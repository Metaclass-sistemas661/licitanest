// ═══════════════════════════════════════════════════════════════
// Firebase Cloud Messaging — Push Notifications
// Configuração Firebase + service worker para notificações push
// ═══════════════════════════════════════════════════════════════
import { api } from "@/lib/api";

// ── Configuração Firebase (reutiliza app singleton) ────────
import { firebaseApp } from "@/lib/firebase";

let messaging: import("firebase/messaging").Messaging | null = null;

async function getMessaging() {
  if (messaging) return messaging;
  const { getMessaging: getMsg, isSupported } = await import("firebase/messaging");

  const supported = await isSupported();
  if (!supported) return null;

  messaging = getMsg(firebaseApp);
  return messaging;
}

// ── Solicitar permissão e obter token FCM ──────────────────
export async function solicitarPermissaoNotificacao(): Promise<string | null> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const msg = await getMessaging();
    if (!msg) return null;

    const { getToken } = await import("firebase/messaging");
    const token = await getToken(msg, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });

    // Salvar token na API para envio server-side
    if (token) {
      await salvarTokenDispositivo(token);
    }

    return token;
  } catch (error) {
    console.error("[FCM] Erro ao solicitar permissão:", error);
    return null;
  }
}

// ── Ouvir mensagens em foreground ──────────────────────────
export async function ouvirNotificacoesForeground(
  callback: (payload: { title: string; body: string; data?: Record<string, string> }) => void,
): Promise<(() => void) | null> {
  const msg = await getMessaging();
  if (!msg) return null;

  const { onMessage } = await import("firebase/messaging");
  const unsubscribe = onMessage(msg, (payload) => {
    callback({
      title: payload.notification?.title ?? "Nova notificação",
      body: payload.notification?.body ?? "",
      data: payload.data,
    });
  });

  return unsubscribe;
}

// ── Salvar token do dispositivo na API ────────────────────────
async function salvarTokenDispositivo(token: string): Promise<void> {
  await api.post("/api/notificacoes/registrar", {
    token_fcm: token,
    plataforma: detectarPlataforma(),
  });
}

// ── Remover token (logout) ─────────────────────────────────
export async function removerTokenDispositivo(): Promise<void> {
  const msg = await getMessaging();
  if (!msg) return;

  const { deleteToken } = await import("firebase/messaging");
  await deleteToken(msg);
}

// ── Helper ─────────────────────────────────────────────────
function detectarPlataforma(): string {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  return "web";
}
