import { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle, Bug, CheckCircle2, Search,
  ChevronLeft, ChevronRight, Eye, Clock, Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/componentes/ui/button";
import { listarErros, obterResumoErros, resolverErro } from "@/servicos/monitoramento";
import type { ErroSistema, ResumoErros, OrigemErro, SeveridadeErro } from "@/tipos";
import { toast } from "sonner";

const SEVERIDADE_CONFIG: Record<SeveridadeErro, { cor: string; bg: string; label: string }> = {
  critical: { cor: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30", label: "Crítico" },
  error: { cor: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/30", label: "Erro" },
  warning: { cor: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-100 dark:bg-yellow-900/30", label: "Aviso" },
  info: { cor: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30", label: "Info" },
};

const ORIGEM_LABELS: Record<OrigemErro, string> = {
  frontend: "Frontend",
  api: "API",
  cloud_function: "Cloud Function",
  cron: "Cron",
  webhook: "Webhook",
};

export function ErrosTab() {
  const [erros, setErros] = useState<ErroSistema[]>([]);
  const [resumo, setResumo] = useState<ResumoErros | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filtroOrigem, setFiltroOrigem] = useState("");
  const [filtroSeveridade, setFiltroSeveridade] = useState("");
  const [filtroResolvido, setFiltroResolvido] = useState<string>("");
  const [busca, setBusca] = useState("");
  const [erroSelecionado, setErroSelecionado] = useState<ErroSistema | null>(null);
  const limit = 20;

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [errosRes, resumoRes] = await Promise.all([
        listarErros({
          page,
          limit,
          origem: filtroOrigem || undefined,
          severidade: filtroSeveridade || undefined,
          resolvido: filtroResolvido ? filtroResolvido === "true" : undefined,
          busca: busca || undefined,
        }),
        obterResumoErros(),
      ]);
      setErros(errosRes.data);
      setTotal(errosRes.pagination.total);
      setResumo(resumoRes.data);
    } catch {
      toast.error("Falha ao carregar erros");
    } finally {
      setLoading(false);
    }
  }, [page, filtroOrigem, filtroSeveridade, filtroResolvido, busca]);

  useEffect(() => { carregar(); }, [carregar]);

  const handleResolver = async (id: string) => {
    try {
      await resolverErro(id);
      toast.success("Erro marcado como resolvido");
      await carregar();
      setErroSelecionado(null);
    } catch {
      toast.error("Falha ao resolver erro");
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      {resumo && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard label="Total de Erros" valor={resumo.total} icon={Bug} />
          <KpiCard label="Não Resolvidos" valor={resumo.nao_resolvidos} icon={AlertTriangle} cor="text-orange-600" />
          <KpiCard label="Críticos" valor={resumo.criticos} icon={AlertTriangle} cor="text-red-600" />
          <KpiCard label="Últimas 24h" valor={resumo.ultimas_24h} icon={Clock} />
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar mensagem ou arquivo..."
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setPage(1); }}
            className="w-full rounded-lg border bg-background py-2 pl-10 pr-3 text-sm"
          />
        </div>
        <select
          value={filtroOrigem}
          onChange={(e) => { setFiltroOrigem(e.target.value); setPage(1); }}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="">Todas origens</option>
          {Object.entries(ORIGEM_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filtroSeveridade}
          onChange={(e) => { setFiltroSeveridade(e.target.value); setPage(1); }}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="">Todas severidades</option>
          {Object.entries(SEVERIDADE_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select
          value={filtroResolvido}
          onChange={(e) => { setFiltroResolvido(e.target.value); setPage(1); }}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="">Todos status</option>
          <option value="false">Não resolvidos</option>
          <option value="true">Resolvidos</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border bg-card">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : erros.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-500" />
            Nenhum erro encontrado
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3">Severidade</th>
                  <th className="px-4 py-3">Origem</th>
                  <th className="px-4 py-3">Mensagem</th>
                  <th className="px-4 py-3">Arquivo</th>
                  <th className="px-4 py-3 text-center">
                    <Hash className="inline h-3.5 w-3.5" />
                  </th>
                  <th className="px-4 py-3">Última</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {erros.map((erro) => {
                  const sev = SEVERIDADE_CONFIG[erro.severidade];
                  return (
                    <tr
                      key={erro.id}
                      className={cn(
                        "border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors",
                        erro.resolvido && "opacity-60",
                      )}
                      onClick={() => setErroSelecionado(erro)}
                    >
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", sev.bg, sev.cor)}>
                          {sev.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">{ORIGEM_LABELS[erro.origem] ?? erro.origem}</td>
                      <td className="max-w-xs truncate px-4 py-3 font-mono text-xs">{erro.mensagem}</td>
                      <td className="max-w-[180px] truncate px-4 py-3 font-mono text-xs text-muted-foreground">
                        {erro.arquivo ? `${erro.arquivo}:${erro.linha ?? "?"}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-center text-xs">{erro.ocorrencias}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                        {new Date(erro.ultima_ocorrencia).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setErroSelecionado(erro); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <span className="text-xs text-muted-foreground">{total} erro(s)</span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs">{page} / {totalPages}</span>
              <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de detalhes */}
      {erroSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setErroSelecionado(null)}>
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Detalhes do Erro</h3>
              {!erroSelecionado.resolvido && (
                <Button size="sm" onClick={() => handleResolver(erroSelecionado.id)}>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" /> Resolver
                </Button>
              )}
            </div>
            <dl className="space-y-3 text-sm">
              <div><dt className="text-xs text-muted-foreground">Mensagem</dt><dd className="font-mono">{erroSelecionado.mensagem}</dd></div>
              {erroSelecionado.arquivo && (
                <div><dt className="text-xs text-muted-foreground">Local</dt><dd className="font-mono">{erroSelecionado.arquivo}:{erroSelecionado.linha}:{erroSelecionado.coluna}</dd></div>
              )}
              {erroSelecionado.stack_trace && (
                <div>
                  <dt className="text-xs text-muted-foreground">Stack Trace</dt>
                  <dd><pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded border bg-muted/50 p-3 font-mono text-xs">{erroSelecionado.stack_trace}</pre></dd>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div><dt className="text-xs text-muted-foreground">Origem</dt><dd>{ORIGEM_LABELS[erroSelecionado.origem] ?? erroSelecionado.origem}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Ocorrências</dt><dd>{erroSelecionado.ocorrencias}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Primeira vez</dt><dd>{new Date(erroSelecionado.primeira_ocorrencia).toLocaleString("pt-BR")}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Última vez</dt><dd>{new Date(erroSelecionado.ultima_ocorrencia).toLocaleString("pt-BR")}</dd></div>
              </div>
            </dl>
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => setErroSelecionado(null)}>Fechar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, valor, icon: Icon, cor }: { label: string; valor: number; icon: React.ElementType; cor?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className={cn("h-4 w-4", cor)} />
        {label}
      </div>
      <p className={cn("mt-1 text-2xl font-bold", cor)}>{valor.toLocaleString("pt-BR")}</p>
    </div>
  );
}
