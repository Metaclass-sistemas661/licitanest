import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { exigirServidor } from "../middleware/autorizacao.js";
import { tratarErro } from "../utils/erros.js";

export async function rotasLgpd(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  // GET /api/lgpd/consentimentos
  app.get("/api/lgpd/consentimentos", async (req, reply) => {
    try {
      const { servidor_id } = req.query as { servidor_id: string };
      const { rows } = await getPool().query(
        `SELECT * FROM consentimentos_lgpd WHERE servidor_id = $1 ORDER BY criado_em DESC`,
        [servidor_id],
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/lgpd/consentimentos
  app.post("/api/lgpd/consentimentos", async (req, reply) => {
    try {
      const { servidor_id, tipo, aceito } = req.body as {
        servidor_id: string; tipo: string; aceito: boolean;
      };
      const { rows } = await getPool().query(
        `INSERT INTO consentimentos_lgpd (servidor_id, tipo, aceito, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (servidor_id, tipo) DO UPDATE SET aceito = $3, atualizado_em = NOW()
         RETURNING *`,
        [servidor_id, tipo, aceito, req.ip, req.headers["user-agent"]],
      );
      reply.status(201).send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/lgpd/solicitacoes
  app.get("/api/lgpd/solicitacoes", async (req, reply) => {
    try {
      const q = req.query as { servidor_id?: string; status?: string };
      const params: unknown[] = [];
      let where = `1=1`;
      if (q.servidor_id) { params.push(q.servidor_id); where += ` AND servidor_id = $${params.length}`; }
      if (q.status) { params.push(q.status); where += ` AND status = $${params.length}`; }
      const { rows } = await getPool().query(
        `SELECT * FROM solicitacoes_lgpd WHERE ${where} ORDER BY criado_em DESC`, params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/lgpd/solicitacoes
  app.post("/api/lgpd/solicitacoes", async (req, reply) => {
    try {
      const { servidor_id, tipo, descricao } = req.body as {
        servidor_id: string; tipo: string; descricao?: string;
      };
      const { rows } = await getPool().query(
        `INSERT INTO solicitacoes_lgpd (servidor_id, tipo, descricao)
         VALUES ($1, $2, $3) RETURNING *`,
        [servidor_id, tipo, descricao],
      );
      reply.status(201).send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // PUT /api/lgpd/solicitacoes/:id
  app.put("/api/lgpd/solicitacoes/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const { status, resposta, respondido_por } = req.body as {
        status: string; resposta: string; respondido_por: string;
      };
      const { rows } = await getPool().query(
        `UPDATE solicitacoes_lgpd SET status = $1, resposta = $2, respondido_por = $3, respondido_em = NOW()
         WHERE id = $4 RETURNING *`,
        [status, resposta, respondido_por, id],
      );
      reply.send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });
}
