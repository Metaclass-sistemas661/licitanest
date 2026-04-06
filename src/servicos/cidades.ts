import { api } from "@/lib/api";
import type { CidadeRegiao } from "@/tipos";

export interface CidadeRegiaoForm {
  nome: string;
  uf: string;
  codigo_ibge?: string;
  municipio_id: string;
  distancia_km?: number;
}

export async function listarCidadesRegiao(municipioId: string) {
  const { data } = await api.get<{ data: CidadeRegiao[] }>(
    `/api/cidades-regiao?municipio_id=${encodeURIComponent(municipioId)}`,
  );
  return data;
}

export async function criarCidadeRegiao(form: CidadeRegiaoForm) {
  const { data } = await api.post<{ data: CidadeRegiao }>("/api/cidades-regiao", {
    nome: form.nome.trim(),
    uf: form.uf.toUpperCase(),
    codigo_ibge: form.codigo_ibge?.trim() || null,
    municipio_id: form.municipio_id,
    distancia_km: form.distancia_km || null,
  });
  return data;
}

export async function atualizarCidadeRegiao(id: string, form: Partial<CidadeRegiaoForm>) {
  const updates: Record<string, unknown> = {};
  if (form.nome !== undefined) updates.nome = form.nome.trim();
  if (form.uf !== undefined) updates.uf = form.uf.toUpperCase();
  if (form.codigo_ibge !== undefined) updates.codigo_ibge = form.codigo_ibge?.trim() || null;
  if (form.distancia_km !== undefined) updates.distancia_km = form.distancia_km || null;

  const { data } = await api.put<{ data: CidadeRegiao }>(
    `/api/cidades-regiao/${encodeURIComponent(id)}`,
    updates,
  );
  return data;
}

export async function desativarCidadeRegiao(id: string) {
  await api.delete(`/api/cidades-regiao/${encodeURIComponent(id)}`);
}
