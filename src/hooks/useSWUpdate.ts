import { useCallback } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

/**
 * Hook que gerencia atualizações do Service Worker (PWA).
 *
 * Retorna:
 * - `precisaAtualizar`: true quando há nova versão disponível
 * - `atualizar()`: aplica a atualização (reload)
 * - `dispensar()`: esconde o banner
 */
export function useSWUpdate() {
  const {
    needRefresh: [precisaAtualizar, setPrecisaAtualizar],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      // Verificar atualizações a cada 60 minutos
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      }
      console.info("[SW] Registrado:", swUrl);
    },
    onRegisterError(error) {
      console.error("[SW] Erro no registro:", error);
    },
  });

  const atualizar = useCallback(() => {
    updateServiceWorker(true);
  }, [updateServiceWorker]);

  const dispensar = useCallback(() => {
    setPrecisaAtualizar(false);
  }, [setPrecisaAtualizar]);

  return { precisaAtualizar, atualizar, dispensar };
}
