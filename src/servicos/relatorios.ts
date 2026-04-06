// ═══════════════════════════════════════════════════════════════════════════════
// Serviço de Relatórios — Fase 11
// Geração de Mapa de Apuração, Relatório de Fontes e Correção Monetária
// Formatos: PDF (jspdf + autotable) e Excel (exceljs)
// ═══════════════════════════════════════════════════════════════════════════════
import { api } from "@/lib/api";
import type {
  ConfigRelatorio,
  CabecalhoRelatorio,
  LinhaMapaApuracao,
  LinhaRelatorioFontes,
  LinhaRelatorioCorrecao,
  ItemCesta,
  RelatorioGerado,
  TipoRelatorio,
  FormatoExportacao,
} from "@/tipos";

// ╔══════════════════════════════════════════════════════╗
// ║  1. COLETA DE DADOS                                  ║
// ╚══════════════════════════════════════════════════════╝

/** Montar linhas do Mapa de Apuração a partir dos itens da cesta */
export function montarLinhasMapaApuracao(
  itens: ItemCesta[],
  incluirExcluidos = true,
): LinhaMapaApuracao[] {
  return itens.map((item) => {
    const precos = (item.precos ?? []).filter(
      (p) => incluirExcluidos || !p.excluido_calculo,
    );

    const precosAtivos = precos.filter((p) => !p.excluido_calculo);
    const valores = precosAtivos.map((p) => p.valor_corrigido ?? p.valor_unitario);
    const media = valores.length > 0 ? valores.reduce((a, b) => a + b, 0) / valores.length : null;
    const mediana = valores.length > 0 ? calcMediana(valores) : null;
    const menor = valores.length > 0 ? Math.min(...valores) : null;

    return {
      item_id: item.id,
      ordem: item.ordem,
      descricao: item.produto?.descricao ?? "Item sem descrição",
      unidade: item.produto?.unidade_medida?.sigla ?? "UN",
      quantidade: item.quantidade,
      precos_por_fonte: precos.map((p) => ({
        fonte_nome: p.fonte?.nome ?? "Fonte desconhecida",
        fonte_sigla: p.fonte?.sigla ?? "??",
        valor_unitario: p.valor_unitario,
        valor_corrigido: p.valor_corrigido,
        orgao: p.orgao,
        data_referencia: p.data_referencia,
        excluido: p.excluido_calculo,
        justificativa_exclusao: p.justificativa_exclusao,
        documento_url: p.documento_url,
      })),
      media,
      mediana,
      menor_preco: menor,
      valor_total: media != null ? media * item.quantidade : null,
    } satisfies LinhaMapaApuracao;
  });
}

/** Montar linhas do Relatório de Fontes */
export function montarLinhasRelatorioFontes(itens: ItemCesta[]): LinhaRelatorioFontes[] {
  const mapaFontes = new Map<string, LinhaRelatorioFontes>();

  for (const item of itens) {
    for (const preco of item.precos ?? []) {
      const fonteId = preco.fonte_id;
      const fonte = preco.fonte;
      if (!mapaFontes.has(fonteId)) {
        mapaFontes.set(fonteId, {
          fonte_nome: fonte?.nome ?? "Fonte desconhecida",
          fonte_sigla: fonte?.sigla ?? "??",
          tipo: fonte?.tipo ?? "pncp",
          total_precos: 0,
          itens_atendidos: [],
          documentos: [],
        });
      }
      const entry = mapaFontes.get(fonteId)!;
      entry.total_precos++;
      const desc = item.produto?.descricao ?? item.id;
      if (!entry.itens_atendidos.includes(desc)) {
        entry.itens_atendidos.push(desc);
      }
      if (preco.documento_url) {
        const jaExiste = entry.documentos.some((d) => d.storage_path === preco.documento_url);
        if (!jaExiste) {
          entry.documentos.push({
            nome_arquivo: preco.documento_url.split("/").pop() ?? "documento",
            storage_path: preco.documento_url,
            tamanho_bytes: null,
          });
        }
      }
    }
  }

  return Array.from(mapaFontes.values()).sort((a, b) => b.total_precos - a.total_precos);
}

/** Montar linhas do Relatório de Correção Monetária */
export function montarLinhasRelatorioCorrecao(itens: ItemCesta[]): LinhaRelatorioCorrecao[] {
  const linhas: LinhaRelatorioCorrecao[] = [];

  for (const item of itens) {
    for (const preco of item.precos ?? []) {
      if (preco.valor_corrigido != null && preco.valor_corrigido !== preco.valor_unitario) {
        const diferenca = preco.valor_corrigido - preco.valor_unitario;
        const percentual = preco.valor_unitario > 0
          ? (diferenca / preco.valor_unitario) * 100
          : 0;
        linhas.push({
          item_descricao: item.produto?.descricao ?? "Item",
          fonte_nome: preco.fonte?.nome ?? "Fonte",
          orgao: preco.orgao,
          valor_original: preco.valor_unitario,
          indice_utilizado: "IPCA", // inferido do uso
          periodo: formatarPeriodo(preco.data_referencia),
          percentual_acumulado: Number(percentual.toFixed(4)),
          valor_correcao: Number(diferenca.toFixed(2)),
          valor_corrigido: preco.valor_corrigido,
        });
      }
    }
  }

  return linhas;
}

// ╔══════════════════════════════════════════════════════╗
// ║  2. GERAÇÃO PDF                                      ║
// ╚══════════════════════════════════════════════════════╝

async function gerarPDF(
  config: ConfigRelatorio,
  itens: ItemCesta[],
  cabecalho: CabecalhoRelatorio,
): Promise<Blob> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // ── Cabeçalho institucional ──
  const renderCabecalho = () => {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(cabecalho.nome_orgao.toUpperCase(), pageWidth / 2, 15, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`${cabecalho.nome_municipio} — ${cabecalho.uf}`, pageWidth / 2, 21, { align: "center" });
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");

    const tituloMap: Record<TipoRelatorio, string> = {
      mapa_apuracao: "MAPA DE APURAÇÃO DE PREÇOS",
      fontes_precos: "RELATÓRIO DE FONTES DE PREÇOS",
      correcao_monetaria: "RELATÓRIO DE CORREÇÃO MONETÁRIA",
    };
    doc.text(tituloMap[config.tipo], pageWidth / 2, 30, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Objeto: ${cabecalho.objeto}`, 14, 38);
    doc.text(`Data: ${fmtData(cabecalho.data_geracao)}`, pageWidth - 14, 38, { align: "right" });
    doc.text(`Responsável: ${cabecalho.servidor_nome}${cabecalho.servidor_cargo ? ` — ${cabecalho.servidor_cargo}` : ""}`, 14, 43);
  };

  renderCabecalho();

  if (config.tipo === "mapa_apuracao") {
    const linhas = montarLinhasMapaApuracao(itens, config.incluir_excluidos ?? true);
    renderMapaApuracaoPDF(doc, linhas, autoTable);
  } else if (config.tipo === "fontes_precos") {
    const linhas = montarLinhasRelatorioFontes(itens);
    renderFontesPDF(doc, linhas, autoTable);
  } else if (config.tipo === "correcao_monetaria") {
    const linhas = montarLinhasRelatorioCorrecao(itens);
    renderCorrecaoPDF(doc, linhas, autoTable);
  }

  // Rodapé em todas as páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text(
      `LicitaNest — Gerado em ${fmtDataHora(new Date().toISOString())} — Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" },
    );
  }

  return doc.output("blob");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderMapaApuracaoPDF(doc: any, linhas: LinhaMapaApuracao[], autoTable: any) {
  // Coletar todas as fontes únicas para colunas dinâmicas
  const fontesUnicas = new Map<string, string>();
  for (const l of linhas) {
    for (const p of l.precos_por_fonte) {
      if (!fontesUnicas.has(p.fonte_sigla)) {
        fontesUnicas.set(p.fonte_sigla, p.fonte_nome);
      }
    }
  }
  const fontesColunas = Array.from(fontesUnicas.entries()); // [sigla, nome]

  const head = [
    [
      { content: "#", styles: { halign: "center" as const } },
      "Descrição do Item",
      "Un.",
      { content: "Qtd.", styles: { halign: "right" as const } },
      ...fontesColunas.map(([sigla]) => ({
        content: sigla,
        styles: { halign: "right" as const },
      })),
      { content: "Média", styles: { halign: "right" as const } },
      { content: "Mediana", styles: { halign: "right" as const } },
      { content: "Menor", styles: { halign: "right" as const } },
      { content: "Total (Média × Qtd)", styles: { halign: "right" as const } },
    ],
  ];

  const body = linhas.map((l) => {
    const precosPorSigla = new Map(l.precos_por_fonte.map((p) => [p.fonte_sigla, p]));
    return [
      { content: String(l.ordem), styles: { halign: "center" as const } },
      l.descricao.length > 50 ? l.descricao.substring(0, 50) + "…" : l.descricao,
      l.unidade,
      { content: String(l.quantidade), styles: { halign: "right" as const } },
      ...fontesColunas.map(([sigla]) => {
        const p = precosPorSigla.get(sigla);
        if (!p) return { content: "—", styles: { halign: "right" as const } };
        const valor = p.valor_corrigido ?? p.valor_unitario;
        const texto = moeda(valor);
        if (p.excluido) {
          return {
            content: texto,
            styles: {
              halign: "right" as const,
              textColor: [150, 150, 150] as [number, number, number],
              fontStyle: "italic" as const,
            },
          };
        }
        return { content: texto, styles: { halign: "right" as const } };
      }),
      { content: moeda(l.media), styles: { halign: "right" as const, fontStyle: "bold" as const } },
      { content: moeda(l.mediana), styles: { halign: "right" as const } },
      { content: moeda(l.menor_preco), styles: { halign: "right" as const } },
      { content: moeda(l.valor_total), styles: { halign: "right" as const, fontStyle: "bold" as const } },
    ];
  });

  // Linha totalizadora
  const totalGeral = linhas.reduce((s, l) => s + (l.valor_total ?? 0), 0);
  const linhaTotal = [
    { content: "", colSpan: 3 + fontesColunas.length + 3 },
    { content: "TOTAL GERAL:", styles: { halign: "right" as const, fontStyle: "bold" as const } },
    { content: moeda(totalGeral), styles: { halign: "right" as const, fontStyle: "bold" as const, fillColor: [230, 240, 255] as [number, number, number] } },
  ];
  body.push(linhaTotal as typeof body[0]);

  autoTable(doc, {
    startY: 48,
    head,
    body,
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [41, 65, 122], textColor: 255, fontStyle: "bold", fontSize: 7 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 8, right: 8 },
    tableWidth: "auto",
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderFontesPDF(doc: any, linhas: LinhaRelatorioFontes[], autoTable: any) {
  const head = [["Fonte", "Sigla", "Tipo", "Preços", "Itens Atendidos", "Documentos"]];
  const body = linhas.map((l) => [
    l.fonte_nome,
    l.fonte_sigla,
    l.tipo.toUpperCase().replace("_", " "),
    String(l.total_precos),
    l.itens_atendidos.length <= 3
      ? l.itens_atendidos.join(", ")
      : `${l.itens_atendidos.slice(0, 3).join(", ")} +${l.itens_atendidos.length - 3}`,
    l.documentos.length > 0 ? `${l.documentos.length} doc(s)` : "—",
  ]);

  autoTable(doc, {
    startY: 48,
    head,
    body,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [41, 65, 122], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 14, right: 14 },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderCorrecaoPDF(doc: any, linhas: LinhaRelatorioCorrecao[], autoTable: any) {
  const head = [[
    "Item", "Fonte", "Órgão", "Valor Original",
    "Índice", "Período", "% Acumulado",
    "Valor Correção", "Valor Corrigido",
  ]];
  const body = linhas.map((l) => [
    l.item_descricao.length > 35 ? l.item_descricao.substring(0, 35) + "…" : l.item_descricao,
    l.fonte_nome.length > 20 ? l.fonte_nome.substring(0, 20) + "…" : l.fonte_nome,
    l.orgao ?? "—",
    moeda(l.valor_original),
    l.indice_utilizado,
    l.periodo,
    `${l.percentual_acumulado.toFixed(2)}%`,
    moeda(l.valor_correcao),
    moeda(l.valor_corrigido),
  ]);

  autoTable(doc, {
    startY: 48,
    head,
    body,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [41, 65, 122], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 14, right: 14 },
  });
}

// ╔══════════════════════════════════════════════════════╗
// ║  3. GERAÇÃO EXCEL (XLSX)                             ║
// ╚══════════════════════════════════════════════════════╝

async function gerarExcel(
  config: ConfigRelatorio,
  itens: ItemCesta[],
  cabecalho: CabecalhoRelatorio,
): Promise<Blob> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "LicitaNest";
  workbook.created = new Date();

  if (config.tipo === "mapa_apuracao") {
    const linhas = montarLinhasMapaApuracao(itens, config.incluir_excluidos ?? true);
    renderMapaApuracaoExcel(workbook, linhas, cabecalho);
  } else if (config.tipo === "fontes_precos") {
    const linhas = montarLinhasRelatorioFontes(itens);
    renderFontesExcel(workbook, linhas, cabecalho);
  } else if (config.tipo === "correcao_monetaria") {
    const linhas = montarLinhasRelatorioCorrecao(itens);
    renderCorrecaoExcel(workbook, linhas, cabecalho);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderMapaApuracaoExcel(workbook: any, linhas: LinhaMapaApuracao[], cabecalho: CabecalhoRelatorio) {
  const ws = workbook.addWorksheet("Mapa de Apuração");

  // ── Cabeçalho institucional ──
  const fontesUnicas = new Map<string, string>();
  for (const l of linhas) {
    for (const p of l.precos_por_fonte) {
      if (!fontesUnicas.has(p.fonte_sigla)) fontesUnicas.set(p.fonte_sigla, p.fonte_nome);
    }
  }
  const fontesColunas = Array.from(fontesUnicas.entries());
  const totalCols = 4 + fontesColunas.length + 4; // #, Desc, Un, Qtd, ...fontes, média, mediana, menor, total

  // Cabeçalho institucional
  ws.mergeCells(1, 1, 1, totalCols);
  const celTitulo = ws.getCell(1, 1);
  celTitulo.value = cabecalho.nome_orgao.toUpperCase();
  celTitulo.font = { bold: true, size: 14 };
  celTitulo.alignment = { horizontal: "center" };

  ws.mergeCells(2, 1, 2, totalCols);
  const celMunicipio = ws.getCell(2, 1);
  celMunicipio.value = `${cabecalho.nome_municipio} — ${cabecalho.uf}`;
  celMunicipio.alignment = { horizontal: "center" };

  ws.mergeCells(3, 1, 3, totalCols);
  const celTipo = ws.getCell(3, 1);
  celTipo.value = "MAPA DE APURAÇÃO DE PREÇOS";
  celTipo.font = { bold: true, size: 12 };
  celTipo.alignment = { horizontal: "center" };

  ws.mergeCells(4, 1, 4, totalCols);
  ws.getCell(4, 1).value = `Objeto: ${cabecalho.objeto}`;

  ws.mergeCells(5, 1, 5, totalCols);
  ws.getCell(5, 1).value = `Data: ${fmtData(cabecalho.data_geracao)} | Responsável: ${cabecalho.servidor_nome}`;

  // ── Cabeçalho da tabela (linha 7) ──
  const headerRow = 7;
  const headers = ["#", "Descrição do Item", "Un.", "Qtd.", ...fontesColunas.map(([s]) => s), "Média", "Mediana", "Menor", "Total"];
  headers.forEach((h, i) => {
    const cell = ws.getCell(headerRow, i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF29417A" } };
    cell.border = borderThin();
    cell.alignment = { horizontal: i >= 3 ? "right" : "left", vertical: "middle" };
  });

  // ── Dados ──
  let row = headerRow + 1;
  for (const l of linhas) {
    const precosPorSigla = new Map(l.precos_por_fonte.map((p) => [p.fonte_sigla, p]));
    const rowData = [
      l.ordem,
      l.descricao,
      l.unidade,
      l.quantidade,
      ...fontesColunas.map(([sigla]) => {
        const p = precosPorSigla.get(sigla);
        return p ? (p.valor_corrigido ?? p.valor_unitario) : null;
      }),
      l.media,
      l.mediana,
      l.menor_preco,
      l.valor_total,
    ];
    rowData.forEach((val, i) => {
      const cell = ws.getCell(row, i + 1);
      cell.value = val;
      cell.border = borderThin();
      if (i >= 3) {
        cell.numFmt = '#,##0.00';
        cell.alignment = { horizontal: "right" };
      }
      // Preço excluído: cinza + itálico
      if (i >= 4 && i < 4 + fontesColunas.length) {
        const sigla = fontesColunas[i - 4][0];
        const p = precosPorSigla.get(sigla);
        if (p?.excluido) {
          cell.font = { italic: true, color: { argb: "FF999999" }, strike: true };
        }
      }
    });
    // Zebra
    if (row % 2 === 0) {
      for (let c = 1; c <= totalCols; c++) {
        const cell = ws.getCell(row, c);
        if (!cell.fill || (cell.fill as any).fgColor?.argb !== "FF29417A") {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F7FA" } };
        }
      }
    }
    row++;
  }

  // ── Linha totalizadora ──
  const totalGeral = linhas.reduce((s, l) => s + (l.valor_total ?? 0), 0);
  ws.mergeCells(row, 1, row, totalCols - 1);
  ws.getCell(row, 1).value = "TOTAL GERAL";
  ws.getCell(row, 1).font = { bold: true };
  ws.getCell(row, 1).alignment = { horizontal: "right" };
  ws.getCell(row, 1).border = borderThin();
  const celTotal = ws.getCell(row, totalCols);
  celTotal.value = totalGeral;
  celTotal.numFmt = '#,##0.00';
  celTotal.font = { bold: true };
  celTotal.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6F0FF" } };
  celTotal.border = borderThin();

  // Fórmula nativa: SOMA da coluna Total
  const colLetra = colToLetter(totalCols);
  celTotal.value = { formula: `SUM(${colLetra}${headerRow + 1}:${colLetra}${row - 1})` };

  // Fórmulas MÉDIA para cada linha
  for (let r = headerRow + 1; r < row; r++) {
    const mediaCol = 4 + fontesColunas.length + 1; // coluna "Média"
    const primeiraFonteCol = colToLetter(5); // coluna E
    const ultimaFonteCol = colToLetter(4 + fontesColunas.length);
    ws.getCell(r, mediaCol).value = {
      formula: `IF(COUNT(${primeiraFonteCol}${r}:${ultimaFonteCol}${r})>0,AVERAGE(${primeiraFonteCol}${r}:${ultimaFonteCol}${r}),"")`,
    };
    ws.getCell(r, mediaCol).numFmt = '#,##0.00';
  }

  // Ajustar larguras
  ws.getColumn(1).width = 5;
  ws.getColumn(2).width = 40;
  ws.getColumn(3).width = 6;
  ws.getColumn(4).width = 8;
  for (let i = 5; i <= 4 + fontesColunas.length; i++) ws.getColumn(i).width = 14;
  for (let i = 4 + fontesColunas.length + 1; i <= totalCols; i++) ws.getColumn(i).width = 14;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderFontesExcel(workbook: any, linhas: LinhaRelatorioFontes[], cabecalho: CabecalhoRelatorio) {
  const ws = workbook.addWorksheet("Fontes de Preços");

  ws.mergeCells(1, 1, 1, 6);
  ws.getCell(1, 1).value = `${cabecalho.nome_orgao} — RELATÓRIO DE FONTES DE PREÇOS`;
  ws.getCell(1, 1).font = { bold: true, size: 13 };

  ws.mergeCells(2, 1, 2, 6);
  ws.getCell(2, 1).value = `Objeto: ${cabecalho.objeto} | Data: ${fmtData(cabecalho.data_geracao)}`;

  const headers = ["Fonte", "Sigla", "Tipo", "Total de Preços", "Itens Atendidos", "Documentos"];
  headers.forEach((h, i) => {
    const cell = ws.getCell(4, i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF29417A" } };
    cell.border = borderThin();
  });

  linhas.forEach((l, idx) => {
    const r = 5 + idx;
    ws.getCell(r, 1).value = l.fonte_nome;
    ws.getCell(r, 2).value = l.fonte_sigla;
    ws.getCell(r, 3).value = l.tipo.toUpperCase().replace("_", " ");
    ws.getCell(r, 4).value = l.total_precos;
    ws.getCell(r, 5).value = l.itens_atendidos.join(", ");
    ws.getCell(r, 6).value = l.documentos.length > 0 ? `${l.documentos.length} doc(s)` : "Nenhum";
    for (let c = 1; c <= 6; c++) ws.getCell(r, c).border = borderThin();
  });

  ws.getColumn(1).width = 30;
  ws.getColumn(2).width = 10;
  ws.getColumn(3).width = 18;
  ws.getColumn(4).width = 14;
  ws.getColumn(5).width = 45;
  ws.getColumn(6).width = 14;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderCorrecaoExcel(workbook: any, linhas: LinhaRelatorioCorrecao[], cabecalho: CabecalhoRelatorio) {
  const ws = workbook.addWorksheet("Correção Monetária");

  ws.mergeCells(1, 1, 1, 9);
  ws.getCell(1, 1).value = `${cabecalho.nome_orgao} — RELATÓRIO DE CORREÇÃO MONETÁRIA`;
  ws.getCell(1, 1).font = { bold: true, size: 13 };

  ws.mergeCells(2, 1, 2, 9);
  ws.getCell(2, 1).value = `Objeto: ${cabecalho.objeto} | Data: ${fmtData(cabecalho.data_geracao)}`;

  const headers = ["Item", "Fonte", "Órgão", "Valor Original", "Índice", "Período", "% Acumulado", "Valor Correção", "Valor Corrigido"];
  headers.forEach((h, i) => {
    const cell = ws.getCell(4, i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF29417A" } };
    cell.border = borderThin();
  });

  linhas.forEach((l, idx) => {
    const r = 5 + idx;
    ws.getCell(r, 1).value = l.item_descricao;
    ws.getCell(r, 2).value = l.fonte_nome;
    ws.getCell(r, 3).value = l.orgao ?? "—";
    ws.getCell(r, 4).value = l.valor_original;
    ws.getCell(r, 4).numFmt = '#,##0.00';
    ws.getCell(r, 5).value = l.indice_utilizado;
    ws.getCell(r, 6).value = l.periodo;
    ws.getCell(r, 7).value = l.percentual_acumulado / 100;
    ws.getCell(r, 7).numFmt = '0.00%';
    ws.getCell(r, 8).value = l.valor_correcao;
    ws.getCell(r, 8).numFmt = '#,##0.00';
    ws.getCell(r, 9).value = l.valor_corrigido;
    ws.getCell(r, 9).numFmt = '#,##0.00';
    for (let c = 1; c <= 9; c++) ws.getCell(r, c).border = borderThin();
  });

  [25, 22, 18, 14, 10, 18, 12, 14, 14].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
}

// ╔══════════════════════════════════════════════════════╗
// ║  4. ORQUESTRADOR PRINCIPAL                           ║
// ╚══════════════════════════════════════════════════════╝

/** Gerar relatório (PDF ou XLSX) e retornar Blob + nome do arquivo */
export async function gerarRelatorio(
  config: ConfigRelatorio,
  itens: ItemCesta[],
  cabecalho: CabecalhoRelatorio,
): Promise<{ blob: Blob; nomeArquivo: string }> {
  const sufixoMap: Record<TipoRelatorio, string> = {
    mapa_apuracao: "mapa_apuracao",
    fontes_precos: "fontes_precos",
    correcao_monetaria: "correcao_monetaria",
  };
  const extensao = config.formato === "pdf" ? "pdf" : "xlsx";
  const nomeArquivo = `${sufixoMap[config.tipo]}_${fmtDataArquivo(new Date())}.${extensao}`;

  const blob = config.formato === "pdf"
    ? await gerarPDF(config, itens, cabecalho)
    : await gerarExcel(config, itens, cabecalho);

  return { blob, nomeArquivo };
}

/** Gerar relatório, disparar download e registrar log */
export async function gerarEBaixarRelatorio(
  config: ConfigRelatorio,
  itens: ItemCesta[],
  cabecalho: CabecalhoRelatorio,
  servidorId: string,
): Promise<void> {
  const { blob, nomeArquivo } = await gerarRelatorio(config, itens, cabecalho);

  // Download imediato
  const { saveAs } = await import("file-saver");
  saveAs(blob, nomeArquivo);

  // Registrar log no banco
  await registrarRelatorioGerado({
    cesta_id: config.cesta_id,
    tipo: config.tipo,
    formato: config.formato,
    nome_arquivo: nomeArquivo,
    tamanho_bytes: blob.size,
    gerado_por: servidorId,
  });
}

/** Listar relatórios gerados para uma cesta */
export async function listarRelatoriosGerados(cestaId: string): Promise<RelatorioGerado[]> {
  const { data } = await api.get<{ data: RelatorioGerado[] }>(`/api/relatorios?cesta_id=${cestaId}`);
  return (data ?? []) as RelatorioGerado[];
}

async function registrarRelatorioGerado(params: {
  cesta_id: string;
  tipo: TipoRelatorio;
  formato: FormatoExportacao;
  nome_arquivo: string;
  tamanho_bytes: number;
  gerado_por: string;
}) {
  try {
    await api.post("/api/relatorios", {
      ...params,
      gerado_em: new Date().toISOString(),
    });
  } catch {
    // Silently fail — log is not critical
    console.warn("Falha ao registrar log de relatório gerado");
  }
}

// ╔══════════════════════════════════════════════════════╗
// ║  5. UTILITÁRIOS                                      ║
// ╚══════════════════════════════════════════════════════╝

function moeda(valor: number | null): string {
  if (valor == null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(d: string): string {
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function fmtDataHora(d: string): string {
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtDataArquivo(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function formatarPeriodo(dataRef: string): string {
  const d = new Date(dataRef);
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const hoje = new Date();
  return `${meses[d.getMonth()]}/${d.getFullYear()} — ${meses[hoje.getMonth()]}/${hoje.getFullYear()}`;
}

function calcMediana(valores: number[]): number {
  const sorted = [...valores].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function borderThin() {
  const side = { style: "thin" as const, color: { argb: "FFD0D0D0" } };
  return { top: side, bottom: side, left: side, right: side };
}

function colToLetter(col: number): string {
  let letter = "";
  let c = col;
  while (c > 0) {
    const mod = (c - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    c = Math.floor((c - 1) / 26);
  }
  return letter;
}
