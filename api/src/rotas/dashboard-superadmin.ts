import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { exigirSuperAdmin } from "../middleware/superadmin.js";
import { tratarErro } from "../utils/erros.js";

export async function rotasDashboardSuperadmin(app: FastifyInstance): Promise<void> {
  // Todas as rotas exigem SuperAdmin
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirSuperAdmin);

  const pool = () => getPool();

  // ── KPIs do Dashboard Financeiro ──────────────────────────
  app.get("/api/superadmin/dashboard/kpis", async (request, reply) => {
    try {
      const query = request.query as Record<string, string>;
      const dias = Math.min(730, parseInt(query.dias || "365"));
      const uf = query.uf || null;
      const statusContrato = query.status || null;

      // Condições de filtro
      const conditions: string[] = ["c.deletado_em IS NULL"];
      const params: unknown[] = [];
      let idx = 1;

      if (uf) {
        conditions.push(`m.uf = $${idx++}`);
        params.push(uf);
      }
      if (statusContrato) {
        conditions.push(`c.status = $${idx++}`);
        params.push(statusContrato);
      }

      const where = conditions.join(" AND ");

      // KPIs atuais
      const kpisResult = await pool().query(
        `SELECT
          COALESCE(SUM(c.valor_total) FILTER (WHERE c.status = 'ativo'), 0) AS receita_total,
          COALESCE(SUM(c.valor_mensal) FILTER (WHERE c.status = 'ativo'), 0) AS mrr,
          COUNT(*) FILTER (WHERE c.status = 'ativo') AS contratos_ativos,
          COUNT(DISTINCT c.municipio_id) FILTER (WHERE c.status = 'ativo') AS prefeituras_ativas,
          COUNT(*) FILTER (WHERE c.data_fim BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days' AND c.status = 'ativo') AS vencendo_90d
        FROM contratos c
        JOIN municipios m ON c.municipio_id = m.id
        WHERE ${where}`,
        params,
      );

      // Taxa de inadimplência
      const inadimplResult = await pool().query(
        `SELECT
          COUNT(*) AS total_faturas,
          COUNT(*) FILTER (WHERE f.status = 'vencida') AS faturas_vencidas
        FROM faturas f
        JOIN contratos c ON f.contrato_id = c.id
        JOIN municipios m ON c.municipio_id = m.id
        WHERE f.criado_em >= CURRENT_DATE - ($${idx}::TEXT || ' days')::INTERVAL
          AND ${where.replace(/c\./g, 'c.')}`,
        [...params, dias],
      );

      // KPIs do mês anterior (para tendência)
      const tendenciaResult = await pool().query(
        `SELECT
          COALESCE(SUM(c.valor_total) FILTER (WHERE c.status = 'ativo'), 0) AS receita_total_anterior,
          COALESCE(SUM(c.valor_mensal) FILTER (WHERE c.status = 'ativo'), 0) AS mrr_anterior,
          COUNT(*) FILTER (WHERE c.status = 'ativo') AS contratos_ativos_anterior,
          COUNT(DISTINCT c.municipio_id) FILTER (WHERE c.status = 'ativo') AS prefeituras_ativas_anterior
        FROM contratos c
        JOIN municipios m ON c.municipio_id = m.id
        WHERE ${where}
          AND c.criado_em < date_trunc('month', CURRENT_DATE)`,
        params,
      );

      const kpis = kpisResult.rows[0];
      const inadimpl = inadimplResult.rows[0];
      const tend = tendenciaResult.rows[0];

      const totalFaturas = parseInt(inadimpl.total_faturas) || 0;
      const faturasVencidas = parseInt(inadimpl.faturas_vencidas) || 0;
      const taxaInadimplencia = totalFaturas > 0
        ? Math.round((faturasVencidas / totalFaturas) * 10000) / 100
        : 0;

      reply.send({
        data: {
          receita_total: parseInt(kpis.receita_total),
          mrr: parseInt(kpis.mrr),
          contratos_ativos: parseInt(kpis.contratos_ativos),
          prefeituras_ativas: parseInt(kpis.prefeituras_ativas),
          taxa_inadimplencia: taxaInadimplencia,
          vencendo_90d: parseInt(kpis.vencendo_90d),
          tendencia: {
            receita_total_anterior: parseInt(tend.receita_total_anterior),
            mrr_anterior: parseInt(tend.mrr_anterior),
            contratos_ativos_anterior: parseInt(tend.contratos_ativos_anterior),
            prefeituras_ativas_anterior: parseInt(tend.prefeituras_ativas_anterior),
          },
        },
      });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // ── Gráfico: Receita Mensal Acumulada (12 meses) ──────────
  app.get("/api/superadmin/dashboard/receita-mensal", async (request, reply) => {
    try {
      const query = request.query as Record<string, string>;
      const meses = Math.min(24, parseInt(query.meses || "12"));

      const { rows } = await pool().query(
        `WITH meses AS (
          SELECT generate_series(
            date_trunc('month', CURRENT_DATE - ($1::TEXT || ' months')::INTERVAL),
            date_trunc('month', CURRENT_DATE),
            '1 month'
          )::DATE AS mes
        )
        SELECT
          m.mes,
          COALESCE(SUM(c.valor_mensal) FILTER (
            WHERE c.status = 'ativo'
              AND c.data_inicio <= (m.mes + INTERVAL '1 month' - INTERVAL '1 day')
              AND c.data_fim >= m.mes
          ), 0) AS receita
        FROM meses m
        LEFT JOIN contratos c ON c.deletado_em IS NULL
        GROUP BY m.mes
        ORDER BY m.mes`,
        [meses],
      );

      reply.send({
        data: rows.map((r) => ({
          mes: r.mes,
          receita: parseInt(r.receita),
        })),
      });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // ── Gráfico: Status dos Contratos (Donut) ─────────────────
  app.get("/api/superadmin/dashboard/contratos-status", async (_request, reply) => {
    try {
      const { rows } = await pool().query(
        `SELECT status, COUNT(*) AS quantidade
         FROM contratos
         WHERE deletado_em IS NULL
         GROUP BY status
         ORDER BY quantidade DESC`,
      );

      reply.send({
        data: rows.map((r) => ({
          status: r.status,
          quantidade: parseInt(r.quantidade),
        })),
      });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // ── Gráfico: Faturas Recebido vs Pendente vs Vencido (12 meses) ──
  app.get("/api/superadmin/dashboard/faturas-mensal", async (request, reply) => {
    try {
      const query = request.query as Record<string, string>;
      const meses = Math.min(24, parseInt(query.meses || "12"));

      const { rows } = await pool().query(
        `WITH meses AS (
          SELECT generate_series(
            date_trunc('month', CURRENT_DATE - ($1::TEXT || ' months')::INTERVAL),
            date_trunc('month', CURRENT_DATE),
            '1 month'
          )::DATE AS mes
        )
        SELECT
          m.mes,
          COALESCE(SUM(f.valor) FILTER (WHERE f.status = 'paga'), 0) AS recebido,
          COALESCE(SUM(f.valor) FILTER (WHERE f.status = 'pendente'), 0) AS pendente,
          COALESCE(SUM(f.valor) FILTER (WHERE f.status = 'vencida'), 0) AS vencido
        FROM meses m
        LEFT JOIN faturas f ON date_trunc('month', f.vencimento) = m.mes
        GROUP BY m.mes
        ORDER BY m.mes`,
        [meses],
      );

      reply.send({
        data: rows.map((r) => ({
          mes: r.mes,
          recebido: parseInt(r.recebido),
          pendente: parseInt(r.pendente),
          vencido: parseInt(r.vencido),
        })),
      });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // ── Gráfico: Evolução de Prefeituras Ativas ──────────────
  app.get("/api/superadmin/dashboard/prefeituras-evolucao", async (request, reply) => {
    try {
      const query = request.query as Record<string, string>;
      const meses = Math.min(24, parseInt(query.meses || "12"));

      const { rows } = await pool().query(
        `WITH meses AS (
          SELECT generate_series(
            date_trunc('month', CURRENT_DATE - ($1::TEXT || ' months')::INTERVAL),
            date_trunc('month', CURRENT_DATE),
            '1 month'
          )::DATE AS mes
        )
        SELECT
          m.mes,
          COUNT(DISTINCT c.municipio_id) AS prefeituras
        FROM meses m
        LEFT JOIN contratos c ON c.deletado_em IS NULL
          AND c.status = 'ativo'
          AND c.data_inicio <= (m.mes + INTERVAL '1 month' - INTERVAL '1 day')
          AND c.data_fim >= m.mes
        GROUP BY m.mes
        ORDER BY m.mes`,
        [meses],
      );

      reply.send({
        data: rows.map((r) => ({
          mes: r.mes,
          prefeituras: parseInt(r.prefeituras),
        })),
      });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // ── Tabela: Faturas Recentes ──────────────────────────────
  app.get("/api/superadmin/dashboard/faturas-recentes", async (request, reply) => {
    try {
      const query = request.query as Record<string, string>;
      const limit = Math.min(50, parseInt(query.limit || "10"));

      const { rows } = await pool().query(
        `SELECT f.id, f.numero, f.valor, f.status, f.vencimento, f.pago_em,
                c.numero_contrato,
                m.nome AS municipio_nome, m.uf AS municipio_uf
         FROM faturas f
         LEFT JOIN contratos c ON f.contrato_id = c.id
         JOIN municipios m ON f.municipio_id = m.id
         ORDER BY f.criado_em DESC
         LIMIT $1`,
        [limit],
      );

      reply.send({ data: rows });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // ── Lista de UFs (para filtro) ────────────────────────────
  app.get("/api/superadmin/dashboard/ufs", async (_request, reply) => {
    try {
      const { rows } = await pool().query(
        `SELECT DISTINCT m.uf
         FROM municipios m
         JOIN contratos c ON c.municipio_id = m.id AND c.deletado_em IS NULL
         ORDER BY m.uf`,
      );
      reply.send({ data: rows.map((r) => r.uf) });
    } catch (e) {
      tratarErro(e, reply);
    }
  });
}
