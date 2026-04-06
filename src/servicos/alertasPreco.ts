import { api } from "@/lib/api";
import type { ConfigAlerta, AlertaPreco, TipoAlerta, StatusAlerta } from "@/tipos";

/* ── Configurações de Alerta ─────────────────────────────── */

export async function listarConfiguracoes(servidorId: string): Promise<ConfigAlerta[]> {
  const { data } = await api.get<{ data: ConfigAlerta[] }>(
    `/api/alertas-preco/configuracoes?servidor_id=${encodeURIComponent(servidorId)}`,
  );
  return data ?? [];
}

export async function criarConfiguracao(
  config: Omit<ConfigAlerta, "id" | "criado_em" | "produto" | "cesta">,
): Promise<ConfigAlerta> {
  const { data } = await api.post<{ data: ConfigAlerta }>(
    `/api/alertas-preco/configuracoes`,
    config,
  );
  return data;
}

export async function atualizarConfiguracao(
  id: string,
  campos: Partial<Pick<ConfigAlerta, "percentual_gatilho" | "notificar_email" | "ativo" | "tipo">>,
): Promise<void> {
  await api.put(`/api/alertas-preco/configuracoes/${encodeURIComponent(id)}`, campos);
}

export async function excluirConfiguracao(id: string): Promise<void> {
  await api.delete(`/api/alertas-preco/configuracoes/${encodeURIComponent(id)}`);
}

/* ── Alertas Disparados ──────────────────────────────────── */

export async function listarAlertas(
  servidorId: string,
  filtros?: { status?: StatusAlerta; tipo?: TipoAlerta },
): Promise<AlertaPreco[]> {
  const params = new URLSearchParams({ servidor_id: servidorId });
  if (filtros?.status) params.set("status", filtros.status);
  if (filtros?.tipo) params.set("tipo", filtros.tipo);

  const { data } = await api.get<{ data: AlertaPreco[] }>(
    `/api/alertas-preco?${params.toString()}`,
  );
  return data ?? [];
}

export async function resolverAlerta(id: string): Promise<void> {
  await api.put(`/api/alertas-preco/${encodeURIComponent(id)}`, {
    status: "resolvido",
    resolvido_em: new Date().toISOString(),
  });
}

export async function silenciarAlerta(id: string): Promise<void> {
  await api.put(`/api/alertas-preco/${encodeURIComponent(id)}`, {
    status: "silenciado",
  });
}

/* ── Estatísticas ────────────────────────────────────────── */

export async function contarAlertasAtivos(_servidorId: string): Promise<number> {
  const { data } = await api.get<{ data: { count: number } }>(
    `/api/alertas-preco/count?status=ativo`,
  );
  return data?.count ?? 0;
}
