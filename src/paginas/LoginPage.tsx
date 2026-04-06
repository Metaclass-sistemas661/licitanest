import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Scale, Loader2, AlertCircle, Eye, EyeOff, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { loginSchema, validarComZod } from "@/lib/validacao";
import { verificar2FAAtivo, obterSegredo2FA, verificarTOTP } from "@/servicos/totp";
import { verificarRateLimitLogin } from "@/lib/rateLimiter";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, usuario, carregando: authCarregando } = useAuth();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [etapa2FA, setEtapa2FA] = useState(false);
  const [codigo2FA, setCodigo2FA] = useState("");

  // Se já está logado, redireciona
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/";
  if (usuario && !authCarregando) {
    navigate(from, { replace: true });
    return null;
  }

  const validarFormulario = (): string | null => {
    const resultado = validarComZod(loginSchema, { email, senha });
    if (!resultado.sucesso) {
      return Object.values(resultado.erros)[0];
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    const erroValidacao = validarFormulario();
    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }

    if (!verificarRateLimitLogin()) {
      setErro("Muitas tentativas de login. Aguarde 1 minuto e tente novamente.");
      return;
    }

    setCarregando(true);
    const { erro: erroLogin } = await login(email, senha);

    if (erroLogin) {
      setCarregando(false);
      setErro(erroLogin);
      return;
    }

    // Verificar se 2FA está ativo para este usuário
    try {
      const tem2FA = await verificar2FAAtivo();
      if (tem2FA) {
        setCarregando(false);
        setEtapa2FA(true);
        return;
      }
    } catch {
      // Se falhar a verificação 2FA, prosseguir sem 2FA
    }

    setCarregando(false);
    navigate(from, { replace: true });
  };

  const handleVerificar2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (codigo2FA.length !== 6 || !/^\d{6}$/.test(codigo2FA)) {
      setErro("Digite os 6 dígitos do aplicativo autenticador.");
      return;
    }

    setCarregando(true);
    try {
      const segredo = await obterSegredo2FA();
      if (!segredo) {
        setErro("Erro ao verificar 2FA. Tente novamente.");
        setCarregando(false);
        return;
      }

      const valido = await verificarTOTP(segredo, codigo2FA);
      if (!valido) {
        setErro("Código inválido. Tente novamente.");
        setCarregando(false);
        return;
      }

      setCarregando(false);
      navigate(from, { replace: true });
    } catch {
      setErro("Erro na verificação do código.");
      setCarregando(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 px-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Scale className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">LicitaNest</CardTitle>
          <CardDescription>
            Sistema de Cestas de Preços para Compras Públicas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {etapa2FA ? (
            /* ── Etapa 2FA ──────────────────────────────── */
            <form onSubmit={handleVerificar2FA} className="space-y-4">
              {erro && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{erro}</span>
                </div>
              )}

              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                <Shield className="h-6 w-6 text-primary" />
                <div>
                  <p className="text-sm font-medium">Verificação em duas etapas</p>
                  <p className="text-xs text-muted-foreground">
                    Digite o código do seu aplicativo autenticador.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="codigo2fa">
                  Código de verificação
                </label>
                <Input
                  id="codigo2fa"
                  value={codigo2FA}
                  onChange={(e) => setCodigo2FA(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="font-mono text-lg tracking-widest text-center"
                  autoFocus
                  disabled={carregando}
                />
              </div>

              <Button className="w-full" type="submit" disabled={carregando}>
                {carregando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Verificar"
                )}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setEtapa2FA(false);
                  setCodigo2FA("");
                  setErro(null);
                }}
                className="w-full text-center text-sm text-muted-foreground hover:underline"
              >
                Voltar ao login
              </button>
            </form>
          ) : (
            /* ── Etapa Login Normal ─────────────────────── */
            <form onSubmit={handleSubmit} className="space-y-4">
            {/* Erro */}
            {erro && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{erro}</span>
              </div>
            )}

            {/* E-mail */}
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                E-mail
              </label>
              <Input
                id="email"
                type="email"
                placeholder="servidor@prefeitura.mg.gov.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={carregando}
                autoFocus
              />
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="senha">
                Senha
              </label>
              <div className="relative">
                <Input
                  id="senha"
                  type={mostrarSenha ? "text" : "password"}
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoComplete="current-password"
                  disabled={carregando}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {mostrarSenha ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Link recuperar senha */}
            <div className="text-right">
              <Link
                to="/recuperar-senha"
                className="text-sm text-primary hover:underline"
              >
                Esqueci minha senha
              </Link>
            </div>

            {/* Botão */}
            <Button className="w-full" type="submit" disabled={carregando}>
              {carregando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Art. 23 da Lei Federal nº 14.133/2021
            </p>
          </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
