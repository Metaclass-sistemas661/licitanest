import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { exigirServidor } from "../middleware/autorizacao.js";
import { tratarErro } from "../utils/erros.js";

// ╔══════════════════════════════════════════════════════╗
// ║  ComprasNet — Compras Federais                      ║
// ╚══════════════════════════════════════════════════════╝

export async function rotasDadosFonteComprasNet(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  app.get("/api/dados-fonte-comprasnet", async (req, reply) => {
    try {
      const { termo, uasg, uf, modalidade, data_inicio, data_fim, tipo_registro, limite } = req.query as {
        termo?: string; uasg?: string; uf?: string; modalidade?: string;
        data_inicio?: string; data_fim?: string; tipo_registro?: string; limite?: string;
      };
      const params: unknown[] = [];
      let where = "1=1";
      if (termo) { params.push(`%${termo}%`); where += ` AND descricao_item ILIKE $${params.length}`; }
      if (uasg) { params.push(uasg); where += ` AND uasg = $${params.length}`; }
      if (uf) { params.push(uf); where += ` AND uf = $${params.length}`; }
      if (modalidade) { params.push(modalidade); where += ` AND modalidade = $${params.length}`; }
      if (data_inicio) { params.push(data_inicio); where += ` AND data_publicacao >= $${params.length}`; }
      if (data_fim) { params.push(data_fim); where += ` AND data_publicacao <= $${params.length}`; }
      if (tipo_registro) { params.push(tipo_registro); where += ` AND tipo_registro = $${params.length}`; }
      const lim = Math.min(parseInt(limite ?? "50") || 50, 200);
      params.push(lim);

      const { rows } = await getPool().query(
        `SELECT * FROM dados_fonte_comprasnet WHERE ${where} ORDER BY criado_em DESC LIMIT $${params.length}`,
        params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  app.post("/api/dados-fonte-comprasnet", async (req, reply) => {
    try {
      const { items } = req.body as { items: any[] };
      if (!items?.length) return reply.send({ inserted: 0 });

      const valores: unknown[] = [];
      const placeholders: string[] = [];
      let idx = 1;
      for (const it of items) {
        placeholders.push(`($${idx},$${idx+1},$${idx+2},$${idx+3},$${idx+4},$${idx+5},$${idx+6},$${idx+7},$${idx+8},$${idx+9},$${idx+10},$${idx+11},$${idx+12})`);
        valores.push(
          it.orgao, it.uasg, it.descricao_item, it.unidade, it.quantidade,
          it.valor_unitario, it.valor_total, it.modalidade, it.numero_contrato,
          it.numero_ata, it.data_publicacao, it.uf, it.tipo_registro ?? "contrato",
        );
        idx += 13;
      }

      const { rowCount } = await getPool().query(
        `INSERT INTO dados_fonte_comprasnet (orgao, uasg, descricao_item, unidade, quantidade,
         valor_unitario, valor_total, modalidade, numero_contrato, numero_ata, data_publicacao, uf, tipo_registro)
         VALUES ${placeholders.join(",")}
         ON CONFLICT DO NOTHING`,
        valores,
      );
      reply.status(201).send({ inserted: rowCount });
    } catch (e) { tratarErro(e, reply); }
  });
}

// ╔══════════════════════════════════════════════════════╗
// ║  CATMAT/CATSER — Catálogo de Materiais e Serviços   ║
// ╚══════════════════════════════════════════════════════╝

export async function rotasDadosFonteCATMAT(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  app.get("/api/dados-fonte-catmat-fase7", async (req, reply) => {
    try {
      const { codigo, termo, grupo, classe, sustentavel, tipo_registro, limite } = req.query as {
        codigo?: string; termo?: string; grupo?: string; classe?: string;
        sustentavel?: string; tipo_registro?: string; limite?: string;
      };
      const params: unknown[] = [];
      let where = "1=1";
      if (codigo) { params.push(codigo); where += ` AND codigo_catmat = $${params.length}`; }
      if (termo) { params.push(`%${termo}%`); where += ` AND descricao ILIKE $${params.length}`; }
      if (grupo) { params.push(`%${grupo}%`); where += ` AND grupo ILIKE $${params.length}`; }
      if (classe) { params.push(`%${classe}%`); where += ` AND classe ILIKE $${params.length}`; }
      if (sustentavel !== undefined) { params.push(sustentavel === "true"); where += ` AND sustentavel = $${params.length}`; }
      if (tipo_registro) { params.push(tipo_registro); where += ` AND tipo_registro = $${params.length}`; }
      const lim = Math.min(parseInt(limite ?? "50") || 50, 200);
      params.push(lim);

      const { rows } = await getPool().query(
        `SELECT * FROM dados_fonte_catmat WHERE ${where} ORDER BY criado_em DESC LIMIT $${params.length}`,
        params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  app.post("/api/dados-fonte-catmat-fase7", async (req, reply) => {
    try {
      const { items } = req.body as { items: any[] };
      if (!items?.length) return reply.send({ inserted: 0 });

      const valores: unknown[] = [];
      const placeholders: string[] = [];
      let idx = 1;
      for (const it of items) {
        placeholders.push(`($${idx},$${idx+1},$${idx+2},$${idx+3},$${idx+4},$${idx+5},$${idx+6},$${idx+7})`);
        valores.push(
          it.codigo_catmat, it.descricao, it.grupo, it.classe,
          it.pdm, it.status ?? "ativo", it.sustentavel ?? false, it.tipo_registro ?? "material",
        );
        idx += 8;
      }

      const { rowCount } = await getPool().query(
        `INSERT INTO dados_fonte_catmat (codigo_catmat, descricao, grupo, classe, pdm, status, sustentavel, tipo_registro)
         VALUES ${placeholders.join(",")}
         ON CONFLICT (codigo_catmat, tipo_registro) DO NOTHING`,
        valores,
      );
      reply.status(201).send({ inserted: rowCount });
    } catch (e) { tratarErro(e, reply); }
  });
}

// ╔══════════════════════════════════════════════════════╗
// ║  ARP — Atas de Registro de Preço Vigentes           ║
// ╚══════════════════════════════════════════════════════╝

export async function rotasDadosFonteARP(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  app.get("/api/dados-fonte-arp", async (req, reply) => {
    try {
      const { termo, uf, fornecedor, apenas_vigentes, limite } = req.query as {
        termo?: string; uf?: string; fornecedor?: string;
        apenas_vigentes?: string; limite?: string;
      };
      const params: unknown[] = [];
      let where = "1=1";
      if (termo) { params.push(`%${termo}%`); where += ` AND descricao_item ILIKE $${params.length}`; }
      if (uf) { params.push(uf); where += ` AND uf = $${params.length}`; }
      if (fornecedor) { params.push(`%${fornecedor}%`); where += ` AND fornecedor ILIKE $${params.length}`; }
      if (apenas_vigentes === "true") { where += ` AND data_vigencia_fim >= CURRENT_DATE`; }
      const lim = Math.min(parseInt(limite ?? "50") || 50, 200);
      params.push(lim);

      const { rows } = await getPool().query(
        `SELECT * FROM dados_fonte_arp WHERE ${where} ORDER BY data_vigencia_fim DESC LIMIT $${params.length}`,
        params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  app.post("/api/dados-fonte-arp", async (req, reply) => {
    try {
      const { items } = req.body as { items: any[] };
      if (!items?.length) return reply.send({ inserted: 0 });

      const valores: unknown[] = [];
      const placeholders: string[] = [];
      let idx = 1;
      for (const it of items) {
        placeholders.push(`($${idx},$${idx+1},$${idx+2},$${idx+3},$${idx+4},$${idx+5},$${idx+6},$${idx+7},$${idx+8},$${idx+9},$${idx+10},$${idx+11})`);
        valores.push(
          it.orgao, it.numero_ata, it.numero_licitacao, it.descricao_item,
          it.marca, it.unidade, it.quantidade, it.valor_unitario,
          it.fornecedor, it.cnpj_fornecedor, it.data_vigencia_inicio, it.data_vigencia_fim,
        );
        idx += 12;
      }

      const { rowCount } = await getPool().query(
        `INSERT INTO dados_fonte_arp (orgao, numero_ata, numero_licitacao, descricao_item,
         marca, unidade, quantidade, valor_unitario, fornecedor, cnpj_fornecedor,
         data_vigencia_inicio, data_vigencia_fim)
         VALUES ${placeholders.join(",")}
         ON CONFLICT DO NOTHING`,
        valores,
      );
      reply.status(201).send({ inserted: rowCount });
    } catch (e) { tratarErro(e, reply); }
  });
}

// ╔══════════════════════════════════════════════════════╗
// ║  ANP — Preços de Combustíveis                       ║
// ╚══════════════════════════════════════════════════════╝

export async function rotasDadosFonteANP(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  app.get("/api/dados-fonte-anp", async (req, reply) => {
    try {
      const { produto, municipio, uf, data_inicio, data_fim, limite } = req.query as {
        produto?: string; municipio?: string; uf?: string;
        data_inicio?: string; data_fim?: string; limite?: string;
      };
      const params: unknown[] = [];
      let where = "1=1";
      if (produto) { params.push(produto); where += ` AND produto = $${params.length}`; }
      if (municipio) { params.push(`%${municipio}%`); where += ` AND municipio ILIKE $${params.length}`; }
      if (uf) { params.push(uf); where += ` AND uf = $${params.length}`; }
      if (data_inicio) { params.push(data_inicio); where += ` AND data_coleta >= $${params.length}`; }
      if (data_fim) { params.push(data_fim); where += ` AND data_coleta <= $${params.length}`; }
      const lim = Math.min(parseInt(limite ?? "50") || 50, 200);
      params.push(lim);

      const { rows } = await getPool().query(
        `SELECT * FROM dados_fonte_anp WHERE ${where} ORDER BY data_coleta DESC LIMIT $${params.length}`,
        params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  app.post("/api/dados-fonte-anp", async (req, reply) => {
    try {
      const { items } = req.body as { items: any[] };
      if (!items?.length) return reply.send({ inserted: 0 });

      const valores: unknown[] = [];
      const placeholders: string[] = [];
      let idx = 1;
      for (const it of items) {
        placeholders.push(`($${idx},$${idx+1},$${idx+2},$${idx+3},$${idx+4},$${idx+5},$${idx+6},$${idx+7},$${idx+8})`);
        valores.push(
          it.produto, it.bandeira, it.valor_revenda, it.valor_distribuicao,
          it.municipio, it.uf, it.data_coleta, it.nome_posto, it.cnpj_posto,
        );
        idx += 9;
      }

      const { rowCount } = await getPool().query(
        `INSERT INTO dados_fonte_anp (produto, bandeira, valor_revenda, valor_distribuicao,
         municipio, uf, data_coleta, nome_posto, cnpj_posto)
         VALUES ${placeholders.join(",")}
         ON CONFLICT DO NOTHING`,
        valores,
      );
      reply.status(201).send({ inserted: rowCount });
    } catch (e) { tratarErro(e, reply); }
  });
}

// ╔══════════════════════════════════════════════════════╗
// ║  FNDE/PNAE — Merenda Escolar                       ║
// ╚══════════════════════════════════════════════════════╝

export async function rotasDadosFonteFNDE(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  app.get("/api/dados-fonte-fnde", async (req, reply) => {
    try {
      const { termo, uf, regiao, tipo_agricultura, programa, limite } = req.query as {
        termo?: string; uf?: string; regiao?: string;
        tipo_agricultura?: string; programa?: string; limite?: string;
      };
      const params: unknown[] = [];
      let where = "1=1";
      if (termo) { params.push(`%${termo}%`); where += ` AND descricao_item ILIKE $${params.length}`; }
      if (uf) { params.push(uf); where += ` AND uf = $${params.length}`; }
      if (regiao) { params.push(regiao); where += ` AND regiao = $${params.length}`; }
      if (tipo_agricultura) { params.push(tipo_agricultura); where += ` AND tipo_agricultura = $${params.length}`; }
      if (programa) { params.push(programa); where += ` AND programa = $${params.length}`; }
      const lim = Math.min(parseInt(limite ?? "50") || 50, 200);
      params.push(lim);

      const { rows } = await getPool().query(
        `SELECT * FROM dados_fonte_fnde WHERE ${where} ORDER BY criado_em DESC LIMIT $${params.length}`,
        params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  app.post("/api/dados-fonte-fnde", async (req, reply) => {
    try {
      const { items } = req.body as { items: any[] };
      if (!items?.length) return reply.send({ inserted: 0 });

      const valores: unknown[] = [];
      const placeholders: string[] = [];
      let idx = 1;
      for (const it of items) {
        placeholders.push(`($${idx},$${idx+1},$${idx+2},$${idx+3},$${idx+4},$${idx+5},$${idx+6},$${idx+7})`);
        valores.push(
          it.descricao_item, it.unidade, it.valor_referencia, it.regiao,
          it.uf, it.tipo_agricultura ?? "convencional", it.programa ?? "PNAE", it.vigencia,
        );
        idx += 8;
      }

      const { rowCount } = await getPool().query(
        `INSERT INTO dados_fonte_fnde (descricao_item, unidade, valor_referencia, regiao,
         uf, tipo_agricultura, programa, vigencia)
         VALUES ${placeholders.join(",")}
         ON CONFLICT DO NOTHING`,
        valores,
      );
      reply.status(201).send({ inserted: rowCount });
    } catch (e) { tratarErro(e, reply); }
  });
}
