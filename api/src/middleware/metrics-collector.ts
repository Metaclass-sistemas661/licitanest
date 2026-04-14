import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";

/**
 * Registrar métrica no banco — uso interno, sem autenticação.
 */
async function registrarMetrica(
  tipo: string,
  valor: number,
  unidade: string,
  labels: Record<string, unknown> = {},
): Promise<void> {
  try {
    await getPool().query(
      `INSERT INTO superadmin.metricas_sistema (tipo, valor, unidade, labels)
       VALUES ($1, $2, $3, $4)`,
      [tipo, valor, unidade, JSON.stringify(labels)],
    );
  } catch {
    // best-effort — não pode bloquear requests
  }
}

/**
 * Hook onResponse — coleta latência de cada request da API.
 * Agrupa por rota normalizada para evitar explosão de séries.
 */
export function registrarMetricsHook(app: FastifyInstance): void {
  // Contadores em memória — flush periódico para o banco
  const buckets = new Map<string, { count: number; totalMs: number; maxMs: number }>();

  app.addHook("onResponse", async (request, reply) => {
    // Ignora health check e log-erro para não poluir
    if (request.url === "/api/health" || request.url === "/api/log-erro") return;

    const duracao = reply.elapsedTime; // Fastify mede automaticamente
    const rota = normalizarRota(request.routeOptions?.url ?? request.url);
    const metodo = request.method;
    const key = `${metodo}:${rota}`;

    const bucket = buckets.get(key) ?? { count: 0, totalMs: 0, maxMs: 0 };
    bucket.count++;
    bucket.totalMs += duracao;
    bucket.maxMs = Math.max(bucket.maxMs, duracao);
    buckets.set(key, bucket);
  });

  // Flush a cada 60 segundos — agrega antes de inserir
  const flushInterval = setInterval(async () => {
    if (buckets.size === 0) return;

    const snapshot = new Map(buckets);
    buckets.clear();

    let totalRequests = 0;
    let totalLatency = 0;
    let maxLatency = 0;

    for (const [key, b] of snapshot) {
      totalRequests += b.count;
      totalLatency += b.totalMs;
      maxLatency = Math.max(maxLatency, b.maxMs);

      // Métrica por rota (apenas top N com mais de 5 requests)
      if (b.count >= 5) {
        await registrarMetrica("api_latencia_rota", b.totalMs / b.count, "ms", {
          rota: key,
          requests: b.count,
          max_ms: Math.round(b.maxMs),
        });
      }
    }

    // Métricas agregadas globais
    if (totalRequests > 0) {
      await registrarMetrica("api_requests_minuto", totalRequests, "count", {});
      await registrarMetrica("api_latencia_media", totalLatency / totalRequests, "ms", {});
      await registrarMetrica("api_latencia_max", maxLatency, "ms", {});
    }

    // Métricas de sistema
    const mem = process.memoryUsage();
    await registrarMetrica("memoria_rss", Math.round(mem.rss / 1024 / 1024), "MB", {
      heap_used: Math.round(mem.heapUsed / 1024 / 1024),
      heap_total: Math.round(mem.heapTotal / 1024 / 1024),
      external: Math.round(mem.external / 1024 / 1024),
    });

    // Pool stats
    try {
      const pool = getPool();
      await registrarMetrica("db_pool_total", pool.totalCount, "connections", {
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      });
    } catch { /* pool pode não estar pronto */ }

    // Erros na última hora
    try {
      const { rows } = await getPool().query(
        `SELECT COUNT(*) as c FROM superadmin.erros_sistema
         WHERE ultima_ocorrencia > now() - INTERVAL '1 hour'`,
      );
      await registrarMetrica("erros_ultima_hora", parseInt(rows[0].c), "count", {});
    } catch { /* best-effort */ }
  }, 60_000);

  // Cleanup no shutdown
  app.addHook("onClose", async () => {
    clearInterval(flushInterval);
  });
}

/**
 * Normaliza rotas removendo UUIDs, IDs numéricos e query strings
 * para agrupar métricas sem explosão de cardinalidade.
 */
function normalizarRota(url: string): string {
  return url
    .split("?")[0]
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "/:id")
    .replace(/\/\d+/g, "/:id");
}
