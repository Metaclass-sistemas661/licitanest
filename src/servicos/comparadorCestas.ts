// Serviço de Comparação de Cestas Lado a Lado
import { api } from "@/lib/api";
import type {
  ComparacaoCesta,
  ItemComparado,
} from "@/tipos";

// ── Comparar duas cestas ──────────────────────────────
export async function compararCestas(
  cestaIdA: string,
  cestaIdB: string,
): Promise<{
  cestaA: ComparacaoCesta;
  cestaB: ComparacaoCesta;
  itensComparados: ItemComparado[];
  resumo: {
    total_itens_a: number;
    total_itens_b: number;
    itens_comuns: number;
    itens_exclusivos_a: number;
    itens_exclusivos_b: number;
    diferenca_total_media: number;
    diferenca_total_percentual: number;
  };
}> {
  const { data } = await api.get<{ data: {
    cestaA: ComparacaoCesta;
    cestaB: ComparacaoCesta;
    itensComparados: ItemComparado[];
    resumo: {
      total_itens_a: number;
      total_itens_b: number;
      itens_comuns: number;
      itens_exclusivos_a: number;
      itens_exclusivos_b: number;
      diferenca_total_media: number;
      diferenca_total_percentual: number;
    };
  } }>(
    `/api/comparador/cestas?cestaA=${encodeURIComponent(cestaIdA)}&cestaB=${encodeURIComponent(cestaIdB)}`,
  );
  return data;
}

// ── Listar cestas para seleção no comparador ──────────
export async function listarCestasParaComparacao() {
  const { data } = await api.get<{ data: any[] }>(
    "/api/cestas?status=em_andamento,concluida&limit=100&order=data:desc&fields=id,descricao_objeto,data,status,secretaria",
  );
  return data ?? [];
}
