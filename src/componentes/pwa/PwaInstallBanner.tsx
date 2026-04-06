import { Download, X } from "lucide-react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

/**
 * Banner flutuante que sugere instalar o app como PWA.
 * Só aparece se o browser suportar e o app ainda não estiver instalado.
 */
export function PwaInstallBanner() {
  const { podeInstalar, instalar, dispensar } = useInstallPrompt();

  if (!podeInstalar) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 animate-in slide-in-from-bottom-4">
      <div className="bg-blue-600 text-white rounded-xl shadow-2xl p-4 flex items-start gap-3">
        <div className="bg-white/20 rounded-lg p-2 shrink-0">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Instalar LicitaNest</p>
          <p className="text-xs text-blue-100 mt-0.5">
            Acesse direto da tela inicial, mesmo sem internet.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={instalar}
              className="px-3 py-1.5 bg-white text-blue-600 text-xs font-semibold rounded-lg hover:bg-blue-50 transition"
            >
              Instalar
            </button>
            <button
              onClick={dispensar}
              className="px-3 py-1.5 text-blue-100 text-xs hover:text-white transition"
            >
              Agora não
            </button>
          </div>
        </div>
        <button onClick={dispensar} className="text-blue-200 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
