import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { exigirServidor } from "../middleware/autorizacao.js";
import { tratarErro } from "../utils/erros.js";

export async function rotasCidades(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  app.get("/api/cidades-regiao", async (req, reply) => {
    try {
      const municipioId = req.usuario!.servidor!.municipio_id;
      const { rows } = await getPool().query(
        `SELECT * FROM cidades_regiao WHERE municipio_id = $1 AND ativo = true ORDER BY nome`,
        [municipioId],
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  app.post("/api/cidades-regiao", async (req, reply) => {
    try {
      const b = req.body as { nome: string; uf: string; codigo_ibge?: string; municipio_id: string };
      const { rows } = await getPool().query(
        `INSERT INTO cidades_regiao (nome, uf, codigo_ibge, municipio_id) VALUES ($1,$2,$3,$4) RETURNING *`,
        [b.nome, b.uf, b.codigo_ibge, b.municipio_id],
      );
      reply.status(201).send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  app.delete("/api/cidades-regiao/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      await getPool().query(`UPDATE cidades_regiao SET ativo = false WHERE id = $1`, [id]);
      reply.status(204).send();
    } catch (e) { tratarErro(e, reply); }
  });
}

export async function rotasSolicitacoesCatalogo(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  app.get("/api/solicitacoes-catalogo", async (req, reply) => {
    try {
      const { status, servidor_id } = req.query as { status?: string; servidor_id?: string };
      const params: unknown[] = [];
      let where = `1=1`;
      if (status) { params.push(status); where += ` AND sc.status = $${params.length}`; }
      if (servidor_id) { params.push(servidor_id); where += ` AND sc.solicitante_id = $${params.length}`; }
      const { rows } = await getPool().query(
        `SELECT sc.*, srv.nome AS solicitante_nome, cat.nome AS categoria_nome, um.sigla AS unidade_sigla
         FROM solicitacoes_catalogo sc
         LEFT JOIN servidores srv ON sc.solicitante_id = srv.id
         LEFT JOIN categorias cat ON sc.categoria_id = cat.id
         LEFT JOIN unidades_medida um ON sc.unidade_medida_id = um.id
         WHERE ${where} ORDER BY sc.criado_em DESC`,
        params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  app.post("/api/solicitacoes-catalogo", async (req, reply) => {
    try {
      const b = req.body as {
        descricao: string; justificativa: string; solicitante_id: string;
        categoria_id?: string; unidade_medida_id?: string; especificacao?: string;
      };
      const { rows } = await getPool().query(
        `INSERT INTO solicitacoes_catalogo (descricao, justificativa, solicitante_id, categoria_id, unidade_medida_id, especificacao)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [b.descricao, b.justificativa, b.solicitante_id, b.categoria_id, b.unidade_medida_id, b.especificacao],
      );
      reply.status(201).send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  app.put("/api/solicitacoes-catalogo/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const { status, respondido_por, produto_criado_id, justificativa_recusa } = req.body as {
        status: string; respondido_por: string; produto_criado_id?: string; justificativa_recusa?: string;
      };
      const { rows } = await getPool().query(
        `UPDATE solicitacoes_catalogo SET status = $1, respondido_por = $2,
         produto_criado_id = $3, justificativa_recusa = $4, respondido_em = NOW()
         WHERE id = $5 RETURNING *`,
        [status, respondido_por, produto_criado_id, justificativa_recusa, id],
      );
      reply.send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });
}

export async function rotasAssinaturasEletronicas(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  app.post("/api/assinaturas-eletronicas", async (req, reply) => {
    try {
      const b = req.body as {
        referencia_tipo: string; referencia_id: string;
        servidor_id: string; hash_documento: string; ip_address?: string;
      };
      const { rows } = await getPool().query(
        `INSERT INTO assinaturas_eletronicas (referencia_tipo, referencia_id, servidor_id, hash_documento, ip_address)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [b.referencia_tipo, b.referencia_id, b.servidor_id, b.hash_documento, req.ip],
      );
      reply.status(201).send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  app.get("/api/assinaturas-eletronicas", async (req, reply) => {
    try {
      const { referencia_tipo, referencia_id } = req.query as { referencia_tipo: string; referencia_id: string };
      const { rows } = await getPool().query(
        `SELECT ae.*, srv.nome AS servidor_nome
         FROM assinaturas_eletronicas ae
         LEFT JOIN servidores srv ON ae.servidor_id = srv.id
         WHERE ae.referencia_tipo = $1 AND ae.referencia_id = $2
         ORDER BY ae.criado_em`,
        [referencia_tipo, referencia_id],
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });
}

export async function rotasMetricasUso(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  app.get("/api/metricas-uso", async (req, reply) => {
    try {
      const { municipio_id } = req.query as { municipio_id?: string };
      const params: unknown[] = [];
      let where = `1=1`;
      if (municipio_id) { params.push(municipio_id); where += ` AND municipio_id = $${params.length}`; }
      const { rows } = await getPool().query(
        `SELECT * FROM metricas_uso_municipio WHERE ${where}`, params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  app.post("/api/metricas-uso/atualizar", async (req, reply) => {
    try {
      const { municipio_id } = req.body as { municipio_id: string };
      await getPool().query(`SELECT fn_atualizar_metricas_uso($1)`, [municipio_id]);
      reply.send({ ok: true });
    } catch (e) { tratarErro(e, reply); }
  });
}

export async function rotasMapaCalor(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  app.get("/api/mapa-calor/:produtoId", async (req, reply) => {
    try {
      const { produtoId } = req.params as { produtoId: string };
      const { rows } = await getPool().query(
        `SELECT pi.uf, pi.municipio_nome, AVG(pi.valor) AS preco_medio, COUNT(*) AS total_precos
         FROM precos_item pi
         JOIN itens_cesta ic ON pi.item_cesta_id = ic.id
         WHERE ic.produto_id = $1 AND pi.uf IS NOT NULL
         GROUP BY pi.uf, pi.municipio_nome
         ORDER BY pi.uf, preco_medio`,
        [produtoId],
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });
}
