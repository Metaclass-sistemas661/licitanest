import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Separator } from "@/componentes/ui/separator";
import { EmptyState } from "@/componentes/ui/empty-state";
import { PageTransition } from "@/componentes/ui/page-transition";
import {
  ScanLine, Upload, FileImage, AlertTriangle, Loader2, FileText, Trash2, Eye,
} from "lucide-react";
import type { ResultadoOCR, ItemOCR } from "@/tipos";
import { toast } from "sonner";

/**
 * Simulação de OCR local.
 * Em produção: Tesseract.js, Google Vision API ou Azure OCR.
 */
function simularOCR(nomeArquivo: string): ResultadoOCR {
  const itens: ItemOCR[] = [
    {
      descricao: "Papel A4 75g/m² Chamex - Resma 500 fls",
      valor_unitario: 24.90,
      quantidade: 50,
      unidade: "RESMA",
      confianca: 92,
      linha_original: "001 | PAPEL A4 75G/M2 CHAMEX RESMA 500 FLS | 50 | RESMA | 24,90",
    },
    {
      descricao: "Caneta esferográfica azul BIC Cristal",
      valor_unitario: 1.35,
      quantidade: 200,
      unidade: "UN",
      confianca: 88,
      linha_original: "002 | CANETA ESFEROGRAFICA AZUL BIC CRISTAL | 200 | UN | 1,35",
    },
    {
      descricao: "Grampeador de mesa 26/6",
      valor_unitario: 18.50,
      quantidade: 10,
      unidade: "UN",
      confianca: 75,
      linha_original: "003 | GRAMPEADOR MESA 26/6 | 10 | UN | 18,50",
    },
    {
      descricao: "Toner HP CF226A compatível",
      valor_unitario: 89.00,
      quantidade: 5,
      unidade: "UN",
      confianca: 82,
      linha_original: "004 | TONER HP CF226A COMPATIVEL | 5 | UN | 89,00",
    },
    {
      descricao: "Borracha branca Mercur Record",
      valor_unitario: 0.85,
      quantidade: 100,
      unidade: "UN",
      confianca: 70,
      linha_original: "005 | BORRACHA BRANCA MERCUR RECORD | 100 | UN | 0,85",
    },
  ];

  const confiancaMedia = itens.reduce((s, i) => s + i.confianca, 0) / itens.length;

  return {
    id: crypto.randomUUID(),
    nome_arquivo: nomeArquivo,
    status: "concluido",
    texto_extraido: itens.map((i) => i.linha_original).join("\n"),
    itens_encontrados: itens,
    confianca_media: Math.round(confiancaMedia),
    processado_em: new Date().toISOString(),
    erro_mensagem: null,
  };
}

function BadgeConfianca({ valor }: { valor: number }) {
  const cor =
    valor >= 85
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
      : valor >= 70
        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cor}`}>{valor}%</span>;
}

export function OcrCotacoesPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resultados, setResultados] = useState<ResultadoOCR[]>([]);
  const [processando, setProcessando] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setProcessando(true);
    // Simula processamento para cada arquivo
    const novos: ResultadoOCR[] = [];
    for (const file of Array.from(files)) {
      // Valida tipo
      if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
        toast.error(`Arquivo "${file.name}" não é uma imagem ou PDF.`);
        continue;
      }
      // Simula latência
      await new Promise((r) => setTimeout(r, 800));
      novos.push(simularOCR(file.name));
    }
    setResultados((prev) => [...novos, ...prev]);
    toast.success(`${novos.length} arquivo(s) processado(s).`);
    setProcessando(false);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemover = (id: string) => {
    setResultados((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ScanLine className="h-6 w-6 text-primary" />
            OCR — Importar Cotações em Papel
          </h1>
          <p className="text-muted-foreground mt-1">
            Envie fotos ou PDFs de cotações em papel e o sistema extrairá automaticamente os itens e valores.
          </p>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-3 py-1 text-xs font-medium dark:bg-amber-900/30 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            Modo demonstração — Em produção, será conectado a Tesseract.js ou Google Vision API
          </div>
        </div>

        {/* Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Enviar Documentos
            </CardTitle>
            <CardDescription>
              Aceita imagens (JPG, PNG) e PDF. Múltiplos arquivos permitidos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={handleUpload}
                className="hidden"
              />
              {processando ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Processando OCR...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <FileImage className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Clique para selecionar arquivos</p>
                  <p className="text-xs text-muted-foreground">ou arraste e solte aqui</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        {resultados.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">
              Resultados ({resultados.length} arquivo{resultados.length !== 1 ? "s" : ""})
            </h2>

            {resultados.map((r) => (
              <Card key={r.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">{r.nome_arquivo}</CardTitle>
                      <CardDescription className="text-xs">
                        {r.itens_encontrados.length} itens · Confiança média: <BadgeConfianca valor={r.confianca_media} />
                        {r.processado_em && (
                          <> · {new Date(r.processado_em).toLocaleString("pt-BR")}</>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpandido(expandido === r.id ? null : r.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleRemover(r.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>

                {expandido === r.id && (
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left border-b text-muted-foreground">
                            <th className="pb-2 font-medium">Descrição</th>
                            <th className="pb-2 font-medium text-right">Qtd</th>
                            <th className="pb-2 font-medium">Un.</th>
                            <th className="pb-2 font-medium text-right">Vlr Unit.</th>
                            <th className="pb-2 font-medium text-center">Confiança</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {r.itens_encontrados.map((item, idx) => (
                            <tr key={idx} className="hover:bg-muted/50">
                              <td className="py-2">
                                <p className="font-medium">{item.descricao}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                                  OCR: {item.linha_original}
                                </p>
                              </td>
                              <td className="py-2 text-right">{item.quantidade ?? "—"}</td>
                              <td className="py-2">{item.unidade ?? "—"}</td>
                              <td className="py-2 text-right font-mono">
                                {item.valor_unitario != null ? `R$ ${item.valor_unitario.toFixed(2)}` : "—"}
                              </td>
                              <td className="py-2 text-center">
                                <BadgeConfianca valor={item.confianca} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {r.texto_extraido && (
                      <>
                        <Separator className="my-3" />
                        <details>
                          <summary className="text-xs font-medium cursor-pointer text-muted-foreground hover:text-foreground">
                            Texto bruto extraído
                          </summary>
                          <pre className="mt-2 text-xs bg-muted rounded p-3 whitespace-pre-wrap">
                            {r.texto_extraido}
                          </pre>
                        </details>
                      </>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}

        {resultados.length === 0 && !processando && (
          <EmptyState
            icon={ScanLine}
            title="Nenhum documento processado"
            description="Envie fotos ou PDFs de cotações em papel para extrair os itens automaticamente via OCR."
            actionLabel="Selecionar Arquivos"
            onAction={() => fileInputRef.current?.click()}
          />
        )}
      </div>
    </PageTransition>
  );
}
