import { RefreshCw, X } from "lucide-react";
import { useSWUpdate } from "@/hooks/useSWUpdate";

/**
 * Banner que aparece quando há nova versão disponível do app.
 * Permite ao usuário atualizar ou dispensar.
 */
export function PwaUpdateBanner() {
  const { precisaAtualizar, atualizar, dispensar } = useSWUpdate();

  if (!precisaAtualizar) return null;

  return (
    <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 animate-in slide-in-from-top-4">
      <div className="bg-green-600 text-white rounded-xl shadow-2xl p-4 flex items-start gap-3">
        <div className="bg-white/20 rounded-lg p-2 shrink-0">
          <RefreshCw className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Nova versão disponível</p>
          <p className="text-xs text-green-100 mt-0.5">
            Uma atualização do LicitaNest está pronta para ser aplicada.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={atualizar}
              className="px-3 py-1.5 bg-white text-green-700 text-xs font-semibold rounded-lg hover:bg-green-50 transition"
            >
              Atualizar agora
            </button>
            <button
              onClick={dispensar}
              className="px-3 py-1.5 text-green-100 text-xs hover:text-white transition"
            >
              Depois
            </button>
          </div>
        </div>
        <button onClick={dispensar} className="text-green-200 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
