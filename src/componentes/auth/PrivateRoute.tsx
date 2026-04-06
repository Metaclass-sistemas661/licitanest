import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { PerfilNome } from "@/tipos";
import { Scale, Loader2 } from "lucide-react";

interface PrivateRouteProps {
  /** Se informado, só esses perfis têm acesso. Se vazio/undefined, qualquer autenticado. */
  perfisPermitidos?: PerfilNome[];
  children?: React.ReactNode;
}

/**
 * Componente que protege rotas.
 * - Sem sessão → redireciona para /login
 * - Sem perfil permitido → redireciona para / (sem acesso)
 * - Carregando → spinner
 *
 * IMPORTANTE: Cada perfil (admin, gestor, pesquisador) tem sua própria conta
 * no Firebase Auth. O PrivateRoute verifica o perfil no banco de dados
 * (tabela servidores → perfis), NÃO no token JWT.
 */
export function PrivateRoute({ perfisPermitidos, children }: PrivateRouteProps) {
  const { usuario, servidor, perfil, carregando } = useAuth();
  const location = useLocation();

  // ── Loading inicial ──────────────────────────────────────
  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Scale className="h-7 w-7 text-primary" />
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Carregando...</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Não autenticado → login ──────────────────────────────
  if (!usuario) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ── Aguardando dados do servidor carregarem ──────────────
  if (!servidor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Scale className="h-7 w-7 text-primary" />
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Verificando permissões...</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Verificar perfil ─────────────────────────────────────
  if (perfisPermitidos && perfisPermitidos.length > 0 && perfil) {
    if (!perfisPermitidos.includes(perfil)) {
      // Usuário autenticado mas sem permissão para esta rota
      return <Navigate to="/" replace />;
    }
  }

  return children ? <>{children}</> : <Outlet />;
}
