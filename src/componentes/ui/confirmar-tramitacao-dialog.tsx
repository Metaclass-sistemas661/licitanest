import { useState } from "react";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Badge } from "@/componentes/ui/badge";
import {
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2,
} from "lucide-react";
import type { StatusWorkflow } from "@/tipos";
import { LABELS_WORKFLOW, CORES_WORKFLOW } from "@/servicos/workflow";

interface ConfirmarTramitacaoDialogProps {
  aberto: boolean;
  statusAtual: StatusWorkflow;
  statusNovo: StatusWorkflow;
  descricaoObjeto: string;
  onConfirmar: (observacoes: string, motivo?: string) => Promise<void>;
  onCancelar: () => void;
}

export function ConfirmarTramitacaoDialog({
  aberto,
  statusAtual,
  statusNovo,
  descricaoObjeto,
  onConfirmar,
  onCancelar,
}: ConfirmarTramitacaoDialogProps) {
  const [observacoes, setObservacoes] = useState("");
  const [motivo, setMotivo] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!aberto) return null;

  const isDevolucao = statusNovo === "devolvida";
  const isAprovacao = statusNovo === "aprovada" || statusNovo === "publicada";

  const handleConfirmar = async () => {
    if (isDevolucao && !motivo.trim()) {
      setErro("Informe o motivo da devolução.");
      return;
    }

    setCarregando(true);
    setErro(null);
    try {
      await onConfirmar(observacoes, isDevolucao ? motivo : undefined);
      setObservacoes("");
      setMotivo("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao tramitar");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancelar}
      />

      {/* Dialog */}
      <div className="relative bg-background rounded-lg shadow-xl max-w-md w-full mx-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Confirmar Tramitação</h3>
          <Button variant="ghost" size="icon" onClick={onCancelar}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Objeto */}
        <p className="text-sm text-muted-foreground">
          {descricaoObjeto || "Cesta sem descrição"}
        </p>

        {/* Transição visual */}
        <div className="flex items-center gap-3 justify-center py-2">
          <Badge className={CORES_WORKFLOW[statusAtual]}>
            {LABELS_WORKFLOW[statusAtual]}
          </Badge>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <Badge className={CORES_WORKFLOW[statusNovo]}>
            {LABELS_WORKFLOW[statusNovo]}
          </Badge>
        </div>

        {/* Aviso para devolução */}
        {isDevolucao && (
          <div className="flex items-start gap-2 text-sm bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 rounded p-3">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>A cesta será devolvida para revisão. Informe o motivo.</span>
          </div>
        )}

        {/* Aviso para aprovação */}
        {isAprovacao && (
          <div className="flex items-start gap-2 text-sm bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 rounded p-3">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              {statusNovo === "aprovada"
                ? "A cesta será aprovada e bloqueada para edição."
                : "A cesta será publicada oficialmente."}
            </span>
          </div>
        )}

        {/* Observações */}
        <div>
          <label className="text-sm font-medium">Observações</label>
          <Input
            placeholder="Observações da tramitação (opcional)..."
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            className="mt-1"
          />
        </div>

        {/* Motivo (apenas devolução) */}
        {isDevolucao && (
          <div>
            <label className="text-sm font-medium">
              Motivo da devolução <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Informe o motivo..."
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
                if (erro) setErro(null);
              }}
              className="mt-1"
            />
          </div>
        )}

        {/* Erro */}
        {erro && (
          <p className="text-sm text-red-600">{erro}</p>
        )}

        {/* Ações */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancelar} disabled={carregando}>
            Cancelar
          </Button>
          <Button
            variant={isDevolucao ? "destructive" : "default"}
            onClick={handleConfirmar}
            disabled={carregando}
          >
            {carregando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isDevolucao ? "Devolver" : "Confirmar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmarTramitacaoDialog;
