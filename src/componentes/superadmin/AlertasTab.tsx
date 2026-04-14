import { useState, useEffect, useCallback } from "react";
import { Bell, BellOff, CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/componentes/ui/button";
import { listarAlertas, marcarAlertaLido } from "@/servicos/monitoramento";
import type { AlertaMonitoramento } from "@/tipos";
import { toast } from "sonner";

const SEVERIDADE_CONFIG: Record<string, { cor: string; bg: string; icon: typeof AlertTriangle; label: string }> = {
  critical: { cor: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30", icon: XCircle, label: "Crítico" },
  warning: { cor: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-100 dark:bg-yellow-900/30", icon: AlertTriangle, label: "Aviso" },
  info: { cor: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30", icon: Info, label: "Info" },
};

export function AlertasTab() {
  const [alertas, setAlertas] = useState<AlertaMonitoramento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroNaoLidos, setFiltroNaoLidos] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listarAlertas(filtroNaoLidos, 100);
      setAlertas(res.data);
    } catch {
      toast.error("Falha ao carregar alertas");
    } finally {
      setLoading(false);
    }
  }, [filtroNaoLidos]);

  useEffect(() => { carregar(); }, [carregar]);

  // Auto-refresh a cada 60s
  useEffect(() => {
    const timer = setInterval(() => carregar(), 60_000);
    return () => clearInterval(timer);
  }, [carregar]);

  const handleMarcarLido = async (id: string) => {
    try {
      await marcarAlertaLido(id);
      toast.success("Alerta marcado como lido");
      await carregar();
    } catch {
      toast.error("Falha ao marcar alerta");
    }
  };

  const naoLidos = alertas.filter((a) => !a.lido).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            <Bell className="mr-1.5 inline h-4 w-4" />
            Alertas do Sistema
          </h3>
          {naoLidos > 0 && (
            <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {naoLidos} não lido{naoLidos !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFiltroNaoLidos(!filtroNaoLidos)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs transition-colors border",
              filtroNaoLidos ? "bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            <BellOff className="mr-1 inline h-3.5 w-3.5" />
            {filtroNaoLidos ? "Mostrando não lidos" : "Filtrar não lidos"}
          </button>
          <Button variant="outline" size="sm" onClick={carregar}>
            Atualizar
          </Button>
        </div>
      </div>

      {/* Lista de alertas */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : alertas.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-500" />
          {filtroNaoLidos ? "Nenhum alerta não lido" : "Nenhum alerta registrado"}
        </div>
      ) : (
        <div className="space-y-3">
          {alertas.map((alerta) => {
            const config = SEVERIDADE_CONFIG[alerta.severidade] ?? SEVERIDADE_CONFIG.info;
            const Icon = config.icon;
            return (
              <div
                key={alerta.id}
                className={cn(
                  "rounded-xl border bg-card p-4 transition-colors",
                  !alerta.lido && "border-l-4",
                  !alerta.lido && alerta.severidade === "critical" && "border-l-red-500",
                  !alerta.lido && alerta.severidade === "warning" && "border-l-yellow-500",
                  !alerta.lido && alerta.severidade === "info" && "border-l-blue-500",
                  alerta.lido && "opacity-60",
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={cn("mt-0.5 rounded-full p-1.5", config.bg)}>
                      <Icon className={cn("h-4 w-4", config.cor)} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{alerta.titulo}</span>
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", config.bg, config.cor)}>
                          {config.label}
                        </span>
                      </div>
                      {alerta.descricao && (
                        <p className="text-xs text-muted-foreground">{alerta.descricao}</p>
                      )}
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>{new Date(alerta.created_at).toLocaleString("pt-BR")}</span>
                        {alerta.referencia_tipo && (
                          <span className="rounded bg-muted px-1.5 py-0.5">{alerta.referencia_tipo}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {!alerta.lido && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarcarLido(alerta.id)}
                      title="Marcar como lido"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
