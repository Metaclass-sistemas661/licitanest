import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartExportWrapper } from "@/componentes/ui/chart-export-wrapper";
import { SkeletonChart } from "@/componentes/ui/skeleton";
import type { ReceitaMensal } from "@/servicos/dashboard-superadmin";

interface ReceitaMensalChartProps {
  dados: ReceitaMensal[];
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

export function ReceitaMensalChart({ dados, carregando }: ReceitaMensalChartProps) {
  if (carregando) return <SkeletonChart height={280} />;

  const chartData = dados.map((d) => ({
    mes: formatMes(d.mes),
    receita: d.receita,
  }));

  return (
    <ChartExportWrapper
      nomeArquivo="receita-mensal"
      dados={chartData}
      className="rounded-xl border bg-card p-6"
    >
      <h3 className="mb-4 text-sm font-semibold">Receita Mensal Acumulada</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="mes" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
          <YAxis tickFormatter={formatBRL} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
          <Tooltip
            formatter={(v) => [
              (Number(v) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
              "Receita",
            ]}
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Area
            type="monotone"
            dataKey="receita"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#gradReceita)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartExportWrapper>
  );
}
