import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Scale, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function RecuperarSenhaPage() {
  const { recuperarSenha } = useAuth();
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!email.trim()) {
      setErro("Informe o e-mail.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErro("E-mail inválido.");
      return;
    }

    setCarregando(true);
    const { erro: erroRecup } = await recuperarSenha(email);
    setCarregando(false);

    if (erroRecup) {
      setErro(erroRecup);
      return;
    }

    setSucesso(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 px-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Scale className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">Recuperar Senha</CardTitle>
          <CardDescription>
            Informe seu e-mail para receber o link de redefinição
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sucesso ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <div>
                  <p className="font-medium">E-mail enviado!</p>
                  <p className="mt-0.5 text-emerald-600">
                    Verifique sua caixa de entrada e clique no link para redefinir sua senha.
                  </p>
                </div>
              </div>
              <Link to="/login">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar ao login
                </Button>
              </Link>
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
                <label className="text-sm font-medium" htmlFor="email">
                  E-mail cadastrado
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

              <Button className="w-full" type="submit" disabled={carregando}>
                {carregando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar link de recuperação"
                )}
              </Button>

              <div className="text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Voltar ao login
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
