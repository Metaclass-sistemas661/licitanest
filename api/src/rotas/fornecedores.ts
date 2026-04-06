import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { exigirServidor } from "../middleware/autorizacao.js";
import { tratarErro } from "../utils/erros.js";
import { parsePaginacao, respostaPaginada } from "../utils/paginacao.js";

export async function rotasFornecedores(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  // GET /api/fornecedores
  app.get("/api/fornecedores", async (req, reply) => {
    try {
      const q = req.query as Record<string, string>;
      const pag = parsePaginacao(q);
      const params: unknown[] = [];
      let where = `f.ativo = true`;

      if (q.busca) {
        params.push(`%${q.busca}%`);
        where += ` AND (f.razao_social ILIKE $${params.length} OR f.nome_fantasia ILIKE $${params.length} OR f.cnpj_cpf ILIKE $${params.length})`;
      }

      params.push(req.usuario!.servidor!.municipio_id);
      where += ` AND f.municipio_id = $${params.length}`;

      const countRes = await getPool().query(
        `SELECT COUNT(*) FROM fornecedores f WHERE ${where}`, params,
      );
      const total = parseInt(countRes.rows[0].count);

      params.push(pag.porPagina, pag.offset);
      const { rows } = await getPool().query(
        `SELECT f.* FROM fornecedores f WHERE ${where}
         ORDER BY f.razao_social
         LIMIT $${params.length - 1} OFFSET $${params.length}`, params,
      );
      reply.send(respostaPaginada(rows, total, pag));
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/fornecedores/:id
  app.get("/api/fornecedores/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const { rows } = await getPool().query(`SELECT * FROM fornecedores WHERE id = $1`, [id]);
      if (!rows[0]) return reply.status(404).send({ error: "Fornecedor não encontrado" });
      reply.send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/fornecedores
  app.post("/api/fornecedores", async (req, reply) => {
    try {
      const b = req.body as {
        razao_social: string; nome_fantasia?: string; cnpj_cpf: string;
        email?: string; telefone?: string; endereco?: string;
        cidade?: string; uf?: string; cep?: string; municipio_id: string;
      };
      const { rows } = await getPool().query(
        `INSERT INTO fornecedores (razao_social, nome_fantasia, cnpj_cpf, email, telefone, endereco, cidade, uf, cep, municipio_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [b.razao_social, b.nome_fantasia, b.cnpj_cpf, b.email, b.telefone, b.endereco, b.cidade, b.uf, b.cep, b.municipio_id],
      );
      reply.status(201).send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // PUT /api/fornecedores/:id
  app.put("/api/fornecedores/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const body = req.body as Record<string, unknown>;
      const campos = ["razao_social", "nome_fantasia", "cnpj_cpf", "email", "telefone", "endereco", "cidade", "uf", "cep"];
      const sets: string[] = [];
      const params: unknown[] = [];
      for (const c of campos) {
        if (body[c] !== undefined) { params.push(body[c]); sets.push(`${c} = $${params.length}`); }
      }
      params.push(new Date().toISOString()); sets.push(`atualizado_em = $${params.length}`);
      params.push(id);
      const { rows } = await getPool().query(
        `UPDATE fornecedores SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING *`, params,
      );
      reply.send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // DELETE /api/fornecedores/:id (soft delete)
  app.delete("/api/fornecedores/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      await getPool().query(`UPDATE fornecedores SET ativo = false, atualizado_em = NOW() WHERE id = $1`, [id]);
      reply.status(204).send();
    } catch (e) { tratarErro(e, reply); }
  });
}
