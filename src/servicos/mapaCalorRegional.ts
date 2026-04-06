import { api } from "@/lib/api";
import type { MapaCalorDados } from "@/tipos";

/**
 * Busca dados regionais de preço para um produto
 */
export async function buscarDadosRegionais(
  produtoId: string,
): Promise<MapaCalorDados | null> {
  const { data } = await api.get<{ data: MapaCalorDados | null }>(
    `/api/mapa-calor/${encodeURIComponent(produtoId)}`
  );
  return data;
}

/**
 * Lista UFs disponíveis com cotações registradas
 */
export async function listarUFsComDados(): Promise<string[]> {
  const { data } = await api.get<{ data: Array<{ uf: string }> }>(
    "/api/fornecedores?fields=uf&distinct=true"
  );
  if (!data) return [];
  const ufs = [...new Set(data.map((f) => f.uf).filter(Boolean))];
  return ufs.sort();
}
