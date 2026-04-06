import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react";
import { Button } from "@/componentes/ui/button";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

/* ── Types ─────────────────────────────────────────────── */
interface TourStep {
  /** CSS selector for the target element */
  target: string;
  title: string;
  content: string;
  placement?: "top" | "bottom" | "left" | "right";
}

interface TourContextType {
  startTour: () => void;
  isTourActive: boolean;
}

const TOUR_KEY = "licitanest-tour-completed";

const STEPS: TourStep[] = [
  {
    target: '[data-tour="search-bar"]',
    title: "Busca Rápida",
    content: "Use Ctrl+K para buscar e navegar rapidamente entre páginas.",
    placement: "bottom",
  },
  {
    target: '[data-tour="theme-toggle"]',
    title: "Tema Escuro",
    content: "Alterne entre tema claro, escuro ou sistema com um clique.",
    placement: "bottom",
  },
  {
    target: '[data-tour="sidebar-nav"]',
    title: "Navegação",
    content: "Acesse todas as funcionalidades pela barra lateral: cestas, catálogo, fornecedores e muito mais.",
    placement: "right",
  },
  {
    target: '[data-tour="main-content"]',
    title: "Área de Trabalho",
    content: "Aqui é onde toda a mágica acontece. Explore as páginas e comece a montar suas cestas de preços!",
    placement: "top",
  },
];

const TourContext = createContext<TourContextType>({ startTour: () => {}, isTourActive: false });

export function useTour() {
  return useContext(TourContext);
}

export function TourProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, height: 0 });

  const currentStep = STEPS[step];

  const updatePosition = useCallback(() => {
    if (!active || !currentStep) return;
    const el = document.querySelector(currentStep.target);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height,
    });
  }, [active, currentStep]);

  useEffect(() => {
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [updatePosition]);

  // Auto-start on first visit
  useEffect(() => {
    const completed = localStorage.getItem(TOUR_KEY);
    if (!completed) {
      // Wait for layout to stabilize
      const t = setTimeout(() => setActive(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  const close = () => {
    setActive(false);
    setStep(0);
    localStorage.setItem(TOUR_KEY, "true");
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else close();
  };

  const prev = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const startTour = () => {
    setStep(0);
    setActive(true);
  };

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    const placement = currentStep?.placement ?? "bottom";
    const gap = 12;
    switch (placement) {
      case "bottom":
        return {
          position: "fixed",
          top: pos.top + pos.height + gap,
          left: pos.left + pos.width / 2,
          transform: "translateX(-50%)",
        };
      case "top":
        return {
          position: "fixed",
          top: pos.top - gap,
          left: pos.left + pos.width / 2,
          transform: "translate(-50%, -100%)",
        };
      case "right":
        return {
          position: "fixed",
          top: pos.top + pos.height / 2,
          left: pos.left + pos.width + gap,
          transform: "translateY(-50%)",
        };
      case "left":
        return {
          position: "fixed",
          top: pos.top + pos.height / 2,
          left: pos.left - gap,
          transform: "translate(-100%, -50%)",
        };
    }
  };

  return (
    <TourContext.Provider value={{ startTour, isTourActive: active }}>
      {children}

      {active && currentStep && (
        <>
          {/* Overlay with hole */}
          <div className="fixed inset-0 z-[200]" onClick={close}>
            <svg className="absolute inset-0 h-full w-full">
              <defs>
                <mask id="tour-mask">
                  <rect x="0" y="0" width="100%" height="100%" fill="white" />
                  <rect
                    x={pos.left - 4}
                    y={pos.top - 4}
                    width={pos.width + 8}
                    height={pos.height + 8}
                    rx="8"
                    fill="black"
                  />
                </mask>
              </defs>
              <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                fill="rgba(0,0,0,0.5)"
                mask="url(#tour-mask)"
              />
            </svg>
          </div>

          {/* Spotlight ring */}
          <div
            className="pointer-events-none fixed z-[201] rounded-lg ring-2 ring-primary ring-offset-2"
            style={{
              top: pos.top - 4,
              left: pos.left - 4,
              width: pos.width + 8,
              height: pos.height + 8,
            }}
          />

          {/* Tooltip */}
          <div
            className="z-[202] w-80 rounded-xl border bg-card p-4 shadow-2xl"
            style={getTooltipStyle()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold">{currentStep.title}</h4>
              <button onClick={close} className="rounded p-1 hover:bg-muted">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">{currentStep.content}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {step + 1} de {STEPS.length}
              </span>
              <div className="flex gap-2">
                {step > 0 && (
                  <Button variant="ghost" size="sm" onClick={prev}>
                    <ChevronLeft className="mr-1 h-3 w-3" /> Anterior
                  </Button>
                )}
                <Button size="sm" onClick={next}>
                  {step < STEPS.length - 1 ? (
                    <>
                      Próximo <ChevronRight className="ml-1 h-3 w-3" />
                    </>
                  ) : (
                    "Concluir"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </TourContext.Provider>
  );
}
