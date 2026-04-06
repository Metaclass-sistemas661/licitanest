import { useState, useEffect } from "react";
import {
  Shield,
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  ToggleLeft,
  ToggleRight,
  Search,
  Loader2,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  listarTenants,
  ativarDesativarTenant,
  estatisticasPlataforma,
} from "@/servicos/tenants";
import { formatarMoeda, statusAssinaturaLabel } from "@/servicos/billing";
import type { TenantResumo, EstatisticasPlataforma } from "@/tipos";

export function AdminMetaclassPage() {
  const [tenants, setTenants] = useState<TenantResumo[]>([]);
  const [stats, setStats] = useState<EstatisticasPlataforma | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);
    try {
      const [t, s] = await Promise.all([listarTenants(), estatisticasPlataforma()]);
      setTenants(t);
      setStats(s);
    } catch {
      /* toast */
    } finally {
      setCarregando(false);
    }
  }

  async function toggleAtivo(municipioId: string, atualAtivo: boolean) {
    await ativarDesativarTenant(municipioId, !atualAtivo);
    setTenants((prev) =>
      prev.map((t) =>
        t.municipio.id === municipioId
          ? { ...t, municipio: { ...t.municipio, ativo: !atualAtivo } }
          : t
      )
    );
  }

  const filtrados = tenants.filter(
    (t) =>
      t.municipio &&
      (t.municipio.nome?.toLowerCase().includes(busca.toLowerCase()) ||
       t.municipio.uf?.toLowerCase().includes(busca.toLowerCase()))
  );

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="h-6 w-6 text-purple-600" />
          Painel Administrativo — Metaclass
        </h1>
        <p className="text-gray-500 mt-1">Visão global de todos os municípios e assinaturas da plataforma.</p>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            titulo="Municípios"
            valor={stats.total_municipios.toString()}
            icone={Building2}
            cor="blue"
          />
          <KpiCard
            titulo="MRR"
            valor={formatarMoeda(stats.mrr)}
            icone={DollarSign}
            cor="green"
          />
          <KpiCard
            titulo="ARR"
            valor={formatarMoeda(stats.arr)}
            icone={TrendingUp}
            cor="purple"
          />
          <KpiCard
            titulo="Churn"
            valor={`${stats.churn_rate}%`}
            icone={Activity}
            cor="red"
          />
        </div>
      )}

      {/* Distribuição de planos */}
      {stats && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Distribuição por Plano</h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(stats.planos_distribuicao).map(([nome, qtd]) => (
              <div
                key={nome}
                className="bg-gray-50 rounded-lg px-4 py-2 flex items-center gap-2"
              >
                <span className="capitalize font-medium text-gray-700">{nome}</span>
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {qtd}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de Tenants */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Municípios ({filtrados.length})
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar município..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b text-gray-500">
                <th className="pb-2 font-medium">Município</th>
                <th className="pb-2 font-medium">UF</th>
                <th className="pb-2 font-medium">Plano</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Usuários</th>
                <th className="pb-2 font-medium">Cestas</th>
                <th className="pb-2 font-medium">Valor</th>
                <th className="pb-2 font-medium">Ativo</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtrados.map((t) => {
                const plano = t.assinatura?.plano as Record<string, unknown> | undefined;
                return (
                  <tr key={t.municipio?.id ?? crypto.randomUUID()} className="hover:bg-gray-50">
                    <td className="py-3 font-medium text-gray-900">{t.municipio?.nome ?? "—"}</td>
                    <td className="py-3 text-gray-600">{t.municipio?.uf ?? "—"}</td>
                    <td className="py-3 capitalize">
                      {(plano?.titulo as string) ?? "—"}
                    </td>
                    <td className="py-3">
                      {t.assinatura ? (
                        <span
                          className={cn(
                            "text-xs px-2 py-0.5 rounded-full font-medium",
                            t.assinatura.status === "ativa" && "bg-green-100 text-green-700",
                            t.assinatura.status === "trial" && "bg-blue-100 text-blue-700",
                            t.assinatura.status === "cancelada" && "bg-red-100 text-red-700",
                            t.assinatura.status === "inadimplente" && "bg-yellow-100 text-yellow-700"
                          )}
                        >
                          {statusAssinaturaLabel(t.assinatura.status)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Sem assinatura</span>
                      )}
                    </td>
                    <td className="py-3 text-center">{t.metricas?.total_usuarios ?? 0}</td>
                    <td className="py-3 text-center">{t.metricas?.total_cestas ?? 0}</td>
                    <td className="py-3">
                      {t.assinatura ? formatarMoeda(t.assinatura.valor_corrente) : "—"}
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => toggleAtivo(t.municipio!.id, t.municipio!.ativo)}
                        title={t.municipio?.ativo ? "Desativar" : "Ativar"}
                      >
                        {t.municipio?.ativo ? (
                          <ToggleRight className="h-5 w-5 text-green-500" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtrados.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">Nenhum município encontrado.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── KPI Card ───────────────────────────────────────────────
function KpiCard({
  titulo,
  valor,
  icone: Icon,
  cor,
}: {
  titulo: string;
  valor: string;
  icone: React.ElementType;
  cor: "blue" | "green" | "purple" | "red";
}) {
  const corMap = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    red: "bg-red-50 text-red-600",
  };

  return (
    <div className="bg-white rounded-xl border p-4 flex items-center gap-4">
      <div className={cn("p-2.5 rounded-lg", corMap[cor])}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{titulo}</p>
        <p className="text-xl font-bold text-gray-900">{valor}</p>
      </div>
    </div>
  );
}
