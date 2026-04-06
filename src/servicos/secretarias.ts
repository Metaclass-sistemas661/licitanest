import { api } from "@/lib/api";
import type { Secretaria } from "@/tipos";

export interface SecretariaForm {
  nome: string;
  sigla: string;
  municipio_id: string;
}

export async function listarSecretarias(municipioId: string) {
  const { data } = await api.get<{ data: Secretaria[] }>(
    `/api/secretarias?municipio_id=${encodeURIComponent(municipioId)}`,
  );
  return data;
}

export async function obterSecretaria(id: string) {
  const { data } = await api.get<{ data: Secretaria }>(
    `/api/secretarias/${encodeURIComponent(id)}`,
  );
  return data;
}

export async function criarSecretaria(form: SecretariaForm) {
  const { data } = await api.post<{ data: Secretaria }>("/api/secretarias", {
    nome: form.nome.trim(),
    sigla: form.sigla.trim().toUpperCase(),
    municipio_id: form.municipio_id,
  });
  return data;
}

export async function atualizarSecretaria(id: string, form: Partial<SecretariaForm>) {
  const updates: Record<string, unknown> = {};
  if (form.nome !== undefined) updates.nome = form.nome.trim();
  if (form.sigla !== undefined) updates.sigla = form.sigla.trim().toUpperCase();

  const { data } = await api.put<{ data: Secretaria }>(
    `/api/secretarias/${encodeURIComponent(id)}`,
    updates,
  );
  return data;
}

export async function desativarSecretaria(id: string) {
  await api.put(`/api/secretarias/${encodeURIComponent(id)}`, {
    ativo: false,
    deletado_em: new Date().toISOString(),
  });
}

export async function reativarSecretaria(id: string) {
  await api.put(`/api/secretarias/${encodeURIComponent(id)}`, {
    ativo: true,
    deletado_em: null,
  });
}
