import { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/componentes/ui/button";
import { verificarSaude } from "@/servicos/monitoramento";
import type { ResumoSaude, StatusHealthCheck } from "@/tipos";
import { toast } from "sonner";

const STATUS_CONFIG: Record<StatusHealthCheck, { cor: string; bg: string; icon: React.ElementType; label: string }> = {
  healthy: { cor: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30", icon: CheckCircle2, label: "Saudável" },
  degraded: { cor: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-100 dark:bg-yellow-900/30", icon: AlertTriangle, label: "Degradado" },
  down: { cor: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30", icon: XCircle, label: "Fora do ar" },
};

export function SaudeTab() {
  const [saude, setSaude] = useState<ResumoSaude | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const carregar = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await verificarSaude();
      setSaude(res.data);
    } catch {
      toast.error("Falha ao verificar saúde do sistema");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  // Auto-refresh a cada 30s
  useEffect(() => {
    const interval = setInterval(() => carregar(true), 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!saude) return null;

  const statusGeral = STATUS_CONFIG[saude.status_geral];
  const StatusGeralIcon = statusGeral.icon;

  return (
    <div className="space-y-6">
      {/* Status geral */}
      <div className={cn("flex items-center justify-between rounded-xl border p-6", statusGeral.bg)}>
        <div className="flex items-center gap-4">
          <StatusGeralIcon className={cn("h-10 w-10", statusGeral.cor)} />
          <div>
            <h3 className="text-lg font-semibold">Status Geral do Sistema</h3>
            <p className={cn("text-sm font-medium", statusGeral.cor)}>{statusGeral.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            <Clock className="mr-1 inline h-3.5 w-3.5" />
            {new Date(saude.ultima_verificacao).toLocaleTimeString("pt-BR")}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => carregar(true)}
            disabled={refreshing}
          >
            <RefreshCw className={cn("mr-1.5 h-4 w-4", refreshing && "animate-spin")} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Grid de serviços */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {saude.servicos.map((servico) => {
          const cfg = STATUS_CONFIG[servico.status];
          const Icon = cfg.icon;
          return (
            <div key={servico.servico} className="rounded-xl border bg-card p-5 transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize">{servico.servico.replace(/_/g, " ")}</span>
                <Icon className={cn("h-5 w-5", cfg.cor)} />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", cfg.bg, cfg.cor)}>
                  {cfg.label}
                </span>
                {servico.latencia_ms != null && servico.latencia_ms > 0 && (
                  <span className="text-xs text-muted-foreground">{servico.latencia_ms}ms</span>
                )}
              </div>
              {servico.detalhes && Object.keys(servico.detalhes).length > 0 && (
                <div className="mt-3 space-y-1">
                  {Object.entries(servico.detalhes).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-mono">{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
