import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { User } from "firebase/auth";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  confirmPasswordReset,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { api } from "@/lib/api";
import type { Servidor, PerfilNome } from "@/tipos";

// ─── Constantes ────────────────────────────────────────────
const TIMEOUT_INATIVIDADE_MS = 30 * 60 * 1000; // 30 minutos
const EVENTOS_ATIVIDADE = ["mousedown", "keydown", "scroll", "touchstart"] as const;

// ─── Tipos do contexto ─────────────────────────────────────
export interface AuthContextoValor {
  /** Usuário do Firebase Auth */
  usuario: User | null;
  /** Dados completos do servidor (tabela `servidores`) */
  servidor: Servidor | null;
  /** Perfil textual do servidor logado */
  perfil: PerfilNome | null;
  /** Carregando estado inicial de auth */
  carregando: boolean;
  /** Login com e-mail e senha */
  login: (email: string, senha: string) => Promise<{ erro: string | null }>;
  /** Logout */
  logout: () => Promise<void>;
  /** Recuperação de senha */
  recuperarSenha: (email: string) => Promise<{ erro: string | null }>;
  /** Redefinir senha (após link do e-mail) */
  redefinirSenha: (novaSenha: string, oobCode: string) => Promise<{ erro: string | null }>;
  /** Verifica se o perfil do usuário está na lista permitida */
  temPermissao: (...perfis: PerfilNome[]) => boolean;
  /** Indica se o servidor logado é SuperAdmin da plataforma */
  isSuperAdmin: boolean;
}

// ─── Contexto ──────────────────────────────────────────────
export const AuthContexto = createContext<AuthContextoValor | undefined>(undefined);

// ─── Provider ──────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [servidor, setServidor] = useState<Servidor | null>(null);
  const [carregando, setCarregando] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Buscar dados do servidor via API ─────────────────────
  const carregarServidor = useCallback(async () => {
    try {
      const res = await api.get<{ data: Servidor }>("/api/servidores/me");
      setServidor(res.data ?? null);
    } catch (e) {
      console.error("Erro ao carregar servidor:", e);
      setServidor(null);
    }
  }, []);

  // ── Logout ───────────────────────────────────────────────
  const logout = useCallback(async () => {
    await signOut(auth);
    setUsuario(null);
    setServidor(null);
  }, []);

  // ── Timeout por inatividade ──────────────────────────────
  const resetarTimeout = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      logout();
    }, TIMEOUT_INATIVIDADE_MS);
  }, [logout]);

  useEffect(() => {
    if (!usuario) return;
    resetarTimeout();
    const handler = () => resetarTimeout();
    for (const ev of EVENTOS_ATIVIDADE) {
      window.addEventListener(ev, handler, { passive: true });
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      for (const ev of EVENTOS_ATIVIDADE) {
        window.removeEventListener(ev, handler);
      }
    };
  }, [usuario, resetarTimeout]);

  // ── Inicializar sessão com Firebase Auth ─────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUsuario(firebaseUser);
      if (firebaseUser) {
        carregarServidor();
      } else {
        setServidor(null);
      }
      setCarregando(false);
    });
    return () => unsubscribe();
  }, [carregarServidor]);

  // ── Login ────────────────────────────────────────────────
  const login = useCallback(
    async (email: string, senha: string): Promise<{ erro: string | null }> => {
      try {
        await signInWithEmailAndPassword(auth, email, senha);
        return { erro: null };
      } catch (error: unknown) {
        const code = (error as { code?: string }).code ?? "";
        const mensagens: Record<string, string> = {
          "auth/invalid-credential": "E-mail ou senha inválidos.",
          "auth/user-not-found": "Usuário não encontrado.",
          "auth/wrong-password": "Senha incorreta.",
          "auth/too-many-requests": "Muitas tentativas. Tente novamente mais tarde.",
          "auth/user-disabled": "Conta desativada. Contate o administrador.",
        };
        return { erro: mensagens[code] || "Erro ao fazer login." };
      }
    },
    [],
  );

  // ── Recuperar senha ──────────────────────────────────────
  const recuperarSenha = useCallback(
    async (email: string): Promise<{ erro: string | null }> => {
      try {
        await sendPasswordResetEmail(auth, email, {
          url: `${window.location.origin}/redefinir-senha`,
        });
        return { erro: null };
      } catch {
        return { erro: "Erro ao enviar e-mail de recuperação." };
      }
    },
    [],
  );

  // ── Redefinir senha ──────────────────────────────────────
  const redefinirSenha = useCallback(
    async (novaSenha: string, oobCode: string): Promise<{ erro: string | null }> => {
      try {
        await confirmPasswordReset(auth, oobCode, novaSenha);
        return { erro: null };
      } catch {
        return { erro: "Erro ao redefinir senha. O link pode ter expirado." };
      }
    },
    [],
  );

  // ── Helpers derivados ────────────────────────────────────
  const perfil = useMemo<PerfilNome | null>(() => {
    if (!servidor?.perfil) return null;
    return (servidor.perfil as unknown as { nome: PerfilNome }).nome;
  }, [servidor]);

  const isSuperAdmin = useMemo(() => !!servidor?.is_superadmin, [servidor]);

  const temPermissao = useCallback(
    (...perfis: PerfilNome[]) => {
      if (isSuperAdmin) return true;
      if (!perfil) return false;
      return perfis.includes(perfil);
    },
    [perfil, isSuperAdmin],
  );

  // ── Valor do contexto ────────────────────────────────────
  const valor = useMemo<AuthContextoValor>(
    () => ({
      usuario,
      servidor,
      perfil,
      carregando,
      login,
      logout,
      recuperarSenha,
      redefinirSenha,
      temPermissao,
      isSuperAdmin,
    }),
    [usuario, servidor, perfil, carregando, login, logout, recuperarSenha, redefinirSenha, temPermissao, isSuperAdmin],
  );

  return (
    <AuthContexto.Provider value={valor}>
      {children}
    </AuthContexto.Provider>
  );
}
