import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  Receipt,
  ScrollText,
  Settings,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Moon,
  Sun,
  Monitor,
  Scale,
  Loader2,
  Bell,
  Search,
  ArrowRightFromLine,
  Activity,
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/componentes/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contextos/ThemeContexto";
import type { LucideIcon } from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────
interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

// ─── Menu do SuperAdmin ───────────────────────────────────
const navSections: NavSection[] = [
  {
    title: "Visão Geral",
    items: [
      { to: "/superadmin", icon: LayoutDashboard, label: "Dashboard Financeiro" },
    ],
  },
  {
    title: "Gestão",
    items: [
      { to: "/superadmin/prefeituras", icon: Building2, label: "Prefeituras" },
      { to: "/superadmin/usuarios", icon: Users, label: "Usuários" },
      { to: "/superadmin/contratos", icon: FileText, label: "Contratos" },
      { to: "/superadmin/faturas", icon: Receipt, label: "Faturas" },
    ],
  },
  {
    title: "Sistema",
    items: [
      { to: "/superadmin/monitoramento", icon: Activity, label: "Monitoramento" },
      { to: "/superadmin/audit-log", icon: ScrollText, label: "Audit Log" },
      { to: "/superadmin/configuracoes", icon: Settings, label: "Configurações" },
    ],
  },
];

// ─── Sidebar Content ──────────────────────────────────────
function SidebarContent({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { logout, servidor } = useAuth();
  const navigate = useNavigate();
  const [saindo, setSaindo] = useState(false);
  const [sectionsCollapsed, setSectionsCollapsed] = useState<Record<string, boolean>>({});

  const toggleSection = (title: string) =>
    setSectionsCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));

  const handleLogout = async () => {
    setSaindo(true);
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-3 px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-superadmin-accent">
          <Scale className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
          >
            <h1 className="text-base font-bold text-superadmin-sidebar-foreground">LicitaNest</h1>
            <p className="text-[10px] leading-none text-superadmin-sidebar-muted">SuperAdmin</p>
          </motion.div>
        )}
      </div>

      <div className="mx-3 h-px bg-superadmin-sidebar-border" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 scrollbar-thin" aria-label="Navegação SuperAdmin">
        {navSections.map((section) => {
          const isCollapsed = sectionsCollapsed[section.title] ?? false;
          return (
            <div key={section.title} className="mb-1">
              {!collapsed ? (
                <button
                  onClick={() => toggleSection(section.title)}
                  aria-expanded={!isCollapsed}
                  className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-superadmin-sidebar-muted hover:text-superadmin-sidebar-foreground transition-colors"
                >
                  {section.title}
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 transition-transform duration-200",
                      isCollapsed && "-rotate-90",
                    )}
                  />
                </button>
              ) : (
                <div className="my-2 mx-3 h-px bg-superadmin-sidebar-border" />
              )}

              <div
                className={cn(
                  "space-y-0.5 overflow-hidden transition-all duration-200",
                  !collapsed && isCollapsed ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100",
                )}
              >
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/superadmin"}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        collapsed && "justify-center px-2",
                        isActive
                          ? "bg-superadmin-accent/15 text-superadmin-accent shadow-sm"
                          : "text-superadmin-sidebar-foreground hover:bg-superadmin-sidebar-accent hover:text-superadmin-sidebar-accent-foreground hover:translate-x-0.5",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && !collapsed && (
                          <motion.div
                            layoutId="superadmin-sidebar-indicator"
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-superadmin-accent"
                            transition={{ type: "spring", stiffness: 500, damping: 35 }}
                          />
                        )}
                        <item.icon className={cn("h-4 w-4 shrink-0", collapsed && "h-5 w-5")} />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                        {collapsed && (
                          <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow-md border opacity-0 transition-opacity group-hover:opacity-100 z-50">
                            {item.label}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="mx-3 h-px bg-superadmin-sidebar-border" />

      {/* Footer */}
      <div className="shrink-0 space-y-1 p-2">
        {/* Link para modo operacional */}
        <NavLink
          to="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-superadmin-sidebar-muted hover:bg-superadmin-sidebar-accent hover:text-superadmin-sidebar-foreground transition-colors"
        >
          <ArrowRightFromLine className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">Modo Operacional</span>}
        </NavLink>

        {/* Perfil resumido */}
        {!collapsed && servidor && (
          <div className="px-3 py-2">
            <p className="text-xs font-medium text-superadmin-sidebar-foreground truncate">{servidor.nome}</p>
            <p className="text-[10px] text-superadmin-sidebar-muted truncate">{servidor.email}</p>
          </div>
        )}

        {/* Sair */}
        <button
          onClick={handleLogout}
          disabled={saindo}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-superadmin-sidebar-foreground transition-colors hover:bg-superadmin-sidebar-accent hover:text-superadmin-sidebar-accent-foreground disabled:opacity-50",
            collapsed && "justify-center px-2",
          )}
        >
          {saindo ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4 shrink-0" />}
          {!collapsed && (saindo ? "Saindo..." : "Sair")}
        </button>
      </div>
    </div>
  );
}

// ─── Theme Toggle ─────────────────────────────────────────
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
    </Button>
  );
}

// ─── Layout Principal ─────────────────────────────────────
export function SuperAdminLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { servidor } = useAuth();

  // Colapsar automaticamente em telas médias
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1280px) and (min-width: 1024px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setSidebarCollapsed(e.matches);
    };
    handler(mql);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Fechar menu mobile ao navegar
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const iniciais = servidor
    ? servidor.nome
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "SA";

  return (
    <div className="superadmin-theme flex h-screen overflow-hidden bg-superadmin-bg">
      {/* Skip to content — acessibilidade */}
      <a
        href="#superadmin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:rounded-lg focus:bg-superadmin-accent focus:px-4 focus:py-2 focus:text-white focus:shadow-lg focus:outline-none"
      >
        Pular para conteúdo principal
      </a>

      {/* ── Sidebar Desktop ── */}
      <aside
        className={cn(
          "relative hidden flex-col bg-superadmin-sidebar transition-[width] duration-300 ease-in-out lg:flex",
          sidebarCollapsed ? "w-16" : "w-64",
        )}
        aria-label="Menu SuperAdmin"
      >
        <SidebarContent collapsed={sidebarCollapsed} />

        {/* Toggle collapse */}
        <button
          onClick={() => setSidebarCollapsed((p) => !p)}
          className="absolute bottom-20 -right-3 z-10 hidden h-6 w-6 items-center justify-center rounded-full border bg-superadmin-sidebar text-superadmin-sidebar-foreground shadow-md hover:bg-superadmin-sidebar-accent lg:flex"
          aria-label={sidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>
      </aside>

      {/* ── Mobile overlay ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar Mobile (drawer) ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-superadmin-sidebar transition-transform duration-300 lg:hidden",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Menu SuperAdmin"
      >
        <button
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Fechar menu"
          className="absolute right-3 top-4 rounded-lg p-1.5 text-superadmin-sidebar-foreground hover:bg-superadmin-sidebar-accent"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent collapsed={false} onNavigate={() => setMobileMenuOpen(false)} />
      </aside>

      {/* ── Main column ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b border-superadmin-border px-4 md:px-6 bg-superadmin-topbar" aria-label="Barra superior SuperAdmin">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Mobile logo */}
            <div className="flex items-center gap-2 lg:hidden">
              <Scale className="h-5 w-5 text-superadmin-accent" />
              <span className="font-bold text-sm">SuperAdmin</span>
            </div>

            {/* Search bar (desktop) */}
            <button
              aria-label="Buscar"
              className="hidden items-center gap-2 rounded-lg border border-superadmin-border bg-superadmin-bg/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 lg:flex"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Buscar contratos, prefeituras...</span>
              <kbd className="pointer-events-none ml-4 inline-flex h-5 items-center gap-1 rounded border bg-background px-1.5 text-[10px] font-medium">
                Ctrl+K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Notificações */}
            <Button variant="ghost" size="icon" className="relative h-8 w-8">
              <Bell className="h-4 w-4" />
            </Button>

            {/* Tema */}
            <ThemeToggle />

            {/* Avatar */}
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-superadmin-accent/10 text-superadmin-accent">
              <span className="text-xs font-semibold">{iniciais}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main
          id="superadmin-main"
          className="flex-1 overflow-y-auto p-4 md:p-6"
          aria-label="Conteúdo SuperAdmin"
        >
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

        {/* Bottom navigation — mobile only */}
        <nav className="flex h-14 items-center justify-around border-t border-superadmin-border bg-superadmin-topbar lg:hidden" aria-label="Navegação mobile">
          {[
            { to: "/superadmin", icon: LayoutDashboard, label: "Dashboard" },
            { to: "/superadmin/prefeituras", icon: Building2, label: "Prefeituras" },
            { to: "/superadmin/contratos", icon: FileText, label: "Contratos" },
            { to: "/superadmin/configuracoes", icon: Settings, label: "Menu" },
          ].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/superadmin"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium transition-colors",
                  isActive
                    ? "text-superadmin-accent"
                    : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
