import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { exigirServidor } from "../middleware/autorizacao.js";
import { tratarErro } from "../utils/erros.js";

export async function rotasRPC(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  // POST /api/rpc/excluir_preco_analise — marca preço como excluído do cálculo
  app.post("/api/rpc/excluir_preco_analise", async (req, reply) => {
    try {
      const { precoId, servidorId, justificativa } = req.body as {
        precoId: string; servidorId: string; justificativa: string;
      };
      if (!justificativa?.trim()) {
        return reply.status(400).send({ error: "Justificativa de exclusão é obrigatória" });
      }

      const pool = getPool();

      const { rows } = await pool.query(
        `UPDATE precos_item SET
           excluido_calculo = true,
           justificativa_exclusao = $1,
           excluido_por = $2,
           excluido_em = NOW()
         WHERE id = $3
         RETURNING *`,
        [justificativa.trim(), servidorId, precoId],
      );

      if (!rows[0]) {
        return reply.status(404).send({ error: "Preço não encontrado" });
      }

      // Registrar na auditoria
      await pool.query(
        `INSERT INTO auditoria (servidor_id, tipo, descricao, entidade_tipo, entidade_id, dados_extra)
         VALUES ($1, 'exclusao_preco', $2, 'precos_item', $3, $4)`,
        [
          servidorId,
          `Preço excluído do cálculo: ${justificativa.trim()}`,
          precoId,
          JSON.stringify({ justificativa: justificativa.trim() }),
        ],
      );

      reply.send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/rpc/reincluir_preco_analise — reativa preço no cálculo
  app.post("/api/rpc/reincluir_preco_analise", async (req, reply) => {
    try {
      const { precoId, servidorId } = req.body as {
        precoId: string; servidorId: string;
      };

      const pool = getPool();

      const { rows } = await pool.query(
        `UPDATE precos_item SET
           excluido_calculo = false,
           justificativa_exclusao = NULL,
           excluido_por = NULL,
           excluido_em = NULL
         WHERE id = $1
         RETURNING *`,
        [precoId],
      );

      if (!rows[0]) {
        return reply.status(404).send({ error: "Preço não encontrado" });
      }

      // Registrar na auditoria
      await pool.query(
        `INSERT INTO auditoria (servidor_id, tipo, descricao, entidade_tipo, entidade_id)
         VALUES ($1, 'reinclusao_preco', 'Preço reincluído no cálculo', 'precos_item', $2)`,
        [servidorId, precoId],
      );

      reply.send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });
}
