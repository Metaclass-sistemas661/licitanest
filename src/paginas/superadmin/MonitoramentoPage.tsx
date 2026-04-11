import { useState } from "react";
import { Bug, HeartPulse, BarChart3, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { ErrosTab } from "@/componentes/superadmin/ErrosTab";
import { SaudeTab } from "@/componentes/superadmin/SaudeTab";
import { MetricasPerformanceTab } from "@/componentes/superadmin/MetricasPerformanceTab";
import { TestesTab } from "@/componentes/superadmin/TestesTab";

const TABS = [
  { id: "erros", label: "Erros", icon: Bug },
  { id: "saude", label: "Saúde", icon: HeartPulse },
  { id: "metricas", label: "Métricas", icon: BarChart3 },
  { id: "testes", label: "Testes", icon: FlaskConical },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function MonitoramentoPage() {
  const [tabAtiva, setTabAtiva] = useState<TabId>("erros");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Monitoramento</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe a saúde do sistema, erros em tempo real e execute testes de diagnóstico.
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 rounded-lg border bg-muted/50 p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTabAtiva(id)}
            className={cn(
              "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              tabAtiva === id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tabAtiva === "erros" && <ErrosTab />}
      {tabAtiva === "saude" && <SaudeTab />}
      {tabAtiva === "metricas" && <MetricasPerformanceTab />}
      {tabAtiva === "testes" && <TestesTab />}
    </div>
  );
}

export default MonitoramentoPage;
