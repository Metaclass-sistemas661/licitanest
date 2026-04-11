import { type ReactNode } from "react";

/**
 * TabelaResponsiva — Em telas grandes mostra a tabela normal; em mobile mostra cards empilhados.
 * Uso: envolve a <table> existente com um slot de mobile cards.
 */
export function TabelaResponsiva({
  children,
  mobileCards,
}: {
  children: ReactNode;
  mobileCards: ReactNode;
}) {
  return (
    <>
      {/* Tabela: visível em md+ */}
      <div className="hidden md:block rounded-xl border bg-card overflow-x-auto">
        {children}
      </div>
      {/* Cards mobile: visível apenas em < md */}
      <div className="md:hidden space-y-3">{mobileCards}</div>
    </>
  );
}

/**
 * CardMobile — Card para cada linha da tabela em mobile
 */
export function CardMobile({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      className="rounded-xl border bg-card p-4 space-y-2 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
    >
      {children}
    </div>
  );
}

/**
 * CardMobileCampo — Um campo label: valor no card mobile
 */
export function CardMobileCampo({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between text-sm ${className}`}>
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}
