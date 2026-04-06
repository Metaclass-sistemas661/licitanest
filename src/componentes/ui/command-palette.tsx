import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Command } from "cmdk";
import {
  LayoutDashboard,
  Package,
  ShoppingBasket,
  Users,
  SendHorizonal,
  Search,
  FileBarChart2,
  Settings,
  Shield,
  GitCompare,
  LayoutTemplate,
  TrendingUp,
  Map,
  BellRing,
  FileOutput,
  Sparkles,
  ScanLine,
  CreditCard,
  BarChart3,
  ShieldCheck,
  BellDot,
  Code2,
} from "lucide-react";

const ROUTES = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, keywords: "início home painel" },
  { to: "/pesquisa-rapida", label: "Pesquisa Rápida", icon: Search, keywords: "buscar procurar preço" },
  { to: "/cestas", label: "Cestas de Preços", icon: ShoppingBasket, keywords: "cesta basket compras" },
  { to: "/catalogo", label: "Catálogo CATMAT", icon: Package, keywords: "material item catmat" },
  { to: "/fornecedores", label: "Fornecedores", icon: Users, keywords: "empresa cnpj fornecedor" },
  { to: "/cotacoes", label: "Cotação Eletrônica", icon: SendHorizonal, keywords: "cotação enviar proposta" },
  { to: "/comparador", label: "Comparador de Cestas", icon: GitCompare, keywords: "comparar lado a lado diferença" },
  { to: "/templates-cestas", label: "Templates de Cestas", icon: LayoutTemplate, keywords: "template modelo cesta" },
  { to: "/historico-precos", label: "Histórico de Preços", icon: TrendingUp, keywords: "histórico gráfico evolução" },
  { to: "/mapa-calor", label: "Mapa de Calor Regional", icon: Map, keywords: "mapa região uf estado calor" },
  { to: "/alertas-preco", label: "Alertas de Preço", icon: BellRing, keywords: "alerta variação notificação preço" },
  { to: "/exportacao-sicom", label: "Exportação SICOM", icon: FileOutput, keywords: "sicom tce mg export" },
  { to: "/sugestao-fontes-ia", label: "Sugestão com IA", icon: Sparkles, keywords: "ia inteligência artificial fonte" },
  { to: "/ocr-cotacoes", label: "OCR Cotações", icon: ScanLine, keywords: "ocr scanner papel importar foto" },
  { to: "/relatorios", label: "Relatórios", icon: FileBarChart2, keywords: "relatório exportar pdf excel" },
  { to: "/painel-gestor", label: "Painel do Gestor", icon: Shield, keywords: "gestor admin painel" },
  { to: "/configuracoes", label: "Configurações", icon: Settings, keywords: "config sistema preferências" },
  { to: "/billing", label: "Assinatura e Billing", icon: CreditCard, keywords: "plano fatura pagamento stripe assinatura" },
  { to: "/metricas-uso", label: "Métricas de Uso", icon: BarChart3, keywords: "métricas uso consumo limites" },
  { to: "/admin-metaclass", label: "Admin Metaclass", icon: ShieldCheck, keywords: "admin tenants municípios plataforma" },
  { to: "/notificacoes", label: "Notificações Push", icon: BellDot, keywords: "notificação push bell alerta" },
  { to: "/api-publica", label: "API Pública REST", icon: Code2, keywords: "api rest integração erp chave key" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  // Ctrl/Cmd + K to toggle
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (open) {
      // Focus input after animation
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const handleSelect = useCallback(
    (to: string) => {
      setOpen(false);
      navigate(to);
    },
    [navigate],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-in fade-in duration-150"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div className="relative z-10 w-full max-w-lg animate-in slide-in-from-top-4 fade-in duration-200">
        <Command className="rounded-xl border bg-card shadow-2xl overflow-hidden">
          <div className="flex items-center border-b px-4">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <Command.Input
              ref={inputRef}
              placeholder="Navegar para..."
              className="flex h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="pointer-events-none ml-2 inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              Nenhum resultado encontrado.
            </Command.Empty>

            <Command.Group heading="Páginas">
              {ROUTES.map((r) => (
                <Command.Item
                  key={r.to}
                  value={`${r.label} ${r.keywords}`}
                  onSelect={() => handleSelect(r.to)}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors aria-selected:bg-accent/10 aria-selected:text-accent-foreground hover:bg-accent/10"
                >
                  <r.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{r.label}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
