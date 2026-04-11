import { api } from "@/lib/api";

// ── Types ────────────────────────────────────────────────────────────────────

export interface UsuarioResumo {
  ativos: number;
  novos_30d: number;
  com_2fa: number;
  pct_2fa: number;
  inativos_90d: number;
  total: number;
}

export interface UsuarioListItem {
  id: string;
  nome: string;
  email: string;
  cpf: string | null;
  matricula: string | null;
  ativo: boolean;
  totp_ativado: boolean;
  ultimo_acesso: string | null;
  criado_em: string;
  is_superadmin: boolean;
  perfil_id: string;
  perfil_nome: string;
  secretaria_id: string;
  secretaria_nome: string;
  municipio_id: string;
  municipio_nome: string;
  municipio_uf: string;
}

export interface UsuarioDetalhe extends UsuarioListItem {
  telefone: string | null;
  totp_ativado_em: string | null;
  ultimo_ip: string | null;
  ultimo_user_agent: string | null;
  atualizado_em: string;
  data_nascimento: string | null;
  atividades_recentes: {
    tabela: string;
    acao: string;
    criado_em: string;
    dados_novos: unknown;
  }[];
}

export interface CriarUsuarioPayload {
  nome: string;
  email: string;
  cpf?: string;
  matricula?: string;
  telefone?: string;
  perfil_id: string;
  secretaria_id: string;
}

export interface PrefeituraOption {
  id: string;
  nome: string;
  uf: string;
  total_usuarios: number;
}

export interface PerfilOption {
  id: string;
  nome: string;
  descricao: string | null;
}

export interface SecretariaOption {
  id: string;
  nome: string;
  sigla: string | null;
}

// ── API Functions ────────────────────────────────────────────────────────────

export async function obterResumoUsuarios(): Promise<UsuarioResumo> {
  const res = await api.get<{ data: UsuarioResumo }>("/api/superadmin/usuarios/resumo");
  return res.data;
}

export async function listarUsuarios(params?: {
  page?: number;
  limit?: number;
  status?: string;
  municipio_id?: string;
  perfil?: string;
  com_2fa?: string;
  busca?: string;
  uf?: string;
  ordenar_por?: string;
  ordem?: string;
}): Promise<{ data: UsuarioListItem[]; total: number; page: number; limit: number }> {
  const sp = new URLSearchParams();
  if (params?.page) sp.set("page", String(params.page));
  if (params?.limit) sp.set("limit", String(params.limit));
  if (params?.status) sp.set("status", params.status);
  if (params?.municipio_id) sp.set("municipio_id", params.municipio_id);
  if (params?.perfil) sp.set("perfil", params.perfil);
  if (params?.com_2fa) sp.set("com_2fa", params.com_2fa);
  if (params?.busca) sp.set("busca", params.busca);
  if (params?.uf) sp.set("uf", params.uf);
  if (params?.ordenar_por) sp.set("ordenar_por", params.ordenar_por);
  if (params?.ordem) sp.set("ordem", params.ordem);
  const qs = sp.toString();
  return api.get(`/api/superadmin/usuarios${qs ? `?${qs}` : ""}`);
}

export async function obterDetalheUsuario(id: string): Promise<UsuarioDetalhe> {
  const res = await api.get<{ data: UsuarioDetalhe }>(`/api/superadmin/usuarios/${id}`);
  return res.data;
}

export async function criarUsuario(payload: CriarUsuarioPayload): Promise<{ id: string; resetLink?: string }> {
  const res = await api.post<{ data: { id: string; resetLink?: string } }>("/api/superadmin/usuarios", payload);
  return res.data;
}

export async function atualizarUsuario(id: string, payload: Record<string, unknown>): Promise<void> {
  await api.put(`/api/superadmin/usuarios/${id}`, payload);
}

export async function acaoLoteUsuarios(ids: string[], acao: "ativar" | "desativar"): Promise<void> {
  await api.post("/api/superadmin/usuarios/lote", { ids, acao });
}

export async function listarPrefeiturasFiltro(): Promise<PrefeituraOption[]> {
  const res = await api.get<{ data: PrefeituraOption[] }>("/api/superadmin/usuarios/prefeituras");
  return res.data;
}

export async function listarPerfisFiltro(): Promise<PerfilOption[]> {
  const res = await api.get<{ data: PerfilOption[] }>("/api/superadmin/usuarios/perfis");
  return res.data;
}

export async function listarSecretariasMunicipio(municipioId: string): Promise<SecretariaOption[]> {
  const res = await api.get<{ data: SecretariaOption[] }>(`/api/superadmin/usuarios/secretarias/${municipioId}`);
  return res.data;
}
