// Serviço de cache de consultas — evita re-consultar fontes em < 24h
import { api } from "@/lib/api";
import type { CacheConsulta } from "@/tipos";

/**
 * Gera uma chave de cache determinística para uma consulta
 */
function gerarChave(params: Record<string, unknown>): string {
  return JSON.stringify(
    Object.keys(params)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        if (params[k] !== undefined && params[k] !== null && params[k] !== "") {
          acc[k] = params[k];
        }
        return acc;
      }, {})
  );
}

/**
 * Busca resultado em cache (válido se expira_em > agora)
 */
export async function buscarCache<T = unknown>(
  fonteTipo: string,
  params: Record<string, unknown>
): Promise<T | null> {
  const chave = gerarChave(params);
  try {
    const { data } = await api.get<{ data: CacheConsulta | null }>(
      `/api/cache-consultas?fonte_tipo=${encodeURIComponent(fonteTipo)}&chave_consulta=${encodeURIComponent(chave)}`
    );
    if (!data) return null;
    return data.resultado as T;
  } catch {
    return null;
  }
}

/**
 * Armazena resultado no cache (upsert)
 */
export async function salvarCache(
  fonteTipo: string,
  params: Record<string, unknown>,
  resultado: unknown,
  ttlHoras = 24
): Promise<void> {
  const chave = gerarChave(params);
  const agora = new Date();
  const expiraEm = new Date(agora.getTime() + ttlHoras * 60 * 60 * 1000);

  try {
    await api.post("/api/cache-consultas", {
      fonte_tipo: fonteTipo,
      chave_consulta: chave,
      resultado,
      consultado_em: agora.toISOString(),
      expira_em: expiraEm.toISOString(),
    });
  } catch (err) {
    console.warn("[Cache] Falha ao salvar cache:", err);
  }
}

/**
 * Limpa caches expirados (manutenção)
 */
export async function limparCacheExpirado(): Promise<number> {
  try {
    const { data } = await api.delete<{ data: { removidos: number } }>("/api/cache-consultas/expirados");
    return data?.removidos ?? 0;
  } catch (err) {
    console.warn("[Cache] Falha ao limpar cache:", err);
    return 0;
  }
}
