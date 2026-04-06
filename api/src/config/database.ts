import { Pool } from "pg";

let pool: Pool;

export function criarPool(password: string): Pool {
  pool = new Pool({
    host: process.env.DB_HOST || `/cloudsql/sistema-de-gestao-16e15:southamerica-east1:licitanest-db`,
    database: process.env.DB_NAME || "licitanest",
    user: process.env.DB_USER || "postgres",
    password,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  return pool;
}

export function getPool(): Pool {
  if (!pool) throw new Error("Pool não inicializado. Chame criarPool() primeiro.");
  return pool;
}
