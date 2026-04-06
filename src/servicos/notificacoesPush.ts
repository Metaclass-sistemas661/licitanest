/**
 * Serviço de notificações Push — LicitaNest PWA
 *
 * Em produção usaria Web Push API com um backend (Edge Function) para enviar
 * notificações via VAPID. Aqui implementamos a camada do lado do cliente:
 * - Solicitar permissão
 * - Registrar subscription na API
 * - Enviar notificação local (fallback quando offline ou para demonstração)
 */

import { api } from "@/lib/api";

// ─── Permissão ──────────────────────────────────────────────

export type StatusPermissao = "granted" | "denied" | "default" | "unsupported";

export function statusNotificacao(): StatusPermissao {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission as StatusPermissao;
}

export async function solicitarPermissao(): Promise<StatusPermissao> {
  if (!("Notification" in window)) return "unsupported";
  const perm = await Notification.requestPermission();
  return perm as StatusPermissao;
}

// ─── Subscription (Web Push) ────────────────────────────────

export async function registrarPushSubscription(): Promise<PushSubscription | null> {
  try {
    const registration = await navigator.serviceWorker.ready;

    // VAPID public key — em produção viria de variável de ambiente
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      console.warn("[Push] VITE_VAPID_PUBLIC_KEY não configurada — push desabilitado");
      return null;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    });

    // Salvar subscription na API para o backend poder enviar push
    await api.post("/api/notificacoes/registrar", {
      subscription: JSON.parse(JSON.stringify(subscription)),
    });

    return subscription;
  } catch (err) {
    console.error("[Push] Falha ao registrar subscription:", err);
    return null;
  }
}

// ─── Notificação Local (fallback / demo) ────────────────────

export interface NotificacaoLocal {
  titulo: string;
  corpo: string;
  icone?: string;
  tag?: string;
  url?: string;
}

export function enviarNotificacaoLocal(notif: NotificacaoLocal): void {
  if (statusNotificacao() !== "granted") return;

  const opcoes: NotificationOptions = {
    body: notif.corpo,
    icon: notif.icone ?? "/icons/icon-192x192.svg",
    badge: "/icons/icon-96x96.svg",
    tag: notif.tag ?? "licitanest-geral",
    data: { url: notif.url ?? "/" },
  };

  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then((reg) => {
      reg.showNotification(notif.titulo, opcoes);
    });
  } else {
    new Notification(notif.titulo, opcoes);
  }
}

// ─── Helpers ────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
