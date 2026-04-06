// Memorial de Cálculo + Justificativa de Preços — Documentos formais IN 65/2021
// Gera PDF com layout formal exigido pelos TCEs
import type {
  MemorialCalculo,
  MemorialItemCalculo,
  MetodologiaCalculo,
  ItemCesta,
} from "@/tipos";
import { LABELS_METODOLOGIA } from "./workflow";

// ══════════════════════════════════════════════════════
// FUNÇÕES ESTATÍSTICAS
// ══════════════════════════════════════════════════════

function calcMedia(valores: number[]): number | null {
  if (valores.length === 0) return null;
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

function calcMediana(valores: number[]): number | null {
  if (valores.length === 0) return null;
  const sorted = [...valores].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function calcDesvioPadrao(valores: number[]): number | null {
  if (valores.length < 2) return null;
  const media = valores.reduce((a, b) => a + b, 0) / valores.length;
  const somaQ = valores.reduce((acc, v) => acc + (v - media) ** 2, 0);
  return Math.sqrt(somaQ / (valores.length - 1));
}

/**
 * Média saneada: exclui outliers via IQR (Interquartile Range)
 * Remove valores abaixo de Q1 - 1.5*IQR e acima de Q3 + 1.5*IQR
 */
function calcMediaSaneada(valores: number[]): { media: number | null; excluidos: number[] } {
  if (valores.length < 4) return { media: calcMedia(valores), excluidos: [] };

  const sorted = [...valores].sort((a, b) => a - b);
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;
  const limiteInferior = q1 - 1.5 * iqr;
  const limiteSuperior = q3 + 1.5 * iqr;

  const excluidos: number[] = [];
  const incluidos: number[] = [];

  for (const v of valores) {
    if (v < limiteInferior || v > limiteSuperior) {
      excluidos.push(v);
    } else {
      incluidos.push(v);
    }
  }

  return { media: calcMedia(incluidos), excluidos };
}

// ── Calcular preço de referência pela metodologia ────────
export function calcularPrecoReferencia(
  valores: number[],
  metodologia: MetodologiaCalculo,
): number | null {
  if (valores.length === 0) return null;
  switch (metodologia) {
    case "media":
      return calcMedia(valores);
    case "mediana":
      return calcMediana(valores);
    case "menor_preco":
      return Math.min(...valores);
    case "media_saneada":
      return calcMediaSaneada(valores).media;
  }
}

// ══════════════════════════════════════════════════════
// MONTAGEM DO MEMORIAL DE CÁLCULO
// ══════════════════════════════════════════════════════

export function montarMemorialCalculo(
  cesta: {
    id: string;
    descricao_objeto: string;
    metodologia_calculo?: MetodologiaCalculo;
    fundamentacao_legal?: string | null;
    numero_minimo_fontes?: number;
  },
  itens: ItemCesta[],
  config: {
    orgao: string;
    municipio: string;
    uf: string;
    responsavel: string;
  },
): MemorialCalculo {
  const metodologia = (cesta.metodologia_calculo ?? "mediana") as MetodologiaCalculo;
  const itensMemorial: MemorialItemCalculo[] = [];
  let valorTotalEstimado = 0;

  for (const [idx, item] of itens.entries()) {
    const precos = item.precos ?? [];
    const precosColetados = precos.map((p) => ({
      fonte: p.fonte?.sigla ?? p.fonte?.nome ?? "—",
      orgao: p.orgao ?? "—",
      data_referencia: p.data_referencia,
      valor_unitario: Number(p.valor_unitario),
      valor_corrigido: p.valor_corrigido ? Number(p.valor_corrigido) : null,
      excluido: p.excluido_calculo,
      justificativa_exclusao: p.justificativa_exclusao ?? undefined,
    }));

    const valoresAtivos = precosColetados
      .filter((p) => !p.excluido)
      .map((p) => p.valor_corrigido ?? p.valor_unitario);

    const media = calcMedia(valoresAtivos);
    const mediana = calcMediana(valoresAtivos);
    const dp = calcDesvioPadrao(valoresAtivos);
    const cv = dp && media && media > 0 ? (dp / media) * 100 : null;
    const precoRef = calcularPrecoReferencia(valoresAtivos, metodologia);

    const itemMemorial: MemorialItemCalculo = {
      ordem: idx + 1,
      descricao: item.produto?.descricao ?? "—",
      unidade: item.produto?.unidade_medida?.sigla ?? "un",
      quantidade: item.quantidade,
      precos_coletados: precosColetados,
      estatisticas: {
        media: media !== null ? Math.round(media * 10000) / 10000 : null,
        mediana: mediana !== null ? Math.round(mediana * 10000) / 10000 : null,
        menor_preco: valoresAtivos.length > 0 ? Math.min(...valoresAtivos) : null,
        maior_preco: valoresAtivos.length > 0 ? Math.max(...valoresAtivos) : null,
        desvio_padrao: dp !== null ? Math.round(dp * 10000) / 10000 : null,
        coeficiente_variacao: cv !== null ? Math.round(cv * 100) / 100 : null,
        preco_referencia: precoRef !== null ? Math.round(precoRef * 10000) / 10000 : null,
        metodo_adotado: metodologia,
      },
      valor_total_estimado: precoRef ? Math.round(precoRef * item.quantidade * 100) / 100 : 0,
    };

    valorTotalEstimado += itemMemorial.valor_total_estimado;
    itensMemorial.push(itemMemorial);
  }

  const fontesSet = new Set<string>();
  for (const item of itens) {
    for (const p of item.precos ?? []) {
      if (!p.excluido_calculo) fontesSet.add(p.fonte_id);
    }
  }

  return {
    cesta_id: cesta.id,
    descricao_objeto: cesta.descricao_objeto,
    fundamentacao_legal:
      cesta.fundamentacao_legal ??
      "Lei nº 14.133/2021, Art. 23 c/c IN SEGES/ME nº 65/2021",
    metodologia,
    data_geracao: new Date().toISOString(),
    orgao: config.orgao,
    municipio: config.municipio,
    uf: config.uf,
    responsavel: config.responsavel,
    itens: itensMemorial,
    resumo: {
      total_itens: itensMemorial.length,
      total_fontes: fontesSet.size,
      valor_total_estimado: Math.round(valorTotalEstimado * 100) / 100,
    },
  };
}

// ══════════════════════════════════════════════════════
// GERAÇÃO DE PDF — MEMORIAL DE CÁLCULO
// ══════════════════════════════════════════════════════

function moeda(v: number | null): string {
  if (v === null || v === undefined) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function fmtPercent(v: number | null): string {
  if (v === null) return "—";
  return `${v.toFixed(2)}%`;
}

export async function gerarPDFMemorialCalculo(memorial: MemorialCalculo): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF("p", "mm", "a4") as InstanceType<typeof jsPDF> & {
    lastAutoTable: { finalY: number };
  };
  const pageW = doc.internal.pageSize.getWidth();
  let y = 15;

  // ── Cabeçalho formal ──
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(memorial.orgao, pageW / 2, y, { align: "center" });
  y += 5;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`${memorial.municipio} — ${memorial.uf}`, pageW / 2, y, { align: "center" });
  y += 8;

  // Título
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("MEMORIAL DE CÁLCULO", pageW / 2, y, { align: "center" });
  y += 5;
  doc.setFontSize(10);
  doc.text("PESQUISA DE PREÇOS — IN SEGES/ME Nº 65/2021", pageW / 2, y, { align: "center" });
  y += 8;

  // ── Informações gerais ──
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("1. OBJETO", 14, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  const linhasObj = doc.splitTextToSize(memorial.descricao_objeto, pageW - 28);
  doc.text(linhasObj, 14, y);
  y += linhasObj.length * 4 + 4;

  doc.setFont("helvetica", "bold");
  doc.text("2. FUNDAMENTAÇÃO LEGAL", 14, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.text(memorial.fundamentacao_legal, 14, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.text("3. METODOLOGIA", 14, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.text(`Método: ${LABELS_METODOLOGIA[memorial.metodologia]}`, 14, y);
  y += 4;
  doc.text(`Total de itens: ${memorial.resumo.total_itens}`, 14, y);
  y += 4;
  doc.text(`Total de fontes distintas: ${memorial.resumo.total_fontes}`, 14, y);
  y += 4;
  doc.text(`Data de geração: ${fmtData(memorial.data_geracao)}`, 14, y);
  y += 8;

  // ── Tabela resumo ──
  doc.setFont("helvetica", "bold");
  doc.text("4. RESUMO DOS ITENS", 14, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    head: [["#", "Descrição", "Unid.", "Qtd.", "Preço Ref.", "Total"]],
    body: memorial.itens.map((item) => [
      item.ordem.toString(),
      item.descricao.substring(0, 50),
      item.unidade,
      item.quantidade.toString(),
      moeda(item.estatisticas.preco_referencia),
      moeda(item.valor_total_estimado),
    ]),
    foot: [["", "", "", "", "TOTAL ESTIMADO", moeda(memorial.resumo.valor_total_estimado)]],
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    footStyles: { fillColor: [240, 240, 240], fontStyle: "bold" },
    margin: { left: 14, right: 14 },
    theme: "grid",
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // ── Detalhamento por item ──
  doc.setFont("helvetica", "bold");
  doc.text("5. DETALHAMENTO DOS PREÇOS POR ITEM", 14, y);
  y += 2;

  for (const item of memorial.itens) {
    if (y > 250) {
      doc.addPage();
      y = 15;
    }

    y += 4;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(`${item.ordem}. ${item.descricao} (${item.unidade})`, 14, y);
    y += 1;

    autoTable(doc, {
      startY: y,
      head: [["Fonte", "Órgão", "Data Ref.", "V. Unit.", "V. Corrigido", "Status"]],
      body: item.precos_coletados.map((p) => [
        p.fonte,
        p.orgao.substring(0, 25),
        fmtData(p.data_referencia),
        moeda(p.valor_unitario),
        p.valor_corrigido ? moeda(p.valor_corrigido) : "—",
        p.excluido ? `EXCL: ${(p.justificativa_exclusao ?? "").substring(0, 20)}` : "Ativo",
      ]),
      styles: { fontSize: 6.5, cellPadding: 1 },
      headStyles: { fillColor: [100, 116, 139] },
      margin: { left: 14, right: 14 },
      theme: "grid",
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 2;

    // Estatísticas do item
    const e = item.estatisticas;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Média: ${moeda(e.media)} | Mediana: ${moeda(e.mediana)} | Menor: ${moeda(e.menor_preco)} | DP: ${moeda(e.desvio_padrao)} | CV: ${fmtPercent(e.coeficiente_variacao)} | Preço Ref. (${LABELS_METODOLOGIA[e.metodo_adotado]}): ${moeda(e.preco_referencia)}`,
      14,
      y,
    );
    y += 6;
  }

  // ── Rodapé com assinatura ──
  if (y > 240) {
    doc.addPage();
    y = 15;
  }
  y += 10;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("6. RESPONSÁVEL", 14, y);
  y += 10;
  doc.setDrawColor(0);
  doc.line(40, y, pageW - 40, y);
  y += 4;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(memorial.responsavel, pageW / 2, y, { align: "center" });
  y += 4;
  doc.text("Responsável pela Pesquisa de Preços", pageW / 2, y, { align: "center" });

  // Salvar
  const nomeArquivo = `memorial_calculo_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(nomeArquivo);
}

// ══════════════════════════════════════════════════════
// GERAÇÃO DE JUSTIFICATIVA DE PREÇOS (TEXTO)
// ══════════════════════════════════════════════════════

export function gerarTextoJustificativa(memorial: MemorialCalculo): string {
  const metodo = LABELS_METODOLOGIA[memorial.metodologia];

  let texto = `JUSTIFICATIVA DE PREÇOS\n\n`;
  texto += `Objeto: ${memorial.descricao_objeto}\n`;
  texto += `Órgão: ${memorial.orgao} — ${memorial.municipio}/${memorial.uf}\n`;
  texto += `Data: ${fmtData(memorial.data_geracao)}\n\n`;

  texto += `1. FUNDAMENTAÇÃO LEGAL\n\n`;
  texto += `${memorial.fundamentacao_legal}\n\n`;

  texto += `2. METODOLOGIA ADOTADA\n\n`;
  texto += `A pesquisa de preços foi realizada utilizando o método da ${metodo}, `;
  texto += `conforme previsto na Instrução Normativa SEGES/ME nº 65, de 7 de julho de 2021. `;
  texto += `Foram consultadas ${memorial.resumo.total_fontes} fonte(s) distintas para a formação `;
  texto += `do preço de referência de ${memorial.resumo.total_itens} item(ns).\n\n`;

  texto += `3. RESUMO\n\n`;
  texto += `Valor total estimado: ${moeda(memorial.resumo.valor_total_estimado)}\n\n`;

  texto += `4. DETALHAMENTO POR ITEM\n\n`;

  for (const item of memorial.itens) {
    const e = item.estatisticas;
    texto += `${item.ordem}. ${item.descricao} (${item.unidade}) — Qtd: ${item.quantidade}\n`;
    texto += `   Preços coletados: ${item.precos_coletados.length} | `;
    texto += `Excluídos: ${item.precos_coletados.filter((p) => p.excluido).length}\n`;
    texto += `   Média: ${moeda(e.media)} | Mediana: ${moeda(e.mediana)} | `;
    texto += `Menor: ${moeda(e.menor_preco)} | CV: ${fmtPercent(e.coeficiente_variacao)}\n`;
    texto += `   → Preço de referência adotado (${metodo}): ${moeda(e.preco_referencia)}\n`;
    texto += `   → Valor total estimado: ${moeda(item.valor_total_estimado)}\n`;

    const excluidos = item.precos_coletados.filter((p) => p.excluido);
    if (excluidos.length > 0) {
      texto += `   EXCLUSÕES:\n`;
      for (const exc of excluidos) {
        texto += `     - ${exc.fonte} (${moeda(exc.valor_unitario)}): ${exc.justificativa_exclusao ?? "Sem justificativa"}\n`;
      }
    }
    texto += `\n`;
  }

  texto += `\n${memorial.municipio}/${memorial.uf}, ${fmtData(memorial.data_geracao)}.\n\n\n`;
  texto += `_______________________________________\n`;
  texto += `${memorial.responsavel}\n`;
  texto += `Responsável pela Pesquisa de Preços\n`;

  return texto;
}

// ── Gerar PDF da justificativa ───────────────────────────
export async function gerarPDFJustificativa(memorial: MemorialCalculo): Promise<void> {
  const { default: jsPDF } = await import("jspdf");

  const doc = new jsPDF("p", "mm", "a4");
  const pageW = doc.internal.pageSize.getWidth();
  const texto = gerarTextoJustificativa(memorial);

  let y = 15;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("JUSTIFICATIVA DE PREÇOS", pageW / 2, y, { align: "center" });
  y += 5;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`${memorial.orgao} — ${memorial.municipio}/${memorial.uf}`, pageW / 2, y, { align: "center" });
  y += 10;

  doc.setFontSize(9);
  const linhas = doc.splitTextToSize(texto, pageW - 28);
  for (const linha of linhas) {
    if (y > 280) {
      doc.addPage();
      y = 15;
    }
    doc.text(linha, 14, y);
    y += 4;
  }

  const nomeArquivo = `justificativa_precos_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(nomeArquivo);
}
