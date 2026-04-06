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
