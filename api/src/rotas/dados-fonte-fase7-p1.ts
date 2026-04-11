import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { exigirServidor } from "../middleware/autorizacao.js";
import { tratarErro } from "../utils/erros.js";

// ╔══════════════════════════════════════════════════════╗
// ║  7.2 — BPS Saúde Ampliado                           ║
// ╚══════════════════════════════════════════════════════╝

export async function rotasDadosFonteBPSSaude(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  app.get("/api/dados-fonte-bps-saude", async (req, reply) => {
    try {
      const { termo, tipoItem, uf, limite } = req.query as {
        termo?: string; tipoItem?: string; uf?: string; limite?: string;
      };
      const params: unknown[] = [];
      let where = "1=1";
      if (termo) { params.push(`%${termo}%`); where += ` AND descricao ILIKE $${params.length}`; }
      if (tipoItem) { params.push(tipoItem); where += ` AND tipo_item = $${params.length}`; }
      if (uf) { params.push(uf); where += ` AND uf = $${params.length}`; }
      const lim = Math.min(parseInt(limite ?? "50") || 50, 200);
      params.push(lim);

      const { rows } = await getPool().query(
        `SELECT * FROM dados_fonte_bps_saude WHERE ${where} ORDER BY criado_em DESC LIMIT $${params.length}`,
        params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  app.post("/api/dados-fonte-bps-saude", async (req, reply) => {
    try {
      const items = Array.isArray(req.body) ? req.body : (req.body as any).items ?? [];
      if (!items.length) return reply.send({ inserted: 0 });

      const valores: unknown[] = [];
      const placeholders: string[] = [];
      let idx = 1;
      for (const it of items) {
        placeholders.push(`($${idx},$${idx+1},$${idx+2},$${idx+3},$${idx+4},$${idx+5},$${idx+6},$${idx+7},$${idx+8},$${idx+9})`);
        valores.push(
          it.codigo_br_saude, it.descricao, it.tipo_item ?? "equipamento",
          it.fabricante, it.modelo, it.unidade, it.preco_unitario,
          it.quantidade, it.orgao_comprador, it.uf,
        );
        idx += 10;
      }

      const { rowCount } = await getPool().query(
        `INSERT INTO dados_fonte_bps_saude (codigo_br_saude, descricao, tipo_item,
         fabricante, modelo, unidade, preco_unitario, quantidade, orgao_comprador, uf)
         VALUES ${placeholders.join(",")}
         ON CONFLICT DO NOTHING`,
        valores,
      );
      reply.send({ inserted: rowCount });
    } catch (e) { tratarErro(e, reply); }
  });
}

// ╔══════════════════════════════════════════════════════╗
// ║  7.3 — SIGTAP/SUS — Procedimentos                  ║
// ╚══════════════════════════════════════════════════════╝

export async function rotasDadosFonteSIGTAP(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  app.get("/api/dados-fonte-sigtap", async (req, reply) => {
    try {
      const { termo, codigo, complexidade, limite } = req.query as {
        termo?: string; codigo?: string; complexidade?: string; limite?: string;
      };
      const params: unknown[] = [];
      let where = "1=1";
      if (termo) { params.push(`%${termo}%`); where += ` AND nome_procedimento ILIKE $${params.length}`; }
      if (codigo) { params.push(codigo); where += ` AND codigo_procedimento = $${params.length}`; }
      if (complexidade) { params.push(complexidade); where += ` AND complexidade = $${params.length}`; }
      const lim = Math.min(parseInt(limite ?? "50") || 50, 200);
      params.push(lim);

      const { rows } = await getPool().query(
        `SELECT * FROM dados_fonte_sigtap WHERE ${where} ORDER BY criado_em DESC LIMIT $${params.length}`,
        params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  app.post("/api/dados-fonte-sigtap", async (req, reply) => {
    try {
      const items = Array.isArray(req.body) ? req.body : (req.body as any).items ?? [];
      if (!items.length) return reply.send({ inserted: 0 });

      const valores: unknown[] = [];
      const placeholders: string[] = [];
      let idx = 1;
      for (const it of items) {
        placeholders.push(`($${idx},$${idx+1},$${idx+2},$${idx+3},$${idx+4},$${idx+5},$${idx+6},$${idx+7},$${idx+8})`);
        valores.push(
          it.codigo_procedimento, it.nome_procedimento, it.grupo,
          it.subgrupo, it.forma_organizacao, it.complexidade,
          it.valor_ambulatorial, it.valor_hospitalar, it.competencia,
        );
        idx += 9;
      }

      const { rowCount } = await getPool().query(
        `INSERT INTO dados_fonte_sigtap (codigo_procedimento, nome_procedimento, grupo,
         subgrupo, forma_organizacao, complexidade, valor_ambulatorial, valor_hospitalar, competencia)
         VALUES ${placeholders.join(",")}
         ON CONFLICT (codigo_procedimento, competencia) DO NOTHING`,
        valores,
      );
      reply.send({ inserted: rowCount });
    } catch (e) { tratarErro(e, reply); }
  });
}

// ╔══════════════════════════════════════════════════════╗
// ║  7.6 — CEASA Nacional (Multi-Estado)                ║
// ╚══════════════════════════════════════════════════════╝

export async function rotasDadosFonteCEASANacional(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  app.get("/api/dados-fonte-ceasa-nacional", async (req, reply) => {
    try {
      const { termo, uf, ceasaOrigem, limite } = req.query as {
        termo?: string; uf?: string; ceasaOrigem?: string; limite?: string;
      };
      const params: unknown[] = [];
      let where = "1=1";
      if (termo) { params.push(`%${termo}%`); where += ` AND produto ILIKE $${params.length}`; }
      if (uf) { params.push(uf); where += ` AND uf = $${params.length}`; }
      if (ceasaOrigem) { params.push(ceasaOrigem); where += ` AND ceasa_origem = $${params.length}`; }
      const lim = Math.min(parseInt(limite ?? "50") || 50, 200);
      params.push(lim);

      const { rows } = await getPool().query(
        `SELECT * FROM dados_fonte_ceasa_nacional WHERE ${where} ORDER BY data_cotacao DESC LIMIT $${params.length}`,
        params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  app.post("/api/dados-fonte-ceasa-nacional", async (req, reply) => {
    try {
      const items = Array.isArray(req.body) ? req.body : (req.body as any).items ?? [];
      if (!items.length) return reply.send({ inserted: 0 });

      const valores: unknown[] = [];
      const placeholders: string[] = [];
      let idx = 1;
      for (const it of items) {
        placeholders.push(`($${idx},$${idx+1},$${idx+2},$${idx+3},$${idx+4},$${idx+5},$${idx+6},$${idx+7},$${idx+8})`);
        valores.push(
          it.produto, it.variedade, it.unidade,
          it.preco_minimo, it.preco_maximo, it.preco_comum,
          it.ceasa_origem, it.uf, it.data_cotacao,
        );
        idx += 9;
      }

      const { rowCount } = await getPool().query(
        `INSERT INTO dados_fonte_ceasa_nacional (produto, variedade, unidade,
         preco_minimo, preco_maximo, preco_comum, ceasa_origem, uf, data_cotacao)
         VALUES ${placeholders.join(",")}
         ON CONFLICT DO NOTHING`,
        valores,
      );
      reply.send({ inserted: rowCount });
    } catch (e) { tratarErro(e, reply); }
  });
}

// ╔══════════════════════════════════════════════════════╗
// ║  7.8 — Tabela FIPE — Veículos                      ║
// ╚══════════════════════════════════════════════════════╝

export async function rotasDadosFonteFIPE(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  app.get("/api/dados-fonte-fipe", async (req, reply) => {
    try {
      const { termo, tipoVeiculo, marca, limite } = req.query as {
        termo?: string; tipoVeiculo?: string; marca?: string; limite?: string;
      };
      const params: unknown[] = [];
      let where = "1=1";
      if (termo) { params.push(`%${termo}%`); where += ` AND modelo ILIKE $${params.length}`; }
      if (tipoVeiculo) { params.push(tipoVeiculo); where += ` AND tipo_veiculo = $${params.length}`; }
      if (marca) { params.push(`%${marca}%`); where += ` AND marca ILIKE $${params.length}`; }
      const lim = Math.min(parseInt(limite ?? "50") || 50, 200);
      params.push(lim);

      const { rows } = await getPool().query(
        `SELECT * FROM dados_fonte_fipe WHERE ${where} ORDER BY criado_em DESC LIMIT $${params.length}`,
        params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  app.post("/api/dados-fonte-fipe", async (req, reply) => {
    try {
      const items = Array.isArray(req.body) ? req.body : (req.body as any).items ?? [];
      if (!items.length) return reply.send({ inserted: 0 });

      const valores: unknown[] = [];
      const placeholders: string[] = [];
      let idx = 1;
      for (const it of items) {
        placeholders.push(`($${idx},$${idx+1},$${idx+2},$${idx+3},$${idx+4},$${idx+5},$${idx+6},$${idx+7})`);
        valores.push(
          it.codigo_fipe, it.tipo_veiculo, it.marca, it.modelo,
          it.ano_modelo, it.combustivel, it.valor, it.mes_referencia,
        );
        idx += 8;
      }

      const { rowCount } = await getPool().query(
        `INSERT INTO dados_fonte_fipe (codigo_fipe, tipo_veiculo, marca, modelo,
         ano_modelo, combustivel, valor, mes_referencia)
         VALUES ${placeholders.join(",")}
         ON CONFLICT (codigo_fipe, mes_referencia) DO NOTHING`,
        valores,
      );
      reply.send({ inserted: rowCount });
    } catch (e) { tratarErro(e, reply); }
  });
}

// ╔══════════════════════════════════════════════════════╗
// ║  7.10 — SIASG/DW — Dados Agregados                 ║
// ╚══════════════════════════════════════════════════════╝

export async function rotasDadosFonteSIASG(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  app.get("/api/dados-fonte-siasg", async (req, reply) => {
    try {
      const { termo, codigoItem, limite } = req.query as {
        termo?: string; codigoItem?: string; limite?: string;
      };
      const params: unknown[] = [];
      let where = "1=1";
      if (termo) { params.push(`%${termo}%`); where += ` AND descricao ILIKE $${params.length}`; }
      if (codigoItem) { params.push(codigoItem); where += ` AND codigo_item = $${params.length}`; }
      const lim = Math.min(parseInt(limite ?? "50") || 50, 200);
      params.push(lim);

      const { rows } = await getPool().query(
        `SELECT * FROM dados_fonte_siasg WHERE ${where} ORDER BY criado_em DESC LIMIT $${params.length}`,
        params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  app.post("/api/dados-fonte-siasg", async (req, reply) => {
    try {
      const items = Array.isArray(req.body) ? req.body : (req.body as any).items ?? [];
      if (!items.length) return reply.send({ inserted: 0 });

      const valores: unknown[] = [];
      const placeholders: string[] = [];
      let idx = 1;
      for (const it of items) {
        placeholders.push(`($${idx},$${idx+1},$${idx+2},$${idx+3},$${idx+4},$${idx+5},$${idx+6},$${idx+7},$${idx+8},$${idx+9})`);
        valores.push(
          it.codigo_item, it.descricao, it.unidade,
          it.preco_medio, it.preco_minimo, it.preco_maximo,
          it.desvio_padrao, it.quantidade_compras, it.quantidade_orgaos,
          it.periodo_fim,
        );
        idx += 10;
      }

      const { rowCount } = await getPool().query(
        `INSERT INTO dados_fonte_siasg (codigo_item, descricao, unidade,
         preco_medio, preco_minimo, preco_maximo, desvio_padrao,
         quantidade_compras, quantidade_orgaos, periodo_fim)
         VALUES ${placeholders.join(",")}
         ON CONFLICT DO NOTHING`,
        valores,
      );
      reply.send({ inserted: rowCount });
    } catch (e) { tratarErro(e, reply); }
  });
}

// ╔══════════════════════════════════════════════════════╗
// ║  7.14 — TCU e-Preços — Estimativas                 ║
// ╚══════════════════════════════════════════════════════╝

export async function rotasDadosFonteTCU(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  app.get("/api/dados-fonte-tcu", async (req, reply) => {
    try {
      const { termo, limite } = req.query as { termo?: string; limite?: string; };
      const params: unknown[] = [];
      let where = "1=1";
      if (termo) { params.push(`%${termo}%`); where += ` AND descricao ILIKE $${params.length}`; }
      const lim = Math.min(parseInt(limite ?? "50") || 50, 200);
      params.push(lim);

      const { rows } = await getPool().query(
        `SELECT * FROM dados_fonte_tcu WHERE ${where} ORDER BY criado_em DESC LIMIT $${params.length}`,
        params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  app.post("/api/dados-fonte-tcu", async (req, reply) => {
    try {
      const items = Array.isArray(req.body) ? req.body : (req.body as any).items ?? [];
      if (!items.length) return reply.send({ inserted: 0 });

      const valores: unknown[] = [];
      const placeholders: string[] = [];
      let idx = 1;
      for (const it of items) {
        placeholders.push(`($${idx},$${idx+1},$${idx+2},$${idx+3},$${idx+4},$${idx+5},$${idx+6},$${idx+7},$${idx+8})`);
        valores.push(
          it.descricao, it.unidade, it.mediana,
          it.quartil_1, it.quartil_3, it.preco_minimo,
          it.preco_maximo, it.quantidade_amostras, it.periodo_referencia,
        );
        idx += 9;
      }

      const { rowCount } = await getPool().query(
        `INSERT INTO dados_fonte_tcu (descricao, unidade, mediana,
         quartil_1, quartil_3, preco_minimo, preco_maximo,
         quantidade_amostras, periodo_referencia)
         VALUES ${placeholders.join(",")}
         ON CONFLICT DO NOTHING`,
        valores,
      );
      reply.send({ inserted: rowCount });
    } catch (e) { tratarErro(e, reply); }
  });
}
