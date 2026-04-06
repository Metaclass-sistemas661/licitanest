import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { exigirServidor } from "../middleware/autorizacao.js";
import { tratarErro } from "../utils/erros.js";
import { parsePaginacao, respostaPaginada } from "../utils/paginacao.js";

export async function rotasCatalogo(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  // GET /api/catalogo
  app.get("/api/catalogo", async (req, reply) => {
    try {
      const q = req.query as Record<string, string>;
      const pag = parsePaginacao(q);
      const params: unknown[] = [];
      let where = `pc.ativo = true`;

      if (q.busca) {
        params.push(`%${q.busca}%`);
        where += ` AND (pc.descricao ILIKE $${params.length} OR pc.codigo ILIKE $${params.length})`;
      }
      if (q.categoria_id) {
        params.push(q.categoria_id);
        where += ` AND pc.categoria_id = $${params.length}`;
      }

      const countRes = await getPool().query(
        `SELECT COUNT(*) FROM produtos_catalogo pc WHERE ${where}`, params,
      );
      const total = parseInt(countRes.rows[0].count);

      params.push(pag.porPagina, pag.offset);
      const { rows } = await getPool().query(
        `SELECT pc.*, cat.nome AS categoria_nome, um.sigla AS unidade_sigla, um.descricao AS unidade_descricao
         FROM produtos_catalogo pc
         LEFT JOIN categorias cat ON pc.categoria_id = cat.id
         LEFT JOIN unidades_medida um ON pc.unidade_medida_id = um.id
         WHERE ${where}
         ORDER BY pc.descricao
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      );
      reply.send(respostaPaginada(rows, total, pag));
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/catalogo/autocomplete
  app.get("/api/catalogo/autocomplete", async (req, reply) => {
    try {
      const { termo } = req.query as { termo: string };
      if (!termo || termo.length < 2) return reply.send({ data: [] });
      const { rows } = await getPool().query(
        `SELECT id, descricao, codigo FROM produtos_catalogo
         WHERE ativo = true AND (descricao ILIKE $1 OR codigo ILIKE $1)
         ORDER BY descricao LIMIT 15`,
        [`%${termo}%`],
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/catalogo/:id
  app.get("/api/catalogo/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const { rows } = await getPool().query(
        `SELECT pc.*, cat.nome AS categoria_nome, um.sigla AS unidade_sigla
         FROM produtos_catalogo pc
         LEFT JOIN categorias cat ON pc.categoria_id = cat.id
         LEFT JOIN unidades_medida um ON pc.unidade_medida_id = um.id
         WHERE pc.id = $1`, [id],
      );
      if (!rows[0]) return reply.status(404).send({ error: "Produto não encontrado" });
      reply.send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/catalogo
  app.post("/api/catalogo", async (req, reply) => {
    try {
      const b = req.body as {
        descricao: string; codigo?: string; categoria_id?: string;
        unidade_medida_id?: string; especificacao?: string; elemento_despesa_id?: string;
      };
      const { rows } = await getPool().query(
        `INSERT INTO produtos_catalogo (descricao, codigo, categoria_id, unidade_medida_id, especificacao, elemento_despesa_id)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [b.descricao, b.codigo, b.categoria_id, b.unidade_medida_id, b.especificacao, b.elemento_despesa_id],
      );
      reply.status(201).send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // PUT /api/catalogo/:id
  app.put("/api/catalogo/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const body = req.body as Record<string, unknown>;
      const campos = ["descricao", "codigo", "categoria_id", "unidade_medida_id", "especificacao", "elemento_despesa_id"];
      const sets: string[] = [];
      const params: unknown[] = [];
      for (const c of campos) {
        if (body[c] !== undefined) { params.push(body[c]); sets.push(`${c} = $${params.length}`); }
      }
      params.push(new Date().toISOString()); sets.push(`atualizado_em = $${params.length}`);
      params.push(id);
      const { rows } = await getPool().query(
        `UPDATE produtos_catalogo SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING *`, params,
      );
      reply.send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // ── Categorias / Unidades / Elementos ──────────
  app.get("/api/categorias", async (_req, reply) => {
    try {
      const { rows } = await getPool().query(`SELECT * FROM categorias ORDER BY nome`);
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  app.post("/api/categorias", async (req, reply) => {
    try {
      const { nome, descricao } = req.body as { nome: string; descricao?: string };
      const { rows } = await getPool().query(
        `INSERT INTO categorias (nome, descricao) VALUES ($1, $2) RETURNING *`, [nome, descricao],
      );
      reply.status(201).send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  app.get("/api/unidades-medida", async (_req, reply) => {
    try {
      const { rows } = await getPool().query(`SELECT * FROM unidades_medida ORDER BY descricao`);
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  app.get("/api/elementos-despesa", async (_req, reply) => {
    try {
      const { rows } = await getPool().query(`SELECT * FROM elementos_despesa ORDER BY codigo`);
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/fontes
  app.get("/api/fontes", async (req, reply) => {
    try {
      const { ativas } = req.query as { ativas?: string };
      let sql = `SELECT * FROM fontes`;
      if (ativas === "true") sql += ` WHERE ativo = true`;
      sql += ` ORDER BY nome`;
      const { rows } = await getPool().query(sql);
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });
}
