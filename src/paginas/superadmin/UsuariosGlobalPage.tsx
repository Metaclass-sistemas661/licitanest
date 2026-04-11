import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Users, Search, RefreshCw, Download, Plus, Shield,
  UserCheck, UserPlus, Clock, ArrowUpDown, ArrowUp, ArrowDown,
  ChevronLeft, ChevronRight, MoreHorizontal, Eye, Edit, Power,
} from "lucide-react";
import { toast } from "sonner";
import { AnimatedCounter } from "@/componentes/ui/animated-counter";
import { SkeletonStatCard, SkeletonTable } from "@/componentes/ui/skeleton";
import { useConfirm } from "@/componentes/ui/confirm-dialog";
import { TabelaResponsiva, CardMobile, CardMobileCampo } from "@/componentes/ui/tabela-responsiva";
import {
  obterResumoUsuarios, listarUsuarios, listarPrefeiturasFiltro, listarPerfisFiltro,
  acaoLoteUsuarios,
  type UsuarioResumo, type UsuarioListItem, type PrefeituraOption, type PerfilOption,
} from "@/servicos/usuarios-superadmin";
import { CriarUsuarioModal } from "@/componentes/superadmin/CriarUsuarioModal";
import { UsuarioDrawer } from "@/componentes/superadmin/UsuarioDrawer";

// ── Helpers ─────────────────────────────────────────────────────────────────

function mascaraCPF(cpf: string | null): string {
  if (!cpf) return "—";
  const nums = cpf.replace(/\D/g, "");
  if (nums.length !== 11) return cpf;
  return `${nums.slice(0, 3)}.***.**${nums.slice(9)}-${nums.slice(9, 11)}`;
}

function tempoRelativo(data: string | null): string {
  if (!data) return "Nunca";
  const diff = Date.now() - new Date(data).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "Agora";
  if (min < 60) return `${min}min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d atrás`;
  return new Date(data).toLocaleDateString("pt-BR");
}

// ── Sub-abas ────────────────────────────────────────────────────────────────

const ABAS = [
  { key: "todos", label: "Todos" },
  { key: "ativo", label: "Ativos" },
  { key: "inativo", label: "Inativos" },
] as const;

type AbaKey = (typeof ABAS)[number]["key"];

// ── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({ label, valor, icon: Icon, cor }: {
  label: string; valor: number; icon: React.ElementType; cor: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${cor}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold"><AnimatedCounter value={valor} /></p>
    </div>
  );
}

// ── Sort Header ─────────────────────────────────────────────────────────────

function SortHeader({ label, campo, atual, dir, onSort }: {
  label: string; campo: string; atual: string; dir: string;
  onSort: (c: string) => void;
}) {
  return (
    <button type="button" onClick={() => onSort(campo)} className="flex items-center gap-1 font-medium hover:text-foreground">
      {label}
      {atual === campo
        ? dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        : <ArrowUpDown className="h-3 w-3 opacity-30" />}
    </button>
  );
}

// ── Badges ──────────────────────────────────────────────────────────────────

function PerfilBadge({ nome }: { nome: string }) {
  const cores: Record<string, string> = {
    Administrador: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    Gestor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    Pesquisador: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${cores[nome] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}>
      {nome}
    </span>
  );
}

// ── Page Component ──────────────────────────────────────────────────────────

export function UsuariosGlobalPage() {
  const [sp, setSp] = useSearchParams();
  const confirm = useConfirm();

  // State
  const [resumo, setResumo] = useState<UsuarioResumo | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingResumo, setLoadingResumo] = useState(true);
  const [prefeituras, setPrefeituras] = useState<PrefeituraOption[]>([]);
  const [perfis, setPerfis] = useState<PerfilOption[]>([]);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [modalAberto, setModalAberto] = useState(false);
  const [drawerUsuarioId, setDrawerUsuarioId] = useState<string | null>(null);
  const [menuAberto, setMenuAberto] = useState<string | null>(null);

  // URL params
  const aba = (sp.get("aba") || "todos") as AbaKey;
  const busca = sp.get("busca") || "";
  const municipioId = sp.get("municipio") || "";
  const perfil = sp.get("perfil") || "";
  const com2fa = sp.get("2fa") || "";
  const uf = sp.get("uf") || "";
  const page = parseInt(sp.get("page") || "1");
  const sort = sp.get("sort") || "criado_em";
  const dir = sp.get("dir") || "desc";
  const limit = 20;

  const setParam = useCallback((key: string, val: string) => {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      if (val) next.set(key, val);
      else next.delete(key);
      if (key !== "page") next.set("page", "1");
      return next;
    });
  }, [setSp]);

  // Fetch filters
  useEffect(() => {
    Promise.all([listarPrefeiturasFiltro(), listarPerfisFiltro()])
      .then(([p, pf]) => { setPrefeituras(p); setPerfis(pf); })
      .catch(() => {});
  }, []);

  // Fetch KPIs
  const carregarResumo = useCallback(() => {
    setLoadingResumo(true);
    obterResumoUsuarios()
      .then(setResumo)
      .catch(() => toast.error("Erro ao carregar KPIs"))
      .finally(() => setLoadingResumo(false));
  }, []);

  // Fetch list
  const carregarLista = useCallback(() => {
    setLoading(true);
    setSelecionados(new Set());
    listarUsuarios({
      page, limit,
      status: aba === "todos" ? undefined : aba,
      municipio_id: municipioId || undefined,
      perfil: perfil || undefined,
      com_2fa: com2fa || undefined,
      busca: busca || undefined,
      uf: uf || undefined,
      ordenar_por: sort,
      ordem: dir,
    })
      .then((res) => { setUsuarios(res.data); setTotal(res.total); })
      .catch(() => toast.error("Erro ao carregar usuários"))
      .finally(() => setLoading(false));
  }, [page, aba, municipioId, perfil, com2fa, busca, uf, sort, dir]);

  useEffect(() => { carregarResumo(); }, [carregarResumo]);
  useEffect(() => { carregarLista(); }, [carregarLista]);

  const totalPaginas = Math.ceil(total / limit);

  const handleSort = (campo: string) => {
    if (sort === campo) {
      setParam("dir", dir === "asc" ? "desc" : "asc");
    } else {
      setSp((prev) => {
        const next = new URLSearchParams(prev);
        next.set("sort", campo);
        next.set("dir", "asc");
        next.set("page", "1");
        return next;
      });
    }
  };

  const toggleSelecionado = (id: string) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTodos = () => {
    if (selecionados.size === usuarios.length) setSelecionados(new Set());
    else setSelecionados(new Set(usuarios.map((u) => u.id)));
  };

  const handleAcaoLote = async (acao: "ativar" | "desativar") => {
    const ids = Array.from(selecionados);
    const confirmado = await confirm({
      title: `${acao === "ativar" ? "Ativar" : "Desativar"} ${ids.length} usuário(s)?`,
      description: `Esta ação irá ${acao} os usuários selecionados.`,
      confirmLabel: acao === "ativar" ? "Ativar" : "Desativar",
      variant: acao === "desativar" ? "danger" : "default",
    });
    if (!confirmado) return;

    try {
      await acaoLoteUsuarios(ids, acao);
      toast.success(`${ids.length} usuário(s) ${acao === "ativar" ? "ativado(s)" : "desativado(s)"}`);
      carregarLista();
      carregarResumo();
    } catch {
      toast.error("Erro na ação em lote");
    }
  };

  const exportarCSV = () => {
    const header = "Nome,Email,CPF,Prefeitura,UF,Secretaria,Perfil,Status,2FA,Último Acesso,Criado em";
    const rows = usuarios.map((u) =>
      [u.nome, u.email, u.cpf || "", u.municipio_nome, u.municipio_uf, u.secretaria_nome,
       u.perfil_nome, u.ativo ? "Ativo" : "Inativo", u.totp_ativado ? "Sim" : "Não",
       u.ultimo_acesso || "", u.criado_em].join(","),
    );
    const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `usuarios_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-superadmin-accent/10">
            <Users className="h-5 w-5 text-superadmin-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Usuários Global</h1>
            <p className="text-sm text-muted-foreground">Todos os servidores da plataforma</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={exportarCSV} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted transition-colors">
            <Download className="h-4 w-4" /> CSV
          </button>
          <button type="button" onClick={() => setModalAberto(true)} className="flex items-center gap-2 rounded-lg bg-superadmin-accent px-4 py-2 text-sm font-medium text-white hover:bg-superadmin-accent/90 transition-colors">
            <Plus className="h-4 w-4" /> Novo Usuário
          </button>
        </div>
      </div>

      {/* KPIs */}
      {loadingResumo ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard /></div>
      ) : resumo && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Usuários Ativos" valor={resumo.ativos} icon={UserCheck} cor="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
          <KpiCard label="Novos (30 dias)" valor={resumo.novos_30d} icon={UserPlus} cor="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
          <KpiCard label={`2FA Habilitado (${resumo.pct_2fa}%)`} valor={resumo.com_2fa} icon={Shield} cor="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />
          <KpiCard label="Inativos +90 dias" valor={resumo.inativos_90d} icon={Clock} cor="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
        </div>
      )}

      {/* Sub-abas */}
      <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
        {ABAS.map((a) => (
          <button key={a.key} type="button" onClick={() => setParam("aba", a.key === "todos" ? "" : a.key)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${aba === a.key ? "bg-background shadow-sm" : "hover:bg-background/50"}`}>
            {a.label}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-50">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={busca} onChange={(e) => setParam("busca", e.target.value)}
            placeholder="Buscar nome, email, CPF..."
            className="w-full rounded-lg border bg-background py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-superadmin-accent" />
        </div>
        <select value={municipioId} onChange={(e) => setParam("municipio", e.target.value)}
          className="rounded-lg border bg-background px-3 py-2 text-sm">
          <option value="">Prefeitura</option>
          {prefeituras.map((p) => <option key={p.id} value={p.id}>{p.nome} ({p.uf})</option>)}
        </select>
        <select value={perfil} onChange={(e) => setParam("perfil", e.target.value)}
          className="rounded-lg border bg-background px-3 py-2 text-sm">
          <option value="">Perfil</option>
          {perfis.map((p) => <option key={p.id} value={p.nome}>{p.nome}</option>)}
        </select>
        <select value={com2fa} onChange={(e) => setParam("2fa", e.target.value)}
          className="rounded-lg border bg-background px-3 py-2 text-sm">
          <option value="">2FA</option>
          <option value="sim">Com 2FA</option>
          <option value="nao">Sem 2FA</option>
        </select>
        <button type="button" onClick={() => { carregarResumo(); carregarLista(); }}
          className="rounded-lg border p-2 hover:bg-muted transition-colors">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Ações em lote */}
      {selecionados.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-superadmin-accent/30 bg-superadmin-accent/5 px-4 py-2">
          <span className="text-sm font-medium">{selecionados.size} selecionado(s)</span>
          <button type="button" onClick={() => handleAcaoLote("ativar")}
            className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700">Ativar</button>
          <button type="button" onClick={() => handleAcaoLote("desativar")}
            className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700">Desativar</button>
          <button type="button" onClick={() => setSelecionados(new Set())}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground">Limpar</button>
        </div>
      )}

      {/* Tabela */}
      {loading ? <SkeletonTable rows={8} cols={8} /> : (
        <TabelaResponsiva
          mobileCards={
            usuarios.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-12">Nenhum usuário encontrado</p>
            ) : usuarios.map((u) => (
              <CardMobile key={u.id} onClick={() => setDrawerUsuarioId(u.id)}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">
                    {u.nome}
                    {u.is_superadmin && <span className="ml-1.5 inline-flex rounded-full bg-yellow-100 px-1.5 py-0.5 text-[9px] font-bold text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">SA</span>}
                  </span>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${u.ativo ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                    {u.ativo ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <CardMobileCampo label="Email">{u.email}</CardMobileCampo>
                <CardMobileCampo label="Prefeitura">{u.municipio_nome} ({u.municipio_uf})</CardMobileCampo>
                <CardMobileCampo label="Perfil"><PerfilBadge nome={u.perfil_nome} /></CardMobileCampo>
                <CardMobileCampo label="Último acesso">{tempoRelativo(u.ultimo_acesso)}</CardMobileCampo>
              </CardMobile>
            ))
          }
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                <th className="p-3 w-10">
                  <input type="checkbox" checked={selecionados.size === usuarios.length && usuarios.length > 0}
                    onChange={toggleTodos} className="rounded" />
                </th>
                <th className="p-3"><SortHeader label="Nome" campo="nome" atual={sort} dir={dir} onSort={handleSort} /></th>
                <th className="p-3"><SortHeader label="Email" campo="email" atual={sort} dir={dir} onSort={handleSort} /></th>
                <th className="p-3">CPF</th>
                <th className="p-3"><SortHeader label="Prefeitura" campo="prefeitura" atual={sort} dir={dir} onSort={handleSort} /></th>
                <th className="p-3">Perfil</th>
                <th className="p-3">Status</th>
                <th className="p-3">2FA</th>
                <th className="p-3"><SortHeader label="Último Acesso" campo="ultimo_acesso" atual={sort} dir={dir} onSort={handleSort} /></th>
                <th className="p-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.length === 0 ? (
                <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">Nenhum usuário encontrado</td></tr>
              ) : usuarios.map((u) => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="p-3">
                    <input type="checkbox" checked={selecionados.has(u.id)}
                      onChange={() => toggleSelecionado(u.id)} className="rounded" />
                  </td>
                  <td className="p-3">
                    <button type="button" onClick={() => setDrawerUsuarioId(u.id)}
                      className="text-left font-medium hover:text-superadmin-accent transition-colors">
                      {u.nome}
                      {u.is_superadmin && (
                        <span className="ml-1.5 inline-flex items-center rounded-full bg-yellow-100 px-1.5 py-0.5 text-[9px] font-bold text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">SA</span>
                      )}
                    </button>
                  </td>
                  <td className="p-3 text-muted-foreground">{u.email}</td>
                  <td className="p-3 text-muted-foreground font-mono text-xs">{mascaraCPF(u.cpf)}</td>
                  <td className="p-3">
                    <span className="text-xs">{u.municipio_nome}</span>
                    <span className="ml-1 inline-flex items-center rounded bg-muted px-1 py-0.5 text-[10px] font-semibold">{u.municipio_uf}</span>
                  </td>
                  <td className="p-3"><PerfilBadge nome={u.perfil_nome} /></td>
                  <td className="p-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${u.ativo ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                      {u.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {u.totp_ativado
                      ? <span className="text-emerald-500" title="2FA ativo">✅</span>
                      : <span className="text-muted-foreground" title="Sem 2FA">❌</span>}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{tempoRelativo(u.ultimo_acesso)}</td>
                  <td className="p-3 relative">
                    <button type="button" onClick={() => setMenuAberto(menuAberto === u.id ? null : u.id)}
                      className="rounded-md p-1 hover:bg-muted transition-colors">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {menuAberto === u.id && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setMenuAberto(null)} />
                        <div className="absolute right-0 top-full z-40 mt-1 w-40 rounded-lg border bg-background py-1 shadow-lg">
                          <button type="button" onClick={() => { setDrawerUsuarioId(u.id); setMenuAberto(null); }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-muted">
                            <Eye className="h-3 w-3" /> Ver detalhes
                          </button>
                          <button type="button" onClick={() => { setDrawerUsuarioId(u.id); setMenuAberto(null); }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-muted">
                            <Edit className="h-3 w-3" /> Editar
                          </button>
                          <button type="button" onClick={async () => {
                            setMenuAberto(null);
                            const ok = await confirm({
                              title: `${u.ativo ? "Desativar" : "Ativar"} ${u.nome}?`,
                              description: `O usuário será ${u.ativo ? "desativado" : "ativado"}.`,
                              confirmLabel: u.ativo ? "Desativar" : "Ativar",
                              variant: u.ativo ? "danger" : "default",
                            });
                            if (ok) {
                              await acaoLoteUsuarios([u.id], u.ativo ? "desativar" : "ativar");
                              toast.success(`${u.nome} ${u.ativo ? "desativado" : "ativado"}`);
                              carregarLista();
                              carregarResumo();
                            }
                          }}
                            className={`flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-muted ${u.ativo ? "text-red-600" : "text-emerald-600"}`}>
                            <Power className="h-3 w-3" /> {u.ativo ? "Desativar" : "Ativar"}
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Paginação */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
              <span>{total} usuário(s) — Página {page} de {totalPaginas}</span>
              <div className="flex items-center gap-1">
                <button type="button" disabled={page <= 1} onClick={() => setParam("page", String(page - 1))}
                  className="rounded-md p-1.5 hover:bg-muted disabled:opacity-30">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button type="button" disabled={page >= totalPaginas} onClick={() => setParam("page", String(page + 1))}
                  className="rounded-md p-1.5 hover:bg-muted disabled:opacity-30">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </TabelaResponsiva>
      )}

      {/* Modal Criar */}
      <CriarUsuarioModal
        aberto={modalAberto}
        onClose={() => setModalAberto(false)}
        onCriado={() => { setModalAberto(false); carregarLista(); carregarResumo(); }}
      />

      {/* Drawer */}
      <UsuarioDrawer
        usuarioId={drawerUsuarioId}
        onClose={() => setDrawerUsuarioId(null)}
        onAtualizado={() => { carregarLista(); carregarResumo(); }}
      />
    </div>
  );
}
