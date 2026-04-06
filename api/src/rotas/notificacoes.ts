import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { exigirServidor } from "../middleware/autorizacao.js";
import { tratarErro } from "../utils/erros.js";
import { obterSecret } from "../config/secrets.js";

export async function rotasNotificacoes(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  // POST /api/notificacoes/registrar
  app.post("/api/notificacoes/registrar", async (req, reply) => {
    try {
      const { token, plataforma } = req.body as { token: string; plataforma?: string };
      const userId = req.usuario!.servidor!.id;

      await getPool().query(
        `INSERT INTO dispositivos_fcm (user_id, token, plataforma)
         VALUES ((SELECT id FROM usuarios WHERE firebase_uid = $1), $2, $3)
         ON CONFLICT (token) DO UPDATE SET atualizado_em = NOW()`,
        [req.usuario!.uid, token, plataforma ?? "web"],
      );
      reply.send({ ok: true });
    } catch (e) { tratarErro(e, reply); }
  });

  // DELETE /api/notificacoes/token
  app.delete("/api/notificacoes/token", async (req, reply) => {
    try {
      const { token } = req.body as { token: string };
      await getPool().query(`DELETE FROM dispositivos_fcm WHERE token = $1`, [token]);
      reply.status(204).send();
    } catch (e) { tratarErro(e, reply); }
  });
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
