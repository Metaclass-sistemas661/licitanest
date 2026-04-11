import { useState, useRef, useCallback } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { uploadPdfContrato } from "@/servicos/contratos";

interface PdfUploaderProps {
  contratoId: string;
  pdfAtual?: string | null;
  onUploadComplete?: (storagePath: string, hash: string) => void;
}

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

async function calcularSHA256(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function validarPdf(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) return false;
  const header = new Uint8Array(buffer, 0, 4);
  return String.fromCharCode(...header) === "%PDF";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PdfUploader({ contratoId, pdfAtual, onUploadComplete }: PdfUploaderProps) {
  const [estado, setEstado] = useState<"idle" | "validando" | "enviando" | "sucesso" | "erro">("idle");
  const [progresso, setProgresso] = useState(0);
  const [erro, setErro] = useState("");
  const [hashLocal, setHashLocal] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setErro("");
    setEstado("validando");
    setArquivo(file);

    if (file.size > MAX_SIZE) {
      setErro(`Arquivo muito grande (${formatBytes(file.size)}). Máximo: 20 MB.`);
      setEstado("erro");
      return;
    }

    if (file.type !== "application/pdf") {
      setErro("Somente arquivos PDF são permitidos.");
      setEstado("erro");
      return;
    }

    const buffer = await file.arrayBuffer();

    if (!validarPdf(buffer)) {
      setErro("Arquivo não é um PDF válido (magic bytes inválidos).");
      setEstado("erro");
      return;
    }

    const hash = await calcularSHA256(buffer);
    setHashLocal(hash);
    setEstado("enviando");
    setProgresso(0);

    try {
      const { data } = await uploadPdfContrato(contratoId, file, setProgresso);
      setEstado("sucesso");
      onUploadComplete?.(data.storagePath, data.hash);
    } catch (e: unknown) {
      const msg = (e && typeof e === "object" && "error" in e) ? String((e as { error: string }).error) : "Erro no upload";
      setErro(msg);
      setEstado("erro");
    }
  }, [contratoId, onUploadComplete]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }, [handleFile]);

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8
          cursor-pointer transition-colors
          ${estado === "erro" ? "border-red-400 bg-red-50 dark:bg-red-950/20" : ""}
          ${estado === "sucesso" ? "border-green-400 bg-green-50 dark:bg-green-950/20" : ""}
          ${estado === "idle" || estado === "validando" ? "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/40" : ""}
          ${estado === "enviando" ? "border-primary/50 bg-primary/5" : ""}
        `}
      >
        <input ref={inputRef} type="file" accept=".pdf,application/pdf" onChange={handleInput} className="hidden" />

        {estado === "idle" && (
          <>
            <Upload className="h-10 w-10 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">Arraste e solte o PDF aqui</p>
              <p className="text-sm text-muted-foreground">ou clique para selecionar (máx. 20 MB)</p>
            </div>
          </>
        )}

        {estado === "validando" && (
          <>
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Validando arquivo…</p>
          </>
        )}

        {estado === "enviando" && (
          <>
            <FileText className="h-10 w-10 text-primary" />
            <div className="w-full max-w-xs">
              <div className="flex justify-between text-sm mb-1">
                <span className="truncate max-w-48">{arquivo?.name}</span>
                <span className="font-medium">{progresso}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-[width] duration-300"
                  style={{ width: `${progresso}%` }}
                />
              </div>
            </div>
          </>
        )}

        {estado === "sucesso" && (
          <>
            <CheckCircle2 className="h-10 w-10 text-green-600" />
            <div className="text-center">
              <p className="font-medium text-green-700 dark:text-green-400">Upload concluído!</p>
              <p className="text-xs text-muted-foreground truncate max-w-60">{arquivo?.name} ({formatBytes(arquivo?.size ?? 0)})</p>
              <p className="text-xs text-muted-foreground font-mono mt-1">SHA-256: {hashLocal.substring(0, 16)}…</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setEstado("idle"); setArquivo(null); }}
              className="text-sm text-primary underline"
            >
              Enviar novo arquivo
            </button>
          </>
        )}

        {estado === "erro" && (
          <>
            <AlertCircle className="h-10 w-10 text-red-500" />
            <div className="text-center">
              <p className="font-medium text-red-600 dark:text-red-400">{erro}</p>
              <p className="text-xs text-muted-foreground mt-1">{arquivo?.name}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setEstado("idle"); setArquivo(null); setErro(""); }}
              className="text-sm text-primary underline"
            >
              Tentar novamente
            </button>
          </>
        )}
      </div>

      {/* PDF atual */}
      {pdfAtual && estado !== "sucesso" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
          <FileText className="h-4 w-4 shrink-0" />
          <span className="truncate">{pdfAtual}</span>
        </div>
      )}
    </div>
  );
}
