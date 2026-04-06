// Serviço de Itens, Lotes, Preços e Documentos da Cesta
import { api } from "@/lib/api";
import type {
  ItemCesta,
  LoteCesta,
  PrecoItem,
  DocumentoComprobatorio,
} from "@/tipos";

// ==================================================
// ITENS
// ==================================================

export async function listarItensCesta(cestaId: string) {
  const { data } = await api.get<{ data: ItemCesta[] }>(
    `/api/cestas/${encodeURIComponent(cestaId)}/itens`,
  );
  return data ?? [];
}

export async function adicionarItem(
  cestaId: string,
  produtoId: string,
  quantidade: number,
  loteId?: string,
) {
  const { data } = await api.post<{ data: ItemCesta }>(
    `/api/cestas/${encodeURIComponent(cestaId)}/itens`,
    { produto_id: produtoId, lote_id: loteId ?? null, quantidade },
  );
  return data;
}

export async function atualizarItem(
  itemId: string,
  campos: Partial<Pick<ItemCesta, "quantidade" | "lote_id" | "ordem">>,
) {
  const { data } = await api.put<{ data: ItemCesta }>(
    `/api/itens-cesta/${encodeURIComponent(itemId)}`,
    campos,
  );
  return data;
}

export async function removerItem(itemId: string) {
  await api.delete(`/api/itens-cesta/${encodeURIComponent(itemId)}`);
}

export async function reordenarItens(itens: { id: string; ordem: number }[]) {
  await api.post("/api/itens-cesta/reordenar", { itens });
}

// ==================================================
// LOTES
// ==================================================

export async function listarLotesCesta(cestaId: string) {
  const { data } = await api.get<{ data: LoteCesta[] }>(
    `/api/cestas/${encodeURIComponent(cestaId)}/lotes`,
  );
  return data ?? [];
}

export async function criarLote(cestaId: string, descricao?: string) {
  const { data } = await api.post<{ data: LoteCesta }>(
    `/api/cestas/${encodeURIComponent(cestaId)}/lotes`,
    { descricao },
  );
  return data;
}

export async function atualizarLote(loteId: string, descricao: string) {
  const { data } = await api.put<{ data: LoteCesta }>(
    `/api/lotes-cesta/${encodeURIComponent(loteId)}`,
    { descricao },
  );
  return data;
}

export async function removerLote(loteId: string) {
  await api.delete(`/api/lotes-cesta/${encodeURIComponent(loteId)}`);
}

export async function moverItemParaLote(
  itemId: string,
  loteId: string | null,
) {
  await api.put(`/api/itens-cesta/${encodeURIComponent(itemId)}`, { lote_id: loteId });
}

// ==================================================
// PREÇOS
// ==================================================

export interface CriarPrecoDTO {
  item_cesta_id: string;
  fonte_id: string;
  valor_unitario: number;
  data_referencia: string;
  orgao?: string;
  cnpj_orgao?: string;
  descricao_fonte?: string;
  unidade_fonte?: string;
  documento_url?: string;
}

export async function adicionarPreco(dto: CriarPrecoDTO) {
  const { data } = await api.post<{ data: PrecoItem }>(
    `/api/itens-cesta/${encodeURIComponent(dto.item_cesta_id)}/precos`,
    dto,
  );
  return data;
}

export async function excluirPrecoDoCalculo(
  precoId: string,
  servidorId: string,
  justificativa: string,
) {
  const { data } = await api.put<{ data: PrecoItem }>(
    `/api/precos/${encodeURIComponent(precoId)}`,
    {
      excluido_calculo: true,
      justificativa_exclusao: justificativa,
      excluido_por: servidorId,
    },
  );
  return data;
}

export async function reincluirPrecoNoCalculo(precoId: string) {
  const { data } = await api.put<{ data: PrecoItem }>(
    `/api/precos/${encodeURIComponent(precoId)}`,
    {
      excluido_calculo: false,
      justificativa_exclusao: null,
      excluido_por: null,
      excluido_em: null,
    },
  );
  return data;
}

export async function removerPreco(precoId: string) {
  await api.delete(`/api/precos/${encodeURIComponent(precoId)}`);
}

// ==================================================
// CÁLCULO DE ESTATÍSTICAS
// ==================================================

export function calcularEstatisticas(precos: PrecoItem[]) {
  const validos = precos
    .filter((p) => !p.excluido_calculo)
    .map((p) => Number(p.valor_unitario));

  if (validos.length === 0) {
    return { media: null, mediana: null, menor_preco: null, maior_preco: null };
  }

  validos.sort((a, b) => a - b);
  const soma = validos.reduce((acc, v) => acc + v, 0);
  const media = soma / validos.length;
  const menor_preco = validos[0];
  const maior_preco = validos[validos.length - 1];

  let mediana: number;
  const mid = Math.floor(validos.length / 2);
  if (validos.length % 2 === 0) {
    mediana = (validos[mid - 1] + validos[mid]) / 2;
  } else {
    mediana = validos[mid];
  }

  return {
    media: Math.round(media * 10000) / 10000,
    mediana: Math.round(mediana * 10000) / 10000,
    menor_preco,
    maior_preco,
  };
}

export async function recalcularEstatisticasItem(itemId: string) {
  const { data: precos } = await api.get<{ data: PrecoItem[] }>(
    `/api/itens-cesta/${encodeURIComponent(itemId)}/precos`,
  );

  const stats = calcularEstatisticas((precos ?? []) as PrecoItem[]);
  await api.put(`/api/itens-cesta/${encodeURIComponent(itemId)}`, stats);

  return stats;
}

// ==================================================
// DOCUMENTOS COMPROBATÓRIOS
// ==================================================

export async function uploadDocumento(precoItemId: string, arquivo: File) {
  const formData = new FormData();
  formData.append("arquivo", arquivo);
  formData.append("preco_item_id", precoItemId);

  const data = await api.upload<DocumentoComprobatorio>(
    `/api/precos/${encodeURIComponent(precoItemId)}/documentos`,
    formData,
  );
  return data;
}

export async function listarDocumentos(precoItemId: string) {
  const { data } = await api.get<{ data: DocumentoComprobatorio[] }>(
    `/api/precos/${encodeURIComponent(precoItemId)}/documentos`,
  );
  return data ?? [];
}

export async function obterUrlDocumento(storagePath: string) {
  const { data } = await api.get<{ data: { url: string } }>(
    `/api/documentos/url?path=${encodeURIComponent(storagePath)}`,
  );
  return data.url;
}
