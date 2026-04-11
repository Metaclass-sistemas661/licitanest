import { useState, useEffect } from "react";
import {
  BarChart3,
  Users,
  ShoppingCart,
  FileText,
  Database,
  Package,
  Clock,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { buscarMetricasUso, atualizarMetricasUso } from "@/servicos/metricasUso";
import type { MetricasUsoMunicipio } from "@/tipos";

export function MetricasUsoPage() {
  const { servidor } = useAuth();
  const municipioId = servidor?.secretaria?.municipio_id;

  const [metricas, setMetricas] = useState<MetricasUsoMunicipio | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  useEffect(() => {
    carregar();
  }, [municipioId]);

  async function carregar() {
    if (!municipioId) return;
    setCarregando(true);
    try {
      const m = await buscarMetricasUso(municipioId);
      setMetricas(m);
    } catch {
      /* toast */
    } finally {
      setCarregando(false);
    }
  }

  async function handleAtualizar() {
    if (!municipioId) return;
    setAtualizando(true);
    try {
      const m = await atualizarMetricasUso(municipioId);
      setMetricas(m);
    } finally {
      setAtualizando(false);
    }
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            Métricas de Uso
          </h1>
          <p className="text-gray-500 mt-1">
            Acompanhe o consumo do seu município.
          </p>
        </div>
        <button
          onClick={handleAtualizar}
          disabled={atualizando}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition text-sm"
        >
          <RefreshCw className={cn("h-4 w-4", atualizando && "animate-spin")} />
          Atualizar
        </button>
      </div>

      {/* Visão geral de uso */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          titulo="Usuários"
          valor={metricas?.total_usuarios ?? 0}
          icone={Users}
          cor="blue"
        />
        <MetricCard
          titulo="Cestas de Preços"
          valor={metricas?.total_cestas ?? 0}
          icone={ShoppingCart}
          cor="green"
        />
        <MetricCard
          titulo="Cotações / mês"
          valor={metricas?.cotacoes_ultimo_mes ?? 0}
          icone={FileText}
          cor="purple"
        />
      </div>

      {/* Cards detalhados */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          titulo="Produtos no Catálogo"
          valor={metricas?.total_produtos_catalogo ?? 0}
          icone={Package}
          cor="orange"
        />
        <MetricCard
          titulo="Cotações (total)"
          valor={metricas?.total_cotacoes ?? 0}
          icone={FileText}
          cor="blue"
        />
        <MetricCard
          titulo="Cestas no último mês"
          valor={metricas?.cestas_ultimo_mes ?? 0}
          icone={ShoppingCart}
          cor="green"
        />
        <MetricCard
          titulo="Armazenamento"
          valor={`${metricas?.armazenamento_mb?.toFixed(1) ?? "0.0"} MB`}
          icone={Database}
          cor="purple"
        />
      </div>

      {/* Último acesso */}
      {metricas?.ultimo_acesso && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Clock className="h-4 w-4" />
          Última atualização: {new Date(metricas.atualizado_em).toLocaleString("pt-BR")}
        </div>
      )}
    </div>
  );
}

// ─── Metric Card ────────────────────────────────────────────
function MetricCard({
  titulo,
  valor,
  icone: Icon,
  cor,
}: {
  titulo: string;
  valor: number | string;
  icone: React.ElementType;
  cor: "blue" | "green" | "purple" | "orange";
}) {
  const corMap = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
  };

  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("p-1.5 rounded", corMap[cor])}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-xs text-gray-500 font-medium">{titulo}</span>
      </div>
      <p className="text-xl font-bold text-gray-900">{valor}</p>
    </div>
  );
}
