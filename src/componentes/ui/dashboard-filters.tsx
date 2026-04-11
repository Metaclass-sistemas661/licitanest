import { useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/componentes/ui/button";
import { Badge } from "@/componentes/ui/badge";
import { Input } from "@/componentes/ui/input";
import {
  Calendar,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { StatusWorkflow } from "@/tipos";
import { LABELS_WORKFLOW } from "@/servicos/workflow";

export interface DashboardFiltros {
  periodo: string; // preset key or "custom"
  dataInicio?: string;
  dataFim?: string;
  secretaria?: string;
  status: StatusWorkflow[];
}

const PRESETS_PERIODO = [
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "90d", label: "90 dias" },
  { key: "mes", label: "Este mês" },
  { key: "ano", label: "Este ano" },
  { key: "todos", label: "Todos" },
] as const;

const STATUS_OPTIONS: StatusWorkflow[] = [
  "rascunho",
  "em_pesquisa",
  "em_analise",
  "aguardando_aprovacao",
  "aprovada",
  "devolvida",
  "publicada",
  "arquivada",
];

interface DashboardFiltersProps {
  secretarias: string[];
  onFiltrar: (filtros: DashboardFiltros) => void;
}

export function DashboardFilters({ secretarias, onFiltrar }: DashboardFiltersProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [aberto, setAberto] = useState(() => searchParams.size > 0);

  // Initialize from URL
  const filtrosFromUrl = useMemo((): DashboardFiltros => ({
    periodo: searchParams.get("periodo") || "todos",
    dataInicio: searchParams.get("inicio") || undefined,
    dataFim: searchParams.get("fim") || undefined,
    secretaria: searchParams.get("secretaria") || undefined,
    status: (searchParams.get("status")?.split(",").filter(Boolean) || []) as StatusWorkflow[],
  }), [searchParams]);

  const [filtros, setFiltros] = useState<DashboardFiltros>(filtrosFromUrl);

  const temFiltroAtivo = filtros.periodo !== "todos" || filtros.secretaria || filtros.status.length > 0;

  const aplicar = useCallback((novosFiltros: DashboardFiltros) => {
    setFiltros(novosFiltros);

    // Persist to URL
    const params = new URLSearchParams();
    if (novosFiltros.periodo !== "todos") params.set("periodo", novosFiltros.periodo);
    if (novosFiltros.dataInicio) params.set("inicio", novosFiltros.dataInicio);
    if (novosFiltros.dataFim) params.set("fim", novosFiltros.dataFim);
    if (novosFiltros.secretaria) params.set("secretaria", novosFiltros.secretaria);
    if (novosFiltros.status.length > 0) params.set("status", novosFiltros.status.join(","));
    setSearchParams(params, { replace: true });

    onFiltrar(novosFiltros);
  }, [onFiltrar, setSearchParams]);

  const limpar = useCallback(() => {
    const vazio: DashboardFiltros = { periodo: "todos", status: [] };
    aplicar(vazio);
  }, [aplicar]);

  const toggleStatus = (s: StatusWorkflow) => {
    const novoStatus = filtros.status.includes(s)
      ? filtros.status.filter((x) => x !== s)
      : [...filtros.status, s];
    aplicar({ ...filtros, status: novoStatus });
  };

  const removerFiltro = (campo: string) => {
    if (campo === "periodo") aplicar({ ...filtros, periodo: "todos", dataInicio: undefined, dataFim: undefined });
    else if (campo === "secretaria") aplicar({ ...filtros, secretaria: undefined });
    else if (campo.startsWith("status:")) {
      const s = campo.replace("status:", "") as StatusWorkflow;
      aplicar({ ...filtros, status: filtros.status.filter((x) => x !== s) });
    }
  };

  return (
    <div className="space-y-2">
      {/* Toggle bar */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAberto(!aberto)}
          className="gap-1.5"
        >
          <Filter className="h-3.5 w-3.5" />
          Filtros
          {temFiltroAtivo && (
            <Badge variant="secondary" className="ml-1 h-5 min-w-5 rounded-full px-1.5 text-[10px]">
              {(filtros.periodo !== "todos" ? 1 : 0) + (filtros.secretaria ? 1 : 0) + filtros.status.length}
            </Badge>
          )}
          {aberto ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>

        {/* Active filter badges */}
        <AnimatePresence>
          {temFiltroAtivo && (
            <motion.div
              className="flex flex-wrap items-center gap-1.5"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
            >
              {filtros.periodo !== "todos" && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  {PRESETS_PERIODO.find((p) => p.key === filtros.periodo)?.label || filtros.periodo}
                  <button type="button" onClick={() => removerFiltro("periodo")} className="hover:text-destructive" aria-label="Remover filtro de período">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filtros.secretaria && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  {filtros.secretaria}
                  <button type="button" onClick={() => removerFiltro("secretaria")} className="hover:text-destructive" aria-label="Remover filtro de secretaria">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filtros.status.map((s) => (
                <Badge key={s} variant="secondary" className="gap-1 text-xs">
                  {LABELS_WORKFLOW[s] || s}
                  <button type="button" onClick={() => removerFiltro(`status:${s}`)} className="hover:text-destructive" aria-label={`Remover filtro ${s}`}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <button
                type="button"
                onClick={limpar}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Limpar tudo
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Expandable filter panel */}
      <AnimatePresence>
        {aberto && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border bg-card/50 p-4 space-y-4">
              {/* Período */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Período
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS_PERIODO.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => aplicar({ ...filtros, periodo: p.key, dataInicio: undefined, dataFim: undefined })}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-all duration-150 ${
                        filtros.periodo === p.key
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Custom date range */}
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="date"
                    value={filtros.dataInicio || ""}
                    onChange={(e) => aplicar({ ...filtros, periodo: "custom", dataInicio: e.target.value })}
                    className="h-8 text-xs w-36"
                    aria-label="Data início"
                  />
                  <span className="text-xs text-muted-foreground">até</span>
                  <Input
                    type="date"
                    value={filtros.dataFim || ""}
                    onChange={(e) => aplicar({ ...filtros, periodo: "custom", dataFim: e.target.value })}
                    className="h-8 text-xs w-36"
                    aria-label="Data fim"
                  />
                </div>
              </div>

              {/* Secretaria */}
              {secretarias.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Secretaria
                  </label>
                  <select
                    value={filtros.secretaria || ""}
                    onChange={(e) => aplicar({ ...filtros, secretaria: e.target.value || undefined })}
                    className="flex h-9 w-full max-w-xs rounded-lg border border-input bg-background px-3 py-1 text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Filtrar por secretaria"
                  >
                    <option value="">Todas as secretarias</option>
                    {secretarias.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status da Cesta
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleStatus(s)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-all duration-150 ${
                        filtros.status.includes(s)
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {LABELS_WORKFLOW[s] || s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              {temFiltroAtivo && (
                <div className="flex justify-end pt-1">
                  <Button variant="ghost" size="sm" onClick={limpar} className="text-xs gap-1">
                    <X className="h-3 w-3" />
                    Limpar filtros
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DashboardFilters;
