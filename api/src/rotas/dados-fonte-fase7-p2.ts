import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { exigirServidor } from "../middleware/autorizacao.js";
import { tratarErro } from "../utils/erros.js";

// ╔══════════════════════════════════════════════════════╗
// ║  7.9 — CUB/SINDUSCON — Custo Unitário Básico        ║
// ╚══════════════════════════════════════════════════════╝

export async function rotasDadosFonteCUB(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  app.get("/api/dados-fonte-cub", async (req, reply) => {
    try {
      const { uf, padraoConstrutivo, mesReferencia, limite } = req.query as {
        uf?: string; padraoConstrutivo?: string; mesReferencia?: string; limite?: string;
      };
      const params: unknown[] = [];
      let where = "1=1";
      if (uf) { params.push(uf); where += ` AND uf = $${params.length}`; }
      if (padraoConstrutivo) { params.push(padraoConstrutivo); where += ` AND padrao_construtivo = $${params.length}`; }
      if (mesReferencia) { params.push(mesReferencia); where += ` AND mes_referencia = $${params.length}`; }
      const lim = Math.min(parseInt(limite ?? "50") || 50, 200);
      params.push(lim);

      const { rows } = await getPool().query(
        `SELECT * FROM dados_fonte_cub WHERE ${where} ORDER BY mes_referencia DESC LIMIT $${params.length}`,
        params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  app.post("/api/dados-fonte-cub", async (req, reply) => {
    try {
      const items = Array.isArray(req.body) ? req.body : (req.body as any).items ?? [];
      if (!items.length) return reply.send({ inserted: 0 });

      const valores: unknown[] = [];
      const placeholders: string[] = [];
      let idx = 1;
      for (const it of items) {
        placeholders.push(`($${idx},$${idx+1},$${idx+2},$${idx+3},$${idx+4})`);
        valores.push(it.uf, it.padrao_construtivo, it.tipo_custo ?? "total", it.valor_m2, it.mes_referencia);
        idx += 5;
      }

      const { rowCount } = await getPool().query(
        `INSERT INTO dados_fonte_cub (uf, padrao_construtivo, tipo_custo, valor_m2, mes_referencia)
         VALUES ${placeholders.join(",")}
         ON CONFLICT (uf, padrao_construtivo, tipo_custo, mes_referencia) DO NOTHING`,
        valores,
      );
      reply.send({ inserted: rowCount });
    } catch (e) { tratarErro(e, reply); }
  });
}

// ╔══════════════════════════════════════════════════════╗
// ║  7.12 — BNDES — Cartão BNDES Credenciados           ║
// ╚══════════════════════════════════════════════════════╝

export async function rotasDadosFonteBNDES(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  app.get("/api/dados-fonte-bndes", async (req, reply) => {
    try {
      const { termo, categoria, limite } = req.query as {
        termo?: string; categoria?: string; limite?: string;
      };
      const params: unknown[] = [];
      let where = "1=1";
      if (termo) { params.push(`%${termo}%`); where += ` AND descricao ILIKE $${params.length}`; }
      if (categoria) { params.push(`%${categoria}%`); where += ` AND categoria ILIKE $${params.length}`; }
      const lim = Math.min(parseInt(limite ?? "50") || 50, 200);
      params.push(lim);

      const { rows } = await getPool().query(
        `SELECT * FROM dados_fonte_bndes WHERE ${where} ORDER BY criado_em DESC LIMIT $${params.length}`,
        params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  app.post("/api/dados-fonte-bndes", async (req, reply) => {
    try {
      const items = Array.isArray(req.body) ? req.body : (req.body as any).items ?? [];
      if (!items.length) return reply.send({ inserted: 0 });

      const valores: unknown[] = [];
      const placeholders: string[] = [];
      let idx = 1;
      for (const it of items) {
        placeholders.push(`($${idx},$${idx+1},$${idx+2},$${idx+3},$${idx+4},$${idx+5},$${idx+6})`);
        valores.push(
          it.codigo_produto, it.descricao, it.categoria,
          it.fabricante, it.fornecedor, it.preco, it.condicao_pagamento,
        );
        idx += 7;
      }

      const { rowCount } = await getPool().query(
        `INSERT INTO dados_fonte_bndes (codigo_produto, descricao, categoria,
         fabricante, fornecedor, preco, condicao_pagamento)
         VALUES ${placeholders.join(",")}
         ON CONFLICT DO NOTHING`,
        valores,
      );
      reply.send({ inserted: rowCount });
    } catch (e) { tratarErro(e, reply); }
  });
}

// ╔══════════════════════════════════════════════════════╗
// ║  7.13 — SIA/SIH-SUS — Ambulatório e Internações     ║
// ╚══════════════════════════════════════════════════════╝

export async function rotasDadosFonteSIASIH(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  app.get("/api/dados-fonte-sia-sih", async (req, reply) => {
    try {
      const { termo, tipoRegistro, uf, complexidade, limite } = req.query as {
        termo?: string; tipoRegistro?: string; uf?: string; complexidade?: string; limite?: string;
      };
      const params: unknown[] = [];
      let where = "1=1";
      if (termo) { params.push(`%${termo}%`); where += ` AND nome_procedimento ILIKE $${params.length}`; }
      if (tipoRegistro) { params.push(tipoRegistro); where += ` AND tipo_registro = $${params.length}`; }
      if (uf) { params.push(uf); where += ` AND uf = $${params.length}`; }
      if (complexidade) { params.push(complexidade); where += ` AND complexidade = $${params.length}`; }
      const lim = Math.min(parseInt(limite ?? "50") || 50, 200);
      params.push(lim);

      const { rows } = await getPool().query(
        `SELECT * FROM dados_fonte_sia_sih WHERE ${where} ORDER BY criado_em DESC LIMIT $${params.length}`,
        params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  app.post("/api/dados-fonte-sia-sih", async (req, reply) => {
    try {
      const items = Array.isArray(req.body) ? req.body : (req.body as any).items ?? [];
      if (!items.length) return reply.send({ inserted: 0 });

      const valores: unknown[] = [];
      const placeholders: string[] = [];
      let idx = 1;
      for (const it of items) {
        placeholders.push(`($${idx},$${idx+1},$${idx+2},$${idx+3},$${idx+4},$${idx+5},$${idx+6},$${idx+7})`);
        valores.push(
          it.codigo_procedimento, it.nome_procedimento, it.tipo_registro,
          it.complexidade, it.valor_unitario, it.valor_medio,
          it.quantidade_aprovada, it.competencia,
        );
        idx += 8;
      }

      const { rowCount } = await getPool().query(
        `INSERT INTO dados_fonte_sia_sih (codigo_procedimento, nome_procedimento, tipo_registro,
         complexidade, valor_unitario, valor_medio, quantidade_aprovada, competencia)
         VALUES ${placeholders.join(",")}
         ON CONFLICT (codigo_procedimento, tipo_registro, competencia, uf) DO NOTHING`,
        valores,
      );
      reply.send({ inserted: rowCount });
    } catch (e) { tratarErro(e, reply); }
  });
}

// ╔══════════════════════════════════════════════════════╗
// ║  7.15 — Agências Reguladoras (ANEEL/ANATEL/ANTT)    ║
// ╚══════════════════════════════════════════════════════╝

export async function rotasDadosFonteAgenciasReg(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  app.get("/api/dados-fonte-agencias-reg", async (req, reply) => {
    try {
      const { agencia, termo, uf, limite } = req.query as {
        agencia?: string; termo?: string; uf?: string; limite?: string;
      };
      const params: unknown[] = [];
      let where = "1=1";
      if (agencia) { params.push(agencia); where += ` AND agencia = $${params.length}`; }
      if (termo) { params.push(`%${termo}%`); where += ` AND descricao ILIKE $${params.length}`; }
      if (uf) { params.push(uf); where += ` AND uf = $${params.length}`; }
      const lim = Math.min(parseInt(limite ?? "50") || 50, 200);
      params.push(lim);

      const { rows } = await getPool().query(
        `SELECT * FROM dados_fonte_agencias_reg WHERE ${where} ORDER BY criado_em DESC LIMIT $${params.length}`,
        params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  app.post("/api/dados-fonte-agencias-reg", async (req, reply) => {
    try {
      const items = Array.isArray(req.body) ? req.body : (req.body as any).items ?? [];
      if (!items.length) return reply.send({ inserted: 0 });

      const valores: unknown[] = [];
      const placeholders: string[] = [];
      let idx = 1;
      for (const it of items) {
        placeholders.push(`($${idx},$${idx+1},$${idx+2},$${idx+3},$${idx+4},$${idx+5},$${idx+6},$${idx+7})`);
        valores.push(
          it.agencia, it.descricao, it.tipo_tarifa, it.valor,
          it.unidade, it.distribuidora_operadora, it.uf, it.vigencia_fim,
        );
        idx += 8;
      }

      const { rowCount } = await getPool().query(
        `INSERT INTO dados_fonte_agencias_reg (agencia, descricao, tipo_tarifa, valor,
         unidade, distribuidora_operadora, uf, vigencia_fim)
         VALUES ${placeholders.join(",")}
         ON CONFLICT DO NOTHING`,
        valores,
      );
      reply.send({ inserted: rowCount });
    } catch (e) { tratarErro(e, reply); }
  });
}

// ╔══════════════════════════════════════════════════════╗
// ║  7.16 — INCRA/EMBRAPA — Preço de Terras             ║
// ╚══════════════════════════════════════════════════════╝

export async function rotasDadosFonteINCRA(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  app.get("/api/dados-fonte-incra", async (req, reply) => {
    try {
      const { tipoTerra, uf, regiao, limite } = req.query as {
        tipoTerra?: string; uf?: string; regiao?: string; limite?: string;
      };
      const params: unknown[] = [];
      let where = "1=1";
      if (tipoTerra) { params.push(tipoTerra); where += ` AND tipo_terra = $${params.length}`; }
      if (uf) { params.push(uf); where += ` AND uf = $${params.length}`; }
      if (regiao) { params.push(`%${regiao}%`); where += ` AND regiao ILIKE $${params.length}`; }
      const lim = Math.min(parseInt(limite ?? "50") || 50, 200);
      params.push(lim);

      const { rows } = await getPool().query(
        `SELECT * FROM dados_fonte_incra WHERE ${where} ORDER BY criado_em DESC LIMIT $${params.length}`,
        params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  app.post("/api/dados-fonte-incra", async (req, reply) => {
    try {
      const items = Array.isArray(req.body) ? req.body : (req.body as any).items ?? [];
      if (!items.length) return reply.send({ inserted: 0 });

      const valores: unknown[] = [];
      const placeholders: string[] = [];
      let idx = 1;
      for (const it of items) {
        placeholders.push(`($${idx},$${idx+1},$${idx+2},$${idx+3},$${idx+4},$${idx+5},$${idx+6})`);
        valores.push(
          it.tipo_terra, it.regiao, it.municipio_referencia,
          it.uf, it.valor_hectare, it.semestre_referencia, it.fonte_dados ?? "INCRA",
        );
        idx += 7;
      }

      const { rowCount } = await getPool().query(
        `INSERT INTO dados_fonte_incra (tipo_terra, regiao, municipio_referencia,
         uf, valor_hectare, semestre_referencia, fonte_dados)
         VALUES ${placeholders.join(",")}
         ON CONFLICT DO NOTHING`,
        valores,
      );
      reply.send({ inserted: rowCount });
    } catch (e) { tratarErro(e, reply); }
  });
}
