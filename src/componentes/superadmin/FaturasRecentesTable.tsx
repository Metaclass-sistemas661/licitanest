import { ExternalLink } from "lucide-react";
import { SkeletonTable } from "@/componentes/ui/skeleton";
import type { FaturaRecente } from "@/servicos/dashboard-superadmin";

interface FaturasRecentesTableProps {
  faturas: FaturaRecente[];
  carregando: boolean;
}

const STATUS_BADGE: Record<string, { label: string; cor: string }> = {
  paga: { label: "Paga", cor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  pendente: { label: "Pendente", cor: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  vencida: { label: "Vencida", cor: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  cancelada: { label: "Cancelada", cor: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400" },
  estornada: { label: "Estornada", cor: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
};

function formatarCentavos(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

export function FaturasRecentesTable({ faturas, carregando }: FaturasRecentesTableProps) {
  if (carregando) return <SkeletonTable rows={5} cols={6} />;

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h3 className="text-sm font-semibold">Faturas Recentes</h3>
        <a
          href="/superadmin/faturas"
          className="flex items-center gap-1 text-xs text-superadmin-accent hover:underline"
        >
          Ver todas <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-6 py-3 font-medium">Nº</th>
              <th className="px-6 py-3 font-medium">Município</th>
              <th className="px-6 py-3 font-medium">Contrato</th>
              <th className="px-6 py-3 font-medium text-right">Valor</th>
              <th className="px-6 py-3 font-medium">Vencimento</th>
              <th className="px-6 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {faturas.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                  Nenhuma fatura encontrada
                </td>
              </tr>
            ) : (
              faturas.map((f) => {
                const badge = STATUS_BADGE[f.status] || STATUS_BADGE.pendente;
                return (
                  <tr key={f.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-3 font-mono text-xs">{f.numero}</td>
                    <td className="px-6 py-3">
                      <span>{f.municipio_nome}</span>
                      <span className="ml-1 text-xs text-muted-foreground">({f.municipio_uf})</span>
                    </td>
                    <td className="px-6 py-3 text-xs text-muted-foreground">
                      {f.numero_contrato || "—"}
                    </td>
                    <td className="px-6 py-3 text-right font-medium">
                      {formatarCentavos(f.valor)}
                    </td>
                    <td className="px-6 py-3 text-xs">{formatarData(f.vencimento)}</td>
                    <td className="px-6 py-3">
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
    </div>
  );
}
