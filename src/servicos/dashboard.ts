// Serviço de Dashboard — métricas reais, atividades e painel do gestor
import { api } from "@/lib/api";
import type {
  MetricasDashboard,
  MetricaSecretaria,
  FonteUtilizacao,
  Atividade,
  IpcaAcumulado,
} from "@/tipos";

// ── Métricas globais do dashboard ────────────────────
export async function obterMetricasDashboard(): Promise<MetricasDashboard> {
  const { data } = await api.get<{ data: MetricasDashboard }>("/api/dashboard/metricas");

  return {
    total_cestas: Number(data.total_cestas ?? 0),
    cestas_ativas: Number(data.cestas_ativas ?? 0),
    cestas_concluidas: Number(data.cestas_concluidas ?? 0),
    cestas_mes_atual: Number(data.cestas_mes_atual ?? 0),
    total_produtos_catalogo: Number(data.total_produtos_catalogo ?? 0),
    total_precos: Number(data.total_precos ?? 0),
    total_precos_excluidos: Number(data.total_precos_excluidos ?? 0),
    total_fornecedores: Number(data.total_fornecedores ?? 0),
    total_cotacoes: Number(data.total_cotacoes ?? 0),
    cotacoes_ativas: Number(data.cotacoes_ativas ?? 0),
  };
}

// ── IPCA acumulado ───────────────────────────────────
export async function obterIpcaAcumulado(): Promise<IpcaAcumulado | null> {
  try {
    const { data } = await api.get<{ data: IpcaAcumulado }>("/api/indices?tipo=ipca&ultimo=true");
    if (!data) return null;
    return {
      acumulado_12m: Number(data.acumulado_12m ?? 0),
      ultimo_mes: data.ultimo_mes,
    };
  } catch {
    return null;
  }
}

// ── Fontes mais utilizadas ───────────────────────────
export async function obterFontesUtilizacao(): Promise<FonteUtilizacao[]> {
  const { data } = await api.get<{ data: FonteUtilizacao[] }>("/api/dashboard/fontes-utilizacao");

  return (data ?? []).map((d) => ({
    fonte_id: d.fonte_id,
    nome: d.nome,
    sigla: d.sigla,
    tipo: d.tipo,
    total_precos: Number(d.total_precos ?? 0),
    total_itens_distintos: Number(d.total_itens_distintos ?? 0),
  }));
}

// ── Atividades recentes ──────────────────────────────
export async function listarAtividadesRecentes(
  limite = 10,
  secretariaId?: string,
): Promise<Atividade[]> {
  const params = new URLSearchParams({ limite: String(limite) });
  if (secretariaId) params.set("secretaria_id", secretariaId);

  const { data } = await api.get<{ data: Atividade[] }>(`/api/dashboard/atividades?${params}`);
  return (data ?? []) as Atividade[];
}

// ── Métricas por secretaria (painel do gestor) ───────
export async function obterMetricasPorSecretaria(): Promise<MetricaSecretaria[]> {
  const { data } = await api.get<{ data: MetricaSecretaria[] }>("/api/dashboard/cestas-por-secretaria");

  return (data ?? []).map((d) => {
    const valorMedia = Number(d.valor_total_media ?? 0);
    const economia = Number(d.economia_estimada ?? 0);
    return {
      secretaria_id: d.secretaria_id,
      secretaria_nome: d.secretaria_nome,
      secretaria_sigla: d.secretaria_sigla,
      total_cestas: Number(d.total_cestas ?? 0),
      cestas_ativas: Number(d.cestas_ativas ?? 0),
      cestas_concluidas: Number(d.cestas_concluidas ?? 0),
      cestas_pendentes_antigas: Number(d.cestas_pendentes_antigas ?? 0),
      economia_estimada: economia,
      valor_total_media: valorMedia,
      percentual_economia: valorMedia > 0 ? Math.round((economia / valorMedia) * 10000) / 100 : 0,
    };
  });
}

// ── Cestas por secretaria (resumo para gráfico) ──────
export async function obterCestasPorSecretaria(): Promise<{ nome: string; total: number }[]> {
  const metricas = await obterMetricasPorSecretaria();
  return metricas
    .filter((m) => m.total_cestas > 0)
    .map((m) => ({
      nome: m.secretaria_sigla ?? m.secretaria_nome,
      total: m.total_cestas,
    }));
}

// ── Economia média global ────────────────────────────
export async function obterEconomiaMedia(): Promise<{ economia: number; percentual: number }> {
  const metricas = await obterMetricasPorSecretaria();
  const totalEconomia = metricas.reduce((acc, m) => acc + m.economia_estimada, 0);
  const totalMedia = metricas.reduce((acc, m) => acc + m.valor_total_media, 0);
  return {
    economia: totalEconomia,
    percentual: totalMedia > 0 ? Math.round((totalEconomia / totalMedia) * 10000) / 100 : 0,
  };
}
