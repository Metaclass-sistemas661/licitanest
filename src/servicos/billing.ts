import { api } from "@/lib/api";
import type { Plano, Assinatura, Fatura } from "@/tipos";

// Flag para modo de desenvolvimento
const IS_DEV = import.meta.env.DEV;

// ─── Planos ─────────────────────────────────────────────────

export async function listarPlanos(): Promise<Plano[]> {
  const { data } = await api.get<{ data: Plano[] }>("/api/billing/planos");
  return data ?? [];
}

export async function buscarPlano(planoId: string): Promise<Plano | null> {
  try {
    const { data } = await api.get<{ data: Plano }>(
      `/api/billing/planos/${encodeURIComponent(planoId)}`,
    );
    return data ?? null;
  } catch {
    return null;
  }
}

// ─── Assinatura ─────────────────────────────────────────────

export async function buscarAssinatura(municipioId: string): Promise<(Assinatura & { plano?: Plano }) | null> {
  try {
    const { data } = await api.get<{ data: Assinatura & { plano?: Plano } }>(
      `/api/billing/assinatura?municipio_id=${encodeURIComponent(municipioId)}`,
    );
    return data ?? null;
  } catch {
    return null;
  }
}

export async function alterarPlano(
  assinaturaId: string,
  novoPlanoId: string,
  intervalo: "mensal" | "anual"
): Promise<void> {
  const plano = await buscarPlano(novoPlanoId);
  if (!plano) throw new Error("Plano não encontrado");

  const valor = intervalo === "anual" ? plano.preco_anual : plano.preco_mensal;

  await api.put(`/api/billing/assinatura/${encodeURIComponent(assinaturaId)}`, {
    plano_id: novoPlanoId,
    intervalo,
    valor_corrente: valor,
    atualizado_em: new Date().toISOString(),
  });
}

export async function cancelarAssinatura(assinaturaId: string): Promise<void> {
  await api.put(`/api/billing/assinatura/${encodeURIComponent(assinaturaId)}`, {
    status: "cancelada",
    cancelado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  });
}

export async function reativarAssinatura(assinaturaId: string): Promise<void> {
  await api.put(`/api/billing/assinatura/${encodeURIComponent(assinaturaId)}`, {
    status: "ativa",
    cancelado_em: null,
    atualizado_em: new Date().toISOString(),
  });
}

// ─── Faturas ────────────────────────────────────────────────

export async function listarFaturas(municipioId: string): Promise<Fatura[]> {
  const { data } = await api.get<{ data: Fatura[] }>(
    `/api/billing/faturas?municipio_id=${encodeURIComponent(municipioId)}`,
  );
  return data ?? [];
}

export async function buscarFatura(faturaId: string): Promise<Fatura | null> {
  try {
    const { data } = await api.get<{ data: Fatura }>(
      `/api/billing/faturas/${encodeURIComponent(faturaId)}`,
    );
    return data ?? null;
  } catch {
    return null;
  }
}

// ─── Stripe — via API ───────────────────────────────────

export async function criarCheckoutSession(
  municipioId: string,
  planoId: string,
  _intervalo: "mensal" | "anual"
): Promise<{ url: string }> {
  if (IS_DEV) {
    console.info("[Billing] Checkout simulado (dev)", { municipioId, planoId });
    return { url: `/billing?checkout=sucesso&plano=${planoId}` };
  }

  const { data } = await api.post<{ data: { url: string } }>("/api/billing/checkout", {
    municipioId,
    planoId,
    intervalo: _intervalo,
  });
  return { url: data.url };
}

export async function processarWebhookStripe(
  payload: Record<string, unknown>
): Promise<void> {
  if (IS_DEV) {
    console.info("[Billing] Webhook simulado (dev)", payload);
  }

  await api.post("/api/billing/webhook", {
    tipo: (payload.type as string) ?? "unknown",
    payload,
    processado: true,
  });
}

// ─── Helpers ────────────────────────────────────────────────

export function formatarMoeda(centavos: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(centavos / 100);
}

export function statusAssinaturaLabel(status: string): string {
  const mapa: Record<string, string> = {
    ativa: "Ativa",
    trial: "Período de teste",
    cancelada: "Cancelada",
    inadimplente: "Inadimplente",
    expirada: "Expirada",
  };
  return mapa[status] ?? status;
}

export function statusFaturaLabel(status: string): string {
  const mapa: Record<string, string> = {
    pendente: "Pendente",
    paga: "Paga",
    vencida: "Vencida",
    cancelada: "Cancelada",
  };
  return mapa[status] ?? status;
}
