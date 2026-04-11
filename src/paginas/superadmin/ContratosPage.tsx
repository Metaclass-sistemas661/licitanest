import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  FileText,
  Search,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Check,
  X,
  Eye,
  Pencil,
  Trash2,
  Clock,
  AlertTriangle,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/componentes/ui/confirm-dialog";
import { SkeletonStatCard, SkeletonTable } from "@/componentes/ui/skeleton";
import { AnimatedCounter } from "@/componentes/ui/animated-counter";
import { TabelaResponsiva, CardMobile, CardMobileCampo } from "@/componentes/ui/tabela-responsiva";
import {
  listarContratos,
  buscarDashboardContratos,
  deletarContrato,
} from "@/servicos/contratos";
import { listarPrefeituras } from "@/servicos/prefeituras-superadmin";
import type { PrefeituraListItem } from "@/servicos/prefeituras-superadmin";
import type { Contrato, ContratoDashboardResumo, StatusContrato } from "@/tipos";
import { ContratoDrawer } from "@/componentes/superadmin/ContratoDrawer";

// ── Tipos locais ─────────────────────────────────────────────

type SubAba = "todos" | "ativos" | "pendentes" | "encerrados";
type SortKey = "numero_contrato" | "municipio_nome" | "valor_total" | "data_inicio" | "data_fim" | "status";

const SUB_ABAS: { key: SubAba; label: string; icon?: React.ComponentType<{ className?: string }> }[] = [
  { key: "todos", label: "Todos" },
  { key: "ativos", label: "Ativos", icon: Check },
  { key: "pendentes", label: "Pendentes", icon: Clock },
  { key: "encerrados", label: "Encerrados", icon: X },
];

const STATUS_MAP: Record<StatusContrato, { label: string; class: string }> = {
  rascunho: { label: "Rascunho", class: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  pendente_assinatura: { label: "Pend. Assinatura", class: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  ativo: { label: "Ativo", class: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  suspenso: { label: "Suspenso", class: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  encerrado: { label: "Encerrado", class: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  cancelado: { label: "Cancelado", class: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  renovacao: { label: "Renovação", class: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
};

const ASSINATURA_MAP: Record<string, { label: string; class: string }> = {
  pendente: { label: "Pendente", class: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  assinado: { label: "Assinado", class: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  recusado: { label: "Recusado", class: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  expirado: { label: "Expirado", class: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
};

// ── Helpers ──────────────────────────────────────────────────

function formatarCentavos(v: number | null): string {
  if (v == null) return "—";
  return (v / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

function vigenciaPercent(inicio: string, fim: string): number {
  const now = Date.now();
  const s = new Date(inicio).getTime();
  const e = new Date(fim).getTime();
  if (e <= s) return 100;
  return Math.min(100, Math.max(0, Math.round(((now - s) / (e - s)) * 100)));
}

function truncar(text: string, max = 40): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "…";
}

// ── Componente ──────────────────────────────────────────────

export function ContratosPage() {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const confirm = useConfirm();

  const [resumo, setResumo] = useState<ContratoDashboardResumo | null>(null);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingResumo, setLoadingResumo] = useState(true);

  // Filtros
  const [busca, setBusca] = useState(sp.get("busca") || "");
  const [subAba, setSubAba] = useState<SubAba>((sp.get("sub") as SubAba) || "todos");
  const [filtroStatus, setFiltroStatus] = useState(sp.get("status") || "");
  const [filtroPrefeitura, setFiltroPrefeitura] = useState(sp.get("municipio_id") || "");
  const [page, setPage] = useState(parseInt(sp.get("page") || "1"));
  const [sortKey, setSortKey] = useState<SortKey>("data_inicio");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const limit = 15;

  // Drawer
  const [drawerId, setDrawerId] = useState<string | null>(null);

  // Opções de prefeitura
  const [prefeituras, setPrefeituras] = useState<PrefeituraListItem[]>([]);
  useEffect(() => {
    listarPrefeituras({ limit: 200 }).then((r) => setPrefeituras(r.data));
  }, []);

  // Status baseado na sub-aba
  const statusFiltro = subAba === "ativos" ? "ativo" : subAba === "pendentes" ? "pendente_assinatura" : subAba === "encerrados" ? "encerrado" : filtroStatus;

  const fetchResumo = useCallback(() => {
    setLoadingResumo(true);
    buscarDashboardContratos()
      .then(({ data }) => setResumo(data))
      .catch(() => toast.error("Erro ao carregar resumo"))
      .finally(() => setLoadingResumo(false));
  }, []);

  const fetchContratos = useCallback(() => {
    setLoading(true);
    listarContratos({
      page,
      limit,
      status: statusFiltro || undefined,
      municipio_id: filtroPrefeitura || undefined,
    })
      .then((r) => {
        let lista = r.data;

        // Client-side search
        if (busca) {
          const b = busca.toLowerCase();
          lista = lista.filter(
            (c) =>
              c.numero_contrato.toLowerCase().includes(b) ||
              c.objeto.toLowerCase().includes(b) ||
              (c.municipio_nome || "").toLowerCase().includes(b),
          );
        }

        // Client-side sort
        lista.sort((a, b) => {
          let va: string | number = "";
          let vb: string | number = "";
          switch (sortKey) {
            case "numero_contrato": va = a.numero_contrato; vb = b.numero_contrato; break;
            case "municipio_nome": va = a.municipio_nome || ""; vb = b.municipio_nome || ""; break;
            case "valor_total": va = a.valor_total; vb = b.valor_total; break;
            case "data_inicio": va = a.data_inicio; vb = b.data_inicio; break;
            case "data_fim": va = a.data_fim; vb = b.data_fim; break;
            case "status": va = a.status; vb = b.status; break;
          }
          if (va < vb) return sortDir === "asc" ? -1 : 1;
          if (va > vb) return sortDir === "asc" ? 1 : -1;
          return 0;
        });

        setContratos(lista);
        setTotal(r.total);
      })
      .catch(() => toast.error("Erro ao carregar contratos"))
      .finally(() => setLoading(false));
  }, [page, statusFiltro, filtroPrefeitura, busca, sortKey, sortDir]);

  useEffect(() => { fetchResumo(); }, [fetchResumo]);
  useEffect(() => { fetchContratos(); }, [fetchContratos]);

  // Sync search params
  useEffect(() => {
    const p = new URLSearchParams();
    if (busca) p.set("busca", busca);
    if (subAba !== "todos") p.set("sub", subAba);
    if (filtroStatus) p.set("status", filtroStatus);
    if (filtroPrefeitura) p.set("municipio_id", filtroPrefeitura);
    if (page > 1) p.set("page", String(page));
    setSp(p, { replace: true });
  }, [busca, subAba, filtroStatus, filtroPrefeitura, page, setSp]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  async function handleDeletar(c: Contrato) {
    const ok = await confirm({
      title: "Excluir contrato",
      description: `Deseja realmente excluir "${c.numero_contrato}"? Esta ação pode ser revertida.`,
      confirmLabel: "Excluir",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deletarContrato(c.id);
      toast.success("Contrato excluído");
      fetchContratos();
      fetchResumo();
    } catch {
      toast.error("Erro ao excluir");
    }
  }

  const totalPages = Math.ceil(total / limit);

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp className="h-3 w-3 opacity-20" />;
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-superadmin-accent/10">
            <FileText className="h-5 w-5 text-superadmin-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Contratos</h1>
            <p className="text-sm text-muted-foreground">Gestão de contratos governamentais</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { fetchResumo(); fetchContratos(); }}
            className="flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-muted transition-colors"
            title="Atualizar"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => nav("/superadmin/contratos/novo")}
            className="flex items-center gap-2 rounded-lg bg-superadmin-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" /> Novo Contrato
          </button>
        </div>
      </div>

      {/* KPIs */}
      {loadingResumo ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)}
        </div>
      ) : resumo ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Check className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Ativos</span>
            </div>
            <div className="mt-2 text-2xl font-bold"><AnimatedCounter value={resumo.contratos_ativos} /></div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Pend. Assinatura</span>
            </div>
            <div className="mt-2 text-2xl font-bold"><AnimatedCounter value={resumo.pendentes_assinatura} /></div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">MRR</span>
            </div>
            <div className="mt-2 text-2xl font-bold">{formatarCentavos(resumo.mrr)}</div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Vencendo 30d</span>
            </div>
            <div className="mt-2 text-2xl font-bold"><AnimatedCounter value={resumo.vencendo_30_dias} /></div>
          </div>
        </div>
      ) : null}

      {/* Sub-abas + Filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Sub-abas */}
        <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
          {SUB_ABAS.map((a) => {
            const active = subAba === a.key;
            const Icon = a.icon;
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => { setSubAba(a.key); setPage(1); }}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors
                  ${active ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {a.label}
              </button>
            );
          })}
        </div>

        {/* Busca */}
        <div className="relative flex-1 min-w-50">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setPage(1); }}
            placeholder="Buscar por nº, objeto ou prefeitura..."
            className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-superadmin-accent"
          />
        </div>

        {/* Prefeitura filter */}
        <select
          value={filtroPrefeitura}
          onChange={(e) => { setFiltroPrefeitura(e.target.value); setPage(1); }}
          className="rounded-lg border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-superadmin-accent"
        >
          <option value="">Todas Prefeituras</option>
          {prefeituras.map((p) => (
            <option key={p.id} value={p.id}>{p.nome} — {p.uf}</option>
          ))}
        </select>

        {/* Status filter (when sub=todos) */}
        {subAba === "todos" && (
          <select
            value={filtroStatus}
            onChange={(e) => { setFiltroStatus(e.target.value); setPage(1); }}
            className="rounded-lg border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-superadmin-accent"
          >
            <option value="">Todos Status</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        )}
      </div>

      {/* Tabela */}
      {loading ? (
        <SkeletonTable rows={8} cols={7} />
      ) : contratos.length === 0 ? (
        <div className="rounded-xl border bg-card py-16 text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum contrato encontrado</p>
        </div>
      ) : (
        <TabelaResponsiva
          mobileCards={
            contratos.map((c) => {
              const st = STATUS_MAP[c.status];
              return (
                <CardMobile key={c.id} onClick={() => setDrawerId(c.id)}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-superadmin-accent">{c.numero_contrato}</span>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${st.class}`}>{st.label}</span>
                  </div>
                  <CardMobileCampo label="Prefeitura">{c.municipio_nome || "—"}</CardMobileCampo>
                  <CardMobileCampo label="Valor">{formatarCentavos(c.valor_total)}</CardMobileCampo>
                  <CardMobileCampo label="Vigência">{formatarData(c.data_inicio)} — {formatarData(c.data_fim)}</CardMobileCampo>
                  <div className="flex justify-end gap-1 pt-1">
                    <button type="button" onClick={(e) => { e.stopPropagation(); nav(`/superadmin/contratos/${c.id}/editar`); }} className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted"><Pencil className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); handleDeletar(c); }} className="flex h-7 w-7 items-center justify-center rounded hover:bg-red-50 dark:hover:bg-red-950 text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </CardMobile>
              );
            })
          }
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left font-medium">
                  <button type="button" onClick={() => toggleSort("numero_contrato")} className="flex items-center gap-1">
                    Nº Contrato <SortIcon col="numero_contrato" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  <button type="button" onClick={() => toggleSort("municipio_nome")} className="flex items-center gap-1">
                    Prefeitura <SortIcon col="municipio_nome" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-medium max-w-50">Objeto</th>
                <th className="px-4 py-3 text-right font-medium">
                  <button type="button" onClick={() => toggleSort("valor_total")} className="flex items-center gap-1 ml-auto">
                    Valor <SortIcon col="valor_total" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-medium">Vigência</th>
                <th className="px-4 py-3 text-center font-medium">
                  <button type="button" onClick={() => toggleSort("status")} className="flex items-center gap-1 mx-auto">
                    Status <SortIcon col="status" />
                  </button>
                </th>
                <th className="px-4 py-3 text-center font-medium">Assinatura</th>
                <th className="px-4 py-3 text-center font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {contratos.map((c) => {
                const st = STATUS_MAP[c.status];
                const as_ = ASSINATURA_MAP[c.assinatura_digital_status] || ASSINATURA_MAP.pendente;
                const pct = vigenciaPercent(c.data_inicio, c.data_fim);
                return (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setDrawerId(c.id)}
                        className="font-medium text-superadmin-accent hover:underline"
                      >
                        {c.numero_contrato}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{c.municipio_nome || "—"}</div>
                      <div className="text-xs text-muted-foreground">{c.municipio_uf || ""}</div>
                    </td>
                    <td className="px-4 py-3 max-w-50" title={c.objeto}>
                      {truncar(c.objeto)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      {formatarCentavos(c.valor_total)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">
                        {formatarData(c.data_inicio)} — {formatarData(c.data_fim)}
                      </div>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-superadmin-accent transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${st.class}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${as_.class}`}>
                        {as_.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setDrawerId(c.id)}
                          className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => nav(`/superadmin/contratos/${c.id}/editar`)}
                          className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletar(c)}
                          className="flex h-7 w-7 items-center justify-center rounded hover:bg-red-50 dark:hover:bg-red-950 text-red-500 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TabelaResponsiva>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {total} contrato{total !== 1 ? "s" : ""} • Página {page}/{totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border hover:bg-muted transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-lg border hover:bg-muted transition-colors disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Drawer de detalhe */}
      <ContratoDrawer
        contratoId={drawerId}
        onClose={() => setDrawerId(null)}
        onAtualizado={() => { fetchContratos(); fetchResumo(); }}
      />
    </div>
  );
}
