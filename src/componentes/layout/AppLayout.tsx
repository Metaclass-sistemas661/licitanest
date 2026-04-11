import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingBasket,
  Users,
  SendHorizonal,
  Search,
  FileBarChart2,
  Settings,
  LogOut,
  Scale,
  ChevronDown,
  Menu,
  X,
  Shield,
  Loader2,
  Moon,
  Sun,
  Monitor,
  HelpCircle,
  GitCompare,
  LayoutTemplate,
  TrendingUp,
  Map,
  BellRing,
  FileOutput,
  Sparkles,
  ScanLine,
  BarChart3,
  ShieldCheck,
  BellDot,
  Code2,
  ClipboardCheck,
  BookOpen,
  FileUp,
  GitBranch,
  Bot,
  ShieldAlert,
  FileSignature,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/componentes/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { usePushNotificacoes } from "@/hooks/usePushNotificacoes";
import { useTheme } from "@/contextos/ThemeContexto";
import { Breadcrumbs } from "@/componentes/ui/breadcrumbs";
import { CommandPalette } from "@/componentes/ui/command-palette";
import type { PerfilNome } from "@/tipos";

interface NavItem {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  /** Se informado, só esses perfis veem o item */
  perfis?: PerfilNome[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

/* ── Itens do sidebar ESQUERDO (navegação principal) ── */
const navSections: NavSection[] = [
  {
    title: "Geral",
    items: [
      { to: "/", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/pesquisa-rapida", icon: Search, label: "Pesquisa Rápida" },
    ],
  },
  {
    title: "Pesquisa de Preços",
    items: [
      { to: "/cestas", icon: ShoppingBasket, label: "Cestas de Preços" },
      { to: "/catalogo", icon: Package, label: "Catálogo" },
      { to: "/fornecedores", icon: Users, label: "Fornecedores" },
      { to: "/cotacoes", icon: SendHorizonal, label: "Cotação Eletrônica" },
      { to: "/comparador", icon: GitCompare, label: "Comparador de Cestas" },
      { to: "/templates-cestas", icon: LayoutTemplate, label: "Templates de Cestas" },
      { to: "/historico-precos", icon: TrendingUp, label: "Histórico de Preços" },
      { to: "/mapa-calor", icon: Map, label: "Mapa de Calor Regional" },
      { to: "/catmat", icon: BookOpen, label: "CATMAT/CATSER" },
    ],
  },
  {
    title: "Gestão",
    items: [
      { to: "/painel-gestor", icon: Shield, label: "Painel do Gestor", perfis: ["administrador", "gestor"] },
      { to: "/relatorios", icon: FileBarChart2, label: "Relatórios" },
      { to: "/alertas-preco", icon: BellRing, label: "Alertas de Preço" },
      { to: "/exportacao-sicom", icon: FileOutput, label: "Exportação SICOM" },
      { to: "/ocr-cotacoes", icon: ScanLine, label: "OCR Cotações" },
      { to: "/checklist-in", icon: ClipboardCheck, label: "Checklist IN 65" },
      { to: "/workflow", icon: GitBranch, label: "Workflow" },
      { to: "/lgpd", icon: ShieldAlert, label: "LGPD" },
      { to: "/importacao-lote", icon: FileUp, label: "Importação em Lote", perfis: ["administrador", "gestor"] },
      { to: "/contratos", icon: FileSignature, label: "Contratos", perfis: ["administrador"] },
      { to: "/configuracoes", icon: Settings, label: "Configurações", perfis: ["administrador"] },
    ],
  },
  {
    title: "Plataforma",
    items: [
      { to: "/metricas-uso", icon: BarChart3, label: "Métricas de Uso", perfis: ["administrador", "gestor"] },
      { to: "/superadmin", icon: ShieldCheck, label: "Painel SuperAdmin", perfis: ["administrador"] },
      { to: "/api-publica", icon: Code2, label: "API Pública REST", perfis: ["administrador"] },
    ],
  },
];

/* ── Itens do sidebar DIREITO (ações rápidas / utilitários) ── */
const rightSidebarItems: NavItem[] = [
  { to: "/sugestao-fontes-ia", icon: Sparkles, label: "IA Sugestões" },
  { to: "/ia-assistente", icon: Bot, label: "IA Chat" },
  { to: "/ajuda", icon: HelpCircle, label: "Ajuda & FAQ" },
  { to: "/notificacoes", icon: BellDot, label: "Notificações" },
];

/* ── Sidebar Esquerdo — Conteúdo com categorias colapsáveis ── */
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { perfil, logout } = useAuth();
  const navigate = useNavigate();
  const [saindo, setSaindo] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleSection = (title: string) =>
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));

  const handleLogout = async () => {
    setSaindo(true);
    await logout();
    navigate("/login", { replace: true });
  };

  const secoesFiltradas = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.perfis || (perfil && item.perfis.includes(perfil)),
      ),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <>
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-3 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
          <Scale className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">LicitaNest</h1>
          <p className="text-[10px] leading-none text-sidebar-muted">Cestas de Preços</p>
        </div>
      </div>

      <div className="mx-4 h-px bg-sidebar-border" />

      {/* Navigation — seções colapsáveis com scroll */}
      <nav data-tour="sidebar-nav" aria-label="Navegação principal" className="flex-1 space-y-1 overflow-y-auto px-3 py-4 scrollbar-thin">
        {secoesFiltradas.map((section) => {
          const isCollapsed = collapsed[section.title] ?? false;
          return (
            <div key={section.title}>
              <button
                onClick={() => toggleSection(section.title)}
                aria-expanded={!isCollapsed}
                className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted hover:text-sidebar-foreground transition-colors"
              >
                {section.title}
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform duration-200",
                    isCollapsed && "-rotate-90",
                  )}
                />
              </button>
              <div
                className={cn(
                  "space-y-0.5 overflow-hidden transition-all duration-200",
                  isCollapsed ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100",
                )}
              >
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-sidebar-primary/15 text-sidebar-primary-foreground shadow-sm"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:translate-x-0.5",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <motion.div
                            layoutId="sidebar-indicator"
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-sidebar-primary"
                            transition={{ type: "spring", stiffness: 500, damping: 35 }}
                          />
                        )}
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="mx-4 h-px bg-sidebar-border" />

      {/* Footer — Sair */}
      <div className="shrink-0 p-3">
        <button
          onClick={handleLogout}
          disabled={saindo}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-50"
        >
          {saindo ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          {saindo ? "Saindo..." : "Sair"}
        </button>
      </div>
    </>
  );
}

/* ── Sidebar Direito — Ícones finos com tooltip ── */
function RightSidebar() {
  const { servidor, perfil } = useAuth();

  const iniciais = servidor
    ? servidor.nome
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "??";

  const perfilLabel = perfil
    ? perfil.charAt(0).toUpperCase() + perfil.slice(1)
    : "—";

  return (
    <aside className="hidden w-14 flex-col items-center border-l bg-muted/30 py-4 lg:flex" aria-label="Ações rápidas">
      {/* Itens de ação rápida */}
      <div className="flex flex-1 flex-col items-center gap-1">
        {rightSidebarItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "group relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {/* Tooltip */}
            <span className="pointer-events-none absolute right-full mr-2 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow-md border opacity-0 transition-opacity group-hover:opacity-100">
              {item.label}
            </span>
          </NavLink>
        ))}
      </div>

      {/* Perfil — botão inferior */}
      <div className="flex flex-col items-center gap-2 border-t pt-3">
        <NavLink
          to="/configuracoes"
          className={({ isActive }) =>
            cn(
              "group relative flex h-10 w-10 items-center justify-center rounded-full transition-colors",
              isActive
                ? "ring-2 ring-primary"
                : "hover:ring-2 hover:ring-accent",
            )
          }
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <span className="text-[10px] font-semibold text-primary">{iniciais}</span>
          </div>
          {/* Tooltip */}
          <span className="pointer-events-none absolute right-full mr-2 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow-md border opacity-0 transition-opacity group-hover:opacity-100">
            {servidor?.nome ?? "Perfil"} · {perfilLabel}
          </span>
        </NavLink>
      </div>
    </aside>
  );
}

export function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  usePushNotificacoes();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Skip to main content — acessibilidade */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg focus:outline-none"
      >
        Pular para conteúdo principal
      </a>

      {/* Sidebar Esquerdo — Desktop */}
      <aside className="hidden w-64 flex-col bg-sidebar-background lg:flex" aria-label="Menu lateral">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Mobile (drawer) */}
      <aside
        aria-label="Menu lateral"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar-background transition-transform duration-300 lg:hidden",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <button
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Fechar menu de navegação"
          className="absolute right-3 top-4 rounded-lg p-1.5 text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent onNavigate={() => setMobileMenuOpen(false)} />
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b px-6" aria-label="Barra superior">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menu de navegação"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 lg:hidden">
              <Scale className="h-6 w-6 text-primary" />
              <span className="font-bold">LicitaNest</span>
            </div>

            {/* Busca global — Cmd/Ctrl+K trigger */}
            <button
              data-tour="search-bar"
              aria-label="Abrir busca global (Ctrl+K)"
              onClick={() => {
                // Disparar evento de teclado simulado para abrir command palette
                document.dispatchEvent(
                  new KeyboardEvent("keydown", { key: "k", ctrlKey: true }),
                );
              }}
              className="hidden items-center gap-2 rounded-lg border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted lg:flex"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Buscar...</span>
              <kbd className="pointer-events-none ml-4 inline-flex h-5 items-center gap-1 rounded border bg-background px-1.5 text-[10px] font-medium">
                Ctrl+K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <div data-tour="theme-toggle">
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" data-tour="main-content" className="flex-1 overflow-y-auto p-6" aria-label="Conteúdo principal">
          <Breadcrumbs />
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Sidebar Direito — Ícones com tooltip */}
      <RightSidebar />

      {/* Command palette — abre com Ctrl/Cmd+K */}
      <CommandPalette />
    </div>
  );
}

/* ── Theme Toggle Component ────────────────────────────── */
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
  const Icon = theme === "dark" ? Moon : theme === "system" ? Monitor : Sun;
  const label = theme === "dark" ? "Escuro" : theme === "system" ? "Sistema" : "Claro";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(next)}
      aria-label={`Alterar tema. Atual: ${label}`}
      className="relative h-8 w-8"
    >
      <Icon className="h-4 w-4" />
      <span className="sr-only">Tema: {label}</span>
    </Button>
  );
}
