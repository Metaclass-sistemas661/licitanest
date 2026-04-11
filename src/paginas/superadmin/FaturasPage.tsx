import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Receipt,
  RefreshCw,
  Search,
  CloudDownload,
  DollarSign,
  Clock,
  AlertTriangle,
  Ban,
  Undo2,
  ChevronLeft,
  ChevronRight,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { SkeletonStatCard, SkeletonTable } from "@/componentes/ui/skeleton";
import { AnimatedCounter } from "@/componentes/ui/animated-counter";
import {
  obterResumoAsaas,
  sincronizarAsaas,
  listarFaturasSuperadmin,
  listarEventosAsaas,
  obterUltimaSync,
} from "@/servicos/faturas-superadmin";
import type {
  AsaasResumo,
  FaturaComJoins,
  BillingEvento,
} from "@/servicos/faturas-superadmin";

const STATUS_BADGE: Record<string, { label: string; cor: string }> = {
  paga: { label: "Paga", cor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  pendente: { label: "Pendente", cor: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  vencida: { label: "Vencida", cor: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  cancelada: { label: "Cancelada", cor: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400" },
  estornada: { label: "Estornada", cor: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
};

function formatarCentavos(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

function formatarDataHora(dateStr: string): string {
  return new Date(dateStr).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

type AbaAtiva = "faturas" | "eventos" | "asaas";

export function FaturasPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>(
    (searchParams.get("aba") as AbaAtiva) || "faturas",
  );

  // Resumo Asaas
  const [resumo, setResumo] = useState<AsaasResumo | null>(null);
  const [carregandoResumo, setCarregandoResumo] = useState(true);

  // Faturas
  const [faturas, setFaturas] = useState<FaturaComJoins[]>([]);
  const [totalFaturas, setTotalFaturas] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [carregandoFaturas, setCarregandoFaturas] = useState(true);
  const [busca, setBusca] = useState(searchParams.get("busca") || "");
  const [statusFiltro, setStatusFiltro] = useState(searchParams.get("status") || "");

  // Eventos
  const [eventos, setEventos] = useState<BillingEvento[]>([]);
  const [totalEventos, setTotalEventos] = useState(0);
  const [paginaEventos, setPaginaEventos] = useState(1);
  const [carregandoEventos, setCarregandoEventos] = useState(false);

  // Sync
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimaSync, setUltimaSync] = useState<string | null>(null);

  const carregarResumo = useCallback(async () => {
    setCarregandoResumo(true);
    try {
      const res = await obterResumoAsaas();
      setResumo(res.data);
    } catch { /* interceptor */ }
    finally { setCarregandoResumo(false); }
  }, []);

  const carregarFaturas = useCallback(async () => {
    setCarregandoFaturas(true);
    try {
      const res = await listarFaturasSuperadmin({
        page: pagina,
        limit: 20,
        status: statusFiltro || undefined,
        busca: busca || undefined,
      });
      setFaturas(res.data);
      setTotalFaturas(res.total);
    } catch { /* interceptor */ }
    finally { setCarregandoFaturas(false); }
  }, [pagina, statusFiltro, busca]);

  const carregarEventos = useCallback(async () => {
    setCarregandoEventos(true);
    try {
      const res = await listarEventosAsaas({ page: paginaEventos, limit: 20 });
      setEventos(res.data);
      setTotalEventos(res.total);
    } catch { /* interceptor */ }
    finally { setCarregandoEventos(false); }
  }, [paginaEventos]);

  const handleSync = async () => {
    setSincronizando(true);
    try {
      const res = await sincronizarAsaas();
      toast.success(`Sincronização concluída: ${res.data.total_synced} cobranças atualizadas`);
      setUltimaSync(res.data.synced_at);
      await Promise.all([carregarResumo(), carregarFaturas()]);
    } catch {
      toast.error("Erro ao sincronizar com o Asaas");
    } finally {
      setSincronizando(false);
    }
  };

  useEffect(() => { carregarResumo(); }, [carregarResumo]);
  useEffect(() => { carregarFaturas(); }, [carregarFaturas]);
  useEffect(() => {
    if (abaAtiva === "eventos") carregarEventos();
  }, [abaAtiva, carregarEventos]);

  useEffect(() => {
    obterUltimaSync()
      .then((res) => { if (res.data) setUltimaSync(res.data.ultima_sync); })
      .catch(() => {});
  }, []);

  const mudarAba = (aba: AbaAtiva) => {
    setAbaAtiva(aba);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("aba", aba);
      return next;
    });
  };

  const totalPaginas = Math.ceil(totalFaturas / 20);
  const totalPaginasEventos = Math.ceil(totalEventos / 20);

  const local = resumo?.local;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-superadmin-accent/10">
            <Receipt className="h-5 w-5 text-superadmin-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Faturas & Financeiro</h1>
            <p className="text-sm text-muted-foreground">
              Gestão financeira integrada com Asaas
              {ultimaSync && (
                <span className="ml-2 text-xs text-muted-foreground/70">
                  · Última sync: {formatarDataHora(ultimaSync)}
                </span>
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={sincronizando}
          className="flex items-center gap-2 rounded-lg bg-superadmin-accent px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-superadmin-accent/90 disabled:opacity-50"
        >
          <CloudDownload className={`h-3.5 w-3.5 ${sincronizando ? "animate-bounce" : ""}`} />
          {sincronizando ? "Sincronizando..." : "Sincronizar Asaas"}
        </button>
      </div>

      {/* KPIs de resumo */}
      {carregandoResumo ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonStatCard key={i} />)}
        </div>
      ) : local && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard
            label="Total Recebido"
            valor={local.total_recebido / 100}
            prefix="R$ "
            icon={DollarSign}
            cor="text-emerald-500"
            bgCor="bg-emerald-500/10"
          />
          <KpiCard
            label="Pendente"
            valor={local.total_pendente / 100}
            prefix="R$ "
            icon={Clock}
            cor="text-amber-500"
            bgCor="bg-amber-500/10"
          />
          <KpiCard
            label="Vencido"
            valor={local.total_vencido / 100}
            prefix="R$ "
            icon={AlertTriangle}
            cor="text-red-500"
            bgCor="bg-red-500/10"
          />
          <KpiCard
            label="Faturas"
            valor={local.total_faturas}
            icon={Receipt}
            cor="text-blue-500"
            bgCor="bg-blue-500/10"
            subtitle={`${local.faturas_pagas} pagas · ${local.faturas_pendentes} pendentes`}
          />
          <KpiCard
            label="Saldo Asaas"
            valor={resumo?.asaas?.balance ? (resumo.asaas.balance.balance as number) : 0}
            prefix="R$ "
            icon={Zap}
            cor="text-violet-500"
            bgCor="bg-violet-500/10"
            subtitle="Disponível para saque"
          />
        </div>
      )}

      {/* Abas */}
      <div className="flex gap-1 border-b">
        {([
          { key: "faturas" as const, label: "Faturas", count: totalFaturas },
          { key: "eventos" as const, label: "Eventos Webhook", count: totalEventos },
        ]).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => mudarAba(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              abaAtiva === tab.key
                ? "border-superadmin-accent text-superadmin-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Aba: Faturas */}
      {abaAtiva === "faturas" && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar nº fatura ou município..."
                value={busca}
                onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
                className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-superadmin-accent"
              />
            </div>
            <select
              value={statusFiltro}
              onChange={(e) => { setStatusFiltro(e.target.value); setPagina(1); }}
              className="rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-superadmin-accent"
            >
              <option value="">Todos os status</option>
              <option value="paga">Paga</option>
              <option value="pendente">Pendente</option>
              <option value="vencida">Vencida</option>
              <option value="cancelada">Cancelada</option>
              <option value="estornada">Estornada</option>
            </select>
            <button
              type="button"
              onClick={carregarFaturas}
              disabled={carregandoFaturas}
              className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${carregandoFaturas ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Tabela */}
          {carregandoFaturas ? (
            <SkeletonTable rows={8} cols={7} />
          ) : (
            <div className="rounded-xl border bg-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Nº</th>
                    <th className="px-4 py-3 font-medium">Município</th>
                    <th className="px-4 py-3 font-medium">Contrato</th>
                    <th className="px-4 py-3 font-medium text-right">Valor</th>
                    <th className="px-4 py-3 font-medium">Vencimento</th>
                    <th className="px-4 py-3 font-medium">Pagamento</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {faturas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        Nenhuma fatura encontrada
                      </td>
                    </tr>
                  ) : (
                    faturas.map((f) => {
                      const badge = STATUS_BADGE[f.status] || STATUS_BADGE.pendente;
                      return (
                        <tr key={f.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs">{f.numero}</td>
                          <td className="px-4 py-3">
                            {f.municipio_nome}
                            <span className="ml-1 text-xs text-muted-foreground">({f.municipio_uf})</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{f.numero_contrato || "—"}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatarCentavos(f.valor)}</td>
                          <td className="px-4 py-3 text-xs">{formatarData(f.vencimento)}</td>
                          <td className="px-4 py-3 text-xs">{formatarData(f.pago_em)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badge.cor}`}>
                              {badge.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginação */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {totalFaturas} faturas · Página {pagina} de {totalPaginas}
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={pagina <= 1}
                  onClick={() => setPagina((p) => p - 1)}
                  className="rounded-md border p-1.5 hover:bg-muted disabled:opacity-50 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={pagina >= totalPaginas}
                  onClick={() => setPagina((p) => p + 1)}
                  className="rounded-md border p-1.5 hover:bg-muted disabled:opacity-50 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Aba: Eventos Webhook */}
      {abaAtiva === "eventos" && (
        <div className="space-y-4">
          {carregandoEventos ? (
            <SkeletonTable rows={8} cols={5} />
          ) : (
            <div className="rounded-xl border bg-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Evento</th>
                    <th className="px-4 py-3 font-medium">Município</th>
                    <th className="px-4 py-3 font-medium">Event ID</th>
                    <th className="px-4 py-3 font-medium">Data</th>
                    <th className="px-4 py-3 font-medium">Processado</th>
                  </tr>
                </thead>
                <tbody>
                  {eventos.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        Nenhum evento registrado
                      </td>
                    </tr>
                  ) : (
                    eventos.map((ev) => (
                      <tr key={ev.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3">
                          <EventoBadge tipo={ev.tipo} />
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {ev.municipio_nome
                            ? `${ev.municipio_nome} (${ev.municipio_uf})`
                            : <span className="text-muted-foreground">—</span>
                          }
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground truncate max-w-[180px]">
                          {ev.asaas_event_id || "—"}
                        </td>
                        <td className="px-4 py-3 text-xs">{formatarDataHora(ev.criado_em)}</td>
                        <td className="px-4 py-3 text-xs">
                          {ev.processado ? "✅" : "⏳"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {totalPaginasEventos > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {totalEventos} eventos · Página {paginaEventos} de {totalPaginasEventos}
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={paginaEventos <= 1}
                  onClick={() => setPaginaEventos((p) => p - 1)}
                  className="rounded-md border p-1.5 hover:bg-muted disabled:opacity-50 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={paginaEventos >= totalPaginasEventos}
                  onClick={() => setPaginaEventos((p) => p + 1)}
                  className="rounded-md border p-1.5 hover:bg-muted disabled:opacity-50 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Componentes auxiliares ────────────────────────────────

function KpiCard({
  label, valor, prefix = "", icon: Icon, cor, bgCor, subtitle,
}: {
  label: string;
  valor: number;
  prefix?: string;
  icon: React.ComponentType<{ className?: string }>;
  cor: string;
  bgCor: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bgCor}`}>
          <Icon className={`h-4 w-4 ${cor}`} />
        </div>
      </div>
      <div className="mt-2">
        <span className={`text-2xl font-bold ${cor}`}>
          <AnimatedCounter value={valor} prefix={prefix} decimals={prefix ? 0 : 0} />
        </span>
      </div>
      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

const EVENTO_CORES: Record<string, { cor: string; icon: React.ComponentType<{ className?: string }> }> = {
  PAYMENT_CONFIRMED: { cor: "text-emerald-600", icon: DollarSign },
  PAYMENT_RECEIVED: { cor: "text-emerald-600", icon: DollarSign },
  PAYMENT_OVERDUE: { cor: "text-red-500", icon: AlertTriangle },
  PAYMENT_REFUNDED: { cor: "text-violet-500", icon: Undo2 },
  PAYMENT_DELETED: { cor: "text-gray-500", icon: Ban },
  checkout_criado: { cor: "text-blue-500", icon: Receipt },
};

function EventoBadge({ tipo }: { tipo: string }) {
  const config = EVENTO_CORES[tipo] || { cor: "text-muted-foreground", icon: Zap };
  const Icon = config.icon;
  return (
    <span className={`flex items-center gap-1.5 text-xs font-medium ${config.cor}`}>
      <Icon className="h-3.5 w-3.5" />
      {tipo.replace(/_/g, " ")}
    </span>
  );
}
