// ═══════════════════════════════════════════════════════════════════════════════
// Sentry — Observabilidade Backend (API) — Fase 12.2
// Captura erros, performance, alertas proativos
// Configure SENTRY_DSN no environment para ativar
// ═══════════════════════════════════════════════════════════════════════════════
import * as Sentry from "@sentry/node";

const SENTRY_DSN = process.env.SENTRY_DSN ?? "";
const ENVIRONMENT = process.env.NODE_ENV ?? "development";

/**
 * Inicializar Sentry para backend.
 * Deve ser chamado ANTES de registrar rotas.
 */
export function initSentryBackend(): void {
  if (!SENTRY_DSN) {
    console.info("[Sentry] DSN não configurado — monitoramento backend desativado");
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    tracesSampleRate: ENVIRONMENT === "production" ? 0.2 : 1.0,
    profilesSampleRate: ENVIRONMENT === "production" ? 0.1 : 0,

    // Alertas configuráveis via dashboard Sentry:
    // - Taxa de erro > 5% → alerta email/slack
    // - Latência p95 > 3s → alerta email/slack
    // Configurar em: Sentry → Alerts → Create Alert Rule

    beforeSend(event) {
      // Remover dados sensíveis de cookies/headers
      if (event.request?.cookies) delete event.request.cookies;
      if (event.request?.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["cookie"];
      }
      return event;
    },

    ignoreErrors: [
      "ECONNRESET",
      "EPIPE",
      "ETIMEDOUT",
    ],
  });
}

/**
 * Capturar exceção manualmente.
 */
export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!SENTRY_DSN) return;
  Sentry.captureException(error, { extra: context });
}

/**
 * Capturar mensagem de alerta.
 */
export function captureMessage(message: string, level: "info" | "warning" | "error" = "warning"): void {
  if (!SENTRY_DSN) return;
  Sentry.captureMessage(message, level);
}

/**
 * Definir contexto de usuário para Sentry.
 */
export function setSentryUser(user: { id: string; municipio_id?: string }): void {
  if (!SENTRY_DSN) return;
  Sentry.setUser({ id: user.id });
  if (user.municipio_id) {
    Sentry.setTag("municipio_id", user.municipio_id);
  }
}

/**
 * Flush pendentes antes de shutdown.
 */
export async function flushSentry(timeout = 2000): Promise<void> {
  if (!SENTRY_DSN) return;
  await Sentry.flush(timeout);
}
