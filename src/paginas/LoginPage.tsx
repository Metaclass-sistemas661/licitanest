import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
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
    <div className="flex min-h-screen items-center justify-center bg-[#1e3a8a] px-4 py-8">
      <div className="flex w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* ── Lado Esquerdo: Formulário ─────────────────── */}
        <div className="flex w-full flex-col justify-center px-8 py-10 sm:px-12 md:w-1/2">
          <div className="mx-auto w-full max-w-sm">
            {/* Logo */}
            <div className="mb-6 flex flex-col items-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#1e3a8a]/10">
                <Scale className="h-6 w-6 text-[#1e3a8a]" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">LicitaNest</h1>
              <p className="mt-1 text-center text-sm text-gray-500">
                Sistema de Cestas de Preços para Compras Públicas
              </p>
            </div>

            {etapa2FA ? (
              /* ── Etapa 2FA ──────────────────────────────── */
              <form onSubmit={handleVerificar2FA} className="space-y-4">
                {erro && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{erro}</span>
                  </div>
                )}

                <div className="flex items-center gap-3 rounded-lg border bg-gray-50 p-3">
                  <Shield className="h-6 w-6 text-[#1e3a8a]" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Verificação em duas etapas</p>
                    <p className="text-xs text-gray-500">
                      Digite o código do seu aplicativo autenticador.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700" htmlFor="codigo2fa">
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

                <Button className="w-full bg-[#1e3a8a] hover:bg-[#1e3a8a]/90" type="submit" disabled={carregando}>
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
                  className="w-full text-center text-sm text-gray-500 hover:underline"
                >
                  Voltar ao login
                </button>
              </form>
            ) : (
              /* ── Etapa Login Normal ─────────────────────── */
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Erro */}
                {erro && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{erro}</span>
                  </div>
                )}

                {/* E-mail */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700" htmlFor="email">
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
                  <label className="text-sm font-medium text-gray-700" htmlFor="senha">
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                    className="text-sm text-[#1e3a8a] hover:underline"
                  >
                    Esqueci minha senha
                  </Link>
                </div>

                {/* Botão */}
                <Button className="w-full bg-[#1e3a8a] hover:bg-[#1e3a8a]/90" type="submit" disabled={carregando}>
                  {carregando ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>

                <p className="text-center text-xs text-gray-400">
                  Art. 23 da Lei Federal nº 14.133/2021
                </p>
              </form>
            )}
          </div>
        </div>

        {/* ── Lado Direito: Gradiente Visual ────────────── */}
        <div className="relative hidden w-1/2 overflow-hidden md:block">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a8a] via-[#3b0764] to-[#0f172a]" />
          {/* Orbs decorativos */}
          <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-purple-600/20 blur-3xl" />
          <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/10 blur-2xl" />
          {/* Conteúdo central */}
          <div className="relative flex h-full flex-col items-center justify-center p-10 text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
              <Scale className="h-8 w-8 text-white" />
            </div>
            <h2 className="mb-3 text-2xl font-bold text-white">
              Cesta de Preços<br />Inteligente
            </h2>
            <p className="max-w-xs text-sm leading-relaxed text-white/70">
              Pesquisa automatizada em PNCP, TCEs e Painel de Preços. Conforme Lei 14.133 e IN 65/2021.
            </p>
            {/* Badges */}
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-sm">
                LGPD
              </span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-sm">
                IN 65/2021
              </span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-sm">
                Lei 14.133
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
