import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { exigirServidor } from "../middleware/autorizacao.js";
import { tratarErro } from "../utils/erros.js";

// ╔══════════════════════════════════════════════════════╗
// ║  Dados Fonte BPS — Banco de Preços em Saúde         ║
// ╚══════════════════════════════════════════════════════╝

export async function rotasDadosFonteBPS(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  app.get("/api/dados-fonte-bps", async (req, reply) => {
    try {
      const { codigo_br, termo, uf, data_inicio, data_fim, limite } = req.query as {
        codigo_br?: string; termo?: string; uf?: string;
        data_inicio?: string; data_fim?: string; limite?: string;
      };
      const params: unknown[] = [];
      let where = "1=1";
      if (codigo_br) { params.push(codigo_br); where += ` AND codigo_br = $${params.length}`; }
      if (termo) { params.push(`%${termo}%`); where += ` AND descricao_item ILIKE $${params.length}`; }
      if (uf) { params.push(uf); where += ` AND uf = $${params.length}`; }
      if (data_inicio) { params.push(data_inicio); where += ` AND data_compra >= $${params.length}`; }
      if (data_fim) { params.push(data_fim); where += ` AND data_compra <= $${params.length}`; }
      const lim = Math.min(parseInt(limite ?? "50") || 50, 200);
      params.push(lim);

      const { rows } = await getPool().query(
        `SELECT * FROM dados_fonte_bps WHERE ${where} ORDER BY criado_em DESC LIMIT $${params.length}`,
        params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  app.post("/api/dados-fonte-bps", async (req, reply) => {
    try {
      const { items } = req.body as { items: any[] };
      if (!items?.length) return reply.send({ inserted: 0 });

      const valores: unknown[] = [];
      const placeholders: string[] = [];
      let idx = 1;
      for (const it of items) {
        placeholders.push(`($${idx},$${idx+1},$${idx+2},$${idx+3},$${idx+4},$${idx+5},$${idx+6},$${idx+7},$${idx+8},$${idx+9})`);
        valores.push(
          it.codigo_br, it.descricao_item, it.apresentacao, it.unidade,
          it.valor_unitario, it.quantidade, it.instituicao, it.uf,
          it.data_compra, it.modalidade,
        );
        idx += 10;
      }

      const { rowCount } = await getPool().query(
        `INSERT INTO dados_fonte_bps (codigo_br, descricao_item, apresentacao, unidade,
         valor_unitario, quantidade, instituicao, uf, data_compra, modalidade)
         VALUES ${placeholders.join(",")}
         ON CONFLICT DO NOTHING`,
        valores,
      );
      reply.status(201).send({ inserted: rowCount });
    } catch (e) { tratarErro(e, reply); }
  });
}

// ╔══════════════════════════════════════════════════════╗
// ║  Dados Fonte SINAPI                                 ║
// ╚══════════════════════════════════════════════════════╝

export async function rotasDadosFonteSINAPI(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  app.get("/api/dados-fonte-sinapi", async (req, reply) => {
    try {
      const { codigo_sinapi, termo, uf, mes_referencia, tipo, desonerado, limite } = req.query as {
        codigo_sinapi?: string; termo?: string; uf?: string; mes_referencia?: string;
        tipo?: string; desonerado?: string; limite?: string;
      };
      const params: unknown[] = [];
      let where = "1=1";
      if (codigo_sinapi) { params.push(codigo_sinapi); where += ` AND codigo_sinapi = $${params.length}`; }
      if (termo) { params.push(`%${termo}%`); where += ` AND descricao_item ILIKE $${params.length}`; }
      if (uf) { params.push(uf); where += ` AND uf = $${params.length}`; }
      if (mes_referencia) { params.push(mes_referencia); where += ` AND mes_referencia = $${params.length}`; }
      if (tipo) { params.push(tipo); where += ` AND tipo = $${params.length}`; }
      if (desonerado !== undefined) { params.push(desonerado === "true"); where += ` AND desonerado = $${params.length}`; }
      const lim = Math.min(parseInt(limite ?? "50") || 50, 200);
      params.push(lim);

      const { rows } = await getPool().query(
        `SELECT * FROM dados_fonte_sinapi WHERE ${where} ORDER BY criado_em DESC LIMIT $${params.length}`,
        params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  app.post("/api/dados-fonte-sinapi", async (req, reply) => {
    try {
      const { items } = req.body as { items: any[] };
      if (!items?.length) return reply.send({ inserted: 0 });

      const valores: unknown[] = [];
      const placeholders: string[] = [];
      let idx = 1;
      for (const it of items) {
        placeholders.push(`($${idx},$${idx+1},$${idx+2},$${idx+3},$${idx+4},$${idx+5},$${idx+6},$${idx+7})`);
        valores.push(
          it.codigo_sinapi, it.descricao_item, it.unidade, it.valor_unitario,
          it.uf, it.mes_referencia, it.tipo, it.desonerado ?? false,
        );
        idx += 8;
      }

      const { rowCount } = await getPool().query(
        `INSERT INTO dados_fonte_sinapi (codigo_sinapi, descricao_item, unidade, valor_unitario,
         uf, mes_referencia, tipo, desonerado)
         VALUES ${placeholders.join(",")}
         ON CONFLICT DO NOTHING`,
        valores,
      );
      reply.status(201).send({ inserted: rowCount });
    } catch (e) { tratarErro(e, reply); }
  });
}

// ╔══════════════════════════════════════════════════════╗
// ║  Dados Fonte CONAB                                  ║
// ╚══════════════════════════════════════════════════════╝

export async function rotasDadosFonteCONAB(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  app.get("/api/dados-fonte-conab", async (req, reply) => {
    try {
      const { termo, cidade, uf, data_inicio, data_fim, limite } = req.query as {
        termo?: string; cidade?: string; uf?: string;
        data_inicio?: string; data_fim?: string; limite?: string;
      };
      const params: unknown[] = [];
      let where = "1=1";
      if (termo) { params.push(`%${termo}%`); where += ` AND descricao_item ILIKE $${params.length}`; }
      if (cidade) { params.push(`%${cidade}%`); where += ` AND cidade ILIKE $${params.length}`; }
      if (uf) { params.push(uf); where += ` AND uf = $${params.length}`; }
      if (data_inicio) { params.push(data_inicio); where += ` AND data_referencia >= $${params.length}`; }
      if (data_fim) { params.push(data_fim); where += ` AND data_referencia <= $${params.length}`; }
      const lim = Math.min(parseInt(limite ?? "50") || 50, 200);
      params.push(lim);

      const { rows } = await getPool().query(
        `SELECT * FROM dados_fonte_conab WHERE ${where} ORDER BY criado_em DESC LIMIT $${params.length}`,
        params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  app.post("/api/dados-fonte-conab", async (req, reply) => {
    try {
      const { items } = req.body as { items: any[] };
      if (!items?.length) return reply.send({ inserted: 0 });

      const valores: unknown[] = [];
      const placeholders: string[] = [];
      let idx = 1;
      for (const it of items) {
        placeholders.push(`($${idx},$${idx+1},$${idx+2},$${idx+3},$${idx+4},$${idx+5},$${idx+6})`);
        valores.push(
          it.descricao_item, it.unidade, it.valor_unitario,
          it.cidade, it.uf, it.data_referencia, it.tipo_produto,
        );
        idx += 7;
      }

      const { rowCount } = await getPool().query(
        `INSERT INTO dados_fonte_conab (descricao_item, unidade, valor_unitario, cidade, uf, data_referencia, tipo_produto)
         VALUES ${placeholders.join(",")}
         ON CONFLICT DO NOTHING`,
        valores,
      );
      reply.status(201).send({ inserted: rowCount });
    } catch (e) { tratarErro(e, reply); }
  });
}

// ╔══════════════════════════════════════════════════════╗
// ║  Dados Fonte CEASA                                  ║
// ╚══════════════════════════════════════════════════════╝

export async function rotasDadosFonteCEASA(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  app.get("/api/dados-fonte-ceasa", async (req, reply) => {
    try {
      const { termo, variedade, data_inicio, data_fim, limite } = req.query as {
        termo?: string; variedade?: string;
        data_inicio?: string; data_fim?: string; limite?: string;
      };
      const params: unknown[] = [];
      let where = "1=1";
      if (termo) { params.push(`%${termo}%`); where += ` AND descricao_item ILIKE $${params.length}`; }
      if (variedade) { params.push(`%${variedade}%`); where += ` AND variedade ILIKE $${params.length}`; }
      if (data_inicio) { params.push(data_inicio); where += ` AND data_cotacao >= $${params.length}`; }
      if (data_fim) { params.push(data_fim); where += ` AND data_cotacao <= $${params.length}`; }
      const lim = Math.min(parseInt(limite ?? "50") || 50, 200);
      params.push(lim);

      const { rows } = await getPool().query(
        `SELECT * FROM dados_fonte_ceasa WHERE ${where} ORDER BY criado_em DESC LIMIT $${params.length}`,
        params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  app.post("/api/dados-fonte-ceasa", async (req, reply) => {
    try {
      const { items } = req.body as { items: any[] };
      if (!items?.length) return reply.send({ inserted: 0 });

      const valores: unknown[] = [];
      const placeholders: string[] = [];
      let idx = 1;
      for (const it of items) {
        placeholders.push(`($${idx},$${idx+1},$${idx+2},$${idx+3},$${idx+4},$${idx+5},$${idx+6},$${idx+7})`);
        valores.push(
          it.descricao_item, it.variedade, it.unidade,
          it.valor_minimo, it.valor_maximo, it.valor_comum,
          it.data_cotacao, it.turno,
        );
        idx += 8;
      }

      const { rowCount } = await getPool().query(
        `INSERT INTO dados_fonte_ceasa (descricao_item, variedade, unidade, valor_minimo, valor_maximo, valor_comum, data_cotacao, turno)
         VALUES ${placeholders.join(",")}
         ON CONFLICT DO NOTHING`,
        valores,
      );
      reply.status(201).send({ inserted: rowCount });
    } catch (e) { tratarErro(e, reply); }
  });
}

// ╔══════════════════════════════════════════════════════╗
// ║  Dados Fonte CMED/ANVISA                            ║
// ╚══════════════════════════════════════════════════════╝

export async function rotasDadosFonteCMED(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  app.get("/api/dados-fonte-cmed", async (req, reply) => {
    try {
      const { registro_anvisa, principio_ativo, termo, laboratorio, limite } = req.query as {
        registro_anvisa?: string; principio_ativo?: string; termo?: string;
        laboratorio?: string; limite?: string;
      };
      const params: unknown[] = [];
      let where = "1=1";
      if (registro_anvisa) { params.push(registro_anvisa); where += ` AND registro_anvisa = $${params.length}`; }
      if (principio_ativo) { params.push(`%${principio_ativo}%`); where += ` AND principio_ativo ILIKE $${params.length}`; }
      if (termo) { params.push(`%${termo}%`); where += ` AND descricao_produto ILIKE $${params.length}`; }
      if (laboratorio) { params.push(`%${laboratorio}%`); where += ` AND laboratorio ILIKE $${params.length}`; }
      const lim = Math.min(parseInt(limite ?? "50") || 50, 200);
      params.push(lim);

      const { rows } = await getPool().query(
        `SELECT * FROM dados_fonte_cmed WHERE ${where} ORDER BY criado_em DESC LIMIT $${params.length}`,
        params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  app.post("/api/dados-fonte-cmed", async (req, reply) => {
    try {
      const { items } = req.body as { items: any[] };
      if (!items?.length) return reply.send({ inserted: 0 });

      const valores: unknown[] = [];
      const placeholders: string[] = [];
      let idx = 1;
      for (const it of items) {
        placeholders.push(`($${idx},$${idx+1},$${idx+2},$${idx+3},$${idx+4},$${idx+5},$${idx+6},$${idx+7},$${idx+8},$${idx+9},$${idx+10},$${idx+11},$${idx+12})`);
        valores.push(
          it.registro_anvisa, it.principio_ativo, it.descricao_produto, it.apresentacao,
          it.laboratorio, it.ean, it.pmvg_sem_impostos, it.pmvg_com_impostos,
          it.pmc, it.icms_0, it.lista_concessao, it.tipo_produto, it.regime_preco,
        );
        idx += 13;
      }

      const { rowCount } = await getPool().query(
        `INSERT INTO dados_fonte_cmed (registro_anvisa, principio_ativo, descricao_produto, apresentacao,
         laboratorio, ean, pmvg_sem_impostos, pmvg_com_impostos, pmc, icms_0, lista_concessao, tipo_produto, regime_preco)
         VALUES ${placeholders.join(",")}
         ON CONFLICT DO NOTHING`,
        valores,
      );
      reply.status(201).send({ inserted: rowCount });
    } catch (e) { tratarErro(e, reply); }
  });
}
