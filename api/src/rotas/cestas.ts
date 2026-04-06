import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { exigirServidor } from "../middleware/autorizacao.js";
import { tratarErro } from "../utils/erros.js";
import { parsePaginacao, respostaPaginada } from "../utils/paginacao.js";

export async function rotasCestas(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  // GET /api/cestas
  app.get("/api/cestas", async (req, reply) => {
    try {
      const q = req.query as Record<string, string>;
      const pag = parsePaginacao(q);
      const params: unknown[] = [];
      let where = `c.deletado_em IS NULL`;

      if (q.busca) {
        params.push(`%${q.busca}%`);
        where += ` AND c.descricao_objeto ILIKE $${params.length}`;
      }
      if (q.status) {
        params.push(q.status);
        where += ` AND c.status = $${params.length}`;
      }
      if (q.secretaria_id) {
        params.push(q.secretaria_id);
        where += ` AND c.secretaria_id = $${params.length}`;
      }
      // Filtro município (ex-RLS)
      params.push(req.usuario!.servidor!.municipio_id);
      where += ` AND sec.municipio_id = $${params.length}`;

      const countRes = await getPool().query(
        `SELECT COUNT(*) FROM cestas c JOIN secretarias sec ON c.secretaria_id = sec.id WHERE ${where}`, params,
      );
      const total = parseInt(countRes.rows[0].count);

      params.push(pag.porPagina, pag.offset);
      const { rows } = await getPool().query(
        `SELECT c.*, sec.nome AS secretaria_nome, srv.nome AS criado_por_nome
         FROM cestas c
         JOIN secretarias sec ON c.secretaria_id = sec.id
         LEFT JOIN servidores srv ON c.criado_por = srv.id
         WHERE ${where}
         ORDER BY c.criado_em DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      );
      reply.send(respostaPaginada(rows, total, pag));
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/cestas/:id
  app.get("/api/cestas/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const { rows } = await getPool().query(
        `SELECT c.*, sec.nome AS secretaria_nome, srv.nome AS criado_por_nome
         FROM cestas c
         JOIN secretarias sec ON c.secretaria_id = sec.id
         LEFT JOIN servidores srv ON c.criado_por = srv.id
         WHERE c.id = $1 AND sec.municipio_id = $2`,
        [id, req.usuario!.servidor!.municipio_id],
      );
      if (!rows[0]) return reply.status(404).send({ error: "Cesta não encontrada" });
      reply.send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/cestas
  app.post("/api/cestas", async (req, reply) => {
    try {
      const b = req.body as {
        descricao_objeto: string; data: string; tipo_calculo: string;
        tipo_correcao: string; percentual_alerta?: number;
        secretaria_id: string; criado_por: string;
      };
      const { rows } = await getPool().query(
        `INSERT INTO cestas (descricao_objeto, data, tipo_calculo, tipo_correcao, percentual_alerta, secretaria_id, criado_por)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [b.descricao_objeto, b.data, b.tipo_calculo, b.tipo_correcao, b.percentual_alerta ?? 25, b.secretaria_id, b.criado_por],
      );
      reply.status(201).send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // PUT /api/cestas/:id
  app.put("/api/cestas/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const body = req.body as Record<string, unknown>;
      const campos = ["descricao_objeto", "data", "tipo_calculo", "tipo_correcao", "percentual_alerta", "status"];
      const sets: string[] = [];
      const params: unknown[] = [];
      for (const c of campos) {
        if (body[c] !== undefined) { params.push(body[c]); sets.push(`${c} = $${params.length}`); }
      }
      if (sets.length === 0) return reply.status(400).send({ error: "Nenhum campo" });
      params.push(new Date().toISOString()); sets.push(`atualizado_em = $${params.length}`);
      params.push(id);
      const { rows } = await getPool().query(
        `UPDATE cestas SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING *`, params,
      );
      if (!rows[0]) return reply.status(404).send({ error: "Cesta não encontrada" });
      reply.send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // DELETE /api/cestas/:id (soft delete)
  app.delete("/api/cestas/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      await getPool().query(`UPDATE cestas SET deletado_em = NOW() WHERE id = $1`, [id]);
      reply.status(204).send();
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/cestas/:id/duplicar
  app.post("/api/cestas/:id/duplicar", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const { servidor_id, com_fontes } = req.body as { servidor_id: string; com_fontes?: boolean };
      const pool = getPool();

      // Copiar cesta
      const { rows: [original] } = await pool.query(`SELECT * FROM cestas WHERE id = $1`, [id]);
      if (!original) return reply.status(404).send({ error: "Cesta não encontrada" });

      const { rows: [nova] } = await pool.query(
        `INSERT INTO cestas (descricao_objeto, data, tipo_calculo, tipo_correcao, percentual_alerta, secretaria_id, criado_por, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'rascunho') RETURNING *`,
        [`${original.descricao_objeto} (cópia)`, original.data, original.tipo_calculo,
         original.tipo_correcao, original.percentual_alerta, original.secretaria_id, servidor_id],
      );

      // Copiar itens
      const { rows: itens } = await pool.query(`SELECT * FROM itens_cesta WHERE cesta_id = $1`, [id]);
      for (const item of itens) {
        const { rows: [novoItem] } = await pool.query(
          `INSERT INTO itens_cesta (cesta_id, produto_id, quantidade, ordem, lote_id)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [nova.id, item.produto_id, item.quantidade, item.ordem, null],
        );
        if (com_fontes) {
          const { rows: precos } = await pool.query(
            `SELECT * FROM precos_item WHERE item_cesta_id = $1`, [item.id],
          );
          for (const p of precos) {
            await pool.query(
              `INSERT INTO precos_item (item_cesta_id, fonte_id, valor, data_coleta, referencia, observacao)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [novoItem.id, p.fonte_id, p.valor, p.data_coleta, p.referencia, p.observacao],
            );
          }
        }
      }
      reply.status(201).send({ data: nova });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/cestas/:id/versoes
  app.get("/api/cestas/:id/versoes", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const { rows } = await getPool().query(
        `SELECT * FROM cestas_versoes WHERE cesta_id = $1 ORDER BY criado_em DESC`, [id],
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/cestas/:id/versoes
  app.post("/api/cestas/:id/versoes", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const { servidor_id, descricao } = req.body as { servidor_id: string; descricao?: string };

      // Contar versão
      const { rows: [{ count }] } = await getPool().query(
        `SELECT COUNT(*) FROM cestas_versoes WHERE cesta_id = $1`, [id],
      );
      const versao = parseInt(count) + 1;

      // Snapshot dos itens
      const { rows: itens } = await getPool().query(
        `SELECT ic.*, pc.descricao AS produto_descricao
         FROM itens_cesta ic
         JOIN produtos_catalogo pc ON ic.produto_id = pc.id
         WHERE ic.cesta_id = $1`, [id],
      );

      const { rows } = await getPool().query(
        `INSERT INTO cestas_versoes (cesta_id, versao, descricao, snapshot_itens, criado_por)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [id, versao, descricao, JSON.stringify(itens), servidor_id],
      );
      reply.status(201).send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });
}
