import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

/**
 * Barra fixa no topo da página que indica quando o usuário está offline.
 */
export function OfflineIndicator() {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-yellow-500 text-yellow-900 text-center text-xs font-medium py-1.5 flex items-center justify-center gap-1.5 shadow-sm">
      <WifiOff className="h-3.5 w-3.5" />
      Você está offline — Algumas funcionalidades podem estar limitadas
    </div>
  );
}
