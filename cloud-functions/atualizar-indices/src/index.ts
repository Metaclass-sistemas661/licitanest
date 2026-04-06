import * as ff from "@google-cloud/functions-framework";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { Pool } from "pg";

const PROJECT_ID = process.env.GCP_PROJECT || "sistema-de-gestao-16e15";
const secretClient = new SecretManagerServiceClient();

let pool: Pool | null = null;

async function getSecret(nome: string): Promise<string> {
  const [version] = await secretClient.accessSecretVersion({
    name: `projects/${PROJECT_ID}/secrets/${nome}/versions/latest`,
  });
  return version.payload?.data?.toString() ?? "";
}

async function getPool(): Promise<Pool> {
  if (pool) return pool;
  const dbPassword = await getSecret("DB_PASSWORD");
  pool = new Pool({
    host: process.env.DB_HOST || `/cloudsql/${PROJECT_ID}:southamerica-east1:licitanest-db`,
    database: process.env.DB_NAME || "licitanest",
    user: process.env.DB_USER || "postgres",
    password: dbPassword,
    max: 3,
    idleTimeoutMillis: 10000,
  });
  return pool;
}

// ── APIs oficiais do IBGE (SIDRA) ────────────────────

const INDICES_CONFIG = [
  {
    tipo: "IPCA",
    nome: "Índice Nacional de Preços ao Consumidor Amplo",
    // SIDRA tabela 1737 — variação mensal do IPCA
    url: "https://apisidra.ibge.gov.br/values/t/1737/n1/all/v/2266/p/last%2012/d/v2266%2013",
  },
  {
    tipo: "INPC",
    nome: "Índice Nacional de Preços ao Consumidor",
    // SIDRA tabela 1736 — variação mensal do INPC
    url: "https://apisidra.ibge.gov.br/values/t/1736/n1/all/v/2266/p/last%2012/d/v2266%2013",
  },
  {
    tipo: "IGP-M",
    nome: "Índice Geral de Preços - Mercado",
    // FGV/IBRE — endpoint público do Banco Central (SGS)
    // Serie 189 = IGP-M mensal
    url: "https://api.bcb.gov.br/dados/serie/bcdata.sgs.189/dados/ultimos/12?formato=json",
  },
];

interface IndiceValor {
  tipo: string;
  ano: number;
  mes: number;
  valor: number;
}

// ── Parsers ──────────────────────────────────────────

function parseSIDRA(json: unknown[], tipo: string): IndiceValor[] {
  const resultados: IndiceValor[] = [];
  // SIDRA retorna array; primeiro item é header, demais são dados
  const dados = Array.isArray(json) ? json.slice(1) : [];
  for (const row of dados) {
    const r = row as Record<string, string>;
    const periodo = r["D3C"]; // formato "202601" (YYYYMM)
    const valorStr = r["V"];
    if (!periodo || !valorStr || valorStr === "..." || valorStr === "-") continue;

    const ano = parseInt(periodo.substring(0, 4));
    const mes = parseInt(periodo.substring(4, 6));
    const valor = parseFloat(valorStr);
    if (isNaN(valor) || isNaN(ano) || isNaN(mes)) continue;

    resultados.push({ tipo, ano, mes, valor });
  }
  return resultados;
}

function parseBCB(json: unknown[], tipo: string): IndiceValor[] {
  const resultados: IndiceValor[] = [];
  for (const item of json) {
    const r = item as { data: string; valor: string };
    // formato "dd/mm/yyyy"
    const partes = r.data?.split("/");
    if (!partes || partes.length !== 3) continue;
    const mes = parseInt(partes[1]);
    const ano = parseInt(partes[2]);
    const valor = parseFloat(r.valor);
    if (isNaN(valor) || isNaN(ano) || isNaN(mes)) continue;

    resultados.push({ tipo, ano, mes, valor });
  }
  return resultados;
}

// ── Buscar índice de uma fonte ───────────────────────

async function buscarIndice(config: typeof INDICES_CONFIG[0]): Promise<IndiceValor[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const resp = await fetch(config.url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!resp.ok) {
      console.warn(`[${config.tipo}] HTTP ${resp.status}: ${resp.statusText}`);
      return [];
    }
    const json = await resp.json();

    if (config.tipo === "IGP-M") {
      return parseBCB(json as unknown[], config.tipo);
    }
    return parseSIDRA(json as unknown[], config.tipo);
  } catch (err) {
    console.warn(`[${config.tipo}] Erro ao buscar:`, err);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

// ── Upsert no banco ─────────────────────────────────

async function salvarIndices(db: Pool, indices: IndiceValor[]): Promise<number> {
  let upserted = 0;
  for (const idx of indices) {
    const { rowCount } = await db.query(
      `INSERT INTO indices_correcao (tipo, ano, mes, valor)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (tipo, ano, mes) DO UPDATE SET valor = $4, atualizado_em = NOW()`,
      [idx.tipo, idx.ano, idx.mes, idx.valor],
    );
    upserted += rowCount ?? 0;
  }
  return upserted;
}

// ── Entry point ──────────────────────────────────────

ff.http("atualizarIndices", async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método não permitido" });
    return;
  }

  try {
    console.log("[atualizar-indices] Iniciando atualização mensal de índices...");

    const db = await getPool();
    const resultados: { tipo: string; importados: number; erro?: string }[] = [];

    for (const config of INDICES_CONFIG) {
      try {
        const indices = await buscarIndice(config);
        const importados = indices.length > 0 ? await salvarIndices(db, indices) : 0;
        resultados.push({ tipo: config.tipo, importados });
        console.log(`[${config.tipo}] ${importados} índices upserted de ${indices.length} buscados`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        resultados.push({ tipo: config.tipo, importados: 0, erro: msg });
        console.error(`[${config.tipo}] Erro:`, msg);
      }
    }

    // Registrar execução na auditoria
    await db.query(
      `INSERT INTO auditoria (tipo, descricao, dados_extra)
       VALUES ('atualizacao_indices', 'Atualização automática mensal de índices', $1)`,
      [JSON.stringify(resultados)],
    );

    const totalImportados = resultados.reduce((s, r) => s + r.importados, 0);
    console.log(`[atualizar-indices] Finalizado. Total: ${totalImportados} índices atualizados.`);

    res.status(200).json({
      ok: true,
      total_importados: totalImportados,
      detalhes: resultados,
    });
  } catch (err) {
    console.error("Erro na Cloud Function atualizar-indices:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});
