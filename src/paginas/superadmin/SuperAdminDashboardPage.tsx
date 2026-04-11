import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, RefreshCw } from "lucide-react";
import { KpiCardsDashboard } from "@/componentes/superadmin/KpiCardsDashboard";
import { ReceitaMensalChart } from "@/componentes/superadmin/ReceitaMensalChart";
import { ContratosStatusChart } from "@/componentes/superadmin/ContratosStatusChart";
import { FaturasMensalChart } from "@/componentes/superadmin/FaturasMensalChart";
import { PrefeiturasEvolucaoChart } from "@/componentes/superadmin/PrefeiturasEvolucaoChart";
import { FaturasRecentesTable } from "@/componentes/superadmin/FaturasRecentesTable";
import {
  DashboardFiltros,
  useDashboardFiltros,
} from "@/componentes/superadmin/DashboardFiltros";
import {
  obterKpis,
  obterReceitaMensal,
  obterContratosStatus,
  obterFaturasMensal,
  obterPrefeiturasEvolucao,
  obterFaturasRecentes,
  obterUfs,
} from "@/servicos/dashboard-superadmin";

const SA_STALE_TIME = 5 * 60 * 1000; // 5 min — dados do dashboard mudam devagar

export function SuperAdminDashboardPage() {
  const { dias, uf, status } = useDashboardFiltros();

  const kpisQuery = useQuery({
    queryKey: ["sa-dashboard", "kpis", dias, uf, status],
    queryFn: () => obterKpis({ dias: parseInt(dias), uf: uf || undefined, status: status || undefined }),
    staleTime: SA_STALE_TIME,
  });

  const receitaQuery = useQuery({
    queryKey: ["sa-dashboard", "receita"],
    queryFn: () => obterReceitaMensal(12),
    staleTime: SA_STALE_TIME,
  });

  const contratosStatusQuery = useQuery({
    queryKey: ["sa-dashboard", "contratos-status"],
    queryFn: () => obterContratosStatus(),
    staleTime: SA_STALE_TIME,
  });

  const faturasMensalQuery = useQuery({
    queryKey: ["sa-dashboard", "faturas-mensal"],
    queryFn: () => obterFaturasMensal(12),
    staleTime: SA_STALE_TIME,
  });

  const prefEvolucaoQuery = useQuery({
    queryKey: ["sa-dashboard", "pref-evolucao"],
    queryFn: () => obterPrefeiturasEvolucao(12),
    staleTime: SA_STALE_TIME,
  });

  const faturasRecentesQuery = useQuery({
    queryKey: ["sa-dashboard", "faturas-recentes"],
    queryFn: () => obterFaturasRecentes(10),
    staleTime: SA_STALE_TIME,
  });

  const [ufs, setUfs] = useState<string[]>([]);
  const [carregandoUfs, setCarregandoUfs] = useState(true);
  useEffect(() => {
    setCarregandoUfs(true);
    obterUfs()
      .then((res) => setUfs(res.data))
      .catch(() => {})
      .finally(() => setCarregandoUfs(false));
  }, []);

  const carregando = kpisQuery.isLoading || receitaQuery.isLoading;
  const refetchAll = () => {
    kpisQuery.refetch();
    receitaQuery.refetch();
    contratosStatusQuery.refetch();
    faturasMensalQuery.refetch();
    prefEvolucaoQuery.refetch();
    faturasRecentesQuery.refetch();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-superadmin-accent/10">
            <LayoutDashboard className="h-5 w-5 text-superadmin-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Dashboard Financeiro</h1>
            <p className="text-sm text-muted-foreground">
              Visão geral financeira da plataforma
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={refetchAll}
          disabled={carregando}
          className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${carregando ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {/* Filtros */}
      <DashboardFiltros ufs={ufs} carregandoUfs={carregandoUfs} />

      {/* KPIs */}
      <KpiCardsDashboard kpis={kpisQuery.data?.data ?? null} carregando={carregando} />

      {/* Gráficos — linha 1 (2 colunas) */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ReceitaMensalChart dados={receitaQuery.data?.data ?? []} carregando={receitaQuery.isLoading} />
        <ContratosStatusChart dados={contratosStatusQuery.data?.data ?? []} carregando={contratosStatusQuery.isLoading} />
      </div>

      {/* Gráficos — linha 2 (2 colunas) */}
      <div className="grid gap-6 lg:grid-cols-2">
        <FaturasMensalChart dados={faturasMensalQuery.data?.data ?? []} carregando={faturasMensalQuery.isLoading} />
        <PrefeiturasEvolucaoChart dados={prefEvolucaoQuery.data?.data ?? []} carregando={prefEvolucaoQuery.isLoading} />
      </div>

      {/* Tabela de faturas recentes */}
      <FaturasRecentesTable faturas={faturasRecentesQuery.data?.data ?? []} carregando={faturasRecentesQuery.isLoading} />
    </div>
  );
}
