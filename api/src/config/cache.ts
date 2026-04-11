import { createClient, type RedisClientType } from "redis";

let client: RedisClientType | null = null;
let conectando = false;

/**
 * Inicializa conexão Redis (Cloud Memorystore ou local).
 * Chamado uma vez no bootstrap da API.
 */
export async function inicializarRedis(): Promise<void> {
  if (client || conectando) return;
  conectando = true;

  const redisHost = process.env.REDIS_HOST;
  const redisPort = parseInt(process.env.REDIS_PORT || "6379");

  // Se REDIS_HOST não estiver configurado, cache fica desabilitado (não bloqueia startup)
  if (!redisHost) {
    console.warn("[cache] REDIS_HOST não configurado — cache desabilitado");
    conectando = false;
    return;
  }

  let tempClient: RedisClientType | null = null;
  try {
    tempClient = createClient({
      socket: {
        host: redisHost,
        port: redisPort,
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 3) return new Error("Max Redis reconnect attempts reached");
          return Math.min(retries * 500, 2000);
        },
      },
    });

    tempClient.on("error", (err) => {
      console.warn("[cache] Erro Redis:", err.message);
    });

    await tempClient.connect();
    client = tempClient;
    console.info(`[cache] Redis conectado em ${redisHost}:${redisPort}`);
  } catch (err) {
    console.warn("[cache] Redis indisponível — cache desabilitado:", (err as Error).message);
    // Garantir que o client com retry é destruído para não ficar reconectando em background
    if (tempClient) {
      try { await tempClient.disconnect(); } catch { /* ignore */ }
    }
    client = null;
  } finally {
    conectando = false;
  }
}

/**
 * Retorna o client Redis (ou null se não conectado).
 */
export function getRedis(): RedisClientType | null {
  return client;
}

// ── Cache-Aside helpers ──────────────────────────────

/**
 * Busca valor no cache. Retorna null se miss ou Redis offline.
 */
export async function cacheGet<T>(chave: string): Promise<T | null> {
  if (!client) return null;
  try {
    const raw = await client.get(chave);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Grava valor no cache com TTL em segundos.
 */
export async function cacheSet(chave: string, valor: unknown, ttlSegundos: number): Promise<void> {
  if (!client) return;
  try {
    await client.set(chave, JSON.stringify(valor), { EX: ttlSegundos });
  } catch {
    // silencioso — cache é best-effort
  }
}

/**
 * Invalida uma ou mais chaves do cache.
 */
export async function cacheInvalidar(...chaves: string[]): Promise<void> {
  if (!client) return;
  try {
    await client.del(chaves);
  } catch {
    // silencioso
  }
}

/**
 * Invalida todas as chaves que começam com o prefixo dado.
 * Usa SCAN para não bloquear o Redis.
 */
export async function cacheInvalidarPrefixo(prefixo: string): Promise<void> {
  if (!client) return;
  try {
    let cursor = "0";
    do {
      const resultado = await client.scan(cursor, { MATCH: `${prefixo}*`, COUNT: 100 });
      cursor = String(resultado.cursor);
      if (resultado.keys.length > 0) {
        await client.del(resultado.keys);
      }
    } while (cursor !== "0");
  } catch {
    // silencioso
  }
}

// ── TTLs padronizados (segundos) ─────────────────────

export const CACHE_TTL = {
  PERFIS: 3600,            // 1 hora
  CATEGORIAS: 1800,        // 30 min
  UNIDADES_MEDIDA: 3600,   // 1 hora
  ELEMENTOS_DESPESA: 3600, // 1 hora
  AUTOCOMPLETE: 300,       // 5 min
} as const;

// ── Chaves padronizadas ──────────────────────────────

export const CACHE_KEY = {
  PERFIS: "perfis:all",
  CATEGORIAS: "categorias:all",
  UNIDADES_MEDIDA: "unidades_medida:all",
  ELEMENTOS_DESPESA: "elementos_despesa:all",
  AUTOCOMPLETE: (termo: string) => `catalogo:autocomplete:${termo.toLowerCase().trim()}`,
} as const;
