import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { exigirServidor } from "../middleware/autorizacao.js";
import { tratarErro } from "../utils/erros.js";

export async function rotasApiPublica(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  // GET /api/api-keys
  app.get("/api/api-keys", async (req, reply) => {
    try {
      const { municipio_id } = req.query as { municipio_id?: string };
      const params: unknown[] = [];
      let where = `1=1`;
      if (municipio_id) { params.push(municipio_id); where += ` AND municipio_id = $${params.length}`; }
      const { rows } = await getPool().query(
        `SELECT * FROM api_keys WHERE ${where} ORDER BY criado_em DESC`, params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/api-keys
  app.post("/api/api-keys", async (req, reply) => {
    try {
      const b = req.body as {
        nome: string; municipio_id: string; permissoes?: string[];
        rate_limit_por_minuto?: number; criado_por?: string;
      };
      const key = `lnk_${crypto.randomUUID().replace(/-/g, "")}`;
      const { rows } = await getPool().query(
        `INSERT INTO api_keys (nome, chave, municipio_id, permissoes, rate_limit_por_minuto, criado_por)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [b.nome, key, b.municipio_id, JSON.stringify(b.permissoes ?? []), b.rate_limit_por_minuto ?? 60, b.criado_por],
      );
      reply.status(201).send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // DELETE /api/api-keys/:id
  app.delete("/api/api-keys/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      await getPool().query(`UPDATE api_keys SET revogada = true, revogada_em = NOW() WHERE id = $1`, [id]);
      reply.status(204).send();
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/api-keys/estatisticas
  app.get("/api/api-keys/estatisticas", async (req, reply) => {
    try {
      const { municipio_id } = req.query as { municipio_id?: string };
      const params: unknown[] = [];
      let where = `1=1`;
      if (municipio_id) { params.push(municipio_id); where += ` AND ak.municipio_id = $${params.length}`; }
      const { rows } = await getPool().query(
        `SELECT ak.id, ak.nome, COUNT(al.id) AS total_requisicoes,
                MAX(al.criado_em) AS ultima_requisicao
         FROM api_keys ak
         LEFT JOIN api_log al ON al.api_key_id = ak.id
         WHERE ${where}
         GROUP BY ak.id, ak.nome
         ORDER BY total_requisicoes DESC`,
        params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });
}
