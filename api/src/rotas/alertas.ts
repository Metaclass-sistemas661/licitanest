import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { exigirServidor } from "../middleware/autorizacao.js";
import { tratarErro } from "../utils/erros.js";

export async function rotasAlertas(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  // GET /api/alertas/configuracoes
  app.get("/api/alertas/configuracoes", async (req, reply) => {
    try {
      const { servidor_id } = req.query as { servidor_id: string };
      const { rows } = await getPool().query(
        `SELECT * FROM config_alertas_preco WHERE servidor_id = $1 ORDER BY criado_em DESC`,
        [servidor_id],
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/alertas/configuracoes
  app.post("/api/alertas/configuracoes", async (req, reply) => {
    try {
      const b = req.body as {
        servidor_id: string; produto_id?: string; categoria_id?: string;
        percentual_variacao: number; tipo_alerta: string;
      };
      const { rows } = await getPool().query(
        `INSERT INTO config_alertas_preco (servidor_id, produto_id, categoria_id, percentual_variacao, tipo_alerta)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [b.servidor_id, b.produto_id, b.categoria_id, b.percentual_variacao, b.tipo_alerta],
      );
      reply.status(201).send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // DELETE /api/alertas/configuracoes/:id
  app.delete("/api/alertas/configuracoes/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      await getPool().query(`DELETE FROM config_alertas_preco WHERE id = $1`, [id]);
      reply.status(204).send();
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/alertas
  app.get("/api/alertas", async (req, reply) => {
    try {
      const { servidor_id, status } = req.query as { servidor_id: string; status?: string };
      const params: unknown[] = [servidor_id];
      let where = `servidor_id = $1`;
      if (status) { params.push(status); where += ` AND status = $${params.length}`; }
      const { rows } = await getPool().query(
        `SELECT * FROM alertas_preco WHERE ${where} ORDER BY criado_em DESC`, params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  // PUT /api/alertas/:id/resolver
  app.put("/api/alertas/:id/resolver", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      await getPool().query(
        `UPDATE alertas_preco SET status = 'resolvido', resolvido_em = NOW() WHERE id = $1`, [id],
      );
      reply.send({ ok: true });
    } catch (e) { tratarErro(e, reply); }
  });
}
