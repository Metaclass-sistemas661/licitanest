// ═══════════════════════════════════════════════════════════════════════════════
// CotacoesPage — Fase 9 — Lista de cotações com filtros e ações
// ═══════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useConfirm } from "@/componentes/ui/confirm-dialog";
import { Card, CardContent } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Badge } from "@/componentes/ui/badge";
import { Separator } from "@/componentes/ui/separator";
import {
  Plus,
  Search,
  SendHorizonal,
  Mail,
  MailCheck,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Loader2,
  Users,
  Package,
  ChevronRight,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { useCotacoesPaginadas } from "@/hooks/useCotacoes";
import { NovaCotacaoDrawer } from "./NovaCotacaoDrawer";
import {
  STATUS_COTACAO_LABELS,
  STATUS_COTACAO_CORES,
  excluirCotacao,
} from "@/servicos/cotacoes";
import type { StatusCotacao } from "@/tipos";

const STATUS_ICONS: Record<StatusCotacao, React.ComponentType<{ className?: string }>> = {
  rascunho: FileText,
  enviada: Mail,
  em_resposta: MailCheck,
  encerrada: CheckCircle2,
  cancelada: XCircle,
};

// ── Formatadores ─────────────────────────────────────────────────────────────
function fmtData(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function CotacoesPage() {
  const navigate = useNavigate();
  const { cotacoes, total, carregando, erro, carregar } = useCotacoesPaginadas();
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<StatusCotacao | "">("");
  const [showNova, setShowNova] = useState(false);
  const [pagina, setPagina] = useState(1);

  const recarregar = useCallback(() => {
    carregar(
      { busca: busca || undefined, status: filtroStatus || undefined },
      pagina,
    );
  }, [carregar, busca, filtroStatus, pagina]);

  useEffect(() => { recarregar(); }, [recarregar]);

  const confirmar = useConfirm();

  const handleExcluir = async (id: string) => {
    const ok = await confirmar({
      title: "Excluir cotação",
      description: "Tem certeza que deseja excluir esta cotação? Esta ação não pode ser desfeita.",
      confirmLabel: "Excluir",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await excluirCotacao(id);
      toast.success("Cotação excluída com sucesso");
      recarregar();
    } catch {
      toast.error("Erro ao excluir cotação");
    }
  };

  // ── Contadores por status ────────────────────────────────────────────────
  const cont = {
    rascunho: cotacoes.filter(c => c.status === "rascunho").length,
    enviada: cotacoes.filter(c => c.status === "enviada").length,
    em_resposta: cotacoes.filter(c => c.status === "em_resposta").length,
    encerrada: cotacoes.filter(c => c.status === "encerrada").length,
  };

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Cotação Eletrônica</h2>
          <p className="text-muted-foreground">
            Envio de cotações para fornecedores com assinatura eletrônica
          </p>
        </div>
        <Button onClick={() => setShowNova(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Cotação
        </Button>
      </div>

      {/* ── Cards resumo ──────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-4">
        {(["rascunho", "enviada", "em_resposta", "encerrada"] as const).map((s) => {
          const Icon = STATUS_ICONS[s];
          return (
            <Card
              key={s}
              className={`cursor-pointer transition hover:shadow-md ${filtroStatus === s ? "ring-2 ring-primary" : ""}`}
              onClick={() => setFiltroStatus(prev => prev === s ? "" : s)}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`rounded-lg p-2 ${STATUS_COTACAO_CORES[s]}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{cont[s]}</p>
                  <p className="text-xs text-muted-foreground">{STATUS_COTACAO_LABELS[s]}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Filtros ───────────────────────────────────────────────────── */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cotação por título…"
            className="pl-10"
            value={busca}
            onChange={e => { setBusca(e.target.value); setPagina(1); }}
          />
        </div>
        {filtroStatus && (
          <Button variant="ghost" size="sm" onClick={() => setFiltroStatus("")}>
            Limpar filtro
          </Button>
        )}
      </div>

      {/* ── Lista ─────────────────────────────────────────────────────── */}
      {carregando ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Carregando cotações…
        </div>
      ) : erro ? (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5" />
          {erro}
        </div>
      ) : cotacoes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <SendHorizonal className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <h3 className="text-lg font-medium">Nenhuma cotação encontrada</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Crie uma nova cotação para enviar para fornecedores.
            </p>
            <Button className="mt-4" onClick={() => setShowNova(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeira Cotação
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {cotacoes.map((c) => {
            const Icon = STATUS_ICONS[c.status];
            const encerrada = new Date(c.data_encerramento) < new Date();
            const fornCount = (c as any).fornecedores?.length ?? 0;
            const itemCount = (c as any).itens?.length ?? 0;
            return (
              <Card
                key={c.id}
                className="cursor-pointer transition hover:shadow-md"
                onClick={() => navigate(`/cotacoes/${c.id}`)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  {/* Ícone status */}
                  <div className={`rounded-lg p-2 ${STATUS_COTACAO_CORES[c.status]}`}>
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate">{c.titulo}</span>
                      <Badge variant="outline" className={STATUS_COTACAO_CORES[c.status]}>
                        {STATUS_COTACAO_LABELS[c.status]}
                      </Badge>
                      {encerrada && c.status !== "encerrada" && c.status !== "cancelada" && (
                        <Badge variant="destructive" className="text-xs">Prazo vencido</Badge>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {fmtData(c.data_abertura)} → {fmtData(c.data_encerramento)}
                      </span>
                      {(c as any).cesta && (
                        <span className="flex items-center gap-1 truncate max-w-[200px]">
                          <Package className="h-3 w-3" />
                          {(c as any).cesta.descricao_objeto}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Métricas rápidas */}
                  <div className="hidden gap-6 text-center text-xs text-muted-foreground md:flex">
                    <div>
                      <Package className="mx-auto mb-1 h-4 w-4" />
                      <span className="font-medium">{itemCount}</span>
                      <p>Itens</p>
                    </div>
                    <div>
                      <Users className="mx-auto mb-1 h-4 w-4" />
                      <span className="font-medium">{fornCount}</span>
                      <p>Fornecedores</p>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1">
                    {c.status === "rascunho" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleExcluir(c.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <Separator />

          {/* Paginação */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {total} cotação(ões) encontrada(s)
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={pagina === 1}
                onClick={() => setPagina(p => p - 1)}
              >
                Anterior
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={cotacoes.length < 20}
                onClick={() => setPagina(p => p + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Drawer Nova Cotação ────────────────────────────────────── */}
      {showNova && (
        <NovaCotacaoDrawer
          aberto={showNova}
          onClose={() => setShowNova(false)}
          onCriada={(cotacao: { id: string }) => {
            setShowNova(false);
            navigate(`/cotacoes/${cotacao.id}`);
          }}
        />
      )}
    </div>
  );
}
