// Serviço CATMAT/CATSER — Catálogo de Materiais e Serviços do Governo Federal
// Importação, busca e vinculação ao catálogo de produtos
import { api } from "@/lib/api";
import type { CatmatCatser, FiltroCatmat, TipoCatmat } from "@/tipos";

// ── URLs das APIs oficiais ───────────────────────────────
const CATMAT_API = "https://dadosabertos.compras.gov.br/modulo-catalogo/v1/material";
const CATSER_API = "https://dadosabertos.compras.gov.br/modulo-catalogo/v1/servico";

// ══════════════════════════════════════════════════════
// BUSCA LOCAL
// ══════════════════════════════════════════════════════

export async function buscarCatmat(
  filtro: FiltroCatmat,
): Promise<{ data: CatmatCatser[]; total: number }> {
  const params = new URLSearchParams();
  if (filtro.tipo) params.set("tipo", filtro.tipo);
  if (filtro.grupo) params.set("grupo", filtro.grupo);
  if (filtro.classe) params.set("classe", filtro.classe);
  if (filtro.sustentavel !== undefined) params.set("sustentavel", String(filtro.sustentavel));
  if (filtro.termo) params.set("termo", filtro.termo);
  params.set("limite", String(filtro.limite ?? 50));
  params.set("offset", String(filtro.offset ?? 0));

  const result = await api.get<{ data: CatmatCatser[]; total: number }>(`/api/catmat?${params}`);
  return { data: result.data ?? [], total: result.total ?? 0 };
}

export async function obterCatmatPorCodigo(codigo: string): Promise<CatmatCatser | null> {
  const { data } = await api.get<{ data: CatmatCatser | null }>(`/api/catmat?codigo=${encodeURIComponent(codigo)}&exato=true`);
  return data ?? null;
}

// ── Vincular produto ao CATMAT ───────────────────────────
export async function vincularProdutoCatmat(
  produtoId: string,
  catmatId: string,
): Promise<void> {
  await api.post("/api/catmat/vincular", { produtoId, catmatId });
}

export async function desvincularProdutoCatmat(produtoId: string): Promise<void> {
  await api.post("/api/catmat/desvincular", { produtoId });
}

// ══════════════════════════════════════════════════════
// IMPORTAÇÃO VIA API DO GOVERNO
// ══════════════════════════════════════════════════════

interface RespostaAPICatmat {
  id: number;
  codigoItemCatalogo: string;
  descricaoItemCatalogo: string;
  codigoGrupo?: string;
  nomeGrupo?: string;
  codigoClasse?: string;
  nomeClasse?: string;
  unidadeFornecimento?: string;
  sustentavel?: boolean;
  padrao_descritivo?: string;
}

export async function importarCatmatAPI(
  tipo: TipoCatmat,
  pagina: number = 1,
  tamanhoPagina: number = 500,
): Promise<{ importados: number; total: number }> {
  const url = tipo === "material" ? CATMAT_API : CATSER_API;

  try {
    const response = await fetch(
      `${url}?pagina=${pagina}&tamanhoPagina=${tamanhoPagina}`,
      {
        headers: { Accept: "application/json" },
      },
    );

    if (!response.ok) {
      throw new Error(`Erro ao consultar API CATMAT: ${response.status}`);
    }

    const json = await response.json();
    const itens = (json?.resultado ?? json?.items ?? []) as RespostaAPICatmat[];

    if (itens.length === 0) return { importados: 0, total: 0 };

    const registros = itens.map((item) => ({
      codigo: item.codigoItemCatalogo ?? String(item.id),
      descricao: item.descricaoItemCatalogo,
      tipo,
      grupo: item.nomeGrupo ?? item.codigoGrupo ?? null,
      classe: item.nomeClasse ?? item.codigoClasse ?? null,
      padrao_descritivo: item.padrao_descritivo ?? null,
      unidade_fornecimento: item.unidadeFornecimento ?? null,
      sustentavel: item.sustentavel ?? false,
      ativo: true,
      atualizado_em: new Date().toISOString(),
    }));

    await api.post("/api/catmat", { registros });

    return { importados: registros.length, total: json?.totalRegistros ?? itens.length };
  } catch (err) {
    console.error("Erro na importação CATMAT:", err);
    throw err;
  }
}

// ── Listar grupos disponíveis ────────────────────────────
export async function listarGruposCatmat(tipo?: TipoCatmat): Promise<string[]> {
  const params = new URLSearchParams();
  if (tipo) params.set("tipo", tipo);

  const { data } = await api.get<{ data: string[] }>(`/api/catmat/grupos?${params}`);
  return data ?? [];
}

// ── Estatísticas do catálogo ─────────────────────────────
export async function estatisticasCatmat(): Promise<{
  total: number;
  materiais: number;
  servicos: number;
  sustentaveis: number;
  grupos: number;
}> {
  const { data } = await api.get<{ data: {
    total: number;
    materiais: number;
    servicos: number;
    sustentaveis: number;
    grupos: number;
  } }>("/api/catmat?estatisticas=true");

  return {
    total: data.total ?? 0,
    materiais: data.materiais ?? 0,
    servicos: data.servicos ?? 0,
    sustentaveis: data.sustentaveis ?? 0,
    grupos: data.grupos ?? 0,
  };
}
