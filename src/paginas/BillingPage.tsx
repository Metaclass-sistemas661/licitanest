import { useState, useEffect } from "react";
import {
  CreditCard,
  ArrowUpCircle,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Loader2,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  listarPlanos,
  buscarAssinatura,
  listarFaturas,
  alterarPlano,
  cancelarAssinatura,
  reativarAssinatura,
  formatarMoeda,
  statusAssinaturaLabel,
  statusFaturaLabel,
} from "@/servicos/billing";
import type { Plano, Assinatura, Fatura } from "@/tipos";

export function BillingPage() {
  const { servidor } = useAuth();
  const municipioId = servidor?.secretaria?.municipio_id;

  const [planos, setPlanos] = useState<Plano[]>([]);
  const [assinatura, setAssinatura] = useState<(Assinatura & { plano?: Plano }) | null>(null);
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [intervalo, setIntervalo] = useState<"mensal" | "anual">("mensal");
  const [alterando, setAlterando] = useState(false);

  useEffect(() => {
    carregar();
  }, [municipioId]);

  async function carregar() {
    if (!municipioId) return;
    setCarregando(true);
    try {
      const [p, a, f] = await Promise.all([
        listarPlanos(),
        buscarAssinatura(municipioId),
        listarFaturas(municipioId),
      ]);
      setPlanos(p);
      setAssinatura(a);
      setFaturas(f);
    } catch {
      /* toast */
    } finally {
      setCarregando(false);
    }
  }

  async function handleAlterarPlano(planoId: string) {
    if (!assinatura) return;
    setAlterando(true);
    try {
      await alterarPlano(assinatura.id, planoId, intervalo);
      await carregar();
    } finally {
      setAlterando(false);
    }
  }

  async function handleCancelar() {
    if (!assinatura || !confirm("Deseja realmente cancelar a assinatura?")) return;
    await cancelarAssinatura(assinatura.id);
    await carregar();
  }

  async function handleReativar() {
    if (!assinatura) return;
    await reativarAssinatura(assinatura.id);
    await carregar();
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case "paga": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "pendente": return <Clock className="h-4 w-4 text-yellow-500" />;
      case "vencida": return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <XCircle className="h-4 w-4 text-gray-400" />;
    }
  };

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
          <CreditCard className="h-6 w-6 text-blue-600" />
          Assinatura e Faturamento
        </h1>
        <p className="text-gray-500 mt-1">Gerencie seu plano e visualize seu histórico de faturas.</p>
      </div>

      {/* Plano Atual */}
      {assinatura && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Plano Atual</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                <span className="text-xl font-bold capitalize">
                  {assinatura.plano?.titulo ?? assinatura.plano_id}
                </span>
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium",
                    assinatura.status === "ativa" && "bg-green-100 text-green-700",
                    assinatura.status === "trial" && "bg-blue-100 text-blue-700",
                    assinatura.status === "cancelada" && "bg-red-100 text-red-700",
                    assinatura.status === "inadimplente" && "bg-yellow-100 text-yellow-700"
                  )}
                >
                  {statusAssinaturaLabel(assinatura.status)}
                </span>
              </div>
              <p className="text-gray-500 text-sm mt-1">
                {formatarMoeda(assinatura.valor_corrente)}/{assinatura.intervalo}
              </p>
              {assinatura.trial_fim && assinatura.status === "trial" && (
                <p className="text-xs text-blue-600 mt-1">
                  Trial expira em {new Date(assinatura.trial_fim).toLocaleDateString("pt-BR")}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {assinatura.status === "cancelada" ? (
                <button
                  onClick={handleReativar}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
                >
                  Reativar
                </button>
              ) : (
                <button
                  onClick={handleCancelar}
                  className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition text-sm"
                >
                  Cancelar assinatura
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upgrade / Planos */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ArrowUpCircle className="h-5 w-5 text-blue-600" />
            {assinatura ? "Alterar Plano" : "Escolher Plano"}
          </h2>
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setIntervalo("mensal")}
              className={cn(
                "px-3 py-1 text-sm rounded-md transition",
                intervalo === "mensal" ? "bg-white shadow text-gray-900" : "text-gray-500"
              )}
            >
              Mensal
            </button>
            <button
              onClick={() => setIntervalo("anual")}
              className={cn(
                "px-3 py-1 text-sm rounded-md transition",
                intervalo === "anual" ? "bg-white shadow text-gray-900" : "text-gray-500"
              )}
            >
              Anual <span className="text-green-600 text-xs ml-1">-17%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {planos.map((p) => {
            const ativo = assinatura?.plano_id === p.id;
            const preco = intervalo === "anual" ? p.preco_anual : p.preco_mensal;
            return (
              <div
                key={p.id}
                className={cn(
                  "border-2 rounded-xl p-4 flex flex-col transition",
                  ativo ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div className="font-semibold text-gray-900">{p.titulo}</div>
                <div className="text-2xl font-bold text-blue-600 mt-1">
                  {preco === 0 ? "Grátis" : formatarMoeda(preco)}
                </div>
                {preco > 0 && (
                  <div className="text-xs text-gray-500">/{intervalo === "anual" ? "ano" : "mês"}</div>
                )}
                <p className="text-xs text-gray-500 mt-2 flex-1">{p.descricao}</p>
                <ul className="text-xs text-gray-600 mt-3 space-y-1">
                  <li>• {p.limite_usuarios === 999 ? "Usuários ilimitados" : `${p.limite_usuarios} usuários`}</li>
                  <li>• {p.limite_cestas === 999 ? "Cestas ilimitadas" : `${p.limite_cestas} cestas`}</li>
                  <li>• {p.limite_cotacoes_mes === 999 ? "Cotações ilimitadas" : `${p.limite_cotacoes_mes} cotações/mês`}</li>
                </ul>
                <button
                  onClick={() => handleAlterarPlano(p.id)}
                  disabled={ativo || alterando}
                  className={cn(
                    "mt-4 w-full py-2 rounded-lg text-sm font-medium transition",
                    ativo
                      ? "bg-gray-100 text-gray-400 cursor-default"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  )}
                >
                  {ativo ? "Plano atual" : alterando ? "Alterando..." : "Selecionar"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Faturas */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-blue-600" />
          Histórico de Faturas
        </h2>

        {faturas.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Nenhuma fatura encontrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b text-gray-500">
                  <th className="pb-2 font-medium">Nº</th>
                  <th className="pb-2 font-medium">Valor</th>
                  <th className="pb-2 font-medium">Vencimento</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {faturas.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="py-3 font-mono text-xs">{f.numero}</td>
                    <td className="py-3">{formatarMoeda(f.valor)}</td>
                    <td className="py-3">{new Date(f.vencimento).toLocaleDateString("pt-BR")}</td>
                    <td className="py-3">
                      <span className="flex items-center gap-1.5">
                        {statusIcon(f.status)}
                        {statusFaturaLabel(f.status)}
                      </span>
                    </td>
                    <td className="py-3">
                      {f.url_boleto && (
                        <a
                          href={f.url_boleto}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-xs"
                        >
                          Boleto
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
