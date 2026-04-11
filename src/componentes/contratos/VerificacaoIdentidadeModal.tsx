import { useState } from "react";
import { ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { verificarAcessoContrato } from "@/servicos/contratos";

interface Props {
  contratoId: string;
  onVerificado: (token: string) => void;
  onClose: () => void;
}

export function VerificacaoIdentidadeModal({ contratoId, onVerificado, onClose }: Props) {
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [verificando, setVerificando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativas, setTentativas] = useState(0);
  const bloqueado = tentativas >= 5;

  const formatarCpf = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const formatarData = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  };

  const cpfLimpo = cpf.replace(/\D/g, "");
  const dataValida = /^\d{2}\/\d{2}\/\d{4}$/.test(dataNascimento);
  const formularioValido = cpfLimpo.length === 11 && dataValida && !bloqueado;

  const handleVerificar = async () => {
    if (!formularioValido) return;
    setVerificando(true);
    setErro(null);

    // Converter DD/MM/AAAA → AAAA-MM-DD
    const [dd, mm, aaaa] = dataNascimento.split("/");
    const dataISO = `${aaaa}-${mm}-${dd}`;

    try {
      const res = await verificarAcessoContrato(contratoId, cpfLimpo, dataISO);
      onVerificado(res.data.token);
    } catch (e: unknown) {
      setTentativas((prev) => prev + 1);
      const msg = (e as { error?: string })?.error;
      if (msg?.includes("bloqueado") || msg?.includes("tentativas")) {
        setErro("Muitas tentativas. Aguarde 15 minutos.");
      } else {
        setErro(msg || "Dados não conferem com o cadastro. Tente novamente.");
      }
    } finally {
      setVerificando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-background p-6 shadow-xl">
        {/* Header */}
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Verificação de Identidade</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Para acessar este contrato, confirme sua identidade com os dados cadastrados.
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">CPF</label>
            <Input
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCpf(formatarCpf(e.target.value))}
              disabled={bloqueado || verificando}
              maxLength={14}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Data de Nascimento</label>
            <Input
              placeholder="DD/MM/AAAA"
              value={dataNascimento}
              onChange={(e) => setDataNascimento(formatarData(e.target.value))}
              disabled={bloqueado || verificando}
              maxLength={10}
            />
          </div>

          {/* Error */}
          {erro && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {erro}
            </div>
          )}

          {bloqueado && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              Acesso temporariamente bloqueado. Tente novamente em 15 minutos.
            </div>
          )}

          {!bloqueado && tentativas > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              {5 - tentativas} tentativa(s) restante(s)
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={verificando}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={handleVerificar}
              disabled={!formularioValido || verificando}
            >
              {verificando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Verificar e Acessar"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
