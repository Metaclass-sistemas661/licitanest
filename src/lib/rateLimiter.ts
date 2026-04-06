/**
 * Rate limiter client-side com sliding window.
 * Protege chamadas excessivas à API antes mesmo de chegar ao servidor.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const buckets = new Map<string, RateLimitEntry>();

/**
 * Verifica se uma ação pode ser executada dentro do limite.
 * @param chave Identificador único (ex: "login", "api:precos")
 * @param limite Número máximo de chamadas na janela
 * @param janelaMs Tamanho da janela em milissegundos (padrão: 60s)
 * @returns true se permitido, false se rate-limited
 */
export function verificarRateLimit(
  chave: string,
  limite: number = 60,
  janelaMs: number = 60_000,
): boolean {
  const agora = Date.now();
  let entry = buckets.get(chave);

  if (!entry) {
    entry = { timestamps: [] };
    buckets.set(chave, entry);
  }

  // Remover timestamps fora da janela
  entry.timestamps = entry.timestamps.filter((t) => agora - t < janelaMs);

  if (entry.timestamps.length >= limite) {
    return false;
  }

  entry.timestamps.push(agora);
  return true;
}

/**
 * Rate limiter específico para tentativas de login.
 * 5 tentativas por minuto por padrão.
 */
export function verificarRateLimitLogin(): boolean {
  return verificarRateLimit('auth:login', 5, 60_000);
}

/**
 * Rate limiter para chamadas gerais à API.
 * 60 chamadas por minuto por padrão.
 */
export function verificarRateLimitAPI(endpoint: string): boolean {
  return verificarRateLimit(`api:${endpoint}`, 60, 60_000);
}

/**
 * Limpa os buckets (útil em logout).
 */
export function limparRateLimits(): void {
  buckets.clear();
}
