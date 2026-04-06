import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { exigirServidor } from "../middleware/autorizacao.js";
import { tratarErro } from "../utils/erros.js";
import { obterSecret } from "../config/secrets.js";

export async function rotasBilling(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  // GET /api/billing/planos
  app.get("/api/billing/planos", async (_req, reply) => {
    try {
      const { rows } = await getPool().query(
        `SELECT * FROM planos WHERE ativo = true ORDER BY preco_mensal`,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/billing/planos/:id
  app.get("/api/billing/planos/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const { rows } = await getPool().query(`SELECT * FROM planos WHERE id = $1`, [id]);
      if (!rows[0]) return reply.status(404).send({ error: "Plano não encontrado" });
      reply.send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/billing/assinatura
  app.get("/api/billing/assinatura", async (req, reply) => {
    try {
      const municipioId = req.usuario!.servidor!.municipio_id;
      const { rows } = await getPool().query(
        `SELECT a.*, p.nome AS plano_nome, p.preco_mensal, p.preco_anual,
                p.max_cestas, p.max_usuarios, p.max_secretarias
         FROM assinaturas a
         JOIN planos p ON a.plano_id = p.id
         WHERE a.municipio_id = $1
         LIMIT 1`,
        [municipioId],
      );
      reply.send({ data: rows[0] ?? null });
    } catch (e) { tratarErro(e, reply); }
  });

  // PUT /api/billing/assinatura
  app.put("/api/billing/assinatura", async (req, reply) => {
    try {
      const body = req.body as { plano_id?: string; intervalo?: string; status?: string };
      const municipioId = req.usuario!.servidor!.municipio_id;
      const sets: string[] = [];
      const params: unknown[] = [];
      if (body.plano_id) { params.push(body.plano_id); sets.push(`plano_id = $${params.length}`); }
      if (body.intervalo) { params.push(body.intervalo); sets.push(`intervalo = $${params.length}`); }
      if (body.status) { params.push(body.status); sets.push(`status = $${params.length}`); }
      params.push(new Date().toISOString()); sets.push(`atualizado_em = $${params.length}`);
      params.push(municipioId);
      const { rows } = await getPool().query(
        `UPDATE assinaturas SET ${sets.join(", ")} WHERE municipio_id = $${params.length} RETURNING *`, params,
      );
      reply.send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/billing/faturas
  app.get("/api/billing/faturas", async (req, reply) => {
    try {
      const municipioId = req.usuario!.servidor!.municipio_id;
      const { rows } = await getPool().query(
        `SELECT f.* FROM faturas f
         JOIN assinaturas a ON f.assinatura_id = a.id
         WHERE a.municipio_id = $1
         ORDER BY f.criado_em DESC`,
        [municipioId],
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/billing/checkout
  app.post("/api/billing/checkout", async (req, reply) => {
    try {
      const { plano_id, intervalo } = req.body as { plano_id: string; intervalo: string };
      const municipioId = req.usuario!.servidor!.municipio_id;
      const servidorId = req.usuario!.servidor!.id;

      const pool = getPool();

      // Buscar plano
      const { rows: planos } = await pool.query(`SELECT * FROM planos WHERE id = $1 AND ativo = true`, [plano_id]);
      if (!planos[0]) return reply.status(404).send({ error: "Plano não encontrado" });
      const plano = planos[0];

      const valor = intervalo === "anual" ? plano.preco_anual : plano.preco_mensal;

      // Buscar/criar customer no Asaas
      const { rows: munis } = await pool.query(
        `SELECT m.*, a.asaas_customer_id FROM municipios m
         LEFT JOIN assinaturas a ON a.municipio_id = m.id
         WHERE m.id = $1`,
        [municipioId],
      );
      const muni = munis[0];
      if (!muni) return reply.status(404).send({ error: "Município não encontrado" });

      const asaasKey = await obterSecret("ASAAS_API_KEY");
      const asaasBase = process.env.ASAAS_API_URL || "https://api.asaas.com/v3";

      let customerId = muni.asaas_customer_id;
      if (!customerId) {
        // Criar customer no Asaas
        const custResp = await fetch(`${asaasBase}/customers`, {
          method: "POST",
          headers: { "Content-Type": "application/json", access_token: asaasKey },
          body: JSON.stringify({
            name: muni.nome,
            cpfCnpj: muni.cnpj,
            externalReference: municipioId,
          }),
        });
        if (!custResp.ok) {
          const err = await custResp.text();
          return reply.status(502).send({ error: `Erro ao criar cliente Asaas: ${err}` });
        }
        const custData = (await custResp.json()) as { id: string };
        customerId = custData.id;

        // Salvar customer id
        await pool.query(
          `UPDATE assinaturas SET asaas_customer_id = $1 WHERE municipio_id = $2`,
          [customerId, municipioId],
        );
      }

      // Criar cobrança no Asaas
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3);

      const payResp = await fetch(`${asaasBase}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", access_token: asaasKey },
        body: JSON.stringify({
          customer: customerId,
          billingType: "UNDEFINED", // Asaas mostra opções ao usuário
          value: valor,
          dueDate: dueDate.toISOString().slice(0, 10),
          description: `LicitaNest — Plano ${plano.nome} (${intervalo})`,
          externalReference: municipioId,
        }),
      });
      if (!payResp.ok) {
        const err = await payResp.text();
        return reply.status(502).send({ error: `Erro ao criar cobrança Asaas: ${err}` });
      }
      const payData = (await payResp.json()) as { id: string; invoiceUrl: string; bankSlipUrl?: string };

      // Criar fatura local
      await pool.query(
        `INSERT INTO faturas (assinatura_id, valor, status, asaas_payment_id, criado_por)
         SELECT a.id, $1, 'pendente', $2, $3
         FROM assinaturas a WHERE a.municipio_id = $4`,
        [valor, payData.id, servidorId, municipioId],
      );

      // Registrar evento
      await pool.query(
        `INSERT INTO billing_eventos (municipio_id, tipo, dados)
         VALUES ($1, 'checkout_criado', $2)`,
        [municipioId, JSON.stringify({ plano_id, intervalo, asaas_payment_id: payData.id })],
      );

      reply.send({ url: payData.invoiceUrl, asaas_payment_id: payData.id });
    } catch (e) { tratarErro(e, reply); }
  });
}

// Webhook Asaas (sem auth — validação por token)
export async function rotasWebhookAsaas(app: FastifyInstance) {
  app.post("/api/webhooks/asaas", async (req, reply) => {
    try {
      const token = req.headers["asaas-access-token"] as string;
      const expectedToken = await obterSecret("ASAAS_WEBHOOK_TOKEN");
      if (!token || token !== expectedToken) {
        return reply.status(401).send({ error: "Token inválido" });
      }

      const payload = req.body as {
        event: string;
        payment?: { id: string; customer: string; value: number; status: string; externalReference?: string; paymentDate?: string };
        subscription?: Record<string, unknown>;
      };

      const pool = getPool();

      // Gravar evento bruto
      await pool.query(
        `INSERT INTO billing_eventos (tipo, dados) VALUES ($1, $2)`,
        [payload.event, JSON.stringify(payload)],
      );

      const municipioId = payload.payment?.externalReference;

      // Processar pagamentos confirmados
      if ((payload.event === "PAYMENT_CONFIRMED" || payload.event === "PAYMENT_RECEIVED") && municipioId) {
        await pool.query(
          `UPDATE faturas SET status = 'pago', pago_em = $1, atualizado_em = NOW()
           WHERE municipio_id = $2 AND asaas_payment_id = $3`,
          [payload.payment!.paymentDate ?? new Date().toISOString(), municipioId, payload.payment!.id],
        );
        await pool.query(
          `UPDATE assinaturas SET status = 'ativa', atualizado_em = NOW()
           WHERE municipio_id = $1 AND status IN ('pendente', 'suspensa')`,
          [municipioId],
        );
      }

      // Pagamento vencido
      if (payload.event === "PAYMENT_OVERDUE" && municipioId) {
        await pool.query(
          `UPDATE faturas SET status = 'vencido', atualizado_em = NOW()
           WHERE municipio_id = $1 AND asaas_payment_id = $2`,
          [municipioId, payload.payment!.id],
        );
      }

      // Pagamento estornado
      if (payload.event === "PAYMENT_REFUNDED" && municipioId) {
        await pool.query(
          `UPDATE faturas SET status = 'estornado', atualizado_em = NOW()
           WHERE municipio_id = $1 AND asaas_payment_id = $2`,
          [municipioId, payload.payment!.id],
        );
      }

      reply.send({ ok: true });
    } catch (e) { tratarErro(e, reply); }
  });
}
