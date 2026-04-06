import { NavLink, Outlet, useNavigate } from "react-router-dom";
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
  ChevronRight,
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
  CreditCard,
  BarChart3,
  ShieldCheck,
  BellDot,
  Code2,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/componentes/ui/button";
import { useAuth } from "@/hooks/useAuth";
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
    ],
  },
  {
    title: "Gestão",
    items: [
      { to: "/painel-gestor", icon: Shield, label: "Painel do Gestor", perfis: ["administrador", "gestor"] },
      { to: "/relatorios", icon: FileBarChart2, label: "Relatórios" },
      { to: "/alertas-preco", icon: BellRing, label: "Alertas de Preço" },
      { to: "/exportacao-sicom", icon: FileOutput, label: "Exportação SICOM" },
      { to: "/sugestao-fontes-ia", icon: Sparkles, label: "Sugestão com IA" },
      { to: "/ocr-cotacoes", icon: ScanLine, label: "OCR Cotações" },
      { to: "/configuracoes", icon: Settings, label: "Configurações", perfis: ["administrador"] },
      { to: "/ajuda", icon: HelpCircle, label: "Ajuda & FAQ" },
      { to: "/notificacoes", icon: BellDot, label: "Notificações Push" },
    ],
  },
  {
    title: "Plataforma",
    items: [
      { to: "/billing", icon: CreditCard, label: "Assinatura e Billing", perfis: ["administrador"] },
      { to: "/metricas-uso", icon: BarChart3, label: "Métricas de Uso", perfis: ["administrador", "gestor"] },
      { to: "/admin-metaclass", icon: ShieldCheck, label: "Admin Metaclass", perfis: ["administrador"] },
      { to: "/api-publica", icon: Code2, label: "API Pública REST", perfis: ["administrador"] },
    ],
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { servidor, perfil, logout } = useAuth();
  const navigate = useNavigate();
  const [saindo, setSaindo] = useState(false);

  const handleLogout = async () => {
    setSaindo(true);
    await logout();
    navigate("/login", { replace: true });
  };

  /** Filtra itens de navegação conforme perfil do usuário logado */
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

      {/* Navigation — seções categorizadas com scroll */}
      <nav data-tour="sidebar-nav" className="flex-1 space-y-4 overflow-y-auto px-3 py-4 scrollbar-thin">
        {secoesFiltradas.map((section) => (
          <div key={section.title}>
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-sidebar-primary/15 text-sidebar-primary-foreground shadow-sm"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {/* Indicador de item ativo */}
                  <ChevronRight
                    className={cn(
                      "ml-auto h-3 w-3 shrink-0 opacity-0 transition-opacity",
                      "group-[.active]:opacity-100",
                    )}
                  />
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="mx-4 h-px bg-sidebar-border" />

      {/* Footer — Usuário + Sair */}
      <div className="shrink-0 p-3">
        {servidor && (
          <div className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary/20 text-[10px] font-bold text-white">
              {servidor.nome
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-white">{servidor.nome}</p>
              <p className="flex items-center gap-1 text-[10px] text-sidebar-muted">
                <Shield className="h-3 w-3" />
                {perfil ? perfil.charAt(0).toUpperCase() + perfil.slice(1) : "—"}
              </p>
            </div>
          </div>
        )}
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

export function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { servidor, perfil } = useAuth();

  const iniciais = servidor
    ? servidor.nome
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "??";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar Desktop */}
      <aside className="hidden w-64 flex-col bg-sidebar-background lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Mobile (drawer) */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar-background transition-transform duration-300 lg:hidden",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Botão fechar */}
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="absolute right-3 top-4 rounded-lg p-1.5 text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent onNavigate={() => setMobileMenuOpen(false)} />
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b px-6">
          <div className="flex items-center gap-4">
            {/* Hamburger mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
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

            <div className="hidden flex-col items-end sm:flex">
              <span className="text-sm font-medium">
                {servidor?.nome || "Carregando..."}
              </span>
              <span className="text-xs text-muted-foreground">
                {perfil ? perfil.charAt(0).toUpperCase() + perfil.slice(1) : "—"}
              </span>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <span className="text-xs font-semibold text-primary">{iniciais}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main data-tour="main-content" className="flex-1 overflow-y-auto p-6">
          <Breadcrumbs />
          <Outlet />
        </main>
      </div>

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
      title={`Tema: ${label}`}
      className="relative h-8 w-8"
    >
      <Icon className="h-4 w-4" />
      <span className="sr-only">Tema: {label}</span>
    </Button>
  );
}
