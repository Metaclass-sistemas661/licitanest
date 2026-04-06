import { api } from "@/lib/api";
import type { ProdutoCatalogo } from "@/tipos";

// ─── Tipos auxiliares ──────────────────────────────────────

export interface FiltrosCatalogo {
  busca?: string;
  categoriaId?: string;
  elementoDespesaId?: string;
  unidadeMedidaId?: string;
  apenasAtivos?: boolean;
}

export interface PaginacaoCatalogo {
  pagina: number;       // 1-based
  porPagina: number;    // default 50
}

export interface ResultadoPaginado<T> {
  dados: T[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

// ─── Listagem com paginação e filtros ──────────────────────

export async function listarProdutosCatalogo(
  filtros: FiltrosCatalogo = {},
  paginacao: PaginacaoCatalogo = { pagina: 1, porPagina: 50 },
): Promise<ResultadoPaginado<ProdutoCatalogo>> {
  const params = new URLSearchParams();
  params.set("pagina", String(paginacao.pagina));
  params.set("porPagina", String(paginacao.porPagina));

  if (filtros.apenasAtivos !== false) params.set("apenasAtivos", "true");
  if (filtros.busca && filtros.busca.trim().length >= 2) params.set("busca", filtros.busca.trim());
  if (filtros.categoriaId) params.set("categoriaId", filtros.categoriaId);
  if (filtros.elementoDespesaId) params.set("elementoDespesaId", filtros.elementoDespesaId);
  if (filtros.unidadeMedidaId) params.set("unidadeMedidaId", filtros.unidadeMedidaId);

  const res = await api.get<{
    data: ProdutoCatalogo[];
    total: number;
    pagina: number;
    totalPaginas: number;
  }>(`/api/catalogo?${params.toString()}`);

  return {
    dados: res.data ?? [],
    total: res.total ?? 0,
    pagina: res.pagina ?? paginacao.pagina,
    totalPaginas: res.totalPaginas ?? 0,
  };
}

// ─── Busca com autocomplete (retorna top 10 sugestões) ─────

export async function buscarAutocompleteProdutos(
  termo: string,
): Promise<Pick<ProdutoCatalogo, "id" | "descricao" | "codigo_catmat">[]> {
  if (!termo || termo.trim().length < 3) return [];

  const { data } = await api.get<{
    data: Pick<ProdutoCatalogo, "id" | "descricao" | "codigo_catmat">[];
  }>(`/api/catalogo/autocomplete?termo=${encodeURIComponent(termo.trim())}`);

  return data ?? [];
}

// ─── Busca com joins (para seleção em cestas) ─────────────

export async function buscarProdutosParaCesta(
  termo: string,
): Promise<ProdutoCatalogo[]> {
  if (!termo || termo.trim().length < 3) return [];

  const { data } = await api.get<{ data: ProdutoCatalogo[] }>(
    `/api/catalogo?busca=${encodeURIComponent(termo.trim())}&apenasAtivos=true&porPagina=10`,
  );
  return data ?? [];
}

// ─── Detalhes de um produto ────────────────────────────────

export async function obterProdutoCatalogo(id: string): Promise<ProdutoCatalogo> {
  const { data } = await api.get<{ data: ProdutoCatalogo }>(
    `/api/catalogo/${encodeURIComponent(id)}`,
  );
  return data;
}

// ─── Detectar duplicidades ─────────────────────────────────

export async function buscarProdutosSimilares(
  descricao: string,
): Promise<ProdutoCatalogo[]> {
  if (!descricao || descricao.trim().length < 3) return [];

  const { data } = await api.get<{ data: ProdutoCatalogo[] }>(
    `/api/catalogo?busca=${encodeURIComponent(descricao.trim())}&porPagina=15`,
  );
  return data ?? [];
}

// ─── Criar produto ─────────────────────────────────────────

export interface CriarProdutoDTO {
  descricao: string;
  descricao_detalhada?: string;
  categoria_id: string;
  unidade_medida_id: string;
  elemento_despesa_id?: string | null;
  codigo_catmat?: string;
}

export async function criarProdutoCatalogo(dto: CriarProdutoDTO): Promise<ProdutoCatalogo> {
  const { data } = await api.post<{ data: ProdutoCatalogo }>("/api/catalogo", dto);
  return data;
}

// ─── Editar produto ────────────────────────────────────────

export async function atualizarProdutoCatalogo(
  id: string,
  campos: Partial<CriarProdutoDTO> & { ativo?: boolean },
): Promise<ProdutoCatalogo> {
  const { data } = await api.put<{ data: ProdutoCatalogo }>(
    `/api/catalogo/${encodeURIComponent(id)}`,
    campos,
  );
  return data;
}

// ─── Soft delete ───────────────────────────────────────────

export async function desativarProdutoCatalogo(id: string): Promise<void> {
  await api.put(`/api/catalogo/${encodeURIComponent(id)}`, {
    ativo: false,
    deletado_em: new Date().toISOString(),
  });
}

export async function reativarProdutoCatalogo(id: string): Promise<void> {
  await api.put(`/api/catalogo/${encodeURIComponent(id)}`, {
    ativo: true,
    deletado_em: null,
  });
}

// ─── Importação CSV ────────────────────────────────────────

export interface LinhaImportacao {
  descricao: string;
  descricao_detalhada?: string;
  categoria_id: string;
  unidade_medida_id: string;
  elemento_despesa_id?: string;
  codigo_catmat?: string;
}

export interface ResultadoImportacao {
  total: number;
  inseridos: number;
  erros: { linha: number; mensagem: string }[];
}

export async function importarProdutosCSV(
  linhas: LinhaImportacao[],
): Promise<ResultadoImportacao> {
  const resultado: ResultadoImportacao = { total: linhas.length, inseridos: 0, erros: [] };

  // Importa em lotes de 100 para performance
  const TAMANHO_LOTE = 100;

  for (let i = 0; i < linhas.length; i += TAMANHO_LOTE) {
    const lote = linhas.slice(i, i + TAMANHO_LOTE);
    try {
      const { data } = await api.post<{ data: { id: string }[] }>("/api/catalogo", lote);
      resultado.inseridos += data?.length ?? 0;
    } catch {
      // Se falhar o lote inteiro, tenta um a um
      for (let j = 0; j < lote.length; j++) {
        try {
          await api.post("/api/catalogo", lote[j]);
          resultado.inseridos++;
        } catch (err) {
          resultado.erros.push({
            linha: i + j + 1,
            mensagem: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }
  }

  return resultado;
}
