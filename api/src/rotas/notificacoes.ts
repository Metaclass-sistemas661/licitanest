import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { exigirServidor } from "../middleware/autorizacao.js";
import { tratarErro, AppError } from "../utils/erros.js";
import { obterSecret } from "../config/secrets.js";

export async function rotasNotificacoes(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  // POST /api/notificacoes/registrar
  app.post("/api/notificacoes/registrar", async (req, reply) => {
    try {
      const { token_fcm, plataforma } = req.body as { token_fcm: string; plataforma?: string };
      if (!token_fcm || typeof token_fcm !== "string") {
        return reply.status(400).send({ error: "token_fcm é obrigatório" });
      }

      await getPool().query(
        `INSERT INTO dispositivos_fcm (user_id, municipio_id, token_fcm, plataforma)
         VALUES (
           (SELECT id FROM usuarios WHERE firebase_uid = $1),
           $2, $3, $4
         )
         ON CONFLICT (token_fcm) DO UPDATE SET atualizado_em = NOW(), ativo = TRUE`,
        [req.usuario!.uid, req.usuario!.servidor!.municipio_id, token_fcm, plataforma ?? "web"],
      );
      reply.send({ ok: true });
    } catch (e) { tratarErro(e, reply); }
  });

  // DELETE /api/notificacoes/token
  app.delete("/api/notificacoes/token", async (req, reply) => {
    try {
      const { token_fcm } = req.body as { token_fcm: string };
      await getPool().query(
        `UPDATE dispositivos_fcm SET ativo = FALSE WHERE token_fcm = $1`, [token_fcm],
      );
      reply.status(204).send();
    } catch (e) { tratarErro(e, reply); }
  });
}

const MAX_DESTINATARIOS_POR_ENVIO = 10;
const MAX_EMAILS_DIARIOS = 50;

// Quota diária em memória por servidor (reset diário)
const quotaDiaria = new Map<string, { count: number; data: string }>();

function verificarQuotaEmail(servidorId: string): { permitido: boolean; restante: number } {
  const hoje = new Date().toISOString().slice(0, 10);
  const entry = quotaDiaria.get(servidorId);
  if (!entry || entry.data !== hoje) {
    quotaDiaria.set(servidorId, { count: 0, data: hoje });
    return { permitido: true, restante: MAX_EMAILS_DIARIOS };
  }
  const restante = MAX_EMAILS_DIARIOS - entry.count;
  return { permitido: restante > 0, restante };
}

function incrementarQuotaEmail(servidorId: string, quantidade: number) {
  const hoje = new Date().toISOString().slice(0, 10);
  const entry = quotaDiaria.get(servidorId);
  if (!entry || entry.data !== hoje) {
    quotaDiaria.set(servidorId, { count: quantidade, data: hoje });
  } else {
    entry.count += quantidade;
  }
}

export async function rotasEmail(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  // POST /api/email/enviar
  app.post("/api/email/enviar", async (req, reply) => {
    try {
      const b = req.body as {
        para: string[]; assunto: string; html: string; criado_por?: string;
        de?: string;
      };

      // Validar limite de destinatários por envio
      if (!Array.isArray(b.para) || b.para.length === 0) {
        throw new AppError("Lista de destinatários é obrigatória", 400);
      }
      if (b.para.length > MAX_DESTINATARIOS_POR_ENVIO) {
        throw new AppError(`Máximo de ${MAX_DESTINATARIOS_POR_ENVIO} destinatários por envio`, 400);
      }

      // Verificar quota diária
      const servidorId = req.usuario!.servidor!.id;
      const quota = verificarQuotaEmail(servidorId);
      if (!quota.permitido) {
        reply.header("Retry-After", "86400");
        return reply.status(429).send({
          error: `Quota diária de ${MAX_EMAILS_DIARIOS} emails atingida. Tente novamente amanhã.`,
        });
      }
      if (b.para.length > quota.restante) {
        return reply.status(429).send({
          error: `Quota diária insuficiente. Restam ${quota.restante} emails hoje.`,
        });
      }

      const pool = getPool();

      // Registrar email localmente
      const { rows } = await pool.query(
        `INSERT INTO emails_enviados (destinatarios, assunto, corpo_html, status, criado_por)
         VALUES ($1, $2, $3, 'enviando', $4) RETURNING *`,
        [JSON.stringify(b.para), b.assunto, b.html, b.criado_por],
      );
      const email = rows[0];

      // Enviar via Resend
      const resendKey = await obterSecret("RESEND_API_KEY");
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: b.de || "LicitaNest <noreply@licitanest.com.br>",
          to: b.para,
          subject: b.assunto,
          html: b.html,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (resp.ok) {
        const data = (await resp.json()) as { id: string };
        await pool.query(
          `UPDATE emails_enviados SET status = 'enviado', resend_id = $1, enviado_em = NOW() WHERE id = $2`,
          [data.id, email.id],
        );
        incrementarQuotaEmail(servidorId, b.para.length);
        reply.status(201).send({ data: { ...email, status: "enviado", resend_id: data.id } });
      } else {
        const errText = await resp.text();
        await pool.query(
          `UPDATE emails_enviados SET status = 'erro', erro_detalhes = $1 WHERE id = $2`,
          [errText, email.id],
        );
        reply.status(502).send({ error: `Erro Resend: ${errText}`, data: email });
      }
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/emails
  app.get("/api/emails", async (req, reply) => {
    try {
      const { status, limite = "50" } = req.query as { status?: string; limite?: string };
      const params: unknown[] = [];
      let where = `1=1`;
      if (status) { params.push(status); where += ` AND status = $${params.length}`; }
      params.push(parseInt(limite));
      const { rows } = await getPool().query(
        `SELECT * FROM emails_enviados WHERE ${where} ORDER BY criado_em DESC LIMIT $${params.length}`,
        params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });
}
