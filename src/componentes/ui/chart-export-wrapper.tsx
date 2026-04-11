import { useRef, useState, useCallback } from "react";
import { Download, Image, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/componentes/ui/button";
import { exportarPNG, exportarCSV, exportarPDF } from "@/lib/export-utils";

interface ChartExportWrapperProps {
  children: React.ReactNode;
  nomeArquivo?: string;
  dados?: Record<string, unknown>[];
  className?: string;
}

export function ChartExportWrapper({
  children,
  nomeArquivo = "grafico",
  dados,
  className,
}: ChartExportWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const [exportando, setExportando] = useState(false);

  const handleExport = useCallback(
    async (tipo: "png" | "csv" | "pdf") => {
      setExportando(true);
      setMenuAberto(false);
      try {
        if (tipo === "csv" && dados) {
          exportarCSV(dados, nomeArquivo);
        } else if (containerRef.current) {
          if (tipo === "png") await exportarPNG(containerRef.current, nomeArquivo);
          if (tipo === "pdf") await exportarPDF(containerRef.current, nomeArquivo);
        }
      } finally {
        setExportando(false);
      }
    },
    [dados, nomeArquivo],
  );

  return (
    <div ref={containerRef} className={`relative group ${className || ""}`}>
      {children}

      {/* Export button — visible on hover */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
        <div className="relative">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 bg-background/80 backdrop-blur-sm shadow-sm"
            onClick={() => setMenuAberto(!menuAberto)}
            disabled={exportando}
            aria-label="Exportar gráfico"
          >
            {exportando ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
          </Button>

          {menuAberto && (
            <div className="absolute right-0 top-full mt-1 w-36 rounded-lg border bg-popover p-1 shadow-lg z-20">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent transition-colors"
                onClick={() => handleExport("png")}
              >
                <Image className="h-3.5 w-3.5" />
                Imagem (PNG)
              </button>
              {dados && dados.length > 0 && (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent transition-colors"
                  onClick={() => handleExport("csv")}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Dados (CSV)
                </button>
              )}
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent transition-colors"
                onClick={() => handleExport("pdf")}
              >
                <FileText className="h-3.5 w-3.5" />
                Relatório (PDF)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChartExportWrapper;
