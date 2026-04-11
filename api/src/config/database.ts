import { Pool } from "pg";

let pool: Pool;
let healthCheckInterval: ReturnType<typeof setInterval> | null = null;

export async function criarPool(password: string): Promise<Pool> {
  const dbHost = process.env.DB_HOST || `/cloudsql/sistema-de-gestao-16e15:southamerica-east1:licitanest-db`;
  const dbPort = parseInt(process.env.DB_PORT || "5432", 10);
  const isUnixSocket = dbHost.startsWith("/");

  const poolConfig: ConstructorParameters<typeof Pool>[0] = {
    database: process.env.DB_NAME || "licitanest",
    user: process.env.DB_USER || "postgres",
    password,
    max: parseInt(process.env.DB_POOL_MAX || "25", 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    statement_timeout: 30000,       // Mata queries travadas após 30s
    idle_in_transaction_session_timeout: 60000, // Mata transações idle após 60s
    // Conexão TCP (Cloud SQL Proxy local / IP direto) vs Unix Socket (Cloud Run)
    ...(isUnixSocket ? { host: dbHost } : { host: dbHost, port: dbPort }),
    // SSL obrigatório em produção (exceto Unix socket que já é criptografado)
    ...(!isUnixSocket && process.env.NODE_ENV === "production" ? { ssl: { rejectUnauthorized: true } } : {}),
  };

  pool = new Pool(poolConfig);

  console.info(`[POOL] Conectando PostgreSQL → ${isUnixSocket ? "socket:" : "tcp:"}${dbHost}${isUnixSocket ? "" : ":" + dbPort}`);

  pool.on("error", (err) => {
    console.error("[POOL] Erro inesperado no pool PostgreSQL:", err.message);
  });

  // Validar conexão no startup (fail-fast)
  try {
    await pool.query("SELECT 1");
  } catch (err) {
    console.error("[POOL] Falha ao conectar no PostgreSQL no startup:", (err as Error).message);
    throw err;
  }

  // Health check periódico (30s)
  if (healthCheckInterval) clearInterval(healthCheckInterval);
  healthCheckInterval = setInterval(async () => {
    try {
      await pool.query("SELECT 1");
    } catch (err) {
      console.error("Health check PostgreSQL falhou:", (err as Error).message);
    }
  }, 30_000);

  return pool;
}

export function getPool(): Pool {
  if (!pool) throw new Error("Pool não inicializado. Chame criarPool() primeiro.");
  return pool;
}
