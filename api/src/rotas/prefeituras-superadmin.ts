import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { verificarAuth } from "../middleware/auth.js";
import { exigirSuperAdmin } from "../middleware/superadmin.js";
import { getPool } from "../config/database.js";
import { tratarErro } from "../utils/erros.js";

export async function rotasPrefeiturasSuperadmin(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirSuperAdmin);

  const pool = () => getPool();

  // ── KPIs / Resumo ─────────────────────────────────────────────────────────

  app.get("/api/superadmin/prefeituras/resumo", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { rows } = await pool().query(`
        SELECT
          COUNT(*) FILTER (WHERE deletado_em IS NULL)::int                                       AS total,
          COUNT(*) FILTER (WHERE ativo = true AND deletado_em IS NULL)::int                      AS ativas,
          COUNT(*) FILTER (WHERE ativo = false AND deletado_em IS NULL)::int                     AS inativas,
          COUNT(DISTINCT m.id) FILTER (WHERE m.deletado_em IS NULL AND m.ativo = true
            AND EXISTS (
              SELECT 1 FROM contratos c
              WHERE c.municipio_id = m.id AND c.status = 'ativo' AND c.deletado_em IS NULL
                AND c.data_fim < NOW()
            ))::int                                                                               AS inadimplentes
        FROM municipios m
      `);
      reply.send({ data: rows[0] });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // ── Listagem com filtros, paginação e ordenação ───────────────────────────

  app.get("/api/superadmin/prefeituras", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const {
        page = "1",
        limit = "20",
        status,
        uf,
        busca,
        ordenar_por = "nome",
        ordem = "asc",
      } = request.query as Record<string, string>;

      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const offset = (pageNum - 1) * limitNum;

      const allowedSort: Record<string, string> = {
        nome: "m.nome",
        uf: "m.uf",
        criado_em: "m.criado_em",
        usuarios: "total_usuarios",
      };
      const sortCol = allowedSort[ordenar_por] || "m.nome";
      const sortDir = ordem === "desc" ? "DESC" : "ASC";

      const conditions: string[] = ["m.deletado_em IS NULL"];
      const params: unknown[] = [];
      let idx = 1;

      if (status === "ativas") {
        conditions.push("m.ativo = true");
      } else if (status === "inativas") {
        conditions.push("m.ativo = false");
      } else if (status === "inadimplentes") {
        conditions.push(`m.ativo = true AND EXISTS (
          SELECT 1 FROM contratos c
          WHERE c.municipio_id = m.id AND c.status = 'ativo' AND c.deletado_em IS NULL
            AND c.data_fim < NOW()
        )`);
      }

      if (uf) {
        conditions.push(`m.uf = $${idx++}`);
        params.push(uf.toUpperCase());
      }

      if (busca) {
        conditions.push(`(
          m.nome ILIKE $${idx} OR
          m.cnpj ILIKE $${idx} OR
          m.codigo_ibge ILIKE $${idx}
        )`);
        params.push(`%${busca}%`);
        idx++;
      }

      const where = conditions.join(" AND ");

      const countQ = await pool().query(
        `SELECT COUNT(*)::int AS total FROM municipios m WHERE ${where}`,
        params,
      );

      const dataQ = await pool().query(
        `SELECT
          m.*,
          (SELECT COUNT(*)::int FROM servidores s
           JOIN secretarias sec ON sec.id = s.secretaria_id
           WHERE sec.municipio_id = m.id AND s.deletado_em IS NULL) AS total_usuarios,
          (SELECT c.numero_contrato FROM contratos c
           WHERE c.municipio_id = m.id AND c.status = 'ativo' AND c.deletado_em IS NULL
           ORDER BY c.criado_em DESC LIMIT 1) AS contrato_ativo,
          (SELECT c.valor_total FROM contratos c
           WHERE c.municipio_id = m.id AND c.status = 'ativo' AND c.deletado_em IS NULL
           ORDER BY c.criado_em DESC LIMIT 1) AS contrato_valor,
          (SELECT c.data_fim FROM contratos c
           WHERE c.municipio_id = m.id AND c.status = 'ativo' AND c.deletado_em IS NULL
           ORDER BY c.criado_em DESC LIMIT 1) AS contrato_data_fim,
          (SELECT c.data_inicio FROM contratos c
           WHERE c.municipio_id = m.id AND c.status = 'ativo' AND c.deletado_em IS NULL
           ORDER BY c.criado_em DESC LIMIT 1) AS contrato_data_inicio,
          (SELECT c.limite_usuarios FROM contratos c
           WHERE c.municipio_id = m.id AND c.status = 'ativo' AND c.deletado_em IS NULL
           ORDER BY c.criado_em DESC LIMIT 1) AS limite_usuarios,
          (SELECT MAX(s.ultimo_acesso) FROM servidores s
           JOIN secretarias sec ON sec.id = s.secretaria_id
           WHERE sec.municipio_id = m.id AND s.deletado_em IS NULL) AS ultimo_acesso
        FROM municipios m
        WHERE ${where}
        ORDER BY ${sortCol} ${sortDir}
        LIMIT $${idx++} OFFSET $${idx++}`,
        [...params, limitNum, offset],
      );

      reply.send({
        data: dataQ.rows,
        total: countQ.rows[0].total,
        page: pageNum,
        limit: limitNum,
      });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // ── Detalhes de uma prefeitura ────────────────────────────────────────────

  app.get("/api/superadmin/prefeituras/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };

      const { rows: municipioRows } = await pool().query(
        `SELECT * FROM municipios WHERE id = $1 AND deletado_em IS NULL`,
        [id],
      );
      if (!municipioRows[0]) return reply.status(404).send({ error: "Prefeitura não encontrada" });

      const [contratosRes, usuariosRes, secretariasRes, metricasRes] = await Promise.all([
        pool().query(
          `SELECT id, numero_contrato, objeto, valor_total, data_inicio, data_fim, status,
                  criado_em, limite_usuarios, limite_cestas, limite_cotacoes_mes
           FROM contratos WHERE municipio_id = $1 AND deletado_em IS NULL
           ORDER BY criado_em DESC`,
          [id],
        ),
        pool().query(
          `SELECT s.id, s.nome, s.email, s.cpf, s.ativo, s.ultimo_acesso, s.criado_em,
                  s.totp_ativado,
                  p.nome AS perfil_nome, sec.nome AS secretaria_nome
           FROM servidores s
           JOIN secretarias sec ON sec.id = s.secretaria_id
           JOIN perfis p ON p.id = s.perfil_id
           WHERE sec.municipio_id = $1 AND s.deletado_em IS NULL
           ORDER BY s.nome`,
          [id],
        ),
        pool().query(
          `SELECT id, nome, sigla, ativo FROM secretarias
           WHERE municipio_id = $1 AND deletado_em IS NULL ORDER BY nome`,
          [id],
        ),
        pool().query(
          `SELECT
            (SELECT COUNT(*)::int FROM cestas_precos cp WHERE cp.municipio_id = $1 AND cp.deletado_em IS NULL) AS total_cestas,
            (SELECT COUNT(*)::int FROM cotacoes cot WHERE cot.municipio_id = $1 AND cot.deletado_em IS NULL) AS total_cotacoes,
            (SELECT MAX(a.criado_em) FROM audit_log a
             JOIN servidores s ON s.id = a.servidor_id
             JOIN secretarias sec ON sec.id = s.secretaria_id
             WHERE sec.municipio_id = $1) AS ultima_atividade`,
          [id],
        ),
      ]);

      reply.send({
        data: {
          ...municipioRows[0],
          contratos: contratosRes.rows,
          usuarios: usuariosRes.rows,
          secretarias: secretariasRes.rows,
          metricas: metricasRes.rows[0] || {},
        },
      });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // ── Criar prefeitura ──────────────────────────────────────────────────────

  app.post("/api/superadmin/prefeituras", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as {
        nome: string;
        uf: string;
        codigo_ibge?: string;
        cnpj?: string;
        endereco?: string;
        cep?: string;
        telefone?: string;
        email?: string;
        responsavel_nome?: string;
        responsavel_cpf?: string;
        responsavel_cargo?: string;
        responsavel_email?: string;
        observacoes?: string;
      };

      if (!body.nome || body.nome.length < 3) {
        return reply.status(400).send({ error: "Nome obrigatório (min 3 caracteres)" });
      }
      if (!body.uf || body.uf.length !== 2) {
        return reply.status(400).send({ error: "UF obrigatória (2 caracteres)" });
      }

      const { rows } = await pool().query(
        `INSERT INTO municipios (
          nome, uf, codigo_ibge, cnpj, endereco, cep, telefone, email,
          responsavel_nome, responsavel_cpf, responsavel_cargo, responsavel_email,
          observacoes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        RETURNING *`,
        [
          body.nome.trim(),
          body.uf.toUpperCase(),
          body.codigo_ibge || null,
          body.cnpj || null,
          body.endereco || null,
          body.cep || null,
          body.telefone || null,
          body.email || null,
          body.responsavel_nome || null,
          body.responsavel_cpf || null,
          body.responsavel_cargo || null,
          body.responsavel_email || null,
          body.observacoes || null,
        ],
      );

      // Criar secretaria padrão
      await pool().query(
        `INSERT INTO secretarias (nome, sigla, municipio_id) VALUES ('Secretaria de Administração', 'ADMIN', $1)`,
        [rows[0].id],
      );

      reply.status(201).send({ data: rows[0] });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // ── Atualizar prefeitura ──────────────────────────────────────────────────

  app.put("/api/superadmin/prefeituras/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as Record<string, unknown>;

      const campos = [
        "nome", "uf", "codigo_ibge", "cnpj", "endereco", "cep",
        "telefone", "email", "responsavel_nome", "responsavel_cpf",
        "responsavel_cargo", "responsavel_email", "observacoes", "ativo",
      ];

      const sets: string[] = ["atualizado_em = NOW()"];
      const params: unknown[] = [];
      let idx = 1;

      for (const campo of campos) {
        if (campo in body) {
          sets.push(`${campo} = $${idx++}`);
          params.push(body[campo]);
        }
      }

      if (params.length === 0) {
        return reply.status(400).send({ error: "Nenhum campo para atualizar" });
      }

      params.push(id);
      const { rows } = await pool().query(
        `UPDATE municipios SET ${sets.join(", ")} WHERE id = $${idx} AND deletado_em IS NULL RETURNING *`,
        params,
      );

      if (!rows[0]) return reply.status(404).send({ error: "Prefeitura não encontrada" });
      reply.send({ data: rows[0] });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // ── Ativar/Desativar em lote ──────────────────────────────────────────────

  app.post("/api/superadmin/prefeituras/lote", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { ids, acao } = request.body as { ids: string[]; acao: "ativar" | "desativar" };

      if (!ids?.length) return reply.status(400).send({ error: "IDs obrigatórios" });
      if (!["ativar", "desativar"].includes(acao)) return reply.status(400).send({ error: "Ação inválida" });

      const placeholders = ids.map((_, i) => `$${i + 2}`).join(",");
      const { rowCount } = await pool().query(
        `UPDATE municipios SET ativo = $1, atualizado_em = NOW()
         WHERE id IN (${placeholders}) AND deletado_em IS NULL`,
        [acao === "ativar", ...ids],
      );

      reply.send({ data: { atualizados: rowCount } });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // ── UFs disponíveis (para filtros) ────────────────────────────────────────

  app.get("/api/superadmin/prefeituras/ufs", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { rows } = await pool().query(
        `SELECT DISTINCT uf, COUNT(*)::int AS total
         FROM municipios WHERE deletado_em IS NULL
         GROUP BY uf ORDER BY uf`,
      );
      reply.send({ data: rows });
    } catch (e) {
      tratarErro(e, reply);
    }
  });
}
