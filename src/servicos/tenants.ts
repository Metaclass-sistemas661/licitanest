import { api } from "@/lib/api";
import type {
  DadosOnboarding,
  TenantResumo,
  EstatisticasPlataforma,
} from "@/tipos";

// ─── Tenants (Municípios) ───────────────────────────────────

export async function listarTenants(): Promise<TenantResumo[]> {
  const res = await api.get<{ data: TenantResumo[] }>("/api/tenants/municipios");
  return res.data;
}

export async function buscarTenant(municipioId: string): Promise<TenantResumo | null> {
  try {
    const res = await api.get<{ data: TenantResumo }>(`/api/tenants/municipios/${municipioId}`);
    return res.data;
  } catch {
    return null;
  }
}

export async function ativarDesativarTenant(municipioId: string, ativo: boolean): Promise<void> {
  await api.put(`/api/tenants/municipios/${municipioId}/status`, { ativo });
}

export async function estatisticasPlataforma(): Promise<EstatisticasPlataforma> {
  const res = await api.get<{ data: EstatisticasPlataforma }>("/api/tenants/estatisticas");
  // endpoint correto já
  return res.data;
}

// ─── Onboarding ─────────────────────────────────────────────

export async function registrarMunicipio(dados: DadosOnboarding): Promise<{ municipioId: string; servidorId: string }> {
  const res = await api.post<{ data: { municipioId: string; servidorId: string } }>(
    "/api/tenants/onboarding",
    dados,
  );
  return res.data;
}
