import { api } from "@/lib/api";
import type { Municipio, Contrato } from "@/tipos";

// ── Tipos ────────────────────────────────────────────────────

export interface PrefeituraResumo {
  total: number;
  ativas: number;
  inativas: number;
  inadimplentes: number;
}

export interface PrefeituraListItem extends Municipio {
  total_usuarios: number;
  contrato_ativo: string | null;
  contrato_valor: number | null;
  contrato_data_fim: string | null;
  contrato_data_inicio: string | null;
  limite_usuarios: number | null;
  ultimo_acesso: string | null;
}

export interface PrefeituraUsuario {
  id: string;
  nome: string;
  email: string;
  cpf: string | null;
  ativo: boolean;
  ultimo_acesso: string | null;
  criado_em: string;
  totp_ativado: boolean;
  perfil_nome: string;
  secretaria_nome: string;
}

export interface PrefeituraDetalhes extends Municipio {
  contratos: Pick<
    Contrato,
    "id" | "numero_contrato" | "objeto" | "valor_total" | "data_inicio" | "data_fim" | "status" | "criado_em" | "limite_usuarios" | "limite_cestas" | "limite_cotacoes_mes"
  >[];
  usuarios: PrefeituraUsuario[];
  secretarias: { id: string; nome: string; sigla: string | null; ativo: boolean }[];
  metricas: {
    total_cestas: number;
    total_cotacoes: number;
    ultima_atividade: string | null;
  };
}

export interface CriarPrefeituraPayload {
  nome: string;
  uf: string;
  codigo_ibge?: string;
  cnpj?: string;
  endereco?: string;
  cep?: string;
  telefone?: string;
  email?: string;
  responsavel_nome?: string;
  responsavel_cpf?: string;
  responsavel_cargo?: string;
  responsavel_email?: string;
  observacoes?: string;
}

// ── Funções ─────────────────────────────────────────────────

export async function obterResumoPrefeituras(): Promise<{ data: PrefeituraResumo }> {
  return api.get("/api/superadmin/prefeituras/resumo");
}

export async function listarPrefeituras(params?: {
  page?: number;
  limit?: number;
  status?: string;
  uf?: string;
  busca?: string;
  ordenar_por?: string;
  ordem?: string;
}): Promise<{ data: PrefeituraListItem[]; total: number; page: number; limit: number }> {
  const sp = new URLSearchParams();
  if (params?.page) sp.set("page", String(params.page));
  if (params?.limit) sp.set("limit", String(params.limit));
  if (params?.status) sp.set("status", params.status);
  if (params?.uf) sp.set("uf", params.uf);
  if (params?.busca) sp.set("busca", params.busca);
  if (params?.ordenar_por) sp.set("ordenar_por", params.ordenar_por);
  if (params?.ordem) sp.set("ordem", params.ordem);
  const qs = sp.toString();
  return api.get(`/api/superadmin/prefeituras${qs ? `?${qs}` : ""}`);
}

export async function obterDetalhesPrefeitura(id: string): Promise<{ data: PrefeituraDetalhes }> {
  return api.get(`/api/superadmin/prefeituras/${id}`);
}

export async function criarPrefeitura(payload: CriarPrefeituraPayload): Promise<{ data: Municipio }> {
  return api.post("/api/superadmin/prefeituras", payload);
}

export async function atualizarPrefeitura(id: string, payload: Partial<CriarPrefeituraPayload> & { ativo?: boolean }): Promise<{ data: Municipio }> {
  return api.put(`/api/superadmin/prefeituras/${id}`, payload);
}

export async function acaoLotePrefeituras(ids: string[], acao: "ativar" | "desativar"): Promise<{ data: { atualizados: number } }> {
  return api.post("/api/superadmin/prefeituras/lote", { ids, acao });
}

export async function listarUfsPrefeituras(): Promise<{ data: { uf: string; total: number }[] }> {
  return api.get("/api/superadmin/prefeituras/ufs");
}
