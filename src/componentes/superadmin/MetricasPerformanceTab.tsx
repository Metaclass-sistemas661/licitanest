import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { listarMetricas } from "@/servicos/monitoramento";
import type { MetricaSistema } from "@/tipos";
import { toast } from "sonner";

export function MetricasPerformanceTab() {
  const [metricas, setMetricas] = useState<MetricaSistema[]>([]);
  const [loading, setLoading] = useState(true);
  const [horas, setHoras] = useState(24);

  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      try {
        const res = await listarMetricas(horas);
        setMetricas(res.data);
      } catch {
        toast.error("Falha ao carregar métricas");
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, [horas]);

  // Agrupar métricas por tipo
  const porTipo = metricas.reduce<Record<string, MetricaSistema[]>>((acc, m) => {
    if (!acc[m.tipo]) acc[m.tipo] = [];
    acc[m.tipo].push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Filtro de período */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          <BarChart3 className="mr-1.5 inline h-4 w-4" />
          Métricas de Performance
        </h3>
        <div className="flex gap-1 rounded-lg border p-1">
          {[1, 6, 12, 24, 48, 168].map((h) => (
            <button
              key={h}
              onClick={() => setHoras(h)}
              className={cn(
                "rounded-md px-3 py-1 text-xs transition-colors",
                horas === h ? "bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              {h < 24 ? `${h}h` : h === 24 ? "24h" : h === 48 ? "2d" : "7d"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : Object.keys(porTipo).length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          <TrendingUp className="mx-auto mb-2 h-8 w-8" />
          Nenhuma métrica registrada neste período
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(porTipo).map(([tipo, items]) => {
            const latest = items[0];
            const valores = items.map((i) => i.valor);
            const media = valores.reduce((a, b) => a + b, 0) / valores.length;
            const max = Math.max(...valores);

            return (
              <div key={tipo} className="rounded-xl border bg-card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{tipo.replace(/_/g, " ")}</span>
                  <span className="text-xs text-muted-foreground">{latest?.unidade ?? ""}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Atual</p>
                    <p className="text-lg font-bold">{latest?.valor.toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Média</p>
                    <p className="text-lg font-bold">{media.toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Max</p>
                    <p className="text-lg font-bold">{max.toFixed(1)}</p>
                  </div>
                </div>
                {/* Mini gráfico de barras simplificado */}
                <div className="mt-4 flex items-end gap-0.5" style={{ height: 40 }}>
                  {items.slice(0, 30).reverse().map((item, i) => {
                    const height = max > 0 ? (item.valor / max) * 100 : 0;
                    return (
                      <div
                        key={i}
                        className="flex-1 rounded-t bg-primary/60 transition-all hover:bg-primary"
                        style={{ height: `${Math.max(2, height)}%` }}
                        title={`${item.valor.toFixed(1)} ${item.unidade ?? ""} — ${new Date(item.timestamp).toLocaleTimeString("pt-BR")}`}
                      />
                    );
                  })}
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                  <span>{items.length} pontos</span>
                  <span>
                    <Clock className="mr-0.5 inline h-3 w-3" />
                    {new Date(latest?.timestamp).toLocaleTimeString("pt-BR")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
