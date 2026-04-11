import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ChartExportWrapper } from "@/componentes/ui/chart-export-wrapper";
import { SkeletonChart } from "@/componentes/ui/skeleton";
import type { FaturaMensal } from "@/servicos/dashboard-superadmin";

interface FaturasMensalChartProps {
  dados: FaturaMensal[];
  carregando: boolean;
}

function formatMes(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

function formatBRL(centavos: number): string {
  if (centavos >= 100_000_00) return `R$ ${(centavos / 100_000_00).toFixed(0)}M`;
  if (centavos >= 1_000_00) return `R$ ${(centavos / 1_000_00).toFixed(0)}k`;
  return `R$ ${(centavos / 100).toFixed(0)}`;
}

export function FaturasMensalChart({ dados, carregando }: FaturasMensalChartProps) {
  if (carregando) return <SkeletonChart height={280} />;

  const chartData = dados.map((d) => ({
    mes: formatMes(d.mes),
    Recebido: d.recebido,
    Pendente: d.pendente,
    Vencido: d.vencido,
  }));

  return (
    <ChartExportWrapper
      nomeArquivo="faturas-mensal"
      dados={chartData}
      className="rounded-xl border bg-card p-6"
    >
      <h3 className="mb-4 text-sm font-semibold">Faturas Mensais (Recebido vs Pendente vs Vencido)</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="mes" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
          <YAxis tickFormatter={formatBRL} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
          <Tooltip
            formatter={(v, name) => [
              (Number(v) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
              name,
            ]}
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Legend
            verticalAlign="bottom"
            iconType="rect"
            iconSize={10}
            wrapperStyle={{ fontSize: "11px" }}
          />
          <Bar dataKey="Recebido" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
          <Bar dataKey="Pendente" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
          <Bar dataKey="Vencido" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartExportWrapper>
  );
}
