import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Filter, X } from "lucide-react";

interface DashboardFiltrosProps {
  ufs: string[];
  carregandoUfs: boolean;
}

const PERIODOS = [
  { label: "30 dias", value: "30" },
  { label: "60 dias", value: "60" },
  { label: "90 dias", value: "90" },
  { label: "180 dias", value: "180" },
  { label: "1 ano", value: "365" },
];

const STATUS_CONTRATO = [
  { label: "Ativo", value: "ativo" },
  { label: "Rascunho", value: "rascunho" },
  { label: "Pend. Assinatura", value: "pendente_assinatura" },
  { label: "Suspenso", value: "suspenso" },
  { label: "Encerrado", value: "encerrado" },
  { label: "Cancelado", value: "cancelado" },
  { label: "Renovação", value: "renovacao" },
];

export function useDashboardFiltros() {
  const [searchParams, setSearchParams] = useSearchParams();

  const dias = searchParams.get("dias") || "365";
  const uf = searchParams.get("uf") || "";
  const status = searchParams.get("status") || "";

  const setFiltro = useCallback(
    (key: string, value: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
        return next;
      });
    },
    [setSearchParams],
  );

  const limparFiltros = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  const temFiltros = uf !== "" || status !== "" || dias !== "365";

  return { dias, uf, status, setFiltro, limparFiltros, temFiltros };
}

export function DashboardFiltros({ ufs, carregandoUfs }: DashboardFiltrosProps) {
  const { dias, uf, status, setFiltro, limparFiltros, temFiltros } = useDashboardFiltros();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Filter className="h-3.5 w-3.5" />
        <span>Filtros</span>
      </div>

      {/* Período */}
      <select
        value={dias}
        onChange={(e) => setFiltro("dias", e.target.value === "365" ? "" : e.target.value)}
        className="rounded-md border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-superadmin-accent"
      >
        {PERIODOS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>

      {/* UF */}
      <select
        value={uf}
        onChange={(e) => setFiltro("uf", e.target.value)}
        disabled={carregandoUfs}
        className="rounded-md border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-superadmin-accent disabled:opacity-50"
      >
        <option value="">Todas as UFs</option>
        {ufs.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </select>

      {/* Status */}
      <select
        value={status}
        onChange={(e) => setFiltro("status", e.target.value)}
        className="rounded-md border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-superadmin-accent"
      >
        <option value="">Todos os status</option>
        {STATUS_CONTRATO.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      {/* Limpar */}
      {temFiltros && (
        <button
          type="button"
          onClick={limparFiltros}
          className="flex items-center gap-1 rounded-md bg-muted px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/80 transition-colors"
        >
          <X className="h-3 w-3" />
          Limpar
        </button>
      )}
    </div>
  );
}
