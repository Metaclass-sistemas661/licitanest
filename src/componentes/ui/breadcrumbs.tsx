import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

/** Map route segments to display labels */
const LABELS: Record<string, string> = {
  "": "Início",
  catalogo: "Catálogo CATMAT",
  cestas: "Cestas de Preços",
  nova: "Nova Cesta",
  fornecedores: "Fornecedores",
  cotacoes: "Cotações",
  "pesquisa-rapida": "Pesquisa Rápida",
  relatorios: "Relatórios",
  "painel-gestor": "Painel Gestor",
  configuracoes: "Configurações",
  ajuda: "Ajuda & FAQ",
  comparador: "Comparador de Cestas",
  "templates-cestas": "Templates de Cestas",
  "historico-precos": "Histórico de Preços",
  "mapa-calor": "Mapa de Calor Regional",
  "alertas-preco": "Alertas de Preço",
  "exportacao-sicom": "Exportação SICOM",
  "sugestao-fontes-ia": "Sugestão com IA",
  "ocr-cotacoes": "OCR Cotações",
  billing: "Assinatura e Billing",
  "metricas-uso": "Métricas de Uso",
  "admin-metaclass": "Admin Metaclass",
  onboarding: "Cadastro de Município",
  notificacoes: "Notificações Push",
  "api-publica": "API Pública REST",
};

function isUUID(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

interface BreadcrumbsProps {
  /** Override the last crumb label (e.g., dynamic entity name) */
  currentLabel?: string;
  className?: string;
}

export function Breadcrumbs({ currentLabel, className }: BreadcrumbsProps) {
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null; // No breadcrumbs on dashboard root

  const crumbs = segments.map((seg, idx) => {
    const path = "/" + segments.slice(0, idx + 1).join("/");
    const isLast = idx === segments.length - 1;
    let label = LABELS[seg] ?? seg;

    // UUIDs → show entity label or "#ID"
    if (isUUID(seg)) {
      label = isLast && currentLabel ? currentLabel : `#${seg.slice(0, 8)}`;
    }

    // Last segment with custom label
    if (isLast && currentLabel && !isUUID(seg)) {
      label = currentLabel;
    }

    return { path, label, isLast };
  });

  return (
    <nav
      aria-label="Breadcrumbs"
      className={cn("mb-4 flex items-center gap-1 text-sm text-muted-foreground", className)}
    >
      <Link
        to="/"
        className="flex items-center gap-1 transition-colors hover:text-foreground"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.map(({ path, label, isLast }) => (
        <span key={path} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3 shrink-0" />
          {isLast ? (
            <span className="font-medium text-foreground truncate max-w-[200px]">
              {label}
            </span>
          ) : (
            <Link
              to={path}
              className="truncate max-w-[160px] transition-colors hover:text-foreground"
            >
              {label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
