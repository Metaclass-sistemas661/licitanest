import { useState, useRef } from "react";
import {
  ShieldCheck,
  Loader2,
  Upload,
  FileKey,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { toast } from "sonner";
import { assinarContrato } from "@/servicos/contratos";

interface DadosCertificado {
  titular: string;
  cpf: string;
  emissor: string;
  validade_inicio: string;
  validade_fim: string;
  serial: string;
}

interface Props {
  contratoId: string;
  contratoNumero: string;
  contratoValor: number;
  contratoVigencia: string;
  tokenAcesso: string;
  onAssinado: () => void;
  onClose: () => void;
}

type Etapa = "upload" | "validando" | "confirmar" | "assinando" | "sucesso" | "erro";

export function AssinaturaDigitalModal({
  contratoId,
  contratoNumero,
  contratoValor,
  contratoVigencia,
  tokenAcesso,
  onAssinado,
  onClose,
}: Props) {
  const [etapa, setEtapa] = useState<Etapa>("upload");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [concordo, setConcordo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [dadosCert, setDadosCert] = useState<DadosCertificado | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatarMoeda = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v / 100);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.toLowerCase();
    if (!ext.endsWith(".pfx") && !ext.endsWith(".p12")) {
      setErro("Formato inválido. Aceitos: .pfx ou .p12");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setErro("Arquivo muito grande (máx. 50MB)");
      return;
    }
    setArquivo(file);
    setErro(null);
  };

  const handleValidar = async () => {
    if (!arquivo || !senha) return;
    setEtapa("validando");
    setErro(null);

    try {
      // Ler arquivo como ArrayBuffer
      const buffer = await arquivo.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      // Enviar para backend para validação do certificado
      // O backend faz: parsing PFX, extrai dados, valida chain ICP-Brasil,
      // compara CPF, verifica validade
      const base64 = btoa(String.fromCharCode(...bytes));

      const res = await assinarContrato(contratoId, {
        certificado_base64: base64,
        senha_certificado: senha,
        token_acesso: tokenAcesso,
        etapa: "validar",
      });

      setDadosCert(res.data.certificado ?? null);
      setEtapa("confirmar");
    } catch (e: unknown) {
      const msg = (e as { error?: string })?.error || "Erro ao validar certificado";
      setErro(msg);
      setEtapa("upload");
    }
  };

  const handleAssinar = async () => {
    if (!arquivo || !senha || !concordo) return;
    setEtapa("assinando");
    setErro(null);

    try {
      const buffer = await arquivo.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const base64 = btoa(String.fromCharCode(...bytes));

      await assinarContrato(contratoId, {
        certificado_base64: base64,
        senha_certificado: senha,
        token_acesso: tokenAcesso,
        etapa: "assinar",
      });

      setEtapa("sucesso");
      toast.success("Contrato assinado digitalmente com sucesso!");
    } catch (e: unknown) {
      const msg = (e as { error?: string })?.error || "Erro ao assinar contrato";
      setErro(msg);
      setEtapa("erro");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-2xl bg-background p-6 shadow-xl">
        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Assinatura Digital</h3>
            <p className="text-sm text-muted-foreground">Certificado ICP-Brasil (A1)</p>
          </div>
        </div>

        {/* Resumo do contrato */}
        <div className="mb-5 rounded-lg border bg-muted/30 p-3">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Contrato</span>
              <p className="font-semibold">{contratoNumero}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Valor</span>
              <p className="font-semibold">{formatarMoeda(contratoValor)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Vigência</span>
              <p className="font-semibold">{contratoVigencia}</p>
            </div>
          </div>
        </div>

        {/* ── Etapa: Upload Certificado ── */}
        {(etapa === "upload" || etapa === "validando") && (
          <div className="space-y-4">
            {/* Upload area */}
            <div
              onClick={() => inputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 transition-colors hover:border-primary/50 hover:bg-muted/20"
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pfx,.p12"
                className="hidden"
                onChange={handleFileSelect}
              />
              {arquivo ? (
                <>
                  <FileKey className="h-8 w-8 text-emerald-600" />
                  <p className="text-sm font-medium">{arquivo.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(arquivo.size / 1024).toFixed(1)} KB — Clique para trocar
                  </p>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Selecionar certificado digital</p>
                  <p className="text-xs text-muted-foreground">.pfx ou .p12 (A1 — ICP-Brasil)</p>
                </>
              )}
            </div>

            {/* Senha */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Senha do certificado</label>
              <div className="relative">
                <Input
                  type={mostrarSenha ? "text" : "password"}
                  placeholder="Digite a senha do certificado"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  disabled={etapa === "validando"}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                >
                  {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {erro && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {erro}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={onClose} disabled={etapa === "validando"}>
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleValidar}
                disabled={!arquivo || !senha || etapa === "validando"}
              >
                {etapa === "validando" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validando...
                  </>
                ) : (
                  "Validar Certificado"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── Etapa: Confirmar assinatura ── */}
        {etapa === "confirmar" && dadosCert && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-emerald-50 p-4 dark:bg-emerald-950/20">
              <p className="mb-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                ✓ Certificado válido
              </p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Titular</span>
                  <span className="font-medium">{dadosCert.titular}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CPF</span>
                  <span className="font-medium">{dadosCert.cpf}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Emissor</span>
                  <span className="font-medium">{dadosCert.emissor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Validade</span>
                  <span className="font-medium">
                    {new Date(dadosCert.validade_inicio).toLocaleDateString("pt-BR")}
                    {" a "}
                    {new Date(dadosCert.validade_fim).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3">
              <input
                type="checkbox"
                checked={concordo}
                onChange={(e) => setConcordo(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm">
                Li e concordo com todos os termos do contrato <strong>{contratoNumero}</strong>. 
                Declaro que tenho poderes legais para assinar este documento em nome do meu município.
              </span>
            </label>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => { setEtapa("upload"); setDadosCert(null); setConcordo(false); }}>
                Voltar
              </Button>
              <Button className="flex-1" onClick={handleAssinar} disabled={!concordo}>
                Assinar Digitalmente
              </Button>
            </div>
          </div>
        )}

        {/* ── Etapa: Assinando ── */}
        {etapa === "assinando" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-semibold">Processando assinatura digital...</p>
              <p className="text-sm text-muted-foreground">
                Validando certificado, gerando hash e aplicando selo
              </p>
            </div>
          </div>
        )}

        {/* ── Etapa: Sucesso ── */}
        {etapa === "sucesso" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/30">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">Contrato assinado com sucesso!</p>
              <p className="mt-1 text-sm text-muted-foreground">
                O selo de assinatura digital foi aplicado ao PDF.
                O contrato está agora ativo.
              </p>
            </div>
            <Button className="mt-2" onClick={() => { onAssinado(); onClose(); }}>
              Fechar
            </Button>
          </div>
        )}

        {/* ── Etapa: Erro ── */}
        {etapa === "erro" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/30">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-red-600">Falha na assinatura</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {erro || "Ocorreu um erro ao processar a assinatura digital."}
              </p>
            </div>
            <div className="flex gap-3 mt-2">
              <Button variant="outline" onClick={onClose}>Fechar</Button>
              <Button onClick={() => { setEtapa("upload"); setErro(null); }}>Tentar novamente</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
