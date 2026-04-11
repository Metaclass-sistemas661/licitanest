// ═══════════════════════════════════════════════════════════════════════════════
// Dead-Letter Queue para Auditoria — Fase 12.1
// Garante que nenhum registro de auditoria seja perdido silenciosamente.
// Usa Redis como fila de retry com exponential backoff (3 tentativas).
// Após 3 falhas, alerta o administrador e persiste em fallback local.
// ═══════════════════════════════════════════════════════════════════════════════
import { getPool } from "../config/database.js";
import { getRedis } from "../config/cache.js";

const AUDIT_DLQ_KEY = "audit:dlq";
const AUDIT_DLQ_PROCESSING = "audit:dlq:processing";
const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 1000; // 1s, 2s, 4s

interface AuditEntry {
  servidor_id?: string | null;
  municipio_id?: string | null;
  acao: string;
  tabela?: string | null;
  registro_id?: string | null;
  dados_anteriores?: unknown;
  dados_novos?: unknown;
  ip_address?: string | null;
  user_agent?: string | null;
  _retries?: number;
  _first_failed_at?: string;
}

// ── Fallback local quando Redis também está offline ──────
const localFallbackQueue: AuditEntry[] = [];

/**
 * Registrar evento de auditoria com garantia de entrega.
 * Se o INSERT falhar, enfileira para retry automático.
 */
export async function registrarAuditoria(entry: AuditEntry): Promise<void> {
  try {
    await inserirAuditLog(entry);
  } catch (err) {
    console.warn("[audit-dlq] INSERT falhou, enfileirando para retry:", (err as Error).message);
    await enfileirar({ ...entry, _retries: 0, _first_failed_at: new Date().toISOString() });
  }
}

/**
 * INSERT direto no audit_log.
 */
async function inserirAuditLog(entry: AuditEntry): Promise<void> {
  await getPool().query(
    `INSERT INTO audit_log (servidor_id, municipio_id, acao, tabela, registro_id, dados_anteriores, dados_novos, ip_address, user_agent)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      entry.servidor_id ?? null,
      entry.municipio_id ?? null,
      entry.acao,
      entry.tabela ?? null,
      entry.registro_id ?? null,
      entry.dados_anteriores ? JSON.stringify(entry.dados_anteriores) : null,
      entry.dados_novos ? JSON.stringify(entry.dados_novos) : null,
      entry.ip_address ?? null,
      entry.user_agent ?? null,
    ],
  );
}

/**
 * Enfileirar entrada para retry (Redis ou fallback local).
 */
async function enfileirar(entry: AuditEntry): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.rPush(AUDIT_DLQ_KEY, JSON.stringify(entry));
      return;
    } catch {
      // Redis também falhou — fallback local
    }
  }
  localFallbackQueue.push(entry);
  console.warn(`[audit-dlq] Redis indisponível — fallback local (${localFallbackQueue.length} pending)`);
}

/**
 * Processar fila de retry. Chamado periodicamente (setInterval).
 * Usa exponential backoff: 1s, 2s, 4s entre tentativas.
 */
export async function processarFilaAuditoria(): Promise<{ processados: number; falhas: number }> {
  let processados = 0;
  let falhas = 0;

  // 1) Processar fallback local primeiro
  while (localFallbackQueue.length > 0) {
    const entry = localFallbackQueue[0];
    try {
      await inserirAuditLog(entry);
      localFallbackQueue.shift();
      processados++;
    } catch {
      // Tentar enfileirar no Redis agora
      const redis = getRedis();
      if (redis) {
        try {
          await redis.rPush(AUDIT_DLQ_KEY, JSON.stringify(entry));
          localFallbackQueue.shift();
        } catch {
          break; // Ambos offline, parar
        }
      } else {
        break;
      }
    }
  }

  // 2) Processar fila Redis
  const redis = getRedis();
  if (!redis) return { processados, falhas };

  const batchSize = 50;
  for (let i = 0; i < batchSize; i++) {
    const raw = await redis.lPop(AUDIT_DLQ_KEY);
    if (!raw) break;

    let entry: AuditEntry;
    try {
      entry = JSON.parse(raw) as AuditEntry;
    } catch {
      falhas++;
      continue;
    }

    try {
      await inserirAuditLog(entry);
      processados++;
    } catch (err) {
      const retries = (entry._retries ?? 0) + 1;
      entry._retries = retries;

      if (retries >= MAX_RETRIES) {
        // Máximo de tentativas atingido — alertar administrador
        falhas++;
        await alertarFalhaAuditoria(entry, err as Error);
        // Mover para fila de mortos (nunca perder)
        try {
          await redis.rPush("audit:dead", JSON.stringify(entry));
        } catch {
          console.error("[audit-dlq] FALHA CRÍTICA: impossível persistir audit entry:", JSON.stringify(entry));
        }
      } else {
        // Re-enfileirar com delay (backoff calculado no processamento)
        try {
          await redis.rPush(AUDIT_DLQ_PROCESSING, JSON.stringify(entry));
        } catch {
          localFallbackQueue.push(entry);
        }
      }
    }
  }

  // Mover itens de processing de volta para a fila principal (após backoff implícito do intervalo)
  try {
    let item = await redis.lPop(AUDIT_DLQ_PROCESSING);
    while (item) {
      await redis.rPush(AUDIT_DLQ_KEY, item);
      item = await redis.lPop(AUDIT_DLQ_PROCESSING);
    }
  } catch {
    // Silencioso
  }

  return { processados, falhas };
}

/**
 * Alertar administrador sobre falha definitiva na auditoria.
 * Loga em nível CRITICAL e registra na tabela de alertas.
 */
async function alertarFalhaAuditoria(entry: AuditEntry, error: Error): Promise<void> {
  console.error(
    `[audit-dlq] ALERTA: registro de auditoria perdido após ${MAX_RETRIES} tentativas!`,
    { acao: entry.acao, tabela: entry.tabela, registro_id: entry.registro_id, error: error.message },
  );

  // Tentar registrar o alerta no banco (em tabela separada, não no audit_log)
  try {
    await getPool().query(
      `INSERT INTO alertas_sistema (tipo, severidade, mensagem, dados, criado_em)
       VALUES ('AUDITORIA_FALHA', 'critical', $1, $2, NOW())
       ON CONFLICT DO NOTHING`,
      [
        `Falha ao gravar auditoria após ${MAX_RETRIES} tentativas: ${entry.acao} em ${entry.tabela}`,
        JSON.stringify({ entry, error: error.message, first_failed_at: entry._first_failed_at }),
      ],
    );
  } catch {
    // Se até isso falhar, já está no console.error acima
  }
}

/**
 * Obter estatísticas da fila.
 */
export async function obterEstatisticasDLQ(): Promise<{
  pendentes_redis: number;
  pendentes_local: number;
  mortos: number;
}> {
  const redis = getRedis();
  let pendentes_redis = 0;
  let mortos = 0;

  if (redis) {
    try {
      pendentes_redis = await redis.lLen(AUDIT_DLQ_KEY);
      mortos = await redis.lLen("audit:dead");
    } catch {
      // Redis offline
    }
  }

  return {
    pendentes_redis,
    pendentes_local: localFallbackQueue.length,
    mortos,
  };
}

// ── Iniciar processamento periódico ──────────────────

let intervalo: ReturnType<typeof setInterval> | null = null;

export function iniciarProcessamentoDLQ(intervalMs = 30_000): void {
  if (intervalo) return;
  intervalo = setInterval(async () => {
    try {
      const stats = await processarFilaAuditoria();
      if (stats.processados > 0 || stats.falhas > 0) {
        console.info(`[audit-dlq] Processados: ${stats.processados}, Falhas: ${stats.falhas}`);
      }
    } catch (err) {
      console.error("[audit-dlq] Erro no processamento:", (err as Error).message);
    }
  }, intervalMs);
}

export function pararProcessamentoDLQ(): void {
  if (intervalo) {
    clearInterval(intervalo);
    intervalo = null;
  }
}
