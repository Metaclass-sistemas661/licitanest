// Serviço de Cestas de Preços — CRUD, duplicação, status e versionamento
import { api } from "@/lib/api";
import type { CestaPrecos, CestaVersao, StatusCesta, TipoCalculo, TipoCorrecao } from "@/tipos";

// ── Tipos auxiliares ─────────────────────────────────
export interface FiltrosCestas {
  busca?: string;
  status?: StatusCesta;
  secretaria_id?: string;
}

export interface CriarCestaDTO {
  descricao_objeto: string;
  data: string;
  tipo_calculo: TipoCalculo;
  tipo_correcao: TipoCorrecao;
  percentual_alerta?: number;
  secretaria_id: string;
  criado_por: string;
}

// ── Listagem paginada ────────────────────────────────
export async function listarCestas(
  filtros: FiltrosCestas = {},
  pagina = 1,
  porPagina = 20,
) {
  const params = new URLSearchParams();
  params.set("pagina", String(pagina));
  params.set("porPagina", String(porPagina));
  if (filtros.busca) params.set("busca", filtros.busca);
  if (filtros.status) params.set("status", filtros.status);
  if (filtros.secretaria_id) params.set("secretaria_id", filtros.secretaria_id);

  const result = await api.get<{ data: CestaPrecos[]; total: number }>(
    `/api/cestas?${params.toString()}`,
  );
  return { data: result.data ?? [], total: result.total ?? 0 };
}

// ── Obter cesta individual ────────────────────────────
export async function obterCesta(id: string) {
  const { data } = await api.get<{ data: CestaPrecos }>(`/api/cestas/${encodeURIComponent(id)}`);
  return data;
}

// ── Criar cesta ──────────────────────────────────────
export async function criarCesta(dto: CriarCestaDTO) {
  const { data } = await api.post<{ data: CestaPrecos }>("/api/cestas", dto);
  return data;
}

// ── Atualizar cesta ──────────────────────────────────
export async function atualizarCesta(
  id: string,
  campos: Partial<
    Pick<
      CestaPrecos,
      "descricao_objeto" | "data" | "tipo_calculo" | "tipo_correcao" | "percentual_alerta"
    >
  >,
) {
  const { data } = await api.put<{ data: CestaPrecos }>(`/api/cestas/${encodeURIComponent(id)}`, campos);
  return data;
}

// ── Alterar status ───────────────────────────────────
export async function alterarStatusCesta(id: string, status: StatusCesta) {
  const { data } = await api.put<{ data: CestaPrecos }>(`/api/cestas/${encodeURIComponent(id)}`, { status });
  return data;
}

// ── Excluir (soft delete) ────────────────────────────
export async function excluirCesta(id: string) {
  await api.delete(`/api/cestas/${encodeURIComponent(id)}`);
}

// ── Duplicar cesta ───────────────────────────────────
export async function duplicarCesta(
  cestaOriginalId: string,
  servidorId: string,
  comFontes: boolean,
) {
  const { data } = await api.post<{ data: CestaPrecos }>(
    `/api/cestas/${encodeURIComponent(cestaOriginalId)}/duplicar`,
    { servidorId, comFontes },
  );
  return data;
}

// ── Versionamento ─────────────────────────────────────
export async function listarVersoes(cestaId: string) {
  const { data } = await api.get<{ data: CestaVersao[] }>(
    `/api/cestas/${encodeURIComponent(cestaId)}/versoes`,
  );
  return data ?? [];
}

export async function criarVersao(
  cestaId: string,
  servidorId: string,
  descricao?: string,
) {
  const { data } = await api.post<{ data: CestaVersao }>(
    `/api/cestas/${encodeURIComponent(cestaId)}/versoes`,
    { servidorId, descricao },
  );
  return data;
}
