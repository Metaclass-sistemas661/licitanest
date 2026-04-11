import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Building2,
  Search,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Check,
  X,
  Users,
  FileText,
  AlertTriangle,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/componentes/ui/confirm-dialog";
import { SkeletonStatCard, SkeletonTable } from "@/componentes/ui/skeleton";
import { AnimatedCounter } from "@/componentes/ui/animated-counter";
import { TabelaResponsiva, CardMobile, CardMobileCampo } from "@/componentes/ui/tabela-responsiva";
import {
  obterResumoPrefeituras,
  listarPrefeituras,
  listarUfsPrefeituras,
  acaoLotePrefeituras,
} from "@/servicos/prefeituras-superadmin";
import type {
  PrefeituraResumo,
  PrefeituraListItem,
} from "@/servicos/prefeituras-superadmin";
import { PrefeituraDrawer } from "@/componentes/superadmin/PrefeituraDrawer";
import { NovaPrefeituraModal } from "@/componentes/superadmin/NovaPrefeituraModal";

type SubAba = "todas" | "ativas" | "inativas" | "inadimplentes";
type SortKey = "nome" | "uf" | "criado_em" | "usuarios";

const SUB_ABAS: { key: SubAba; label: string; icon?: React.ComponentType<{ className?: string }> }[] = [
  { key: "todas", label: "Todas" },
  { key: "ativas", label: "Ativas", icon: Check },
  { key: "inativas", label: "Inativas", icon: X },
  { key: "inadimplentes", label: "Inadimplentes", icon: AlertTriangle },
];

function formatarCentavos(v: number | null): string {
  if (v == null) return "—";
  return (v / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

function tempoRelativo(d: string | null): string {
  if (!d) return "Nunca";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Agora";
  if (mins < 60) return `${mins}min atrás`;
  const horas = Math.floor(mins / 60);
  if (horas < 24) return `${horas}h atrás`;
  const dias = Math.floor(horas / 24);
  if (dias < 30) return `${dias}d atrás`;
  return formatarData(d);
}

function progressoVigencia(inicio: string | null, fim: string | null): number {
  if (!inicio || !fim) return 0;
  const now = Date.now();
  const start = new Date(inicio).getTime();
  const end = new Date(fim).getTime();
  if (now >= end) return 100;
  if (now <= start) return 0;
  return Math.round(((now - start) / (end - start)) * 100);
}

export function PrefeiturasPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const confirm = useConfirm();

  // Estado
  const [resumo, setResumo] = useState<PrefeituraResumo | null>(null);
  const [prefeituras, setPrefeituras] = useState<PrefeituraListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [ufs, setUfs] = useState<{ uf: string; total: number }[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [carregandoResumo, setCarregandoResumo] = useState(true);

  // Filtros
  const [subAba, setSubAba] = useState<SubAba>((searchParams.get("sub") as SubAba) || "todas");
  const [busca, setBusca] = useState(searchParams.get("busca") || "");
  const [ufFiltro, setUfFiltro] = useState(searchParams.get("uf") || "");
  const [pagina, setPagina] = useState(parseInt(searchParams.get("page") || "1"));
  const [sortKey, setSortKey] = useState<SortKey>((searchParams.get("sort") as SortKey) || "nome");
  const [sortDir, setSortDir] = useState<"asc" | "desc">((searchParams.get("dir") as "asc" | "desc") || "asc");

  // Seleção em lote
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  // Drawer / Modal
  const [drawerPrefeituraId, setDrawerPrefeituraId] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  // Persistir filtros na URL
  useEffect(() => {
    const next = new URLSearchParams();
    if (subAba !== "todas") next.set("sub", subAba);
    if (busca) next.set("busca", busca);
    if (ufFiltro) next.set("uf", ufFiltro);
    if (pagina > 1) next.set("page", String(pagina));
    if (sortKey !== "nome") next.set("sort", sortKey);
    if (sortDir !== "asc") next.set("dir", sortDir);
    setSearchParams(next, { replace: true });
  }, [subAba, busca, ufFiltro, pagina, sortKey, sortDir, setSearchParams]);

  const carregarResumo = useCallback(async () => {
    setCarregandoResumo(true);
    try {
      const res = await obterResumoPrefeituras();
      setResumo(res.data);
    } catch { /* interceptor */ }
    finally { setCarregandoResumo(false); }
  }, []);

  const carregarPrefeituras = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await listarPrefeituras({
        page: pagina,
        limit: 20,
        status: subAba === "todas" ? undefined : subAba,
        uf: ufFiltro || undefined,
        busca: busca || undefined,
        ordenar_por: sortKey,
        ordem: sortDir,
      });
      setPrefeituras(res.data);
      setTotal(res.total);
    } catch { /* interceptor */ }
    finally { setCarregando(false); }
  }, [pagina, subAba, ufFiltro, busca, sortKey, sortDir]);

  useEffect(() => { carregarResumo(); }, [carregarResumo]);
  useEffect(() => { carregarPrefeituras(); }, [carregarPrefeituras]);
  useEffect(() => {
    listarUfsPrefeituras().then((r) => setUfs(r.data)).catch(() => {});
  }, []);

  const totalPaginas = Math.ceil(total / 20);

  const mudarSubAba = (aba: SubAba) => {
    setSubAba(aba);
    setPagina(1);
    setSelecionados(new Set());
  };

  const mudarSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPagina(1);
  };

  const toggleSelecionado = (id: string) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleTodos = () => {
    if (selecionados.size === prefeituras.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(prefeituras.map((p) => p.id)));
    }
  };

  const handleAcaoLote = async (acao: "ativar" | "desativar") => {
    const ids = [...selecionados];
    const confirmado = await confirm({
      title: `${acao === "ativar" ? "Ativar" : "Desativar"} ${ids.length} prefeitura(s)?`,
      description: `Esta ação irá ${acao === "ativar" ? "ativar" : "desativar"} as prefeituras selecionadas.`,
      confirmLabel: acao === "ativar" ? "Ativar" : "Desativar",
      variant: acao === "desativar" ? "danger" : "default",
    });
    if (!confirmado) return;
    try {
      const res = await acaoLotePrefeituras(ids, acao);
      toast.success(`${res.data.atualizados} prefeitura(s) ${acao === "ativar" ? "ativadas" : "desativadas"}`);
      setSelecionados(new Set());
      await Promise.all([carregarResumo(), carregarPrefeituras()]);
    } catch {
      toast.error(`Erro ao ${acao} prefeituras`);
    }
  };

  const exportarCSV = () => {
    const header = "Nome,UF,CNPJ,IBGE,Contrato,Valor,Vencimento,Usuários,Status,Último Acesso\n";
    const csv = prefeituras.map((p) =>
      [
        `"${p.nome}"`, p.uf, p.cnpj || "", p.codigo_ibge || "",
        p.contrato_ativo || "Sem contrato",
        p.contrato_valor != null ? (p.contrato_valor / 100).toFixed(2) : "",
        p.contrato_data_fim || "",
        p.total_usuarios,
        p.ativo ? "Ativa" : "Inativa",
        p.ultimo_acesso || "Nunca",
      ].join(","),
    ).join("\n");
    const blob = new Blob([header + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prefeituras_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const contadorSubAba = (key: SubAba): number => {
    if (!resumo) return 0;
    switch (key) {
      case "todas": return resumo.total;
      case "ativas": return resumo.ativas;
      case "inativas": return resumo.inativas;
      case "inadimplentes": return resumo.inadimplentes;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-superadmin-accent/10">
            <Building2 className="h-5 w-5 text-superadmin-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Prefeituras</h1>
            <p className="text-sm text-muted-foreground">Gestão de municípios contratantes</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportarCSV}
            className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-muted transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
          <button
            type="button"
            onClick={() => setModalAberto(true)}
            className="flex items-center gap-2 rounded-lg bg-superadmin-accent px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-superadmin-accent/90"
          >
            <Plus className="h-3.5 w-3.5" />
            Nova Prefeitura
          </button>
        </div>
      </div>

      {/* KPIs */}
      {carregandoResumo ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)}
        </div>
      ) : resumo && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Total" valor={resumo.total} icon={Building2} cor="text-blue-500" bgCor="bg-blue-500/10" />
          <KpiCard label="Ativas" valor={resumo.ativas} icon={Check} cor="text-emerald-500" bgCor="bg-emerald-500/10" />
          <KpiCard label="Inativas" valor={resumo.inativas} icon={X} cor="text-gray-500" bgCor="bg-gray-500/10" />
          <KpiCard label="Inadimplentes" valor={resumo.inadimplentes} icon={AlertTriangle} cor="text-red-500" bgCor="bg-red-500/10" />
        </div>
      )}

      {/* Sub-abas */}
      <div className="flex gap-1 border-b">
        {SUB_ABAS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => mudarSubAba(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              subAba === key
                ? "border-superadmin-accent text-superadmin-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {label}
            <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs">
              {contadorSubAba(key)}
            </span>
          </button>
        ))}
      </div>

      {/* Filtros + Ações lote */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-50">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar nome, CNPJ ou código IBGE..."
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
            className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-superadmin-accent"
          />
        </div>
        <select
          value={ufFiltro}
          onChange={(e) => { setUfFiltro(e.target.value); setPagina(1); }}
          className="rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-superadmin-accent"
        >
          <option value="">Todas UFs</option>
          {ufs.map((u) => (
            <option key={u.uf} value={u.uf}>{u.uf} ({u.total})</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => { carregarResumo(); carregarPrefeituras(); }}
          disabled={carregando}
          className="rounded-md border p-2 hover:bg-muted transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${carregando ? "animate-spin" : ""}`} />
        </button>

        {selecionados.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-muted-foreground">{selecionados.size} selecionada(s)</span>
            <button
              type="button"
              onClick={() => handleAcaoLote("ativar")}
              className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400"
            >
              Ativar
            </button>
            <button
              type="button"
              onClick={() => handleAcaoLote("desativar")}
              className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
            >
              Desativar
            </button>
          </div>
        )}
      </div>

      {/* Tabela */}
      {carregando ? (
        <SkeletonTable rows={10} cols={9} />
      ) : (
        <TabelaResponsiva
          mobileCards={
            prefeituras.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-12">Nenhuma prefeitura encontrada</p>
            ) : (
              prefeituras.map((p) => (
                <CardMobile key={p.id} onClick={() => setDrawerPrefeituraId(p.id)}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{p.nome}</span>
                    <span className="inline-flex rounded bg-blue-100 px-1.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{p.uf}</span>
                  </div>
                  <CardMobileCampo label="CNPJ">{p.cnpj || "—"}</CardMobileCampo>
                  <CardMobileCampo label="Contrato">
                    {p.contrato_ativo ? (
                      <span className="flex items-center gap-1"><FileText className="h-3 w-3 text-emerald-500" />{p.contrato_ativo}</span>
                    ) : "Sem contrato"}
                  </CardMobileCampo>
                  <CardMobileCampo label="Valor">{formatarCentavos(p.contrato_valor)}</CardMobileCampo>
                  <CardMobileCampo label="Usuários">
                    {p.total_usuarios}{p.limite_usuarios != null && `/${p.limite_usuarios}`}
                  </CardMobileCampo>
                  <CardMobileCampo label="Status">
                    {p.ativo ? (
                      <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Ativa</span>
                    ) : (
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-900/30 dark:text-gray-400">Inativa</span>
                    )}
                  </CardMobileCampo>
                </CardMobile>
              ))
            )
          }
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selecionados.size === prefeituras.length && prefeituras.length > 0}
                    onChange={toggleTodos}
                    className="rounded border-gray-300"
                  />
                </th>
                <SortHeader label="Nome" sortKey="nome" currentKey={sortKey} dir={sortDir} onChange={mudarSort} />
                <SortHeader label="UF" sortKey="uf" currentKey={sortKey} dir={sortDir} onChange={mudarSort} />
                <th className="px-4 py-3 font-medium">CNPJ</th>
                <th className="px-4 py-3 font-medium">IBGE</th>
                <th className="px-4 py-3 font-medium">Contrato</th>
                <th className="px-4 py-3 font-medium text-right">Valor</th>
                <th className="px-4 py-3 font-medium">Vigência</th>
                <SortHeader label="Usuários" sortKey="usuarios" currentKey={sortKey} dir={sortDir} onChange={mudarSort} />
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Último Acesso</th>
                <th className="px-4 py-3 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody>
              {prefeituras.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-muted-foreground">
                    Nenhuma prefeitura encontrada
                  </td>
                </tr>
              ) : (
                prefeituras.map((p) => {
                  const prog = progressoVigencia(p.contrato_data_inicio, p.contrato_data_fim);
                  return (
                    <tr
                      key={p.id}
                      className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setDrawerPrefeituraId(p.id)}
                    >
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selecionados.has(p.id)}
                          onChange={() => toggleSelecionado(p.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium">{p.nome}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded bg-blue-100 px-1.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          {p.uf}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.cnpj || "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.codigo_ibge || "—"}</td>
                      <td className="px-4 py-3 text-xs">
                        {p.contrato_ativo ? (
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3 text-emerald-500" />
                            {p.contrato_ativo}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Sem contrato</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-medium">
                        {formatarCentavos(p.contrato_valor)}
                      </td>
                      <td className="px-4 py-3">
                        {p.contrato_data_fim ? (
                          <div className="space-y-1">
                            <div className="h-1.5 w-20 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  prog >= 90 ? "bg-red-500" : prog >= 70 ? "bg-amber-500" : "bg-emerald-500"
                                }`}
                                style={{ width: `${prog}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              até {formatarData(p.contrato_data_fim)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="flex items-center gap-1 text-xs">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {p.total_usuarios}
                          {p.limite_usuarios != null && (
                            <span className="text-muted-foreground">/{p.limite_usuarios}</span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {p.ativo ? (
                          <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            Ativa
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-900/30 dark:text-gray-400">
                            Inativa
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {tempoRelativo(p.ultimo_acesso)}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setDrawerPrefeituraId(p.id)}
                          className="rounded p-1 hover:bg-muted transition-colors"
                        >
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </TabelaResponsiva>
      )}

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {total} prefeituras · Página {pagina} de {totalPaginas}
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

      {/* Drawer de detalhes */}
      <PrefeituraDrawer
        prefeituraId={drawerPrefeituraId}
        onClose={() => setDrawerPrefeituraId(null)}
        onAtualizado={() => { carregarResumo(); carregarPrefeituras(); }}
      />

      {/* Modal de cadastro */}
      <NovaPrefeituraModal
        aberto={modalAberto}
        onClose={() => setModalAberto(false)}
        onCriado={() => { setModalAberto(false); carregarResumo(); carregarPrefeituras(); }}
      />
    </div>
  );
}

// ── Componentes auxiliares ────────────────────────────────────

function KpiCard({
  label, valor, icon: Icon, cor, bgCor,
}: {
  label: string; valor: number; icon: React.ComponentType<{ className?: string }>; cor: string; bgCor: string;
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
          <AnimatedCounter value={valor} />
        </span>
      </div>
    </div>
  );
}

function SortHeader({
  label, sortKey, currentKey, dir, onChange,
}: {
  label: string; sortKey: SortKey; currentKey: SortKey; dir: "asc" | "desc";
  onChange: (k: SortKey) => void;
}) {
  const active = currentKey === sortKey;
  return (
    <th className="px-4 py-3 font-medium">
      <button
        type="button"
        onClick={() => onChange(sortKey)}
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {label}
        {active ? (
          dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronUp className="h-3 w-3 opacity-30" />
        )}
      </button>
    </th>
  );
}
