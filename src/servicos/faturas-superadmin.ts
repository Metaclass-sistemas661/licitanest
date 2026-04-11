import { api } from "@/lib/api";
import type { Fatura } from "@/tipos";

// ── Tipos ────────────────────────────────────────────────────

export interface AsaasResumo {
  asaas: {
    balance: { balance: number; [key: string]: unknown } | null;
    stats: Record<string, unknown> | null;
  };
  local: {
    faturas_pagas: number;
    faturas_pendentes: number;
    faturas_vencidas: number;
    faturas_canceladas: number;
    faturas_estornadas: number;
    total_faturas: number;
    total_recebido: number;
    total_pendente: number;
    total_vencido: number;
  };
}

export interface BillingEvento {
  id: string;
  municipio_id: string | null;
  tipo: string;
  payload: Record<string, unknown>;
  asaas_event_id: string | null;
  processado: boolean;
  criado_em: string;
  municipio_nome?: string;
  municipio_uf?: string;
}

export interface FaturaComJoins extends Fatura {
  municipio_nome: string;
  municipio_uf: string;
  numero_contrato?: string;
}

// ── Funções ─────────────────────────────────────────────────

export async function obterResumoAsaas(): Promise<{ data: AsaasResumo }> {
  return api.get("/api/superadmin/asaas/resumo");
}

export async function sincronizarAsaas(): Promise<{ data: { total_synced: number; synced_at: string } }> {
  return api.post("/api/superadmin/asaas/sync", {});
}

export async function listarEventosAsaas(params?: {
  page?: number;
  limit?: number;
}): Promise<{ data: BillingEvento[]; total: number; page: number; limit: number }> {
  const sp = new URLSearchParams();
  if (params?.page) sp.set("page", String(params.page));
  if (params?.limit) sp.set("limit", String(params.limit));
  const qs = sp.toString();
  return api.get(`/api/superadmin/asaas/eventos${qs ? `?${qs}` : ""}`);
}

export async function listarFaturasSuperadmin(params?: {
  page?: number;
  limit?: number;
  status?: string;
  municipio_id?: string;
  uf?: string;
  busca?: string;
}): Promise<{ data: FaturaComJoins[]; total: number; page: number; limit: number }> {
  const sp = new URLSearchParams();
  if (params?.page) sp.set("page", String(params.page));
  if (params?.limit) sp.set("limit", String(params.limit));
  if (params?.status) sp.set("status", params.status);
  if (params?.municipio_id) sp.set("municipio_id", params.municipio_id);
  if (params?.uf) sp.set("uf", params.uf);
  if (params?.busca) sp.set("busca", params.busca);
  const qs = sp.toString();
  return api.get(`/api/superadmin/faturas${qs ? `?${qs}` : ""}`);
}

export async function obterUltimaSync(): Promise<{ data: { ultima_sync: string; total_registros: number } | null }> {
  return api.get("/api/superadmin/asaas/ultima-sync");
}
