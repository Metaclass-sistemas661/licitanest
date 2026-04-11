import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { exigirServidor } from "../middleware/autorizacao.js";
import { tratarErro } from "../utils/erros.js";

// ── Sliding window rate limit por API key (em memória) ────
const apiKeyHits = new Map<string, { timestamps: number[] }>();

function verificarRateLimitApiKey(keyId: string, limitePorMinuto: number): boolean {
  const now = Date.now();
  const windowMs = 60_000;
  let entry = apiKeyHits.get(keyId);
  if (!entry) {
    entry = { timestamps: [] };
    apiKeyHits.set(keyId, entry);
  }
  // Remover timestamps fora da janela
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
  if (entry.timestamps.length >= limitePorMinuto) return false;
  entry.timestamps.push(now);
  return true;
}

// Middleware de autenticação por API key
async function autenticarApiKey(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const chave = req.headers["x-api-key"] as string;
  if (!chave) {
    reply.status(401).send({ error: "Header X-API-Key é obrigatório" });
    return;
  }

  const pool = getPool();
  const { rows: [key] } = await pool.query(
    `SELECT id, municipio_id, permissoes, rate_limit_rpm, ativo, expira_em
     FROM api_keys WHERE chave = $1`,
    [chave],
  );

  if (!key || !key.ativo) {
    reply.status(401).send({ error: "API key inválida ou revogada" });
    return;
  }
  if (key.expira_em && new Date(key.expira_em) < new Date()) {
    reply.status(401).send({ error: "API key expirada" });
    return;
  }

  const limite = key.rate_limit_rpm ?? 60;
  if (!verificarRateLimitApiKey(key.id, limite)) {
    reply.header("Retry-After", "60");
    reply.header("X-RateLimit-Limit", String(limite));
    reply.status(429).send({ error: `Rate limit excedido: ${limite} req/min` });
    return;
  }

  // Registrar uso + log
  const start = Date.now();
  req.apiKey = { id: key.id, municipio_id: key.municipio_id, permissoes: key.permissoes };

  // Log de acesso (após a resposta)
  reply.raw.on("finish", () => {
    const latencia = Date.now() - start;
    pool.query(
      `INSERT INTO api_log (api_key_id, metodo, endpoint, status_code, ip, user_agent, latencia_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [key.id, req.method, req.url, reply.statusCode, req.ip, req.headers["user-agent"] ?? "", latencia],
    ).catch(() => {});
    pool.query(
      `UPDATE api_keys SET ultimo_uso_em = NOW(), total_requisicoes = total_requisicoes + 1 WHERE id = $1`,
      [key.id],
    ).catch(() => {});
  });
}

declare module "fastify" {
  interface FastifyRequest {
    apiKey?: { id: string; municipio_id: string; permissoes: string[] | null };
  }
}

export async function rotasApiPublica(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  // GET /api/api-keys
  app.get("/api/api-keys", async (req, reply) => {
    try {
      const { municipio_id } = req.query as { municipio_id?: string };
      const params: unknown[] = [];
      let where = `1=1`;
      if (municipio_id) { params.push(municipio_id); where += ` AND municipio_id = $${params.length}`; }
      const { rows } = await getPool().query(
        `SELECT * FROM api_keys WHERE ${where} ORDER BY criado_em DESC`, params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/api-keys
  app.post("/api/api-keys", async (req, reply) => {
    try {
      const b = req.body as {
        nome: string; municipio_id: string; permissoes?: string[];
        rate_limit_por_minuto?: number; criado_por?: string;
      };
      const key = `lnk_${crypto.randomUUID().replace(/-/g, "")}`;
      const { rows } = await getPool().query(
        `INSERT INTO api_keys (nome, chave, municipio_id, permissoes, rate_limit_por_minuto, criado_por)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [b.nome, key, b.municipio_id, JSON.stringify(b.permissoes ?? []), b.rate_limit_por_minuto ?? 60, b.criado_por],
      );
      reply.status(201).send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // DELETE /api/api-keys/:id
  app.delete("/api/api-keys/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      await getPool().query(`UPDATE api_keys SET revogada = true, revogada_em = NOW() WHERE id = $1`, [id]);
      reply.status(204).send();
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/api-keys/estatisticas
  app.get("/api/api-keys/estatisticas", async (req, reply) => {
    try {
      const { municipio_id } = req.query as { municipio_id?: string };
      const params: unknown[] = [];
      let where = `1=1`;
      if (municipio_id) { params.push(municipio_id); where += ` AND ak.municipio_id = $${params.length}`; }
      const { rows } = await getPool().query(
        `SELECT ak.id, ak.nome, COUNT(al.id) AS total_requisicoes,
                MAX(al.criado_em) AS ultima_requisicao
         FROM api_keys ak
         LEFT JOIN api_log al ON al.api_key_id = ak.id
         WHERE ${where}
         GROUP BY ak.id, ak.nome
         ORDER BY total_requisicoes DESC`,
        params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });
}

// ── Endpoints públicos com autenticação via API Key ───────
export async function rotasDadosPublicos(app: FastifyInstance) {
  app.addHook("preHandler", autenticarApiKey);

  // GET /api/publico/precos — consulta preços por município
  app.get("/api/publico/precos", async (req, reply) => {
    try {
      const { produto, limite = "50", pagina = "1" } = req.query as Record<string, string>;
      const munId = req.apiKey!.municipio_id;
      const lim = Math.min(parseInt(limite) || 50, 100);
      const offset = (Math.max(parseInt(pagina) || 1, 1) - 1) * lim;
      const params: unknown[] = [munId];
      let where = `sec.municipio_id = $1`;
      if (produto) {
        params.push(`%${produto}%`);
        where += ` AND pc.descricao ILIKE $${params.length}`;
      }
      params.push(lim, offset);
      const { rows } = await getPool().query(
        `SELECT pc.descricao, pc.codigo_catmat, pi.valor, pi.data_coleta,
                um.sigla AS unidade
         FROM precos_item pi
         JOIN itens_cesta ic ON pi.item_cesta_id = ic.id
         JOIN cestas c ON ic.cesta_id = c.id
         JOIN secretarias sec ON c.secretaria_id = sec.id
         JOIN produtos_catalogo pc ON ic.produto_id = pc.id
         LEFT JOIN unidades_medida um ON pc.unidade_medida_id = um.id
         WHERE ${where} AND pi.excluido_calculo = false
         ORDER BY pi.data_coleta DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/publico/catalogo — catálogo de produtos
  app.get("/api/publico/catalogo", async (req, reply) => {
    try {
      const { busca, limite = "50", pagina = "1" } = req.query as Record<string, string>;
      const lim = Math.min(parseInt(limite) || 50, 100);
      const offset = (Math.max(parseInt(pagina) || 1, 1) - 1) * lim;
      const params: unknown[] = [];
      let where = `1=1`;
      if (busca) {
        params.push(`%${busca}%`);
        where += ` AND (pc.descricao ILIKE $${params.length} OR pc.codigo_catmat ILIKE $${params.length})`;
      }
      params.push(lim, offset);
      const { rows } = await getPool().query(
        `SELECT pc.id, pc.descricao, pc.codigo_catmat, um.sigla AS unidade
         FROM produtos_catalogo pc
         LEFT JOIN unidades_medida um ON pc.unidade_medida_id = um.id
         WHERE ${where}
         ORDER BY pc.descricao
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });
}
