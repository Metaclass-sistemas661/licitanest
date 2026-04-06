import { useCallback, useState } from "react";
import {
  Card,
  CardContent,
} from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Badge } from "@/componentes/ui/badge";
import { Separator } from "@/componentes/ui/separator";
import {
  GitBranch,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  FileCheck,
  Lock,
  Filter,
  Search,
  ChevronRight,
  History,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkflow } from "@/hooks/useFase17";
import type { CestaWorkflow, StatusWorkflow } from "@/tipos";
import {
  LABELS_WORKFLOW,
  CORES_WORKFLOW,
  proximasTransicoes,
} from "@/servicos/workflow";
import { WorkflowTimelineDrawer } from "@/componentes/ui/workflow-timeline-drawer";
import { ConfirmarTramitacaoDialog } from "@/componentes/ui/confirmar-tramitacao-dialog";

const FILTROS_STATUS: Array<{ label: string; value: StatusWorkflow | "" }> = [
  { label: "Todos", value: "" },
  { label: "Rascunho", value: "rascunho" },
  { label: "Em Pesquisa", value: "em_pesquisa" },
  { label: "Em Análise", value: "em_analise" },
  { label: "Aguardando Aprovação", value: "aguardando_aprovacao" },
  { label: "Aprovada", value: "aprovada" },
  { label: "Devolvida", value: "devolvida" },
  { label: "Publicada", value: "publicada" },
];

export function WorkflowPage() {
  const { servidor } = useAuth();
  const [statusFiltro, setStatusFiltro] = useState<StatusWorkflow | "">("");
  const [busca, setBusca] = useState("");
  const [cestaSelecionada, setCestaSelecionada] = useState<CestaWorkflow | null>(null);
  const [cestaTimeline, setCestaTimeline] = useState<CestaWorkflow | null>(null);
  const [confirmacao, setConfirmacao] = useState<{
    cesta: CestaWorkflow;
    statusNovo: StatusWorkflow;
  } | null>(null);

  const { cestas, carregando, tramitar, recarregar } = useWorkflow(
    statusFiltro ? { status: statusFiltro as StatusWorkflow } : undefined,
  );

  const cestasFiltradas = cestas.filter((c) =>
    !busca || c.descricao_objeto?.toLowerCase().includes(busca.toLowerCase()),
  );

  const handleTramitar = useCallback(
    async (cestaId: string, novoStatus: StatusWorkflow, obs?: string, mot?: string) => {
      if (!servidor) return;
      try {
        await tramitar(
          cestaId,
          novoStatus,
          servidor.id,
          obs || undefined,
          novoStatus === "devolvida" ? mot || "Sem motivo informado" : undefined,
        );
        setCestaSelecionada(null);
        setConfirmacao(null);
      } catch {
        // Re-throw para o componente de confirmação exibir erro
        throw new Error("Falha ao tramitar cesta");
      }
    },
    [servidor, tramitar],
  );

  const abrirConfirmacao = useCallback(
    (cesta: CestaWorkflow, statusNovo: StatusWorkflow) => {
      setConfirmacao({ cesta, statusNovo });
    },
    [],
  );

  const getIconeStatus = (status: StatusWorkflow) => {
    switch (status) {
      case "aprovada":
      case "publicada":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "devolvida":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case "aguardando_aprovacao":
        return <Clock className="h-4 w-4 text-amber-600" />;
      default:
        return <GitBranch className="h-4 w-4 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GitBranch className="h-6 w-6" />
          Workflow de Aprovação
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tramitação e gestão de cestas de preços conforme fluxo de aprovação
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex gap-1 flex-wrap">
              {FILTROS_STATUS.map((f) => (
                <Button
                  key={f.value}
                  variant={statusFiltro === f.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFiltro(f.value as StatusWorkflow | "")}
                >
                  {f.label}
                </Button>
              ))}
            </div>
            <div className="flex-1 flex items-center gap-2 min-w-[200px]">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por objeto..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="h-8"
              />
            </div>
            <Button variant="ghost" size="sm" onClick={recarregar}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Em Pesquisa", count: cestas.filter((c) => c.status_workflow === "em_pesquisa").length, cor: "bg-blue-100 text-blue-700" },
          { label: "Aguardando Aprovação", count: cestas.filter((c) => c.status_workflow === "aguardando_aprovacao").length, cor: "bg-amber-100 text-amber-700" },
          { label: "Aprovadas", count: cestas.filter((c) => c.status_workflow === "aprovada").length, cor: "bg-green-100 text-green-700" },
          { label: "Devolvidas", count: cestas.filter((c) => c.status_workflow === "devolvida").length, cor: "bg-red-100 text-red-700" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="py-3 text-center">
              <p className="text-2xl font-bold">{s.count}</p>
              <Badge variant="outline" className={s.cor}>{s.label}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lista de cestas */}
      {carregando ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Carregando cestas...
          </CardContent>
        </Card>
      ) : cestasFiltradas.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Nenhuma cesta encontrada com os filtros aplicados
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {cestasFiltradas.map((cesta) => (
            <Card
              key={cesta.id}
              className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                cestaSelecionada?.id === cesta.id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() =>
                setCestaSelecionada(
                  cestaSelecionada?.id === cesta.id ? null : cesta,
                )
              }
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getIconeStatus(cesta.status_workflow)}
                      <span className="font-medium truncate">
                        {cesta.descricao_objeto || "Sem descrição"}
                      </span>
                      {cesta.bloqueada && (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>{cesta.secretaria_nome}</span>
                      <span>•</span>
                      <span>Criado por: {cesta.criador_nome}</span>
                      <span>•</span>
                      <span>{cesta.total_itens ?? 0} itens</span>
                      <span>•</span>
                      <span>{cesta.total_fontes_distintas ?? 0} fontes</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={CORES_WORKFLOW[cesta.status_workflow]}>
                      {LABELS_WORKFLOW[cesta.status_workflow]}
                    </Badge>
                    {cesta.checklist_aprovado && (
                      <FileCheck className="h-4 w-4 text-green-600" />
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                {/* Painel de ações (expandido) */}
                {cestaSelecionada?.id === cesta.id && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Ações disponíveis:</div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCestaTimeline(cesta);
                        }}
                      >
                        <History className="h-4 w-4 mr-1" />
                        Histórico
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {proximasTransicoes(cesta.status_workflow).map(
                        (novoStatus) => (
                          <Button
                            key={novoStatus}
                            size="sm"
                            variant={
                              novoStatus === "devolvida"
                                ? "destructive"
                                : novoStatus === "aprovada" ||
                                  novoStatus === "publicada"
                                ? "default"
                                : "secondary"
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              abrirConfirmacao(cesta, novoStatus);
                            }}
                          >
                            {novoStatus === "devolvida" && (
                              <RotateCcw className="h-3 w-3 mr-1" />
                            )}
                            {novoStatus === "aprovada" && (
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                            )}
                            {LABELS_WORKFLOW[novoStatus]}
                          </Button>
                        ),
                      )}
                    </div>

                    <Separator />

                    <div className="text-xs text-muted-foreground space-y-1">
                      {cesta.aprovador_nome && (
                        <p>Aprovador: {cesta.aprovador_nome}</p>
                      )}
                      {cesta.expira_em && (
                        <p>Expira em: {new Date(cesta.expira_em).toLocaleDateString("pt-BR")}</p>
                      )}
                      {cesta.ultima_tramitacao && (
                        <p>Última tramitação: {new Date(cesta.ultima_tramitacao).toLocaleString("pt-BR")}</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Timeline Drawer */}
      {cestaTimeline && (
        <WorkflowTimelineDrawer
          cesta={cestaTimeline}
          aberto={!!cestaTimeline}
          onFechar={() => setCestaTimeline(null)}
        />
      )}

      {/* Diálogo de confirmação */}
      {confirmacao && (
        <ConfirmarTramitacaoDialog
          aberto={!!confirmacao}
          statusAtual={confirmacao.cesta.status_workflow}
          statusNovo={confirmacao.statusNovo}
          descricaoObjeto={confirmacao.cesta.descricao_objeto || ""}
          onConfirmar={async (obs, mot) => {
            await handleTramitar(
              confirmacao.cesta.id,
              confirmacao.statusNovo,
              obs,
              mot,
            );
          }}
          onCancelar={() => setConfirmacao(null)}
        />
      )}
    </div>
  );
}

export default WorkflowPage;
