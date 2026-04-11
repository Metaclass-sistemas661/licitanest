import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/componentes/ui/card";
import { SkeletonTable } from "@/componentes/ui/skeleton";
import { EmptyState } from "@/componentes/ui/empty-state";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Badge } from "@/componentes/ui/badge";
import {
  FileSignature,
  Search,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Pause,
  Bell,
  BellDot,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  listarContratosPortal,
  listarNotificacoesPortal,
  marcarNotificacaoLida,
} from "@/servicos/contratos";
import type { Contrato, StatusContrato, ContratoNotificacao } from "@/tipos";

// ── Labels e variantes ───────────────────────────────
const STATUS_LABEL: Record<StatusContrato, string> = {
  rascunho: "Rascunho",
  pendente_assinatura: "Pendente Assinatura",
  ativo: "Ativo",
  suspenso: "Suspenso",
  encerrado: "Encerrado",
  cancelado: "Cancelado",
  renovacao: "Em Renovação",
};

const STATUS_VARIANT: Record<StatusContrato, string> = {
  rascunho: "secondary",
  pendente_assinatura: "warning",
  ativo: "success",
  suspenso: "warning",
  encerrado: "secondary",
  cancelado: "destructive",
  renovacao: "default",
};

const STATUS_ICON: Record<StatusContrato, React.ReactNode> = {
  rascunho: <Clock className="h-3 w-3" />,
  pendente_assinatura: <AlertTriangle className="h-3 w-3" />,
  ativo: <CheckCircle className="h-3 w-3" />,
  suspenso: <Pause className="h-3 w-3" />,
  encerrado: <XCircle className="h-3 w-3" />,
  cancelado: <XCircle className="h-3 w-3" />,
  renovacao: <Clock className="h-3 w-3" />,
};

const ASSINATURA_LABEL: Record<string, string> = {
  pendente: "Pendente",
  assinado: "Assinado",
  recusado: "Recusado",
  expirado: "Expirado",
};

const ASSINATURA_VARIANT: Record<string, string> = {
  pendente: "warning",
  assinado: "success",
  recusado: "destructive",
  expirado: "secondary",
};

function formatarMoeda(centavos: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(centavos / 100);
}

function calcularDiasRestantes(dataFim: string): number {
  return Math.ceil((new Date(dataFim).getTime() - Date.now()) / 86400000);
}

export function ContratosPortalPage() {
  const navigate = useNavigate();

  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [notificacoes, setNotificacoes] = useState<ContratoNotificacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");

  const naoLidas = notificacoes.filter((n) => !n.lido);
  const pendentes = contratos.filter((c) => c.status === "pendente_assinatura");

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [contRes, notRes] = await Promise.all([
        listarContratosPortal(),
        listarNotificacoesPortal(),
      ]);
      setContratos(contRes.data);
      setNotificacoes(notRes.data);
    } catch {
      toast.error("Erro ao carregar contratos");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Toast on load if pending contracts
  useEffect(() => {
    if (pendentes.length > 0) {
      toast.info(`Você tem ${pendentes.length} contrato(s) aguardando assinatura`, {
        duration: 6000,
        action: {
          label: "Ver pendentes",
          onClick: () => setStatusFiltro("pendente_assinatura"),
        },
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendentes.length]);

  const marcarLida = async (id: string) => {
    try {
      await marcarNotificacaoLida(id);
      setNotificacoes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lido: true, lido_em: new Date().toISOString() } : n)),
      );
    } catch {
      toast.error("Erro ao marcar notificação como lida");
    }
  };

  // Filtering
  const filtrados = contratos.filter((c) => {
    if (statusFiltro !== "todos" && c.status !== statusFiltro) return false;
    if (busca) {
      const q = busca.toLowerCase();
      return (
        c.numero_contrato?.toLowerCase().includes(q) ||
        c.objeto?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // KPIs
  const kpi = {
    total: contratos.length,
    pendentes: pendentes.length,
    ativos: contratos.filter((c) => c.status === "ativo").length,
    vencendo30d: contratos.filter(
      (c) => c.status === "ativo" && c.data_fim && calcularDiasRestantes(c.data_fim) <= 30 && calcularDiasRestantes(c.data_fim) > 0,
    ).length,
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Contratos</h2>
          <p className="text-muted-foreground">
            Gerencie os contratos recebidos da plataforma
          </p>
        </div>
      </div>

      {/* ── Banner Pendentes ── */}
      <AnimatePresence>
        {pendentes.length > 0 && statusFiltro !== "pendente_assinatura" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <span className="font-medium text-amber-800 dark:text-amber-200">
                    Você tem {pendentes.length} contrato(s) aguardando assinatura
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-500 text-amber-700 hover:bg-amber-100"
                  onClick={() => setStatusFiltro("pendente_assinatura")}
                >
                  Ver pendentes
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total", value: kpi.total, icon: FileSignature, color: "text-blue-600" },
          { label: "Pendentes", value: kpi.pendentes, icon: AlertTriangle, color: "text-amber-600" },
          { label: "Ativos", value: kpi.ativos, icon: CheckCircle, color: "text-emerald-600" },
          { label: "Vencendo 30d", value: kpi.vencendo30d, icon: Clock, color: "text-red-600" },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <k.icon className={`h-8 w-8 ${k.color}`} />
              <div>
                <p className="text-2xl font-bold">{k.value}</p>
                <p className="text-xs text-muted-foreground">{k.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Notificações não-lidas ── */}
      {naoLidas.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <BellDot className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">
                Notificações ({naoLidas.length})
              </span>
            </div>
            <div className="space-y-2">
              {naoLidas.slice(0, 5).map((n) => (
                <div
                  key={n.id}
                  className="flex items-center justify-between rounded-lg border bg-muted/30 p-3"
                >
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium">{n.titulo}</p>
                      <p className="text-xs text-muted-foreground">{n.mensagem}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => marcarLida(n.id)}
                  >
                    Marcar lida
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Filtros ── */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nº contrato ou objeto..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {["todos", "pendente_assinatura", "ativo", "encerrado", "cancelado"].map(
              (s) => (
                <Button
                  key={s}
                  variant={statusFiltro === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFiltro(s)}
                >
                  {s === "todos" ? "Todos" : STATUS_LABEL[s as StatusContrato]}
                </Button>
              ),
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Tabela ── */}
      {carregando ? (
        <SkeletonTable />
      ) : filtrados.length === 0 ? (
        <EmptyState
          title="Nenhum contrato encontrado"
          description={busca || statusFiltro !== "todos" ? "Ajuste os filtros" : "Nenhum contrato recebido ainda"}
          icon={FileSignature}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            {/* Desktop */}
            <div className="hidden md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                    <th className="p-4">Nº Contrato</th>
                    <th className="p-4">Objeto</th>
                    <th className="p-4 text-right">Valor</th>
                    <th className="p-4">Vigência</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Assinatura</th>
                    <th className="p-4">Recebido em</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((c) => {
                    const dias = c.data_fim ? calcularDiasRestantes(c.data_fim) : null;
                    return (
                      <tr
                        key={c.id}
                        className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                        onClick={() => navigate(`/contratos/${c.id}`)}
                      >
                        <td className="p-4 font-medium">{c.numero_contrato}</td>
                        <td className="max-w-48 truncate p-4 text-sm" title={c.objeto}>
                          {c.objeto}
                        </td>
                        <td className="p-4 text-right font-mono text-sm">
                          {formatarMoeda(c.valor_total)}
                        </td>
                        <td className="p-4 text-sm">
                          <div className="flex flex-col gap-1">
                            <span>
                              {c.data_inicio && new Date(c.data_inicio).toLocaleDateString("pt-BR")}
                              {" → "}
                              {c.data_fim && new Date(c.data_fim).toLocaleDateString("pt-BR")}
                            </span>
                            {dias !== null && c.status === "ativo" && (
                              <span className={`text-xs ${dias <= 30 ? "text-red-600 font-semibold" : dias <= 90 ? "text-amber-600" : "text-muted-foreground"}`}>
                                {dias > 0 ? `${dias} dias restantes` : "Vencido"}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant={STATUS_VARIANT[c.status] as "default"}>
                            <span className="flex items-center gap-1">
                              {STATUS_ICON[c.status]}
                              {STATUS_LABEL[c.status]}
                            </span>
                          </Badge>
                        </td>
                        <td className="p-4">
                          {c.assinatura_digital_status && (
                            <Badge variant={ASSINATURA_VARIANT[c.assinatura_digital_status] as "default"}>
                              {ASSINATURA_LABEL[c.assinatura_digital_status] ?? c.assinatura_digital_status}
                            </Badge>
                          )}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {c.criado_em && new Date(c.criado_em).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="p-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/contratos/${c.id}`);
                            }}
                          >
                            <Eye className="mr-1 h-4 w-4" />
                            Ver
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="space-y-3 p-4 md:hidden">
              {filtrados.map((c) => (
                <Card
                  key={c.id}
                  className="cursor-pointer transition-colors hover:bg-muted/30"
                  onClick={() => navigate(`/contratos/${c.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{c.numero_contrato}</span>
                      <Badge variant={STATUS_VARIANT[c.status] as "default"}>
                        {STATUS_LABEL[c.status]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {c.objeto}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="font-mono">{formatarMoeda(c.valor_total)}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
