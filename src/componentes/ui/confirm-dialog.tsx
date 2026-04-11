import { useState, useCallback, createContext, useContext, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/componentes/ui/button";
import { AlertTriangle } from "lucide-react";

/* ── Types ─────────────────────────────────────────────── */
interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
}

interface ConfirmContextType {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

/* ── Context ───────────────────────────────────────────── */
const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be inside ConfirmProvider");
  return ctx.confirm;
}

/* ── Provider ──────────────────────────────────────────── */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    open: boolean;
    opts: ConfirmOptions;
    resolve: ((v: boolean) => void) | null;
  }>({ open: false, opts: { title: "", description: "" }, resolve: null });

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ open: true, opts, resolve });
    });
  }, []);

  const handleClose = (result: boolean) => {
    state.resolve?.(result);
    setState((s) => ({ ...s, open: false, resolve: null }));
  };

  const variantConfig = {
    danger: {
      icon: "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400",
      btn: "bg-red-600 hover:bg-red-700 text-white",
    },
    warning: {
      icon: "bg-yellow-100 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400",
      btn: "bg-yellow-600 hover:bg-yellow-700 text-white",
    },
    default: {
      icon: "bg-primary/10 text-primary",
      btn: "",
    },
  };

  const v = variantConfig[state.opts.variant ?? "default"];

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {/* Backdrop + Dialog */}
      {state.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => handleClose(false)}
          />
          <div className="relative z-10 mx-4 w-full max-w-md animate-in zoom-in-95 fade-in duration-200 rounded-xl border bg-card p-6 shadow-xl">
            <div className="flex gap-4">
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full animate-pulse", v.icon)}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-base font-semibold">{state.opts.title}</h3>
                <p className="text-sm text-muted-foreground">{state.opts.description}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => handleClose(false)}>
                {state.opts.cancelLabel ?? "Cancelar"}
              </Button>
              <Button
                size="sm"
                className={cn(v.btn)}
                onClick={() => handleClose(true)}
              >
                {state.opts.confirmLabel ?? "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
