import { api } from "@/lib/api";

// ── Tipos ────────────────────────────────────────────────────

export interface DashboardKpis {
  receita_total: number;
  mrr: number;
  contratos_ativos: number;
  prefeituras_ativas: number;
  taxa_inadimplencia: number;
  vencendo_90d: number;
  tendencia: {
    receita_total_anterior: number;
    mrr_anterior: number;
    contratos_ativos_anterior: number;
    prefeituras_ativas_anterior: number;
  };
}

export interface ReceitaMensal {
  mes: string;
  receita: number;
}

export interface ContratoStatus {
  status: string;
  quantidade: number;
}

export interface FaturaMensal {
  mes: string;
  recebido: number;
  pendente: number;
  vencido: number;
}

export interface PrefeituraEvolucao {
  mes: string;
  prefeituras: number;
}

export interface FaturaRecente {
  id: string;
  numero: string;
  valor: number;
  status: string;
  vencimento: string;
  pago_em: string | null;
  numero_contrato: string | null;
  municipio_nome: string;
  municipio_uf: string;
}

// ── Funções ─────────────────────────────────────────────────

export async function obterKpis(params?: {
  dias?: number;
  uf?: string;
  status?: string;
}): Promise<{ data: DashboardKpis }> {
  const sp = new URLSearchParams();
  if (params?.dias) sp.set("dias", String(params.dias));
  if (params?.uf) sp.set("uf", params.uf);
  if (params?.status) sp.set("status", params.status);
  const qs = sp.toString();
  return api.get(`/api/superadmin/dashboard/kpis${qs ? `?${qs}` : ""}`);
}

export async function obterReceitaMensal(meses?: number): Promise<{ data: ReceitaMensal[] }> {
  const qs = meses ? `?meses=${meses}` : "";
  return api.get(`/api/superadmin/dashboard/receita-mensal${qs}`);
}

export async function obterContratosStatus(): Promise<{ data: ContratoStatus[] }> {
  return api.get("/api/superadmin/dashboard/contratos-status");
}

export async function obterFaturasMensal(meses?: number): Promise<{ data: FaturaMensal[] }> {
  const qs = meses ? `?meses=${meses}` : "";
  return api.get(`/api/superadmin/dashboard/faturas-mensal${qs}`);
}

export async function obterPrefeiturasEvolucao(meses?: number): Promise<{ data: PrefeituraEvolucao[] }> {
  const qs = meses ? `?meses=${meses}` : "";
  return api.get(`/api/superadmin/dashboard/prefeituras-evolucao${qs}`);
}

export async function obterFaturasRecentes(limit?: number): Promise<{ data: FaturaRecente[] }> {
  const qs = limit ? `?limit=${limit}` : "";
  return api.get(`/api/superadmin/dashboard/faturas-recentes${qs}`);
}

export async function obterUfs(): Promise<{ data: string[] }> {
  return api.get("/api/superadmin/dashboard/ufs");
}
