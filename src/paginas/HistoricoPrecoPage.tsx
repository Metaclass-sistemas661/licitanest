import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Search,
  BarChart3,
  Calendar,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import {
  obterHistoricoPrecos,
  listarProdutosComPrecos,
} from "@/servicos/historicoPrecos";
import type { HistoricoPrecoItem } from "@/tipos";
import { cn } from "@/lib/utils";

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface ProdutoOpcao {
  id: string;
  descricao: string;
  codigo: string | null;
  unidade_medida: { sigla: string }[] | { sigla: string } | null;
  categoria: { nome: string }[] | { nome: string } | null;
}

export function HistoricoPrecoPage() {
  const [produtos, setProdutos] = useState<ProdutoOpcao[]>([]);
  const [produtoId, setProdutoId] = useState("");
  const [meses, setMeses] = useState(12);
  const [carregandoProdutos, setCarregandoProdutos] = useState(true);
  const [carregando, setCarregando] = useState(false);
  const [historico, setHistorico] = useState<HistoricoPrecoItem | null>(null);
  const [busca, setBusca] = useState("");
  const [tipoGrafico, setTipoGrafico] = useState<"line" | "area">("area");

  useEffect(() => {
    listarProdutosComPrecos()
      .then(setProdutos)
      .catch(() => toast.error("Erro ao carregar produtos"))
      .finally(() => setCarregandoProdutos(false));
  }, []);

  const handleBuscar = useCallback(async () => {
    if (!produtoId) {
      toast.warning("Selecione um produto");
      return;
    }
    setCarregando(true);
    try {
      const res = await obterHistoricoPrecos(produtoId, meses);
      setHistorico(res);
      if (res.pontos.length === 0) {
        toast.info("Nenhum dado de preço encontrado no período selecionado");
      }
    } catch {
      toast.error("Erro ao buscar histórico de preços");
    } finally {
      setCarregando(false);
    }
  }, [produtoId, meses]);

  const produtosFiltrados = busca.trim()
    ? produtos.filter(
        (p) =>
          p.descricao.toLowerCase().includes(busca.toLowerCase()) ||
          p.codigo?.toLowerCase().includes(busca.toLowerCase()),
      )
    : produtos;

  // Dados formatados para recharts
  const dadosGrafico = historico?.pontos.map((p) => ({
    mes: formatarMes(p.data),
    "Média": p.valor_medio,
    "Mínimo": p.valor_minimo,
    "Máximo": p.valor_maximo,
    fontes: p.total_fontes,
  })) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Histórico de Preços
        </h2>
        <p className="text-muted-foreground">
          Acompanhe a evolução temporal dos preços por produto
        </p>
      </div>

      {/* Seleção de produto */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Selecione o Produto</CardTitle>
          <CardDescription>
            Escolha um produto do catálogo para ver a evolução de preços
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Produto</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filtrar produtos..."
                  className="mb-2 w-full rounded-lg border border-input bg-background py-2 pl-10 pr-4 text-sm"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>
              <select
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={produtoId}
                onChange={(e) => setProdutoId(e.target.value)}
                disabled={carregandoProdutos}
                size={5}
              >
                <option value="">Selecione...</option>
                {produtosFiltrados.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.descricao} ({Array.isArray(p.unidade_medida) ? p.unidade_medida[0]?.sigla : p.unidade_medida?.sigla ?? "UN"}) — {Array.isArray(p.categoria) ? p.categoria[0]?.nome : p.categoria?.nome ?? ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <select
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={meses}
                onChange={(e) => setMeses(Number(e.target.value))}
              >
                <option value={3}>3 meses</option>
                <option value={6}>6 meses</option>
                <option value={12}>12 meses</option>
                <option value={24}>24 meses</option>
              </select>
            </div>

            <Button
              onClick={handleBuscar}
              disabled={carregando || !produtoId}
              className="shrink-0"
            >
              {carregando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <BarChart3 className="mr-2 h-4 w-4" />
              )}
              Gerar Gráfico
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultado */}
      {historico && historico.pontos.length > 0 && (
        <>
          {/* Cards resumo */}
          <div className="grid gap-4 md:grid-cols-4">
            <SummaryCard
              label="Variação no Período"
              valor={
                historico.variacao_12m != null
                  ? `${historico.variacao_12m > 0 ? "+" : ""}${historico.variacao_12m.toFixed(2)}%`
                  : "—"
              }
              icone={
                historico.tendencia === "alta"
                  ? TrendingUp
                  : historico.tendencia === "baixa"
                    ? TrendingDown
                    : Minus
              }
              cor={
                historico.tendencia === "alta"
                  ? "text-red-600"
                  : historico.tendencia === "baixa"
                    ? "text-green-600"
                    : "text-muted-foreground"
              }
            />
            <SummaryCard
              label="Último Preço Médio"
              valor={moeda(
                historico.pontos[historico.pontos.length - 1].valor_medio,
              )}
              icone={Calendar}
              cor="text-blue-600"
            />
            <SummaryCard
              label="Menor Registrado"
              valor={moeda(
                Math.min(...historico.pontos.map((p) => p.valor_minimo)),
              )}
              icone={TrendingDown}
              cor="text-green-600"
            />
            <SummaryCard
              label="Maior Registrado"
              valor={moeda(
                Math.max(...historico.pontos.map((p) => p.valor_maximo)),
              )}
              icone={TrendingUp}
              cor="text-red-600"
            />
          </div>

          {/* Gráfico */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {historico.descricao}
                  </CardTitle>
                  <CardDescription>
                    Evolução de preços — últimos {meses} meses ({historico.unidade})
                  </CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant={tipoGrafico === "area" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTipoGrafico("area")}
                  >
                    Área
                  </Button>
                  <Button
                    variant={tipoGrafico === "line" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTipoGrafico("line")}
                  >
                    Linha
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {tipoGrafico === "area" ? (
                    <AreaChart data={dadosGrafico}>
                      <defs>
                        <linearGradient id="colorMedia" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-primary, #3b82f6)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--color-primary, #3b82f6)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={(v) => `R$ ${v.toFixed(2)}`}
                      />
                      <Tooltip
                        formatter={(value: any, name: any) => [
                          moeda(Number(value)),
                          name,
                        ]}
                        labelFormatter={(label) => `Mês: ${label}`}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="Máximo"
                        stroke="#ef4444"
                        fill="none"
                        strokeDasharray="4 4"
                        strokeWidth={1}
                      />
                      <Area
                        type="monotone"
                        dataKey="Média"
                        stroke="var(--color-primary, #3b82f6)"
                        fill="url(#colorMedia)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="Mínimo"
                        stroke="#22c55e"
                        fill="none"
                        strokeDasharray="4 4"
                        strokeWidth={1}
                      />
                    </AreaChart>
                  ) : (
                    <LineChart data={dadosGrafico}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={(v) => `R$ ${v.toFixed(2)}`}
                      />
                      <Tooltip
                        formatter={(value: any, name: any) => [
                          moeda(Number(value)),
                          name,
                        ]}
                        labelFormatter={(label) => `Mês: ${label}`}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="Máximo"
                        stroke="#ef4444"
                        strokeDasharray="4 4"
                        strokeWidth={1}
                        dot={{ r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Média"
                        stroke="var(--color-primary, #3b82f6)"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Mínimo"
                        stroke="#22c55e"
                        strokeDasharray="4 4"
                        strokeWidth={1}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de dados */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Info className="h-4 w-4" />
                Dados Detalhados
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Mês</th>
                    <th className="px-3 py-3 text-right font-medium">Média</th>
                    <th className="px-3 py-3 text-right font-medium">Mínimo</th>
                    <th className="px-3 py-3 text-right font-medium">Máximo</th>
                    <th className="px-3 py-3 text-right font-medium">Fontes</th>
                    <th className="px-3 py-3 text-left font-medium">
                      Fonte Principal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {historico.pontos.map((p) => (
                    <tr key={p.data} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-2 font-medium">
                        {formatarMes(p.data)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {moeda(p.valor_medio)}
                      </td>
                      <td className="px-3 py-2 text-right text-green-600">
                        {moeda(p.valor_minimo)}
                      </td>
                      <td className="px-3 py-2 text-right text-red-600">
                        {moeda(p.valor_maximo)}
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground">
                        {p.total_fontes}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {p.fonte_principal ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ── Componentes internos ──────────────────────────────

function SummaryCard({
  label,
  valor,
  icone: Icone,
  cor,
}: {
  label: string;
  valor: string;
  icone: React.ComponentType<{ className?: string }>;
  cor: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-4">
        <div className={cn("rounded-lg bg-muted p-2", cor)}>
          <Icone className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-lg font-bold">{valor}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatarMes(data: string): string {
  const [ano, mes] = data.split("-");
  const meses = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  return `${meses[parseInt(mes, 10) - 1]}/${ano.slice(2)}`;
}
