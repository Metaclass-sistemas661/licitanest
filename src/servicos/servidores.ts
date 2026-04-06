import { api } from "@/lib/api";
import type { Servidor } from "@/tipos";

export interface ServidorForm {
  nome: string;
  email: string;
  cpf?: string;
  matricula?: string;
  perfil_id: string;
  secretaria_id: string;
  telefone?: string;
  senha?: string; // apenas na criação — cria o auth.user
}

export async function listarServidores(secretariaId?: string) {
  const params = new URLSearchParams();
  if (secretariaId) params.set("secretaria_id", secretariaId);
  const qs = params.toString();

  const { data } = await api.get<{ data: Servidor[] }>(
    `/api/servidores${qs ? `?${qs}` : ""}`,
  );
  return data;
}

export async function obterServidor(id: string) {
  const { data } = await api.get<{ data: Servidor }>(
    `/api/servidores/${encodeURIComponent(id)}`,
  );
  return data;
}

export async function criarServidor(form: ServidorForm) {
  const { data } = await api.post<{ data: Servidor }>("/api/servidores", {
    nome: form.nome.trim(),
    email: form.email.trim().toLowerCase(),
    cpf: form.cpf?.replace(/\D/g, "") || null,
    matricula: form.matricula?.trim() || null,
    perfil_id: form.perfil_id,
    secretaria_id: form.secretaria_id,
    telefone: form.telefone?.trim() || null,
    senha: form.senha,
  });
  return data;
}

export async function atualizarServidor(id: string, form: Partial<ServidorForm>) {
  const updates: Record<string, unknown> = {};
  if (form.nome !== undefined) updates.nome = form.nome.trim();
  if (form.email !== undefined) updates.email = form.email.trim().toLowerCase();
  if (form.cpf !== undefined) updates.cpf = form.cpf.replace(/\D/g, "") || null;
  if (form.matricula !== undefined) updates.matricula = form.matricula.trim() || null;
  if (form.perfil_id !== undefined) updates.perfil_id = form.perfil_id;
  if (form.secretaria_id !== undefined) updates.secretaria_id = form.secretaria_id;
  if (form.telefone !== undefined) updates.telefone = form.telefone.trim() || null;

  const { data } = await api.put<{ data: Servidor }>(
    `/api/servidores/${encodeURIComponent(id)}`,
    updates,
  );
  return data;
}

export async function desativarServidor(id: string) {
  await api.put(`/api/servidores/${encodeURIComponent(id)}`, {
    ativo: false,
    deletado_em: new Date().toISOString(),
  });
}

export async function reativarServidor(id: string) {
  await api.put(`/api/servidores/${encodeURIComponent(id)}`, {
    ativo: true,
    deletado_em: null,
  });
}

export async function listarPerfis() {
  const { data } = await api.get<{ data: unknown[] }>("/api/perfis");
  return data;
}
