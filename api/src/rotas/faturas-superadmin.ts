import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { exigirSuperAdmin } from "../middleware/superadmin.js";
import { obterSecret } from "../config/secrets.js";
import { tratarErro } from "../utils/erros.js";

// ═══════════════════════════════════════════════════════════════
// Rotas SuperAdmin — Gestão Asaas (sync, resumo, faturas)
// ═══════════════════════════════════════════════════════════════
export async function rotasFaturasSuperadmin(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirSuperAdmin);

  const pool = () => getPool();

  // ── Resumo financeiro em tempo real do Asaas ──────────────
  app.get("/api/superadmin/asaas/resumo", async (_request, reply) => {
    try {
      const asaasKey = await obterSecret("ASAAS_API_KEY");
      const asaasBase = process.env.ASAAS_API_URL || "https://api.asaas.com/v3";

      // Buscar resumo financeiro do Asaas (finance/balance)
      const [balanceResp, paymentsResp] = await Promise.all([
        fetch(`${asaasBase}/finance/balance`, {
          headers: { access_token: asaasKey },
        }),
        fetch(`${asaasBase}/finance/payment-statistics`, {
          headers: { access_token: asaasKey },
        }),
      ]);

      const balance = balanceResp.ok ? (await balanceResp.json()) as Record<string, unknown> : null;
      const stats = paymentsResp.ok ? (await paymentsResp.json()) as Record<string, unknown> : null;

      // Também buscar o resumo local da DB
      const { rows: [dbResumo] } = await pool().query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'paga') AS faturas_pagas,
          COUNT(*) FILTER (WHERE status = 'pendente') AS faturas_pendentes,
          COUNT(*) FILTER (WHERE status = 'vencida') AS faturas_vencidas,
          COUNT(*) FILTER (WHERE status = 'cancelada') AS faturas_canceladas,
          COUNT(*) FILTER (WHERE status = 'estornada') AS faturas_estornadas,
          COUNT(*) AS total_faturas,
          COALESCE(SUM(valor) FILTER (WHERE status = 'paga'), 0) AS total_recebido,
          COALESCE(SUM(valor) FILTER (WHERE status = 'pendente'), 0) AS total_pendente,
          COALESCE(SUM(valor) FILTER (WHERE status = 'vencida'), 0) AS total_vencido
        FROM faturas
      `);

      reply.send({
        data: {
          asaas: { balance, stats },
          local: {
            faturas_pagas: parseInt(dbResumo.faturas_pagas),
            faturas_pendentes: parseInt(dbResumo.faturas_pendentes),
            faturas_vencidas: parseInt(dbResumo.faturas_vencidas),
            faturas_canceladas: parseInt(dbResumo.faturas_canceladas),
            faturas_estornadas: parseInt(dbResumo.faturas_estornadas),
            total_faturas: parseInt(dbResumo.total_faturas),
            total_recebido: parseInt(dbResumo.total_recebido),
            total_pendente: parseInt(dbResumo.total_pendente),
            total_vencido: parseInt(dbResumo.total_vencido),
          },
        },
      });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // ── Sincronizar cobranças do Asaas → DB local ────────────
  app.post("/api/superadmin/asaas/sync", async (_request, reply) => {
    try {
      const asaasKey = await obterSecret("ASAAS_API_KEY");
      const asaasBase = process.env.ASAAS_API_URL || "https://api.asaas.com/v3";

      let offset = 0;
      const limit = 100;
      let totalSynced = 0;
      let hasMore = true;

      while (hasMore) {
        const resp = await fetch(
          `${asaasBase}/payments?offset=${offset}&limit=${limit}`,
          { headers: { access_token: asaasKey } },
        );

        if (!resp.ok) {
          return reply.status(502).send({ error: `Erro ao consultar Asaas: ${resp.status}` });
        }

        const data = (await resp.json()) as {
          data: Array<{
            id: string;
            customer: string;
            value: number;
            netValue: number;
            status: string;
            billingType: string;
            dueDate: string;
            paymentDate: string | null;
            invoiceUrl: string;
            bankSlipUrl: string | null;
            externalReference: string | null;
          }>;
          hasMore: boolean;
          totalCount: number;
        };

        for (const pg of data.data) {
          const municipioId = pg.externalReference;
          if (!municipioId) continue;

          // Map Asaas status → DB status
          const statusMap: Record<string, string> = {
            PENDING: "pendente",
            RECEIVED: "paga",
            CONFIRMED: "paga",
            OVERDUE: "vencida",
            REFUNDED: "estornada",
            RECEIVED_IN_CASH: "paga",
            REFUND_REQUESTED: "pendente",
            CHARGEBACK_REQUESTED: "pendente",
            CHARGEBACK_DISPUTE: "pendente",
            AWAITING_CHARGEBACK_REVERSAL: "pendente",
            DUNNING_REQUESTED: "vencida",
            DUNNING_RECEIVED: "paga",
            AWAITING_RISK_ANALYSIS: "pendente",
          };
          const dbStatus = statusMap[pg.status] || "pendente";

          // Upsert — atualizar se já existe com asaas_payment_id
          await pool().query(
            `UPDATE faturas
             SET status = $1,
                 pago_em = $2,
                 url_pagamento = $3,
                 url_boleto = $4,
                 asaas_status = $5,
                 atualizado_em = NOW()
             WHERE asaas_payment_id = $6`,
            [dbStatus, pg.paymentDate, pg.invoiceUrl, pg.bankSlipUrl, pg.status, pg.id],
          );

          totalSynced++;
        }

        hasMore = data.hasMore;
        offset += limit;
      }

      // Gravar log de sync
      await pool().query(
        `INSERT INTO superadmin.asaas_sync (tipo, total_registros, resumo)
         VALUES ('payments', $1, $2)`,
        [totalSynced, JSON.stringify({ synced_at: new Date().toISOString() })],
      );

      reply.send({
        data: { total_synced: totalSynced, synced_at: new Date().toISOString() },
      });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // ── Últimos eventos do webhook ────────────────────────────
  app.get("/api/superadmin/asaas/eventos", async (request, reply) => {
    try {
      const { page = "1", limit = "20" } = request.query as Record<string, string>;
      const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

      const [dataResult, countResult] = await Promise.all([
        pool().query(
          `SELECT be.*, m.nome AS municipio_nome, m.uf AS municipio_uf
           FROM billing_eventos be
           LEFT JOIN municipios m ON be.municipio_id = m.id
           ORDER BY be.criado_em DESC
           LIMIT $1 OFFSET $2`,
          [Number(limit), offset],
        ),
        pool().query(`SELECT COUNT(*) FROM billing_eventos`),
      ]);

      reply.send({
        data: dataResult.rows,
        total: Number(countResult.rows[0].count),
        page: Number(page),
        limit: Number(limit),
      });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // ── Listar TODAS as faturas (SuperAdmin) ─────────────────
  app.get("/api/superadmin/faturas", async (request, reply) => {
    try {
      const query = request.query as Record<string, string>;
      const page = Math.max(1, parseInt(query.page || "1"));
      const limit = Math.min(100, parseInt(query.limit || "20"));
      const offset = (page - 1) * limit;

      const conditions: string[] = [];
      const params: unknown[] = [];

      if (query.status) {
        params.push(query.status);
        conditions.push(`f.status = $${params.length}`);
      }
      if (query.municipio_id) {
        params.push(query.municipio_id);
        conditions.push(`f.municipio_id = $${params.length}`);
      }
      if (query.uf) {
        params.push(query.uf);
        conditions.push(`m.uf = $${params.length}`);
      }
      if (query.busca) {
        params.push(`%${query.busca}%`);
        conditions.push(`(f.numero ILIKE $${params.length} OR m.nome ILIKE $${params.length})`);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const [dataResult, countResult] = await Promise.all([
        pool().query(
          `SELECT f.*, m.nome AS municipio_nome, m.uf AS municipio_uf,
                  c.numero_contrato
           FROM faturas f
           JOIN municipios m ON f.municipio_id = m.id
           LEFT JOIN contratos c ON f.contrato_id = c.id
           ${where}
           ORDER BY f.criado_em DESC
           LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
          [...params, limit, offset],
        ),
        pool().query(
          `SELECT COUNT(*)
           FROM faturas f
           JOIN municipios m ON f.municipio_id = m.id
           LEFT JOIN contratos c ON f.contrato_id = c.id
           ${where}`,
          params,
        ),
      ]);

      reply.send({
        data: dataResult.rows,
        total: Number(countResult.rows[0].count),
        page,
        limit,
      });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // ── Última sincronização ──────────────────────────────────
  app.get("/api/superadmin/asaas/ultima-sync", async (_request, reply) => {
    try {
      const { rows } = await pool().query(
        `SELECT * FROM superadmin.asaas_sync
         WHERE tipo = 'payments'
         ORDER BY criado_em DESC
         LIMIT 1`,
      );
      reply.send({ data: rows[0] ?? null });
    } catch (e) {
      tratarErro(e, reply);
    }
  });
}
