import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ChartExportWrapper } from "@/componentes/ui/chart-export-wrapper";
import { SkeletonChart } from "@/componentes/ui/skeleton";
import type { ContratoStatus } from "@/servicos/dashboard-superadmin";

interface ContratosStatusChartProps {
  dados: ContratoStatus[];
  carregando: boolean;
}

const STATUS_CORES: Record<string, string> = {
  ativo: "#22c55e",
  rascunho: "#94a3b8",
  pendente_assinatura: "#f59e0b",
  suspenso: "#ef4444",
  encerrado: "#6366f1",
  cancelado: "#dc2626",
  renovacao: "#06b6d4",
};

const STATUS_LABELS: Record<string, string> = {
  ativo: "Ativo",
  rascunho: "Rascunho",
  pendente_assinatura: "Pend. Assinatura",
  suspenso: "Suspenso",
  encerrado: "Encerrado",
  cancelado: "Cancelado",
  renovacao: "Renovação",
};

export function ContratosStatusChart({ dados, carregando }: ContratosStatusChartProps) {
  if (carregando) return <SkeletonChart height={280} />;

  const total = dados.reduce((s, d) => s + d.quantidade, 0);
  const chartData = dados.map((d) => ({
    name: STATUS_LABELS[d.status] || d.status,
    value: d.quantidade,
    fill: STATUS_CORES[d.status] || "#94a3b8",
  }));

  return (
    <ChartExportWrapper
      nomeArquivo="contratos-status"
      dados={chartData}
      className="rounded-xl border bg-card p-6"
    >
      <h3 className="mb-4 text-sm font-semibold">Status dos Contratos</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={95}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            strokeWidth={0}
          >
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v, name) => [`${v} (${total ? Math.round((Number(v) / total) * 100) : 0}%)`, name]}
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: "11px" }}
          />
          {/* Centro do donut */}
          <text
            x="50%"
            y="45%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-foreground text-2xl font-bold"
          >
            {total}
          </text>
          <text
            x="50%"
            y="55%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-muted-foreground text-xs"
          >
            contratos
          </text>
        </PieChart>
      </ResponsiveContainer>
    </ChartExportWrapper>
  );
}
