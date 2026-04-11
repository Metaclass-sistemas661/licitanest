// ═══════════════════════════════════════════════════════════════════════════════
// usePushNotificacoes — Hook para gerenciar push notifications (Fase 13.4)
// Solicita permissão no login, ouve mensagens in-foreground via toast.
// ═══════════════════════════════════════════════════════════════════════════════
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "./useAuth";
import {
  solicitarPermissaoNotificacao,
  ouvirNotificacoesForeground,
} from "@/servicos/pushNotificacoes";

export function usePushNotificacoes() {
  const { usuario } = useAuth();
  const inicializado = useRef(false);

  useEffect(() => {
    if (!usuario || inicializado.current) return;
    inicializado.current = true;

    // Solicitar permissão + registrar token
    solicitarPermissaoNotificacao().catch(() => {});

    // Ouvir notificações em foreground
    let unsubscribe: (() => void) | null = null;
    ouvirNotificacoesForeground((payload) => {
      toast.info(payload.title, { description: payload.body, duration: 6000 });
    }).then((unsub) => { unsubscribe = unsub; });

    return () => { unsubscribe?.(); };
  }, [usuario]);
}
