import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { exigirServidor } from "../middleware/autorizacao.js";
import { tratarErro } from "../utils/erros.js";
import { parsePaginacao, respostaPaginada } from "../utils/paginacao.js";

export async function rotasCotacoes(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  // GET /api/cotacoes
  app.get("/api/cotacoes", async (req, reply) => {
    try {
      const q = req.query as Record<string, string>;
      const pag = parsePaginacao(q);
      const params: unknown[] = [];
      let where = `cot.deletado_em IS NULL`;

      if (q.status) { params.push(q.status); where += ` AND cot.status = $${params.length}`; }
      if (q.cesta_id) { params.push(q.cesta_id); where += ` AND cot.cesta_id = $${params.length}`; }

      params.push(req.usuario!.servidor!.municipio_id);
      where += ` AND sec.municipio_id = $${params.length}`;

      const countRes = await getPool().query(
        `SELECT COUNT(*) FROM cotacoes cot
         JOIN cestas c ON cot.cesta_id = c.id
         JOIN secretarias sec ON c.secretaria_id = sec.id
         WHERE ${where}`, params,
      );
      const total = parseInt(countRes.rows[0].count);

      params.push(pag.porPagina, pag.offset);
      const { rows } = await getPool().query(
        `SELECT cot.*, c.descricao_objeto AS cesta_descricao, srv.nome AS criado_por_nome
         FROM cotacoes cot
         JOIN cestas c ON cot.cesta_id = c.id
         JOIN secretarias sec ON c.secretaria_id = sec.id
         LEFT JOIN servidores srv ON cot.criado_por = srv.id
         WHERE ${where}
         ORDER BY cot.criado_em DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      );
      reply.send(respostaPaginada(rows, total, pag));
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/cotacoes/:id
  app.get("/api/cotacoes/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const { rows } = await getPool().query(
        `SELECT cot.*, c.descricao_objeto AS cesta_descricao
         FROM cotacoes cot
         JOIN cestas c ON cot.cesta_id = c.id
         JOIN secretarias sec ON c.secretaria_id = sec.id
         WHERE cot.id = $1 AND sec.municipio_id = $2`, [id, req.usuario!.servidor!.municipio_id],
      );
      if (!rows[0]) return reply.status(404).send({ error: "Cotação não encontrada" });

      // Carregar itens, fornecedores e respostas
      const [itens, fornecedores, respostas] = await Promise.all([
        getPool().query(`SELECT ci.*, pc.descricao AS produto_descricao
           FROM cotacao_itens ci JOIN itens_cesta ic ON ci.item_cesta_id = ic.id
           JOIN produtos_catalogo pc ON ic.produto_id = pc.id
           WHERE ci.cotacao_id = $1`, [id]),
        getPool().query(`SELECT * FROM cotacao_fornecedores WHERE cotacao_id = $1`, [id]),
        getPool().query(`SELECT * FROM respostas_cotacao WHERE cotacao_id = $1`, [id]),
      ]);

      reply.send({
        data: {
          ...rows[0],
          itens: itens.rows,
          fornecedores: fornecedores.rows,
          respostas: respostas.rows,
        },
      });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/cotacoes
  app.post("/api/cotacoes", async (req, reply) => {
    try {
      const b = req.body as {
        cesta_id: string; titulo: string; descricao?: string;
        prazo_resposta: string; criado_por: string;
      };
      const { rows } = await getPool().query(
        `INSERT INTO cotacoes (cesta_id, titulo, descricao, prazo_resposta, criado_por)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [b.cesta_id, b.titulo, b.descricao, b.prazo_resposta, b.criado_por],
      );
      reply.status(201).send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // PUT /api/cotacoes/:id
  app.put("/api/cotacoes/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const body = req.body as Record<string, unknown>;
      const campos = ["titulo", "descricao", "prazo_resposta", "status"];
      const sets: string[] = [];
      const params: unknown[] = [];
      for (const c of campos) {
        if (body[c] !== undefined) { params.push(body[c]); sets.push(`${c} = $${params.length}`); }
      }
      params.push(new Date().toISOString()); sets.push(`atualizado_em = $${params.length}`);
      params.push(id);
      const { rows } = await getPool().query(
        `UPDATE cotacoes SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING *`, params,
      );
      reply.send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // DELETE /api/cotacoes/:id
  app.delete("/api/cotacoes/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      await getPool().query(`UPDATE cotacoes SET deletado_em = NOW() WHERE id = $1`, [id]);
      reply.status(204).send();
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/cotacoes/:id/itens
  app.post("/api/cotacoes/:id/itens", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const { item_cesta_id, quantidade_estimada } = req.body as { item_cesta_id: string; quantidade_estimada?: number };
      const { rows } = await getPool().query(
        `INSERT INTO cotacao_itens (cotacao_id, item_cesta_id, quantidade_estimada)
         VALUES ($1,$2,$3) RETURNING *`,
        [id, item_cesta_id, quantidade_estimada],
      );
      reply.status(201).send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // DELETE /api/cotacao-itens/:id
  app.delete("/api/cotacao-itens/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      await getPool().query(`DELETE FROM cotacao_itens WHERE id = $1`, [id]);
      reply.status(204).send();
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/cotacoes/:id/fornecedores
  app.post("/api/cotacoes/:id/fornecedores", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const b = req.body as { fornecedor_id?: string; nome: string; email: string; cnpj_cpf?: string; telefone?: string };
      const { rows } = await getPool().query(
        `INSERT INTO cotacao_fornecedores (cotacao_id, fornecedor_id, nome, email, cnpj_cpf, telefone)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [id, b.fornecedor_id, b.nome, b.email, b.cnpj_cpf, b.telefone],
      );
      reply.status(201).send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // DELETE /api/cotacao-fornecedores/:id
  app.delete("/api/cotacao-fornecedores/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      await getPool().query(`DELETE FROM cotacao_fornecedores WHERE id = $1`, [id]);
      reply.status(204).send();
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/cotacoes/:id/enviar
  app.post("/api/cotacoes/:id/enviar", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      await getPool().query(
        `UPDATE cotacoes SET status = 'enviada', enviado_em = NOW(), atualizado_em = NOW() WHERE id = $1`, [id],
      );
      reply.send({ ok: true });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/cotacoes/:id/lancamentos
  app.post("/api/cotacoes/:id/lancamentos", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const b = req.body as {
        item_cesta_id: string; fornecedor_nome: string; valor: number;
        marca?: string; observacao?: string; servidor_id: string;
      };
      const { rows } = await getPool().query(
        `INSERT INTO cotacao_lancamentos_manuais (cotacao_id, item_cesta_id, fornecedor_nome, valor, marca, observacao, servidor_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [id, b.item_cesta_id, b.fornecedor_nome, b.valor, b.marca, b.observacao, b.servidor_id],
      );
      reply.status(201).send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  app.get("/api/cotacoes/:id/lancamentos", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const { rows } = await getPool().query(
        `SELECT * FROM cotacao_lancamentos_manuais WHERE cotacao_id = $1 ORDER BY criado_em DESC`, [id],
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });
}

// ── Portal público (sem auth) ────────────────────
export async function rotasPortalCotacao(app: FastifyInstance) {
  // GET /api/portal/:token
  app.get("/api/portal/:token", async (req, reply) => {
    try {
      const { token } = req.params as { token: string };
      const { rows } = await getPool().query(
        `SELECT cf.*, cot.titulo, cot.descricao, cot.prazo_resposta
         FROM cotacao_fornecedores cf
         JOIN cotacoes cot ON cf.cotacao_id = cot.id
         WHERE cf.token_acesso = $1 AND cot.status IN ('enviada','aberta')`,
        [token],
      );
      if (!rows[0]) return reply.status(404).send({ error: "Cotação não encontrada ou expirada" });

      const itens = await getPool().query(
        `SELECT ci.*, pc.descricao AS produto_descricao, um.sigla AS unidade_sigla
         FROM cotacao_itens ci
         JOIN itens_cesta ic ON ci.item_cesta_id = ic.id
         JOIN produtos_catalogo pc ON ic.produto_id = pc.id
         LEFT JOIN unidades_medida um ON pc.unidade_medida_id = um.id
         WHERE ci.cotacao_id = $1`,
        [rows[0].cotacao_id],
      );

      reply.send({ data: { ...rows[0], itens: itens.rows } });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/portal/:token/responder
  app.post("/api/portal/:token/responder", async (req, reply) => {
    try {
      const { token } = req.params as { token: string };
      const { respostas, dados_fornecedor } = req.body as {
        respostas: { item_cotacao_id: string; valor: number; marca?: string; observacao?: string }[];
        dados_fornecedor?: { nome?: string; telefone?: string };
      };

      const { rows: [forn] } = await getPool().query(
        `SELECT * FROM cotacao_fornecedores WHERE token_acesso = $1`, [token],
      );
      if (!forn) return reply.status(404).send({ error: "Token inválido" });

      const pool = getPool();
      for (const r of respostas) {
        await pool.query(
          `INSERT INTO respostas_cotacao (cotacao_id, cotacao_fornecedor_id, cotacao_item_id, valor, marca, observacao)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (cotacao_fornecedor_id, cotacao_item_id)
           DO UPDATE SET valor = $4, marca = $5, observacao = $6, atualizado_em = NOW()`,
          [forn.cotacao_id, forn.id, r.item_cotacao_id, r.valor, r.marca, r.observacao],
        );
      }

      // Atualizar status fornecedor
      await pool.query(
        `UPDATE cotacao_fornecedores SET respondido = true, respondido_em = NOW() WHERE id = $1`, [forn.id],
      );

      if (dados_fornecedor) {
        const sets: string[] = [];
        const params: unknown[] = [];
        if (dados_fornecedor.nome) { params.push(dados_fornecedor.nome); sets.push(`nome = $${params.length}`); }
        if (dados_fornecedor.telefone) { params.push(dados_fornecedor.telefone); sets.push(`telefone = $${params.length}`); }
        if (sets.length > 0) {
          params.push(forn.id);
          await pool.query(`UPDATE cotacao_fornecedores SET ${sets.join(", ")} WHERE id = $${params.length}`, params);
        }
      }

      reply.send({ ok: true });
    } catch (e) { tratarErro(e, reply); }
  });
}
