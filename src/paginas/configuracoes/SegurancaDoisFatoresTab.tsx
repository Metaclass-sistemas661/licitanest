import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Copy,
  QrCode,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  gerarSegredo,
  gerarOtpauthUri,
  verificarTOTP,
  ativar2FA,
  desativar2FA,
  verificar2FAAtivo,
  obterSegredo2FA,
} from "@/servicos/totp";

type Etapa = "status" | "setup" | "verificar" | "desativar";

export function SegurancaDoisFatoresTab() {
  const { usuario, servidor } = useAuth();
  const [etapa, setEtapa] = useState<Etapa>("status");
  const [ativo, setAtivo] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [segredo, setSegredo] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);

  // Verificar status ao montar
  useEffect(() => {
    verificar2FAAtivo()
      .then(setAtivo)
      .finally(() => setCarregando(false));
  }, []);

  // Iniciar configuração 2FA
  const iniciarSetup = useCallback(async () => {
    setErro(null);
    setSucesso(null);
    const novoSegredo = gerarSegredo();
    setSegredo(novoSegredo);

    const email = usuario?.email ?? "usuario@licitanest.com";
    const uri = gerarOtpauthUri(email, novoSegredo);

    // Gerar QR code como data URL usando canvas (sem dependência externa)
    try {
      const qrUrl = await gerarQRCodeDataUrl(uri);
      setQrDataUrl(qrUrl);
    } catch {
      setQrDataUrl("");
    }

    setEtapa("setup");
  }, [usuario]);

  // Verificar código e ativar
  const confirmarAtivacao = useCallback(async () => {
    setErro(null);
    if (codigo.length !== 6 || !/^\d{6}$/.test(codigo)) {
      setErro("Digite os 6 dígitos do aplicativo autenticador.");
      return;
    }

    setProcessando(true);
    const valido = await verificarTOTP(segredo, codigo);
    if (!valido) {
      setErro("Código inválido. Tente novamente.");
      setProcessando(false);
      return;
    }

    const { erro: erroSalvar } = await ativar2FA(segredo, servidor?.id ?? "");
    setProcessando(false);

    if (erroSalvar) {
      setErro(erroSalvar);
      return;
    }

    setAtivo(true);
    setSucesso("Autenticação de dois fatores ativada com sucesso!");
    setEtapa("status");
    setCodigo("");
  }, [codigo, segredo]);

  // Desativar 2FA
  const confirmarDesativacao = useCallback(async () => {
    setErro(null);
    if (codigo.length !== 6 || !/^\d{6}$/.test(codigo)) {
      setErro("Digite o código atual para confirmar a desativação.");
      return;
    }

    setProcessando(true);
    // Verificar código antes de desativar
    const secret = await obterSegredo2FA();
    if (secret) {
      const valido = await verificarTOTP(secret, codigo);
      if (!valido) {
        setErro("Código inválido.");
        setProcessando(false);
        return;
      }
    }

    const { erro: erroDesativar } = await desativar2FA(servidor?.id ?? "");
    setProcessando(false);

    if (erroDesativar) {
      setErro(erroDesativar);
      return;
    }

    setAtivo(false);
    setSucesso("Autenticação de dois fatores desativada.");
    setEtapa("status");
    setCodigo("");
  }, [codigo, usuario]);

  const copiarSegredo = () => {
    navigator.clipboard.writeText(segredo);
    setSucesso("Chave copiada!");
    setTimeout(() => setSucesso(null), 2000);
  };

  if (carregando) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Autenticação de Dois Fatores (2FA)
        </CardTitle>
        <CardDescription>
          Proteja sua conta com verificação TOTP via aplicativo autenticador
          (Google Authenticator, Authy, etc.)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mensagens */}
        {erro && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{erro}</span>
          </div>
        )}
        {sucesso && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{sucesso}</span>
          </div>
        )}

        {/* ── Status ──────────────────────────────────── */}
        {etapa === "status" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border p-4">
              {ativo ? (
                <>
                  <ShieldCheck className="h-8 w-8 text-emerald-600" />
                  <div>
                    <p className="font-medium text-emerald-700">2FA Ativo</p>
                    <p className="text-sm text-muted-foreground">
                      Sua conta está protegida com autenticação de dois fatores.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <ShieldOff className="h-8 w-8 text-amber-500" />
                  <div>
                    <p className="font-medium text-amber-700">2FA Inativo</p>
                    <p className="text-sm text-muted-foreground">
                      Recomendamos ativar a autenticação de dois fatores para maior
                      segurança.
                    </p>
                  </div>
                </>
              )}
            </div>

            {ativo ? (
              <Button
                variant="outline"
                className="text-destructive"
                onClick={() => {
                  setCodigo("");
                  setErro(null);
                  setSucesso(null);
                  setEtapa("desativar");
                }}
              >
                <ShieldOff className="mr-2 h-4 w-4" />
                Desativar 2FA
              </Button>
            ) : (
              <Button onClick={iniciarSetup}>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Ativar 2FA
              </Button>
            )}
          </div>
        )}

        {/* ── Setup: QR Code + Segredo ────────────────── */}
        {etapa === "setup" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              1. Abra seu aplicativo autenticador e escaneie o QR code abaixo:
            </p>

            {qrDataUrl ? (
              <div className="flex justify-center rounded-lg border bg-white p-4">
                <img src={qrDataUrl} alt="QR Code 2FA" className="h-48 w-48" />
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-lg border bg-muted/30 p-6">
                <QrCode className="h-12 w-12 text-muted-foreground" />
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              2. Ou insira esta chave manualmente:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded border bg-muted/50 px-3 py-2 text-sm font-mono break-all">
                {segredo}
              </code>
              <Button variant="outline" size="icon" onClick={copiarSegredo}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              3. Digite o código de 6 dígitos gerado pelo aplicativo:
            </p>
            <div className="flex gap-2">
              <Input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="max-w-[200px] font-mono text-lg tracking-widest text-center"
                autoFocus
              />
              <Button onClick={confirmarAtivacao} disabled={processando}>
                {processando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Confirmar
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEtapa("status");
                setCodigo("");
                setErro(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        )}

        {/* ── Desativar: pedir código ─────────────────── */}
        {etapa === "desativar" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Para desativar o 2FA, insira o código atual do seu aplicativo
              autenticador:
            </p>
            <div className="flex gap-2">
              <Input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="max-w-[200px] font-mono text-lg tracking-widest text-center"
                autoFocus
              />
              <Button
                variant="destructive"
                onClick={confirmarDesativacao}
                disabled={processando}
              >
                {processando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Desativar
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEtapa("status");
                setCodigo("");
                setErro(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── QR Code simples via Canvas (sem lib externa) ──────────
// Usa API do chart para gerar QR via URL (fallback se não houver lib)
async function gerarQRCodeDataUrl(data: string): Promise<string> {
  // Usa a API pública do QR Server para gerar o QR code
  // Em produção, substituir por geração local
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}`;
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
