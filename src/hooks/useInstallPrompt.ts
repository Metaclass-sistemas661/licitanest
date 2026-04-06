import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Hook para controlar o banner/prompt de instalação PWA.
 *
 * Retorna:
 * - `podeInstalar`: se o browser disparou o evento `beforeinstallprompt`
 * - `jaInstalado`: se o app já está em modo standalone
 * - `instalar()`: abre o prompt nativo de instalação
 * - `dispensar()`: esconde o banner
 */
export function useInstallPrompt() {
  const [evento, setEvento] = useState<BeforeInstallPromptEvent | null>(null);
  const [jaInstalado, setJaInstalado] = useState(false);
  const [dispensado, setDispensado] = useState(false);

  useEffect(() => {
    // Detectar se já está em modo standalone (instalado)
    const mq = window.matchMedia("(display-mode: standalone)");
    const isStandalone = mq.matches;
    // Use queueMicrotask to avoid synchronous setState in effect
    queueMicrotask(() => setJaInstalado(isStandalone));

    const handleChange = (e: MediaQueryListEvent) => setJaInstalado(e.matches);
    mq.addEventListener("change", handleChange);

    // Capturar evento beforeinstallprompt
    const handleBIP = (e: Event) => {
      e.preventDefault();
      setEvento(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleBIP);

    // Detectar appinstalled
    const handleInstalled = () => {
      setJaInstalado(true);
      setEvento(null);
    };
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      mq.removeEventListener("change", handleChange);
      window.removeEventListener("beforeinstallprompt", handleBIP);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const instalar = useCallback(async () => {
    if (!evento) return false;
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    if (outcome === "accepted") {
      setJaInstalado(true);
      setEvento(null);
    }
    return outcome === "accepted";
  }, [evento]);

  const dispensar = useCallback(() => {
    setDispensado(true);
    sessionStorage.setItem("pwa-install-dismissed", "1");
  }, []);

  const podeInstalar = !!evento && !jaInstalado && !dispensado && !sessionStorage.getItem("pwa-install-dismissed");

  return { podeInstalar, jaInstalado, instalar, dispensar };
}
