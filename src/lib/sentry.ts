// ═══════════════════════════════════════════════════════════════════════════════
// Sentry — Observabilidade e Crash Reporting
// Configure VITE_SENTRY_DSN no .env para ativar
// ═══════════════════════════════════════════════════════════════════════════════
import * as Sentry from "@sentry/react";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN ?? "";
const ENVIRONMENT = import.meta.env.MODE ?? "development";

export function initSentry() {
  if (!SENTRY_DSN) {
    console.info("[Sentry] DSN não configurado — monitoramento desativado");
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Taxa de amostragem de performance (10% em prod, 100% em dev)
    tracesSampleRate: ENVIRONMENT === "production" ? 0.1 : 1.0,
    // Replay de sessão: 10% normais, 100% em erros
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    // Não enviar dados sensíveis
    beforeSend(event) {
      // Remover dados potencialmente sensíveis
      if (event.request?.cookies) {
        delete event.request.cookies;
      }
      return event;
    },
    // Ignorar erros de rede comuns
    ignoreErrors: [
      "Network Error",
      "Failed to fetch",
      "Load failed",
      "AbortError",
      "ResizeObserver loop",
    ],
  });
}

export function setSentryUser(user: { id: string; email?: string; municipio?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    // Não enviar dados pessoais extras — apenas contexto de tenant
  });
  if (user.municipio) {
    Sentry.setTag("municipio", user.municipio);
  }
}

export function clearSentryUser() {
  Sentry.setUser(null);
}

export function captureError(error: Error, context?: Record<string, unknown>) {
  Sentry.captureException(error, {
    extra: context,
  });
}

export { Sentry };
