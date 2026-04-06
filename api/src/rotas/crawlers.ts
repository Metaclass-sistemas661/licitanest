import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { exigirServidor } from "../middleware/autorizacao.js";
import { tratarErro } from "../utils/erros.js";

// ╔══════════════════════════════════════════════════════╗
// ║  Execuções de Crawler                               ║
// ╚══════════════════════════════════════════════════════╝

export async function rotasExecucoesCrawler(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  // POST /api/execucoes-crawler — registrar início
  app.post("/api/execucoes-crawler", async (req, reply) => {
    try {
      const b = req.body as {
        fonte_id: string; status: string;
        itens_processados: number; itens_novos: number; itens_atualizados: number;
        iniciado_em: string;
      };
      const { rows } = await getPool().query(
        `INSERT INTO execucoes_crawler (fonte_id, status, itens_processados, itens_novos, itens_atualizados, iniciado_em)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [b.fonte_id, b.status, b.itens_processados, b.itens_novos, b.itens_atualizados, b.iniciado_em],
      );
      reply.status(201).send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/execucoes-crawler — listar
  app.get("/api/execucoes-crawler", async (req, reply) => {
    try {
      const { fonte_id, limite } = req.query as { fonte_id?: string; limite?: string };
      const params: unknown[] = [];
      let where = "1=1";
      if (fonte_id) { params.push(fonte_id); where += ` AND fonte_id = $${params.length}`; }
      const lim = Math.min(parseInt(limite ?? "20") || 20, 100);
      params.push(lim);

      const { rows } = await getPool().query(
        `SELECT * FROM execucoes_crawler WHERE ${where} ORDER BY iniciado_em DESC LIMIT $${params.length}`,
        params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/execucoes-crawler/:id — detalhe
  app.get("/api/execucoes-crawler/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const { rows } = await getPool().query(`SELECT * FROM execucoes_crawler WHERE id = $1`, [id]);
      if (!rows[0]) return reply.status(404).send({ error: "Execução não encontrada" });
      reply.send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // PUT /api/execucoes-crawler/:id — atualizar (finalizar)
  app.put("/api/execucoes-crawler/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const b = req.body as {
        status: string; itens_processados: number; itens_novos: number;
        itens_atualizados: number; erro_mensagem?: string;
        finalizado_em?: string; duracao_segundos?: number;
      };
      const { rows } = await getPool().query(
        `UPDATE execucoes_crawler SET status=$1, itens_processados=$2, itens_novos=$3,
         itens_atualizados=$4, erro_mensagem=$5, finalizado_em=$6, duracao_segundos=$7
         WHERE id=$8 RETURNING *`,
        [b.status, b.itens_processados, b.itens_novos, b.itens_atualizados,
         b.erro_mensagem ?? null, b.finalizado_em ?? null, b.duracao_segundos ?? null, id],
      );
      if (!rows[0]) return reply.status(404).send({ error: "Execução não encontrada" });
      reply.send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });
}

// ╔══════════════════════════════════════════════════════╗
// ║  Dados Fonte PNCP                                   ║
// ╚══════════════════════════════════════════════════════╝

export async function rotasDadosFontePNCP(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  app.get("/api/dados-fonte-pncp", async (req, reply) => {
    try {
      const { termo, uf, data_inicio, data_fim, limite } = req.query as {
        termo?: string; uf?: string; data_inicio?: string; data_fim?: string; limite?: string;
      };
      const params: unknown[] = [];
      let where = "1=1";
      if (termo) { params.push(`%${termo}%`); where += ` AND descricao_item ILIKE $${params.length}`; }
      if (uf) { params.push(uf); where += ` AND uf_orgao = $${params.length}`; }
      if (data_inicio) { params.push(data_inicio); where += ` AND data_homologacao >= $${params.length}`; }
      if (data_fim) { params.push(data_fim); where += ` AND data_homologacao <= $${params.length}`; }
      const lim = Math.min(parseInt(limite ?? "50") || 50, 200);
      params.push(lim);

      const { rows } = await getPool().query(
        `SELECT * FROM dados_fonte_pncp WHERE ${where} ORDER BY criado_em DESC LIMIT $${params.length}`,
        params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  app.post("/api/dados-fonte-pncp", async (req, reply) => {
    try {
      const { items } = req.body as { items: any[] };
      if (!items?.length) return reply.send({ data: [], inserted: 0 });

      const valores: unknown[] = [];
      const placeholders: string[] = [];
      let idx = 1;
      for (const it of items) {
        placeholders.push(`($${idx},$${idx+1},$${idx+2},$${idx+3},$${idx+4},$${idx+5},$${idx+6},$${idx+7},$${idx+8},$${idx+9},$${idx+10},$${idx+11},$${idx+12})`);
        valores.push(
          it.orgao, it.cnpj_orgao, it.uf_orgao, it.cidade_orgao, it.descricao_item,
          it.unidade, it.quantidade, it.valor_unitario, it.valor_total,
          it.data_homologacao, it.numero_contrato, it.modalidade, it.documento_url,
        );
        idx += 13;
      }

      const { rowCount } = await getPool().query(
        `INSERT INTO dados_fonte_pncp (orgao, cnpj_orgao, uf_orgao, cidade_orgao, descricao_item,
         unidade, quantidade, valor_unitario, valor_total, data_homologacao, numero_contrato, modalidade, documento_url)
         VALUES ${placeholders.join(",")}
         ON CONFLICT DO NOTHING`,
        valores,
      );
      reply.status(201).send({ inserted: rowCount });
    } catch (e) { tratarErro(e, reply); }
  });
}

// ╔══════════════════════════════════════════════════════╗
// ║  Dados Fonte Painel de Preços                       ║
// ╚══════════════════════════════════════════════════════╝

export async function rotasDadosFontePainel(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  app.get("/api/dados-fonte-painel", async (req, reply) => {
    try {
      const { termo, data_inicio, data_fim, limite } = req.query as {
        termo?: string; data_inicio?: string; data_fim?: string; limite?: string;
      };
      const params: unknown[] = [];
      let where = "1=1";
      if (termo) { params.push(`%${termo}%`); where += ` AND descricao_item ILIKE $${params.length}`; }
      if (data_inicio) { params.push(data_inicio); where += ` AND data_compra >= $${params.length}`; }
      if (data_fim) { params.push(data_fim); where += ` AND data_compra <= $${params.length}`; }
      const lim = Math.min(parseInt(limite ?? "50") || 50, 200);
      params.push(lim);

      const { rows } = await getPool().query(
        `SELECT * FROM dados_fonte_painel WHERE ${where} ORDER BY criado_em DESC LIMIT $${params.length}`,
        params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  app.post("/api/dados-fonte-painel", async (req, reply) => {
    try {
      const { items } = req.body as { items: any[] };
      if (!items?.length) return reply.send({ data: [], inserted: 0 });

      const valores: unknown[] = [];
      const placeholders: string[] = [];
      let idx = 1;
      for (const it of items) {
        placeholders.push(`($${idx},$${idx+1},$${idx+2},$${idx+3},$${idx+4},$${idx+5},$${idx+6})`);
        valores.push(
          it.orgao, it.descricao_item, it.unidade, it.valor_unitario,
          it.data_compra, it.modalidade, it.documento_url,
        );
        idx += 7;
      }

      const { rowCount } = await getPool().query(
        `INSERT INTO dados_fonte_painel (orgao, descricao_item, unidade, valor_unitario, data_compra, modalidade, documento_url)
         VALUES ${placeholders.join(",")}
         ON CONFLICT DO NOTHING`,
        valores,
      );
      reply.status(201).send({ inserted: rowCount });
    } catch (e) { tratarErro(e, reply); }
  });
}

// ╔══════════════════════════════════════════════════════╗
// ║  Dados Fonte TCE                                    ║
// ╚══════════════════════════════════════════════════════╝

export async function rotasDadosFonteTCE(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  app.get("/api/dados-fonte-tce", async (req, reply) => {
    try {
      const { termo, uf, municipio, data_inicio, data_fim, limite } = req.query as {
        termo?: string; uf?: string; municipio?: string;
        data_inicio?: string; data_fim?: string; limite?: string;
      };
      const params: unknown[] = [];
      let where = "1=1";
      if (termo) { params.push(`%${termo}%`); where += ` AND descricao_item ILIKE $${params.length}`; }
      if (uf) { params.push(uf); where += ` AND uf = $${params.length}`; }
      if (municipio) { params.push(`%${municipio}%`); where += ` AND municipio ILIKE $${params.length}`; }
      if (data_inicio) { params.push(data_inicio); where += ` AND data_contrato >= $${params.length}`; }
      if (data_fim) { params.push(data_fim); where += ` AND data_contrato <= $${params.length}`; }
      const lim = Math.min(parseInt(limite ?? "50") || 50, 200);
      params.push(lim);

      const { rows } = await getPool().query(
        `SELECT * FROM dados_fonte_tce WHERE ${where} ORDER BY criado_em DESC LIMIT $${params.length}`,
        params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  app.post("/api/dados-fonte-tce", async (req, reply) => {
    try {
      const { items } = req.body as { items: any[] };
      if (!items?.length) return reply.send({ data: [], inserted: 0 });

      const valores: unknown[] = [];
      const placeholders: string[] = [];
      let idx = 1;
      for (const it of items) {
        placeholders.push(`($${idx},$${idx+1},$${idx+2},$${idx+3},$${idx+4},$${idx+5},$${idx+6},$${idx+7},$${idx+8})`);
        valores.push(
          it.orgao, it.uf, it.municipio, it.descricao_item, it.unidade,
          it.valor_unitario, it.data_contrato, it.numero_contrato, it.fonte_tce,
        );
        idx += 9;
      }

      const { rowCount } = await getPool().query(
        `INSERT INTO dados_fonte_tce (orgao, uf, municipio, descricao_item, unidade, valor_unitario, data_contrato, numero_contrato, fonte_tce)
         VALUES ${placeholders.join(",")}
         ON CONFLICT DO NOTHING`,
        valores,
      );
      reply.status(201).send({ inserted: rowCount });
    } catch (e) { tratarErro(e, reply); }
  });
}
