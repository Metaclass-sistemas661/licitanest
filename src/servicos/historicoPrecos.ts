// Serviço de Histórico de Preços com gráfico temporal
import { api } from "@/lib/api";
import type { HistoricoPrecoItem } from "@/tipos";

/**
 * Busca o histórico de preços de um produto nos últimos N meses,
 * agrupando por mês e calculando média, mínimo e máximo.
 */
export async function obterHistoricoPrecos(
  produtoId: string,
  meses: number = 12,
): Promise<HistoricoPrecoItem> {
  const { data } = await api.get<{ data: HistoricoPrecoItem }>(
    `/api/precos/historico/${encodeURIComponent(produtoId)}?meses=${meses}`,
  );
  return data;
}

/**
 * Lista produtos que possuem preços para mostrar no seletor.
 */
export async function listarProdutosComPrecos() {
  const { data } = await api.get<{ data: any[] }>("/api/precos/historico/produtos?ativo=true&limit=500");
  return data ?? [];
}
