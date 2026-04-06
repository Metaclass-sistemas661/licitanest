import { useState, useEffect } from "react";
import {
  Bell,
  BellOff,
  BellRing,
  CheckCircle2,
  Shield,
  Loader2,
  Send,
  Smartphone,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  statusNotificacao,
  solicitarPermissao,
  registrarPushSubscription,
  enviarNotificacaoLocal,
  type StatusPermissao,
} from "@/servicos/notificacoesPush";

export function NotificacoesPage() {
  const [status, setStatus] = useState<StatusPermissao>("default");
  const [registrando, setRegistrando] = useState(false);

  useEffect(() => {
    setStatus(statusNotificacao());
  }, []);

  async function handleAtivar() {
    const perm = await solicitarPermissao();
    setStatus(perm);

    if (perm === "granted") {
      setRegistrando(true);
      try {
        await registrarPushSubscription();
      } catch {
        /* silencioso */
      } finally {
        setRegistrando(false);
      }
    }
  }

  function handleTestar() {
    enviarNotificacaoLocal({
      titulo: "LicitaNest — Teste",
      corpo: "Suas notificações estão funcionando corretamente! 🎉",
      tag: "teste",
      url: "/notificacoes",
    });
  }

  const statusConfig: Record<StatusPermissao, { cor: string; icone: React.ElementType; texto: string }> = {
    granted: { cor: "text-green-600 bg-green-50", icone: CheckCircle2, texto: "Notificações ativadas" },
    denied: { cor: "text-red-600 bg-red-50", icone: BellOff, texto: "Notificações bloqueadas pelo navegador" },
    default: { cor: "text-yellow-600 bg-yellow-50", icone: Bell, texto: "Notificações não configuradas" },
    unsupported: { cor: "text-gray-600 bg-gray-50", icone: BellOff, texto: "Navegador não suporta notificações" },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icone;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BellRing className="h-6 w-6 text-blue-600" />
          Notificações Push
        </h1>
        <p className="text-gray-500 mt-1">
          Receba alertas sobre cotações, vencimentos e atualizações de preços diretamente no seu dispositivo.
        </p>
      </div>

      {/* Status atual */}
      <div className={cn("rounded-xl border p-6 flex items-center gap-4", config.cor)}>
        <StatusIcon className="h-8 w-8 shrink-0" />
        <div className="flex-1">
          <p className="font-semibold">{config.texto}</p>
          {status === "denied" && (
            <p className="text-xs mt-1 opacity-80">
              Acesse as configurações do navegador para desbloquear as notificações deste site.
            </p>
          )}
        </div>
        {status === "default" && (
          <button
            onClick={handleAtivar}
            disabled={registrando}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {registrando ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-4 w-4 animate-spin" /> Ativando...
              </span>
            ) : (
              "Ativar notificações"
            )}
          </button>
        )}
        {status === "granted" && (
          <button
            onClick={handleTestar}
            className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
          >
            <Send className="h-4 w-4" /> Testar
          </button>
        )}
      </div>

      {/* Tipos de notificação */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tipos de Notificação</h2>
        <div className="space-y-3">
          {[
            {
              titulo: "Cotações recebidas",
              descricao: "Quando um fornecedor responder uma cotação eletrônica.",
              icone: Send,
            },
            {
              titulo: "Alertas de preço",
              descricao: "Quando um item monitorado variar acima do limite configurado.",
              icone: BellRing,
            },
            {
              titulo: "Vencimento de cestas",
              descricao: "Quando uma cesta de preços estiver próxima da validade.",
              icone: Shield,
            },
            {
              titulo: "Atualizações do sistema",
              descricao: "Novas funcionalidades e melhorias do LicitaNest.",
              icone: Smartphone,
            },
          ].map((item) => {
            const Icon = item.icone;
            return (
              <div
                key={item.titulo}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <Icon className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.titulo}</p>
                  <p className="text-xs text-gray-500">{item.descricao}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info PWA */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-700">
          <p className="font-medium">Dica: Instale o app para melhor experiência</p>
          <p className="text-xs mt-0.5 text-blue-600">
            As notificações push funcionam melhor quando o LicitaNest está instalado como
            aplicativo. Procure a opção "Instalar" no menu do seu navegador.
          </p>
        </div>
      </div>
    </div>
  );
}
