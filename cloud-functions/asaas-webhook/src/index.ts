import * as ff from "@google-cloud/functions-framework";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { Pool } from "pg";

const PROJECT_ID = process.env.GCP_PROJECT || "sistema-de-gestao-16e15";
const secretClient = new SecretManagerServiceClient();

let pool: Pool | null = null;
let webhookToken: string | null = null;
let asaasApiKey: string | null = null;

async function getSecret(nome: string): Promise<string> {
  const [version] = await secretClient.accessSecretVersion({
    name: `projects/${PROJECT_ID}/secrets/${nome}/versions/latest`,
  });
  return version.payload?.data?.toString() ?? "";
}

async function getPool(): Promise<Pool> {
  if (pool) return pool;
  const dbPassword = await getSecret("DB_PASSWORD");
  pool = new Pool({
    host: process.env.DB_HOST || `/cloudsql/${PROJECT_ID}:southamerica-east1:licitanest-db`,
    database: process.env.DB_NAME || "licitanest",
    user: process.env.DB_USER || "postgres",
    password: dbPassword,
    max: 3,
    idleTimeoutMillis: 10000,
  });
  return pool;
}

async function getWebhookToken(): Promise<string> {
  if (webhookToken) return webhookToken;
  webhookToken = await getSecret("ASAAS_WEBHOOK_TOKEN");
  return webhookToken;
}

async function getAsaasApiKey(): Promise<string> {
  if (asaasApiKey) return asaasApiKey;
  asaasApiKey = await getSecret("ASAAS_API_KEY");
  return asaasApiKey;
}

// ── Tipos de evento Asaas ────────────────────────────
type AsaasEvent =
  | "PAYMENT_CONFIRMED"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_OVERDUE"
  | "PAYMENT_DELETED"
  | "PAYMENT_REFUNDED"
  | "PAYMENT_CREATED"
  | "PAYMENT_UPDATED"
  | "SUBSCRIPTION_CREATED"
  | "SUBSCRIPTION_UPDATED"
  | "SUBSCRIPTION_DELETED";

interface AsaasPayload {
  event: AsaasEvent;
  payment?: {
    id: string;
    customer: string;
    value: number;
    status: string;
    billingType: string;
    dueDate: string;
    paymentDate?: string;
    invoiceUrl?: string;
    externalReference?: string;
    subscription?: string;
  };
  subscription?: {
    id: string;
    customer: string;
    value: number;
    cycle: string;
    status: string;
    externalReference?: string;
  };
}

// ── Processadores por tipo de evento ─────────────────

async function processarPagamentoConfirmado(db: Pool, payload: AsaasPayload): Promise<void> {
  const p = payload.payment!;
  const municipioId = p.externalReference;
  if (!municipioId) return;

  // Atualizar fatura como paga — match por asaas_payment_id (único) ao invés de valor
  await db.query(
    `UPDATE faturas SET status = 'paga', pago_em = $1, atualizado_em = NOW()
     WHERE municipio_id = $2 AND asaas_payment_id = $3 AND status = 'pendente'`,
    [p.paymentDate ?? new Date().toISOString(), municipioId, p.id],
  );

  // Fallback: se fatura não tinha asaas_payment_id — vincular pela mais recente pendente
  await db.query(
    `UPDATE faturas SET status = 'paga', pago_em = $1, asaas_payment_id = $2, atualizado_em = NOW()
     WHERE municipio_id = $3 AND status = 'pendente' AND asaas_payment_id IS NULL AND valor = $4
     AND NOT EXISTS (SELECT 1 FROM faturas f2 WHERE f2.asaas_payment_id = $2)
     ORDER BY criado_em DESC LIMIT 1`,
    [p.paymentDate ?? new Date().toISOString(), p.id, municipioId, p.value],
  );

  // Ativar/renovar assinatura
  await db.query(
    `UPDATE assinaturas SET status = 'ativa', atualizado_em = NOW()
     WHERE municipio_id = $1 AND status IN ('pendente', 'suspensa')`,
    [municipioId],
  );
}

async function processarPagamentoVencido(db: Pool, payload: AsaasPayload): Promise<void> {
  const p = payload.payment!;
  const municipioId = p.externalReference;
  if (!municipioId) return;

  await db.query(
    `UPDATE faturas SET status = 'vencida', atualizado_em = NOW()
     WHERE municipio_id = $1 AND asaas_payment_id = $2`,
    [municipioId, p.id],
  );

  // Verificar se tem mais de 1 fatura vencida → suspender
  const { rows } = await db.query(
    `SELECT COUNT(*) AS total FROM faturas WHERE municipio_id = $1 AND status = 'vencida'`,
    [municipioId],
  );
  if (parseInt(rows[0].total) >= 2) {
    await db.query(
      `UPDATE assinaturas SET status = 'suspensa', atualizado_em = NOW() WHERE municipio_id = $1`,
      [municipioId],
    );
  }
}

async function processarPagamentoEstornado(db: Pool, payload: AsaasPayload): Promise<void> {
  const p = payload.payment!;
  const municipioId = p.externalReference;
  if (!municipioId) return;

  await db.query(
    `UPDATE faturas SET status = 'estornada', atualizado_em = NOW()
     WHERE municipio_id = $1 AND asaas_payment_id = $2`,
    [municipioId, p.id],
  );
}

async function processarPagamentoDeletado(db: Pool, payload: AsaasPayload): Promise<void> {
  const p = payload.payment!;
  const municipioId = p.externalReference;
  if (!municipioId) return;

  await db.query(
    `UPDATE faturas SET status = 'cancelada', atualizado_em = NOW()
     WHERE municipio_id = $1 AND asaas_payment_id = $2`,
    [municipioId, p.id],
  );
}

// ── Entry point ──────────────────────────────────────

ff.http("asaasWebhook", async (req, res) => {
  // Aceitar apenas POST
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido" });
    return;
  }

  try {
    // Validar token do webhook
    const token = req.headers["asaas-access-token"] as string | undefined;
    const expectedToken = await getWebhookToken();
    if (!token || token !== expectedToken) {
      res.status(401).json({ error: "Token inválido" });
      return;
    }

    const payload = req.body as AsaasPayload;
    if (!payload.event) {
      res.status(400).json({ error: "Evento não informado" });
      return;
    }

    const db = await getPool();

    // Idempotência: gerar event_id único para deduplicação
    const eventId = payload.payment?.id
      ? `${payload.event}:${payload.payment.id}`
      : payload.subscription?.id
        ? `${payload.event}:${payload.subscription.id}`
        : `${payload.event}:${Date.now()}`;
    const municipioId = payload.payment?.externalReference
      ?? payload.subscription?.externalReference
      ?? null;

    // Gravar evento bruto — com deduplicação via asaas_event_id
    const { rowCount } = await db.query(
      `INSERT INTO billing_eventos (municipio_id, tipo, payload, asaas_event_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (asaas_event_id) DO NOTHING`,
      [municipioId, payload.event, JSON.stringify(payload), eventId],
    );

    // Se rowCount = 0, evento já foi processado (idempotente)
    if (rowCount === 0) {
      console.info(`[webhook] Evento duplicado ignorado: ${eventId}`);
      res.status(200).json({ ok: true, event: payload.event, duplicated: true });
      return;
    }

    // Processar por tipo de evento
    switch (payload.event) {
      case "PAYMENT_CONFIRMED":
      case "PAYMENT_RECEIVED":
        await processarPagamentoConfirmado(db, payload);
        break;
      case "PAYMENT_OVERDUE":
        await processarPagamentoVencido(db, payload);
        break;
      case "PAYMENT_REFUNDED":
        await processarPagamentoEstornado(db, payload);
        break;
      case "PAYMENT_DELETED":
        await processarPagamentoDeletado(db, payload);
        break;
      default:
        // Eventos de subscription e outros — apenas logar
        break;
    }

    res.status(200).json({ ok: true, event: payload.event });
  } catch (err) {
    console.error("Erro no webhook Asaas:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});
