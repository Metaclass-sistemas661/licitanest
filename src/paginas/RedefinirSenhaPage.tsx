import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Scale, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { redefinirSenhaSchema, validarComZod } from "@/lib/validacao";
import { PasswordStrength } from "@/componentes/ui/password-strength";

export function RedefinirSenhaPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { redefinirSenha } = useAuth();
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const oobCode = searchParams.get("oobCode") ?? "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!oobCode) {
      setErro("Link de redefinição inválido ou expirado.");
      return;
    }

    const validacao = validarComZod(redefinirSenhaSchema, { novaSenha, confirmarSenha });
    if (!validacao.sucesso) {
      const primeiroErro = Object.values(validacao.erros)[0];
      setErro(primeiroErro);
      return;
    }

    setCarregando(true);
    const { erro: erroRedef } = await redefinirSenha(novaSenha, oobCode);
    setCarregando(false);

    if (erroRedef) {
      setErro(erroRedef);
      return;
    }

    setSucesso(true);
    setTimeout(() => navigate("/"), 2000);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 px-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Scale className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">Nova Senha</CardTitle>
          <CardDescription>Defina sua nova senha de acesso</CardDescription>
        </CardHeader>
        <CardContent>
          {sucesso ? (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium">Senha redefinida!</p>
                <p className="mt-0.5 text-emerald-600">
                  Redirecionando para o sistema...
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {erro && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{erro}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="novaSenha">
                  Nova senha
                </label>
                <div className="relative">
                  <Input
                    id="novaSenha"
                    type={mostrarSenha ? "text" : "password"}
                    placeholder="Mínimo 8 caracteres"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    autoComplete="new-password"
                    disabled={carregando}
                    className="pr-10"
                    autoFocus
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
                <PasswordStrength senha={novaSenha} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="confirmarSenha">
                  Confirmar nova senha
                </label>
                <Input
                  id="confirmarSenha"
                  type={mostrarSenha ? "text" : "password"}
                  placeholder="Repita a nova senha"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  autoComplete="new-password"
                  disabled={carregando}
                />
              </div>

              <Button className="w-full" type="submit" disabled={carregando}>
                {carregando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Redefinir senha"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
