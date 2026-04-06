import {
  Card,
  CardContent,
} from "@/componentes/ui/card";
import { Badge } from "@/componentes/ui/badge";
import { Button } from "@/componentes/ui/button";
import { Separator } from "@/componentes/ui/separator";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  GitBranch,
  ArrowRight,
  User,
  MessageSquare,
  X,
  Loader2,
  FileCheck,
  AlertCircle,
} from "lucide-react";
import { useTramitacoes } from "@/hooks/useFase17";
import type { CestaWorkflow, StatusWorkflow, TramitacaoCesta } from "@/tipos";
import { LABELS_WORKFLOW, CORES_WORKFLOW } from "@/servicos/workflow";

interface WorkflowTimelineDrawerProps {
  cesta: CestaWorkflow;
  aberto: boolean;
  onFechar: () => void;
}

function iconeStatus(status: StatusWorkflow) {
  switch (status) {
    case "aprovada":
    case "publicada":
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case "devolvida":
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    case "aguardando_aprovacao":
      return <Clock className="h-4 w-4 text-amber-600" />;
    case "expirada":
      return <AlertCircle className="h-4 w-4 text-rose-600" />;
    default:
      return <GitBranch className="h-4 w-4 text-blue-600" />;
  }
}

export function WorkflowTimelineDrawer({
  cesta,
  aberto,
  onFechar,
}: WorkflowTimelineDrawerProps) {
  const { tramitacoes, carregando } = useTramitacoes(aberto ? cesta.id : "");

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onFechar}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-lg bg-background shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-background z-10 p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-lg">Histórico de Tramitações</h2>
            <p className="text-sm text-muted-foreground truncate">
              {cesta.descricao_objeto || "Sem descrição"}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onFechar}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {/* Status atual */}
          <Card>
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status atual:</span>
                <Badge className={CORES_WORKFLOW[cesta.status_workflow]}>
                  {LABELS_WORKFLOW[cesta.status_workflow]}
                </Badge>
              </div>
              {cesta.checklist_aprovado && (
                <div className="flex items-center gap-2 mt-2 text-sm text-green-600">
                  <FileCheck className="h-4 w-4" />
                  Checklist de conformidade aprovado
                </div>
              )}
              {cesta.expira_em && (
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Expira em: {new Date(cesta.expira_em).toLocaleDateString("pt-BR")}
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Timeline */}
          {carregando ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Carregando histórico...
            </div>
          ) : tramitacoes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma tramitação registrada
            </div>
          ) : (
            <div className="relative">
              {/* Linha vertical da timeline */}
              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-border" />

              <div className="space-y-0">
                {tramitacoes.map((t, idx) => (
                  <TimelineItem
                    key={t.id || idx}
                    tramitacao={t}
                    primeiro={idx === 0}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TimelineItem({
  tramitacao,
  primeiro,
}: {
  tramitacao: TramitacaoCesta;
  primeiro: boolean;
}) {
  const data = tramitacao.criado_em
    ? new Date(tramitacao.criado_em)
    : null;

  return (
    <div className="relative pl-10 pb-6">
      {/* Dot na timeline */}
      <div
        className={`absolute left-2.5 top-1 h-3 w-3 rounded-full border-2 border-background ${
          primeiro ? "bg-primary" : "bg-muted-foreground/40"
        }`}
      />

      <div className={`space-y-1 ${primeiro ? "" : "opacity-80"}`}>
        {/* Transição */}
        <div className="flex items-center gap-2 flex-wrap">
          {iconeStatus(tramitacao.status_anterior as StatusWorkflow)}
          <Badge variant="outline" className="text-xs">
            {LABELS_WORKFLOW[tramitacao.status_anterior as StatusWorkflow] || tramitacao.status_anterior}
          </Badge>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          {iconeStatus(tramitacao.status_novo as StatusWorkflow)}
          <Badge className={CORES_WORKFLOW[tramitacao.status_novo as StatusWorkflow] || ""}>
            {LABELS_WORKFLOW[tramitacao.status_novo as StatusWorkflow] || tramitacao.status_novo}
          </Badge>
        </div>

        {/* Detalhes */}
        <div className="text-xs text-muted-foreground space-y-0.5">
          {(tramitacao as any).servidor && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {(tramitacao as any).servidor.nome || (tramitacao as any).servidor.email}
            </div>
          )}
          {data && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {data.toLocaleString("pt-BR")}
            </div>
          )}
        </div>

        {/* Observações */}
        {tramitacao.observacoes && (
          <div className="flex items-start gap-1 text-xs bg-muted/50 rounded p-2 mt-1">
            <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
            <span>{tramitacao.observacoes}</span>
          </div>
        )}

        {/* Motivo devolução */}
        {tramitacao.motivo_devolucao && (
          <div className="flex items-start gap-1 text-xs bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 rounded p-2 mt-1">
            <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
            <span><strong>Motivo:</strong> {tramitacao.motivo_devolucao}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkflowTimelineDrawer;
