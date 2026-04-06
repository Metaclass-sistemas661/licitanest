// Painel do Gestor — visão consolidada para administradores
// Mostra métricas de TODAS as secretarias, ranking de economia, cestas pendentes
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Badge } from "@/componentes/ui/badge";
import { Button } from "@/componentes/ui/button";
import {
  ArrowLeft,
  Building2,
  Clock,
  FileBarChart2,
  Loader2,
  AlertCircle,
  Trophy,
  TrendingDown,
  ShoppingBasket,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePainelGestor } from "@/hooks/useDashboard";
import type { Atividade, TipoAtividade } from "@/tipos";

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const ATIVIDADE_ICONE: Partial<Record<TipoAtividade, typeof FileBarChart2>> = {
  cesta_criada: ShoppingBasket,
  cesta_concluida: Trophy,
  cotacao_enviada: FileBarChart2,
};

export function PainelGestorPage() {
  const navigate = useNavigate();
  const { metricas, atividades, carregando, erro } = usePainelGestor();

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="space-y-4 text-center py-20">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">{erro}</p>
      </div>
    );
  }

  // Totais consolidados
  const totalCestas = metricas.reduce((a, m) => a + m.total_cestas, 0);
  const totalAtivas = metricas.reduce((a, m) => a + m.cestas_ativas, 0);
  const totalConcluidas = metricas.reduce((a, m) => a + m.cestas_concluidas, 0);
  const totalPendentes = metricas.reduce((a, m) => a + m.cestas_pendentes_antigas, 0);
  const totalEconomia = metricas.reduce((a, m) => a + m.economia_estimada, 0);
  const totalValorMedia = metricas.reduce((a, m) => a + m.valor_total_media, 0);
  const pctEconomiaGeral = totalValorMedia > 0
    ? Math.round((totalEconomia / totalValorMedia) * 10000) / 100
    : 0;

  // Ranking de economia (top 5)
  const ranking = [...metricas]
    .filter((m) => m.economia_estimada > 0)
    .sort((a, b) => b.percentual_economia - a.percentual_economia);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="sm" className="mt-1" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Painel do Gestor</h2>
          <p className="text-sm text-muted-foreground">
            Visão consolidada de todas as secretarias
          </p>
        </div>
      </div>

      {/* Cards consolidados */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Cestas</CardTitle>
            <ShoppingBasket className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCestas}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalAtivas} ativas • {totalConcluidas} concluídas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Economia Total</CardTitle>
            <TrendingDown className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">{moeda(totalEconomia)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {pctEconomiaGeral > 0 ? `${pctEconomiaGeral}% de economia média` : "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Secretarias</CardTitle>
            <Building2 className="h-4 w-4 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricas.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metricas.filter((m) => m.total_cestas > 0).length} com cestas ativas
            </p>
          </CardContent>
        </Card>

        <Card className={totalPendentes > 0 ? "border-amber-200" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes ({">"}30d)</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${totalPendentes > 0 ? "text-amber-600" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalPendentes > 0 ? "text-amber-600" : ""}`}>
              {totalPendentes}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Cestas ativas há mais de 30 dias
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de secretarias + Ranking + Atividades */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Tabela completa por secretaria */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" />
              Métricas por Secretaria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Secretaria</th>
                    <th className="px-3 py-2 text-right">Cestas</th>
                    <th className="px-3 py-2 text-right">Ativas</th>
                    <th className="px-3 py-2 text-right">Concluídas</th>
                    <th className="px-3 py-2 text-right">Pendentes</th>
                    <th className="px-3 py-2 text-right">Economia</th>
                    <th className="px-3 py-2 text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {metricas.map((m) => (
                    <tr key={m.secretaria_id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-2">
                        <div>
                          <p className="font-medium">{m.secretaria_nome}</p>
                          {m.secretaria_sigla && (
                            <p className="text-xs text-muted-foreground">{m.secretaria_sigla}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">{m.total_cestas}</td>
                      <td className="px-3 py-2 text-right">
                        {m.cestas_ativas > 0 ? (
                          <Badge variant="default">{m.cestas_ativas}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {m.cestas_concluidas > 0 ? (
                          <Badge variant="success">{m.cestas_concluidas}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {m.cestas_pendentes_antigas > 0 ? (
                          <Badge variant="warning">{m.cestas_pendentes_antigas}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-emerald-700">
                        {m.economia_estimada > 0 ? moeda(m.economia_estimada) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs">
                        {m.percentual_economia > 0 ? `${m.percentual_economia}%` : "—"}
                      </td>
                    </tr>
                  ))}
                  {metricas.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                        Nenhuma secretaria cadastrada
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Ranking + Atividades */}
        <div className="space-y-4">
          {/* Ranking de economia */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Trophy className="h-5 w-5 text-amber-500" />
                Ranking de Economia
              </CardTitle>
              <CardDescription>% de economia por secretaria</CardDescription>
            </CardHeader>
            <CardContent>
              {ranking.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sem dados de economia para ranking.
                </p>
              ) : (
                <div className="space-y-2">
                  {ranking.slice(0, 5).map((m, i) => (
                    <div key={m.secretaria_id} className="flex items-center gap-2">
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        i === 0 ? "bg-amber-100 text-amber-700" :
                        i === 1 ? "bg-gray-100 text-gray-600" :
                        i === 2 ? "bg-orange-100 text-orange-700" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {m.secretaria_sigla ?? m.secretaria_nome}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-emerald-700">
                        {m.percentual_economia}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Atividades recentes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5" />
                Atividade Recente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {atividades.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma atividade registrada.
                </p>
              ) : (
                <div className="space-y-3">
                  {atividades.slice(0, 10).map((a) => (
                    <AtividadeItemGestor key={a.id} atividade={a} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function formatarTempoRelativo(dataISO: string): string {
  const diff = Date.now() - new Date(dataISO).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min`;
  if (min < 1440) return `${Math.floor(min / 60)}h`;
  return `${Math.floor(min / 1440)}d`;
}

function AtividadeItemGestor({ atividade }: { atividade: Atividade }) {
  const Icon = ATIVIDADE_ICONE[atividade.tipo] ?? FileBarChart2;
  const tempo = formatarTempoRelativo(atividade.criado_em);

  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted">
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
          {atividade.secretaria && (
            <>
              <span className="text-[10px] text-muted-foreground">•</span>
              <Badge variant="outline" className="text-[9px] h-4 px-1">
                {atividade.secretaria.sigla ?? atividade.secretaria.nome}
              </Badge>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
