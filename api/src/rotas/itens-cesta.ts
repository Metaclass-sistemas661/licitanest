import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { exigirServidor } from "../middleware/autorizacao.js";
import { tratarErro } from "../utils/erros.js";

export async function rotasItensCesta(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  // GET /api/cestas/:cestaId/itens
  app.get("/api/cestas/:cestaId/itens", async (req, reply) => {
    try {
      const { cestaId } = req.params as { cestaId: string };
      const { rows } = await getPool().query(
        `SELECT ic.*,
                pc.descricao AS produto_descricao, pc.codigo AS produto_codigo,
                cat.nome AS categoria_nome, um.sigla AS unidade_sigla
         FROM itens_cesta ic
         JOIN produtos_catalogo pc ON ic.produto_id = pc.id
         LEFT JOIN categorias cat ON pc.categoria_id = cat.id
         LEFT JOIN unidades_medida um ON pc.unidade_medida_id = um.id
         WHERE ic.cesta_id = $1
         ORDER BY ic.ordem, ic.criado_em`,
        [cestaId],
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/cestas/:cestaId/itens
  app.post("/api/cestas/:cestaId/itens", async (req, reply) => {
    try {
      const { cestaId } = req.params as { cestaId: string };
      const b = req.body as { produto_id: string; quantidade: number; lote_id?: string };
      // Próxima ordem
      const { rows: [{ max }] } = await getPool().query(
        `SELECT COALESCE(MAX(ordem), 0) AS max FROM itens_cesta WHERE cesta_id = $1`, [cestaId],
      );
      const { rows } = await getPool().query(
        `INSERT INTO itens_cesta (cesta_id, produto_id, quantidade, ordem, lote_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [cestaId, b.produto_id, b.quantidade, parseInt(max) + 1, b.lote_id],
      );
      reply.status(201).send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // PUT /api/itens-cesta/:id
  app.put("/api/itens-cesta/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const body = req.body as Record<string, unknown>;
      const campos = ["quantidade", "ordem", "lote_id"];
      const sets: string[] = [];
      const params: unknown[] = [];
      for (const c of campos) {
        if (body[c] !== undefined) { params.push(body[c]); sets.push(`${c} = $${params.length}`); }
      }
      if (sets.length === 0) return reply.status(400).send({ error: "Nenhum campo" });
      params.push(id);
      const { rows } = await getPool().query(
        `UPDATE itens_cesta SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING *`, params,
      );
      reply.send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // DELETE /api/itens-cesta/:id
  app.delete("/api/itens-cesta/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      await getPool().query(`DELETE FROM itens_cesta WHERE id = $1`, [id]);
      reply.status(204).send();
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/itens-cesta/reordenar
  app.post("/api/itens-cesta/reordenar", async (req, reply) => {
    try {
      const { itens } = req.body as { itens: { id: string; ordem: number }[] };
      const pool = getPool();
      for (const item of itens) {
        await pool.query(`UPDATE itens_cesta SET ordem = $1 WHERE id = $2`, [item.ordem, item.id]);
      }
      reply.send({ ok: true });
    } catch (e) { tratarErro(e, reply); }
  });

  // ── Lotes ──────────────────────────────────────
  app.get("/api/cestas/:cestaId/lotes", async (req, reply) => {
    try {
      const { cestaId } = req.params as { cestaId: string };
      const { rows } = await getPool().query(
        `SELECT * FROM lotes_cesta WHERE cesta_id = $1 ORDER BY criado_em`, [cestaId],
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  app.post("/api/cestas/:cestaId/lotes", async (req, reply) => {
    try {
      const { cestaId } = req.params as { cestaId: string };
      const { descricao } = req.body as { descricao?: string };
      const { rows: [{ count }] } = await getPool().query(
        `SELECT COUNT(*) FROM lotes_cesta WHERE cesta_id = $1`, [cestaId],
      );
      const num = parseInt(count) + 1;
      const { rows } = await getPool().query(
        `INSERT INTO lotes_cesta (cesta_id, numero, descricao) VALUES ($1, $2, $3) RETURNING *`,
        [cestaId, num, descricao || `Lote ${num}`],
      );
      reply.status(201).send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  app.delete("/api/lotes-cesta/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      await getPool().query(`UPDATE itens_cesta SET lote_id = NULL WHERE lote_id = $1`, [id]);
      await getPool().query(`DELETE FROM lotes_cesta WHERE id = $1`, [id]);
      reply.status(204).send();
    } catch (e) { tratarErro(e, reply); }
  });

  // ── Preços ─────────────────────────────────────
  app.get("/api/itens-cesta/:itemId/precos", async (req, reply) => {
    try {
      const { itemId } = req.params as { itemId: string };
      const { rows } = await getPool().query(
        `SELECT pi.*, f.nome AS fonte_nome, f.tipo AS fonte_tipo
         FROM precos_item pi
         LEFT JOIN fontes f ON pi.fonte_id = f.id
         WHERE pi.item_cesta_id = $1
         ORDER BY pi.data_coleta DESC`,
        [itemId],
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  app.post("/api/itens-cesta/:itemId/precos", async (req, reply) => {
    try {
      const { itemId } = req.params as { itemId: string };
      const b = req.body as {
        fonte_id: string; valor: number; data_coleta: string;
        referencia?: string; observacao?: string; fornecedor_id?: string;
        uf?: string; municipio_nome?: string;
      };
      const { rows } = await getPool().query(
        `INSERT INTO precos_item (item_cesta_id, fonte_id, valor, data_coleta, referencia, observacao, fornecedor_id, uf, municipio_nome)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [itemId, b.fonte_id, b.valor, b.data_coleta, b.referencia, b.observacao, b.fornecedor_id, b.uf, b.municipio_nome],
      );
      reply.status(201).send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  app.put("/api/precos/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const body = req.body as Record<string, unknown>;
      const campos = ["valor", "data_coleta", "referencia", "observacao", "excluido_do_calculo", "justificativa_exclusao", "excluido_por"];
      const sets: string[] = [];
      const params: unknown[] = [];
      for (const c of campos) {
        if (body[c] !== undefined) { params.push(body[c]); sets.push(`${c} = $${params.length}`); }
      }
      if (sets.length === 0) return reply.status(400).send({ error: "Nenhum campo" });
      params.push(id);
      const { rows } = await getPool().query(
        `UPDATE precos_item SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING *`, params,
      );
      reply.send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  app.delete("/api/precos/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      await getPool().query(`DELETE FROM precos_item WHERE id = $1`, [id]);
      reply.status(204).send();
    } catch (e) { tratarErro(e, reply); }
  });
}
