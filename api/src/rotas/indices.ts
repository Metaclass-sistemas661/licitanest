import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { exigirServidor } from "../middleware/autorizacao.js";
import { tratarErro } from "../utils/erros.js";

export async function rotasIndices(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  // GET /api/indices
  app.get("/api/indices", async (req, reply) => {
    try {
      const { tipo, ano_inicio, ano_fim } = req.query as {
        tipo: string; ano_inicio?: string; ano_fim?: string;
      };
      const params: unknown[] = [tipo];
      let where = `tipo = $1`;
      if (ano_inicio) { params.push(parseInt(ano_inicio)); where += ` AND ano >= $${params.length}`; }
      if (ano_fim) { params.push(parseInt(ano_fim)); where += ` AND ano <= $${params.length}`; }
      const { rows } = await getPool().query(
        `SELECT * FROM indices_correcao WHERE ${where} ORDER BY ano, mes`, params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/indices/importar
  app.post("/api/indices/importar", async (req, reply) => {
    try {
      const { indices } = req.body as {
        indices: { tipo: string; ano: number; mes: number; valor: number }[];
      };
      const pool = getPool();
      let importados = 0;
      for (const idx of indices) {
        await pool.query(
          `INSERT INTO indices_correcao (tipo, ano, mes, valor)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (tipo, ano, mes) DO UPDATE SET valor = $4`,
          [idx.tipo, idx.ano, idx.mes, idx.valor],
        );
        importados++;
      }
      reply.send({ importados });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/indices/corrigir
  app.post("/api/indices/corrigir", async (req, reply) => {
    try {
      const { preco_id, valor_corrigido, fator_correcao, tipo_indice, data_base } = req.body as {
        preco_id: string; valor_corrigido: number; fator_correcao: number;
        tipo_indice: string; data_base: string;
      };
      const { rows } = await getPool().query(
        `UPDATE precos_item
         SET valor_corrigido = $1, fator_correcao = $2, tipo_correcao = $3, data_base_correcao = $4
         WHERE id = $5 RETURNING *`,
        [valor_corrigido, fator_correcao, tipo_indice, data_base, preco_id],
      );
      reply.send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });
}
