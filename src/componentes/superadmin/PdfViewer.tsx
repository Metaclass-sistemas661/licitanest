import { useState, useEffect } from "react";
import { X, Download, Loader2, FileText } from "lucide-react";
import { downloadPdfContrato } from "@/servicos/contratos";

interface PdfViewerProps {
  contratoId: string;
  nomeArquivo?: string | null;
  onClose: () => void;
}

export function PdfViewer({ contratoId, nomeArquivo, onClose }: PdfViewerProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let cancelled = false;
    setCarregando(true);
    setErro("");

    downloadPdfContrato(contratoId)
      .then(({ data }) => {
        if (!cancelled) setUrl(data.url);
      })
      .catch(() => {
        if (!cancelled) setErro("Não foi possível carregar o PDF.");
      })
      .finally(() => {
        if (!cancelled) setCarregando(false);
      });

    return () => { cancelled = true; };
  }, [contratoId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative flex flex-col w-full max-w-5xl h-[90vh] bg-background rounded-xl shadow-2xl border overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-5 w-5 text-primary shrink-0" />
            <span className="font-medium truncate">{nomeArquivo || "Contrato PDF"}</span>
          </div>
          <div className="flex items-center gap-2">
            {url && (
              <a
                href={url}
                download={nomeArquivo || "contrato.pdf"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition"
              >
                <Download className="h-4 w-4" />
                Baixar
              </a>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 hover:bg-muted transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-muted/20">
          {carregando && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {erro && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <FileText className="h-12 w-12 opacity-50" />
              <p>{erro}</p>
            </div>
          )}

          {url && !carregando && !erro && (
            <iframe
              src={`${url}#toolbar=1&navpanes=1`}
              title="Visualização do PDF"
              className="w-full h-full border-0"
            />
          )}
        </div>
      </div>
    </div>
  );
}
