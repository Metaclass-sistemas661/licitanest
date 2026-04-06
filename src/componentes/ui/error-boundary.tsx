import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
    // Registrar no audit log via API (fire-and-forget)
    try {
      const payload = {
        mensagem: error.message,
        stack: error.stack?.slice(0, 2000),
        componentStack: info.componentStack?.slice(0, 2000),
        url: window.location.href,
        timestamp: new Date().toISOString(),
      };
      navigator.sendBeacon?.(
        "/api/log-erro",
        new Blob([JSON.stringify(payload)], { type: "application/json" }),
      );
    } catch {
      // Silencioso — log é best-effort
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Algo deu errado</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Ocorreu um erro inesperado. Tente recarregar a página ou voltar à tela anterior.
            </p>
            {this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-xs text-muted-foreground hover:underline">
                  Detalhes técnicos
                </summary>
                <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded border bg-muted/50 p-3 text-xs">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              Tentar novamente
            </button>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <RefreshCw className="h-4 w-4" />
              Recarregar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
