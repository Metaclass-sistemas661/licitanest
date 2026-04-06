import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import { Badge } from "@/componentes/ui/badge";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerBody,
  DrawerFooter,
} from "@/componentes/ui/drawer";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Search,
  Filter,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { SolicitacaoCatalogo, StatusSolicitacao, Servidor } from "@/tipos";
import {
  listarSolicitacoes,
  listarMinhasSolicitacoes,
  aprovarSolicitacao,
  recusarSolicitacao,
} from "@/servicos/solicitacoesCatalogo";

const STATUS_CONFIG: Record<StatusSolicitacao, { label: string; variant: "warning" | "success" | "destructive"; icon: React.ElementType }> = {
  pendente: { label: "Pendente", variant: "warning", icon: Clock },
  aprovada: { label: "Aprovada", variant: "success", icon: CheckCircle2 },
  recusada: { label: "Recusada", variant: "destructive", icon: XCircle },
};

interface Props {
  modoAdmin?: boolean;
}

export function PainelSolicitacoes({ modoAdmin = false }: Props) {
  const { servidor, temPermissao } = useAuth();
  const isAdmin = temPermissao("administrador", "gestor");
  const admin = modoAdmin && isAdmin;

  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoCatalogo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<StatusSolicitacao | "todas">("todas");
  const [busca, setBusca] = useState("");

  // Modal de resposta
  const [respondendo, setRespondendo] = useState<SolicitacaoCatalogo | null>(null);
  const [justificativaRecusa, setJustificativaRecusa] = useState("");
  const [processando, setProcessando] = useState(false);

  const carregar = useCallback(async () => {
    if (!servidor) return;
    setCarregando(true);
    setErro(null);
    try {
      const statusFiltro = filtroStatus !== "todas" ? filtroStatus : undefined;
      const dados = admin
        ? await listarSolicitacoes(statusFiltro)
        : await listarMinhasSolicitacoes(servidor.id);
      setSolicitacoes(
        filtroStatus !== "todas" && !admin
          ? dados.filter((s) => s.status === filtroStatus)
          : dados,
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar solicitações.");
    } finally {
      setCarregando(false);
    }
  }, [servidor, admin, filtroStatus]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const handleAprovar = async (sol: SolicitacaoCatalogo) => {
    if (!servidor) return;
    setProcessando(true);
    try {
      await aprovarSolicitacao(sol.id, servidor.id);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao aprovar.");
    } finally {
      setProcessando(false);
    }
  };

  const handleRecusar = async () => {
    if (!respondendo || !servidor || !justificativaRecusa.trim()) return;
    setProcessando(true);
    try {
      await recusarSolicitacao(respondendo.id, servidor.id, justificativaRecusa);
      setRespondendo(null);
      setJustificativaRecusa("");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao recusar.");
    } finally {
      setProcessando(false);
    }
  };

  const solicitacoesFiltradas = solicitacoes.filter(
    (s) =>
      s.descricao.toLowerCase().includes(busca.toLowerCase()) ||
      ((s.solicitante as unknown as Servidor)?.nome ?? "")
        .toLowerCase()
        .includes(busca.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar solicitação..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-1">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {(["todas", "pendente", "aprovada", "recusada"] as const).map((st) => (
            <Button
              key={st}
              variant={filtroStatus === st ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltroStatus(st)}
            >
              {st === "todas" ? "Todas" : STATUS_CONFIG[st].label}
            </Button>
          ))}
        </div>
      </div>

      {/* Erro */}
      {erro && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {admin ? "Solicitações de Inclusão" : "Minhas Solicitações"}
          </CardTitle>
          <CardDescription>
            {solicitacoesFiltradas.length} solicitação(ões)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {carregando ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : solicitacoesFiltradas.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma solicitação encontrada.
            </p>
          ) : (
            <div className="divide-y">
              {solicitacoesFiltradas.map((sol) => {
                const config = STATUS_CONFIG[sol.status];
                const Icon = config.icon;
                const solicitante = sol.solicitante as unknown as Servidor | undefined;

                return (
                  <div
                    key={sol.id}
                    className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{sol.descricao}</p>
                        <Badge variant={config.variant} className="shrink-0">
                          <Icon className="mr-1 h-3 w-3" />
                          {config.label}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Por {solicitante?.nome ?? "—"} em{" "}
                        {new Date(sol.criado_em).toLocaleDateString("pt-BR")}
                        {sol.justificativa && ` · "${sol.justificativa}"`}
                      </p>
                      {sol.resposta && (
                        <p className="mt-1 text-xs italic text-muted-foreground">
                          Resposta: {sol.resposta}
                        </p>
                      )}
                    </div>

                    {/* Botões de ação (admin, só pendentes) */}
                    {admin && sol.status === "pendente" && (
                      <div className="flex shrink-0 gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                          onClick={() => handleAprovar(sol)}
                          disabled={processando}
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => {
                            setRespondendo(sol);
                            setJustificativaRecusa("");
                          }}
                          disabled={processando}
                        >
                          <XCircle className="mr-1 h-3 w-3" />
                          Recusar
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drawer de recusa */}
      <Drawer
        open={!!respondendo}
        onOpenChange={(v) => {
          if (!v) setRespondendo(null);
        }}
      >
        <DrawerContent side="right">
          <DrawerHeader>
            <DrawerTitle>Recusar Solicitação</DrawerTitle>
            <DrawerDescription>
              Informe o motivo da recusa. O solicitante será notificado.
            </DrawerDescription>
          </DrawerHeader>
          <DrawerBody>
          <div className="space-y-3">
            <p className="text-sm">
              <strong>Item:</strong> {respondendo?.descricao}
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Justificativa *</label>
              <Textarea
                value={justificativaRecusa}
                onChange={(e) => setJustificativaRecusa(e.target.value)}
                placeholder="Ex: Item já existe como 'Detergente Neutro 500ml'."
                rows={3}
                required
              />
            </div>
          </div>
          </DrawerBody>
          <DrawerFooter>
            <Button variant="outline" onClick={() => setRespondendo(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRecusar}
              disabled={processando || !justificativaRecusa.trim()}
            >
              {processando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Recusa
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
