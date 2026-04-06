import { useContext } from "react";
import { AuthContexto } from "@/contextos/AuthContexto";
import type { AuthContextoValor } from "@/contextos/AuthContexto";

/**
 * Hook para acessar o contexto de autenticação.
 * Deve ser usado dentro de um `<AuthProvider>`.
 */
export function useAuth(): AuthContextoValor {
  const contexto = useContext(AuthContexto);
  if (!contexto) {
    throw new Error("useAuth deve ser usado dentro de um <AuthProvider>");
  }
  return contexto;
}
