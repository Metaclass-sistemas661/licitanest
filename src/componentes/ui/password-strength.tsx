import { useMemo } from "react";

interface PasswordStrengthProps {
  senha: string;
}

const REGRAS = [
  { regex: /.{8,}/, label: "8+ caracteres" },
  { regex: /[A-Z]/, label: "Letra maiúscula" },
  { regex: /[a-z]/, label: "Letra minúscula" },
  { regex: /[0-9]/, label: "Número" },
  { regex: /[^A-Za-z0-9]/, label: "Caractere especial" },
] as const;

export function PasswordStrength({ senha }: PasswordStrengthProps) {
  const resultado = useMemo(() => {
    return REGRAS.map((r) => ({ ...r, ok: r.regex.test(senha) }));
  }, [senha]);

  const preenchidas = resultado.filter((r) => r.ok).length;
  const pct = (preenchidas / REGRAS.length) * 100;

  if (!senha) return null;

  const cor =
    pct <= 40 ? "bg-red-500" : pct <= 80 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="space-y-2">
      {/* Barra de progresso */}
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-300 ${cor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {/* Checklist */}
      <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
        {resultado.map((r) => (
          <li
            key={r.label}
            className={r.ok ? "text-emerald-600" : "text-muted-foreground"}
          >
            {r.ok ? "✓" : "○"} {r.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
