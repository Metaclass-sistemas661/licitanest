// Hook para Dashboard e Painel do Gestor — com TanStack Query
import { useQuery } from "@tanstack/react-query";
import type {
  MetricasDashboard,
  MetricaSecretaria,
  FonteUtilizacao,
  Atividade,
  IpcaAcumulado,
} from "@/tipos";
import * as dashSvc from "@/servicos/dashboard";

// ── Dashboard principal ──────────────────────────────
export function useDashboard() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [m, i, f, a, e, cs] = await Promise.allSettled([
        dashSvc.obterMetricasDashboard(),
        dashSvc.obterIpcaAcumulado(),
        dashSvc.obterFontesUtilizacao(),
        dashSvc.listarAtividadesRecentes(10),
        dashSvc.obterEconomiaMedia(),
        dashSvc.obterCestasPorSecretaria(),
      ]);
      return {
        metricas: m.status === "fulfilled" ? m.value : null,
        ipca: i.status === "fulfilled" ? i.value : null,
        fontes: f.status === "fulfilled" ? f.value : [],
        atividades: a.status === "fulfilled" ? a.value : [],
        economia: e.status === "fulfilled" ? e.value : null,
        cestasSecretaria: cs.status === "fulfilled" ? cs.value : [],
      };
    },
    staleTime: 2 * 60 * 1000, // 2 min — dashboard atualiza com frequência
  });

  return {
    metricas: data?.metricas ?? null as MetricasDashboard | null,
    ipca: data?.ipca ?? null as IpcaAcumulado | null,
    fontes: data?.fontes ?? [] as FonteUtilizacao[],
    atividades: data?.atividades ?? [] as Atividade[],
    economia: data?.economia ?? null as { economia: number; percentual: number } | null,
    cestasSecretaria: data?.cestasSecretaria ?? [] as { nome: string; total: number }[],
    carregando: isLoading,
    erro: error ? (error instanceof Error ? error.message : "Erro ao carregar dashboard") : null,
    recarregar: refetch,
  };
}

// ── Painel do Gestor ─────────────────────────────────
export function usePainelGestor() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["painel-gestor"],
    queryFn: async () => {
      const [m, a] = await Promise.allSettled([
        dashSvc.obterMetricasPorSecretaria(),
        dashSvc.listarAtividadesRecentes(20),
      ]);
      return {
        metricas: m.status === "fulfilled" ? m.value : [],
        atividades: a.status === "fulfilled" ? a.value : [],
      };
    },
    staleTime: 2 * 60 * 1000,
  });

  return {
    metricas: data?.metricas ?? [] as MetricaSecretaria[],
    atividades: data?.atividades ?? [] as Atividade[],
    carregando: isLoading,
    erro: error ? (error instanceof Error ? error.message : "Erro ao carregar painel") : null,
    recarregar: refetch,
  };
}
