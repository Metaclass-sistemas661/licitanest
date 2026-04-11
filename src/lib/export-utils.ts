import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

/**
 * Export a DOM element as PNG image.
 */
export async function exportarPNG(
  element: HTMLElement,
  nomeArquivo = "grafico",
): Promise<void> {
  const canvas = await html2canvas(element, {
    backgroundColor: null,
    scale: 2, // HD quality
    useCORS: true,
    logging: false,
  });

  const link = document.createElement("a");
  link.download = `${nomeArquivo}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

/**
 * Export data as CSV with Brazilian formatting (semicolon separator, comma decimal).
 */
export function exportarCSV(
  dados: Record<string, unknown>[],
  nomeArquivo = "dados",
): void {
  if (dados.length === 0) return;

  const colunas = Object.keys(dados[0]);
  const linhas = dados.map((row) =>
    colunas
      .map((col) => {
        const val = row[col];
        if (val === null || val === undefined) return "";
        if (typeof val === "number") return val.toLocaleString("pt-BR");
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(";"),
  );

  const csv = [colunas.join(";"), ...linhas].join("\n");
  const bom = "\uFEFF"; // UTF-8 BOM for Excel
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });

  const link = document.createElement("a");
  link.download = `${nomeArquivo}.csv`;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Export a DOM element as PDF.
 */
export async function exportarPDF(
  element: HTMLElement,
  nomeArquivo = "relatorio",
): Promise<void> {
  const canvas = await html2canvas(element, {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL("image/png");
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  // A4 landscape for dashboards
  const pdf = new jsPDF({
    orientation: imgWidth > imgHeight ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
  const x = (pageWidth - imgWidth * ratio) / 2;
  const y = 10;

  pdf.addImage(imgData, "PNG", x, y, imgWidth * ratio, imgHeight * ratio);
  pdf.save(`${nomeArquivo}.pdf`);
}
