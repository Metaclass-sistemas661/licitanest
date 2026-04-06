import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { exigirServidor } from "../middleware/autorizacao.js";
import { tratarErro } from "../utils/erros.js";

export async function rotasCatmat(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  // GET /api/catmat
  app.get("/api/catmat", async (req, reply) => {
    try {
      const { busca, tipo, grupo, pagina = "1" } = req.query as Record<string, string>;
      const params: unknown[] = [];
      let where = `1=1`;
      if (busca) { params.push(`%${busca}%`); where += ` AND (descricao ILIKE $${params.length} OR codigo ILIKE $${params.length})`; }
      if (tipo) { params.push(tipo); where += ` AND tipo = $${params.length}`; }
      if (grupo) { params.push(grupo); where += ` AND grupo = $${params.length}`; }

      const limit = 50;
      const offset = (parseInt(pagina) - 1) * limit;
      params.push(limit, offset);
      const { rows } = await getPool().query(
        `SELECT * FROM catmat_catser WHERE ${where} ORDER BY descricao LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/catmat/vincular
  app.post("/api/catmat/vincular", async (req, reply) => {
    try {
      const { produto_id, catmat_id } = req.body as { produto_id: string; catmat_id: string };
      await getPool().query(
        `UPDATE produtos_catalogo SET catmat_id = $1, atualizado_em = NOW() WHERE id = $2`,
        [catmat_id, produto_id],
      );
      reply.send({ ok: true });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/catmat/desvincular
  app.post("/api/catmat/desvincular", async (req, reply) => {
    try {
      const { produto_id } = req.body as { produto_id: string };
      await getPool().query(
        `UPDATE produtos_catalogo SET catmat_id = NULL, atualizado_em = NOW() WHERE id = $1`,
        [produto_id],
      );
      reply.send({ ok: true });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/catmat/grupos
  app.get("/api/catmat/grupos", async (req, reply) => {
    try {
      const { tipo } = req.query as { tipo?: string };
      const params: unknown[] = [];
      let where = `1=1`;
      if (tipo) { params.push(tipo); where += ` AND tipo = $${params.length}`; }
      const { rows } = await getPool().query(
        `SELECT grupo, COUNT(*) AS total FROM catmat_catser WHERE ${where} GROUP BY grupo ORDER BY grupo`,
        params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });
}
