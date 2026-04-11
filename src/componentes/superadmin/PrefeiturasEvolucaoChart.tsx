import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartExportWrapper } from "@/componentes/ui/chart-export-wrapper";
import { SkeletonChart } from "@/componentes/ui/skeleton";
import type { PrefeituraEvolucao } from "@/servicos/dashboard-superadmin";

interface PrefeiturasEvolucaoChartProps {
  dados: PrefeituraEvolucao[];
  carregando: boolean;
}

function formatMes(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

export function PrefeiturasEvolucaoChart({ dados, carregando }: PrefeiturasEvolucaoChartProps) {
  if (carregando) return <SkeletonChart height={280} />;

  const chartData = dados.map((d) => ({
    mes: formatMes(d.mes),
    prefeituras: d.prefeituras,
  }));

  return (
    <ChartExportWrapper
      nomeArquivo="prefeituras-evolucao"
      dados={chartData}
      className="rounded-xl border bg-card p-6"
    >
      <h3 className="mb-4 text-sm font-semibold">Evolução de Prefeituras Ativas</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="mes" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
          <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" allowDecimals={false} />
          <Tooltip
            formatter={(v) => [`${v} prefeituras`, "Ativas"]}
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Line
            type="monotone"
            dataKey="prefeituras"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ r: 4, fill: "#8b5cf6" }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartExportWrapper>
  );
}
