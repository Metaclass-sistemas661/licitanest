import { api } from "@/lib/api";
import type { Categoria, UnidadeMedida, ElementoDespesa } from "@/tipos";

// ─── Categorias ────────────────────────────────────────────

export async function listarCategorias(): Promise<Categoria[]> {
  const { data } = await api.get<{ data: Categoria[] }>("/api/categorias");
  return data ?? [];
}

export async function criarCategoria(
  categoria: Pick<Categoria, "nome"> & Partial<Pick<Categoria, "descricao" | "icone" | "ordem">>,
): Promise<Categoria> {
  const { data } = await api.post<{ data: Categoria }>("/api/categorias", categoria);
  return data;
}

export async function atualizarCategoria(
  id: string,
  campos: Partial<Pick<Categoria, "nome" | "descricao" | "icone" | "ordem" | "ativo">>,
): Promise<Categoria> {
  const { data } = await api.put<{ data: Categoria }>(
    `/api/categorias/${encodeURIComponent(id)}`,
    campos,
  );
  return data;
}

// ─── Unidades de Medida ────────────────────────────────────

export async function listarUnidadesMedida(): Promise<UnidadeMedida[]> {
  const { data } = await api.get<{ data: UnidadeMedida[] }>("/api/unidades-medida");
  return data ?? [];
}

// ─── Elementos de Despesa ──────────────────────────────────

export async function listarElementosDespesa(): Promise<ElementoDespesa[]> {
  const { data } = await api.get<{ data: ElementoDespesa[] }>("/api/elementos-despesa");
  return data ?? [];
}
