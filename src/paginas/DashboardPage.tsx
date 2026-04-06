import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import {
  ShoppingBasket,
  Package,
  Users,
  FileBarChart2,
  TrendingUp,
  TrendingDown,
  Clock,
  Loader2,
  BarChart3,
  SendHorizonal,
  AlertTriangle,
  CheckCircle2,
  PieChart,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/componentes/ui/button";
import { useDashboard } from "@/hooks/useDashboard";
import { useAuth } from "@/hooks/useAuth";
import type { Atividade, FonteUtilizacao, TipoAtividade } from "@/tipos";

// ── Formatadores ─────────────────────────────────────
function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Ícones de atividade
const ATIVIDADE_ICONE: Partial<Record<TipoAtividade, typeof CheckCircle2>> = {
  cesta_criada: ShoppingBasket,
  cesta_concluida: CheckCircle2,
  preco_excluido: AlertTriangle,
  cotacao_criada: SendHorizonal,
  cotacao_enviada: SendHorizonal,
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { temPermissao } = useAuth();
  const {
    metricas,
    ipca,
    fontes,
    atividades,
    economia,
    cestasSecretaria,
    carregando,
  } = useDashboard();

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const m = metricas;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Visão geral do sistema de pesquisa de preços
          </p>
        </div>
        {temPermissao("administrador") && (
          <Button variant="outline" onClick={() => navigate("/painel-gestor")}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Painel do Gestor
          </Button>
        )}
      </div>

      {/* ── Cards de estatísticas ─────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Cestas Ativas"
          valor={String(m?.cestas_ativas ?? 0)}
          subtext={`${m?.cestas_concluidas ?? 0} concluídas • ${m?.cestas_mes_atual ?? 0} este mês`}
          icon={ShoppingBasket}
          cor="text-blue-600"
          onClick={() => navigate("/cestas")}
        />
        <StatCard
          label="Itens no Catálogo"
          valor={String(m?.total_produtos_catalogo ?? 0)}
          subtext={`${m?.total_precos ?? 0} preços coletados`}
          icon={Package}
          cor="text-emerald-600"
          onClick={() => navigate("/catalogo")}
        />
        <StatCard
          label="Fornecedores"
          valor={String(m?.total_fornecedores ?? 0)}
          subtext={`${m?.cotacoes_ativas ?? 0} cotações ativas`}
          icon={Users}
          cor="text-violet-600"
          onClick={() => navigate("/fornecedores")}
        />
        <StatCard
          label="IPCA Acumulado (12m)"
          valor={ipca ? `${ipca.acumulado_12m.toFixed(2)}%` : "—"}
          subtext={ipca ? `Ref: ${ipca.ultimo_mes}` : "Sem dados importados"}
          icon={TrendingUp}
          cor="text-amber-600"
        />
      </div>

      {/* ── Segunda linha: Economia + Preços ──────── */}
      {economia && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Economia Estimada</CardTitle>
              <TrendingDown className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-700">
                {moeda(economia.economia)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {economia.percentual > 0
                  ? `${economia.percentual.toFixed(1)}% de economia média (menor preço vs média)`
                  : "Comparação entre menor preço e média geral"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cotações Eletrônicas</CardTitle>
              <SendHorizonal className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {m?.total_cotacoes ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {m?.cotacoes_ativas ?? 0} ativas •{" "}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => navigate("/cotacoes")}
                >
                  Ver todas →
                </button>
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Fontes + Cestas por Secretaria + Atividade ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Fontes mais utilizadas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5" />
              Fontes de Preços
            </CardTitle>
            <CardDescription>Mais utilizadas</CardDescription>
          </CardHeader>
          <CardContent>
            {fontes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma fonte com preços registrados.
              </p>
            ) : (
              <div className="space-y-2">
                {fontes.slice(0, 8).map((f) => (
                  <FonteBar key={f.fonte_id} fonte={f} maxPrecos={fontes[0]?.total_precos ?? 1} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cestas por secretaria (gráfico simplificado) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PieChart className="h-5 w-5" />
              Cestas por Secretaria
            </CardTitle>
            <CardDescription>Distribuição</CardDescription>
          </CardHeader>
          <CardContent>
            {cestasSecretaria.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma cesta criada ainda.
              </p>
            ) : (
              <div className="space-y-2">
                {cestasSecretaria.map((cs, i) => {
                  const max = Math.max(...cestasSecretaria.map((c) => c.total));
                  const largura = max > 0 ? (cs.total / max) * 100 : 0;
                  const cores = [
                    "bg-blue-500", "bg-emerald-500", "bg-violet-500",
                    "bg-amber-500", "bg-pink-500", "bg-teal-500",
                    "bg-orange-500", "bg-cyan-500",
                  ];
                  return (
                    <div key={cs.nome} className="flex items-center gap-2">
                      <span className="w-16 text-right text-xs font-mono text-muted-foreground truncate">
                        {cs.nome}
                      </span>
                      <div className="flex-1 h-4 bg-muted/30 rounded overflow-hidden">
                        <div
                          className={`h-full rounded ${cores[i % cores.length]}`}
                          style={{ width: `${largura}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-xs font-bold">
                        {cs.total}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Atividade recente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" />
              Atividade Recente
            </CardTitle>
            <CardDescription>Últimas ações no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {atividades.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma atividade recente. Comece criando uma nova cesta de preços.
              </p>
            ) : (
              <div className="space-y-3">
                {atividades.slice(0, 8).map((a) => (
                  <AtividadeItem key={a.id} atividade={a} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Alertas / Preços excluídos ────────────── */}
      {m && m.total_precos_excluidos > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {m.total_precos_excluidos} preço{m.total_precos_excluidos !== 1 && "s"} excluído{m.total_precos_excluidos !== 1 && "s"} do cálculo
              </p>
              <p className="text-xs text-muted-foreground">
                Preços marcados como destoantes na análise crítica das cestas
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate("/cestas")}>
              Ver Cestas <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Sub-componentes ──────────────────────────────────

function StatCard({
  label,
  valor,
  subtext,
  icon: Icon,
  cor,
  onClick,
}: {
  label: string;
  valor: string;
  subtext: string;
  icon: React.ComponentType<{ className?: string }>;
  cor: string;
  onClick?: () => void;
}) {
  return (
    <Card
      className={onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <Icon className={`h-4 w-4 ${cor}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{valor}</div>
        <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
      </CardContent>
    </Card>
  );
}

function FonteBar({ fonte, maxPrecos }: { fonte: FonteUtilizacao; maxPrecos: number }) {
  const largura = maxPrecos > 0 ? (fonte.total_precos / maxPrecos) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 text-right text-xs font-mono text-muted-foreground truncate" title={fonte.nome}>
        {fonte.sigla}
      </span>
      <div className="flex-1 h-3.5 bg-muted/30 rounded overflow-hidden">
        <div
          className="h-full rounded bg-primary/70"
          style={{ width: `${largura}%` }}
        />
      </div>
      <span className="w-12 text-right text-xs font-medium">
        {fonte.total_precos}
      </span>
    </div>
  );
}

function AtividadeItem({ atividade }: { atividade: Atividade }) {
  const Icon = ATIVIDADE_ICONE[atividade.tipo] ?? FileBarChart2;
  const tempo = formatarTempoRelativo(atividade.criado_em);

  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className="h-3 w-3 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs leading-snug">{atividade.descricao}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-[10px] text-muted-foreground">{tempo}</span>
          {atividade.servidor && (
            <>
              <span className="text-[10px] text-muted-foreground">•</span>
              <span className="text-[10px] text-muted-foreground">{atividade.servidor.nome}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function formatarTempoRelativo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d atrás`;
  return new Date(isoDate).toLocaleDateString("pt-BR");
}
