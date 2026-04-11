import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "./contextos/ThemeContexto";
import { ConfirmProvider } from "./componentes/ui/confirm-dialog";
import { TourProvider } from "./componentes/ui/guided-tour";
import { QueryProvider } from "./lib/queryClient";
import { ErrorBoundary } from "./componentes/ui/error-boundary";
import { initSentry } from "./lib/sentry";
import App from "./App";
import "./index.css";

// Inicializar Sentry antes de renderizar
initSentry();

// ── Global error handlers para monitoramento ──
window.onerror = (message, source, lineno, colno, error) => {
  try {
    const payload = {
      origem: "frontend",
      severidade: "error",
      mensagem: typeof message === "string" ? message : "Erro desconhecido",
      stack_trace: error?.stack?.slice(0, 5000) ?? null,
      arquivo: source ?? null,
      linha: lineno ?? null,
      coluna: colno ?? null,
      modulo: "window.onerror",
      url_requisicao: window.location.href,
      user_agent: navigator.userAgent,
    };
    navigator.sendBeacon?.(
      "/api/log-erro",
      new Blob([JSON.stringify(payload)], { type: "application/json" }),
    );
  } catch {
    // best-effort
  }
};

window.onunhandledrejection = (event: PromiseRejectionEvent) => {
  try {
    const error = event.reason;
    const payload = {
      origem: "frontend",
      severidade: "error",
      mensagem: error?.message ?? String(error),
      stack_trace: error?.stack?.slice(0, 5000) ?? null,
      modulo: "unhandledrejection",
      url_requisicao: window.location.href,
      user_agent: navigator.userAgent,
    };
    navigator.sendBeacon?.(
      "/api/log-erro",
      new Blob([JSON.stringify(payload)], { type: "application/json" }),
    );
  } catch {
    // best-effort
  }
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryProvider>
        <ThemeProvider>
          <BrowserRouter>
            <ConfirmProvider>
              <TourProvider>
                <App />
              </TourProvider>
            </ConfirmProvider>
          </BrowserRouter>
        </ThemeProvider>
      </QueryProvider>
    </ErrorBoundary>
  </StrictMode>
);
