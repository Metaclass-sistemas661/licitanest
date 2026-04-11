import { useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  FileText,
  Building2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { AnimatedCounter } from "@/componentes/ui/animated-counter";
import { SkeletonStatCard } from "@/componentes/ui/skeleton";
import type { DashboardKpis } from "@/servicos/dashboard-superadmin";

interface KpiCardsDashboardProps {
  kpis: DashboardKpis | null;
  carregando: boolean;
}

function calcTendencia(atual: number, anterior: number): { pct: number; positivo: boolean } {
  if (anterior === 0) return { pct: atual > 0 ? 100 : 0, positivo: atual >= 0 };
  const pct = Math.round(((atual - anterior) / anterior) * 100);
  return { pct, positivo: pct >= 0 };
}

export function KpiCardsDashboard({ kpis, carregando }: KpiCardsDashboardProps) {
  const cards = useMemo(() => {
    if (!kpis) return [];

    const t = kpis.tendencia;

    return [
      {
        label: "Receita Contratada",
        valor: kpis.receita_total / 100,
        prefix: "R$ ",
        decimals: 0,
        icon: DollarSign,
        cor: "text-emerald-500",
        bgCor: "bg-emerald-500/10",
        tendencia: calcTendencia(kpis.receita_total, t.receita_total_anterior),
      },
      {
        label: "MRR",
        valor: kpis.mrr / 100,
        prefix: "R$ ",
        decimals: 0,
        icon: TrendingUp,
        cor: "text-blue-500",
        bgCor: "bg-blue-500/10",
        tendencia: calcTendencia(kpis.mrr, t.mrr_anterior),
      },
      {
        label: "Contratos Ativos",
        valor: kpis.contratos_ativos,
        prefix: "",
        decimals: 0,
        icon: FileText,
        cor: "text-violet-500",
        bgCor: "bg-violet-500/10",
        tendencia: calcTendencia(kpis.contratos_ativos, t.contratos_ativos_anterior),
      },
      {
        label: "Prefeituras Ativas",
        valor: kpis.prefeituras_ativas,
        prefix: "",
        decimals: 0,
        icon: Building2,
        cor: "text-amber-500",
        bgCor: "bg-amber-500/10",
        tendencia: calcTendencia(kpis.prefeituras_ativas, t.prefeituras_ativas_anterior),
      },
      {
        label: "Taxa Inadimplência",
        valor: kpis.taxa_inadimplencia,
        prefix: "",
        suffix: "%",
        decimals: 1,
        icon: AlertTriangle,
        cor: kpis.taxa_inadimplencia > 10 ? "text-red-500" : "text-emerald-500",
        bgCor: kpis.taxa_inadimplencia > 10 ? "bg-red-500/10" : "bg-emerald-500/10",
        tendenciaInversa: true,
      },
      {
        label: "Vencendo em 90 dias",
        valor: kpis.vencendo_90d,
        prefix: "",
        decimals: 0,
        icon: Clock,
        cor: kpis.vencendo_90d > 0 ? "text-orange-500" : "text-muted-foreground",
        bgCor: kpis.vencendo_90d > 0 ? "bg-orange-500/10" : "bg-muted/50",
      },
    ];
  }, [kpis]);

  if (carregando) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.bgCor}`}>
                <Icon className={`h-4 w-4 ${card.cor}`} />
              </div>
            </div>
            <div className="mt-2">
              <span className={`text-2xl font-bold ${card.cor}`}>
                <AnimatedCounter
                  value={card.valor}
                  prefix={card.prefix}
                  suffix={"suffix" in card ? card.suffix : ""}
                  decimals={card.decimals}
                />
              </span>
            </div>
            {"tendencia" in card && card.tendencia && (
              <div className="mt-1 flex items-center gap-1 text-xs">
                {card.tendencia.positivo ? (
                  <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500" />
                )}
                <span className={card.tendencia.positivo ? "text-emerald-500" : "text-red-500"}>
                  {Math.abs(card.tendencia.pct)}%
                </span>
                <span className="text-muted-foreground">vs mês anterior</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
