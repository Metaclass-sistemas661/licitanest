// ═══════════════════════════════════════════════════════════════════════════════
// Serviço de Assinatura Eletrônica e PDF de Cotação — Fase 16
// Geração de PDF com dados do fornecedor + assinatura eletrônica
// ═══════════════════════════════════════════════════════════════════════════════
import { api } from "@/lib/api";
import type {
  AssinaturaEletronica,
  CriarAssinaturaDTO,
  RespostaCotacao,
} from "@/tipos";

// ╔══════════════════════════════════════════════════════╗
// ║  1. ASSINATURA ELETRÔNICA                            ║
// ╚══════════════════════════════════════════════════════╝

/**
 * Gerar hash SHA-256 dos dados para integridade.
 */
async function gerarHashDocumento(dados: unknown): Promise<string> {
  const conteudo = JSON.stringify(dados, null, 0);
  const encoder = new TextEncoder();
  const buffer = encoder.encode(conteudo);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Coletar informações do navegador para a assinatura.
 */
function coletarDadosNavegador(): { ip: string; user_agent: string } {
  return {
    ip: "client", // IP real é obtido server-side
    user_agent: navigator.userAgent,
  };
}

/**
 * Criar registro de assinatura eletrônica.
 */
export async function criarAssinaturaEletronica(
  dto: CriarAssinaturaDTO,
): Promise<AssinaturaEletronica> {
  const nav = coletarDadosNavegador();
  const hash = await gerarHashDocumento(dto.dados_assinados);

  const { data } = await api.post<{ data: AssinaturaEletronica }>(
    "/api/assinaturas-eletronicas",
    {
      tipo: dto.tipo,
      referencia_tipo: dto.referencia_tipo,
      referencia_id: dto.referencia_id,
      nome_assinante: dto.nome_assinante,
      cpf_cnpj_assinante: dto.cpf_cnpj_assinante ?? null,
      email_assinante: dto.email_assinante ?? null,
      ip_assinante: nav.ip,
      user_agent: nav.user_agent,
      hash_documento: hash,
      dados_assinados: dto.dados_assinados ?? null,
    },
  );
  return data;
}

/**
 * Buscar assinaturas de uma referência.
 */
export async function buscarAssinaturas(
  referencia_tipo: string,
  referencia_id: string,
): Promise<AssinaturaEletronica[]> {
  const params = new URLSearchParams({
    referencia_tipo,
    referencia_id,
  });
  const { data } = await api.get<{ data: AssinaturaEletronica[] }>(
    `/api/assinaturas-eletronicas?${params.toString()}`,
  );
  return data ?? [];
}

// ╔══════════════════════════════════════════════════════╗
// ║  2. GERAÇÃO DE PDF DA COTAÇÃO                        ║
// ╚══════════════════════════════════════════════════════╝

interface DadosPDFCotacao {
  cotacao: {
    titulo: string;
    descricao?: string;
    data_abertura: string;
    data_encerramento: string;
  };
  entidade_solicitante: string;
  fornecedor: {
    razao_social: string;
    cpf_cnpj?: string;
    email?: string;
    endereco?: string;
    cep?: string;
    cidade?: string;
    uf?: string;
    prazo_validade_dias?: number;
    nome_responsavel?: string;
    cpf_responsavel?: string;
  };
  itens: {
    ordem: number;
    descricao: string;
    unidade: string;
    quantidade: number;
    marca?: string;
    valor_unitario: number;
    valor_total: number;
    registro_anvisa?: string;
    observacoes?: string;
  }[];
  assinatura?: {
    hash: string;
    data: string;
    ip: string;
    user_agent: string;
  };
}

/**
 * Gerar PDF da proposta do fornecedor (cotação).
 * Usa jsPDF + autoTable (lazy loaded).
 */
export async function gerarPDFCotacaoFornecedor(
  dados: DadosPDFCotacao,
): Promise<Blob> {
  // Lazy import para code-splitting
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF("p", "mm", "a4");
  const W = doc.internal.pageSize.getWidth();
  let y = 15;

  // ── Cabeçalho ──
  doc.setFillColor(37, 99, 235); // blue-600
  doc.rect(0, 0, W, 35, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("PROPOSTA DE COTAÇÃO", W / 2, 15, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("LicitaNest — Sistema de Cestas de Preços", W / 2, 22, { align: "center" });
  doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, W / 2, 28, { align: "center" });

  y = 45;
  doc.setTextColor(30, 41, 59); // slate-800

  // ── Dados da Cotação ──
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("DADOS DA COTAÇÃO", 14, y);
  y += 7;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const dadosCotacao = [
    ["Objeto:", dados.cotacao.titulo],
    ["Entidade Solicitante:", dados.entidade_solicitante],
    ["Abertura:", new Date(dados.cotacao.data_abertura).toLocaleDateString("pt-BR")],
    ["Encerramento:", new Date(dados.cotacao.data_encerramento).toLocaleDateString("pt-BR")],
  ];
  if (dados.cotacao.descricao) {
    dadosCotacao.push(["Descrição:", dados.cotacao.descricao]);
  }

  for (const [label, valor] of dadosCotacao) {
    doc.setFont("helvetica", "bold");
    doc.text(label, 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(valor), 50, y);
    y += 5;
  }

  // ── Dados do Fornecedor ──
  y += 5;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("DADOS DO FORNECEDOR", 14, y);
  y += 7;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const dadosForn: [string, string][] = [
    ["Razão Social:", dados.fornecedor.razao_social],
  ];
  if (dados.fornecedor.cpf_cnpj) dadosForn.push(["CPF/CNPJ:", dados.fornecedor.cpf_cnpj]);
  if (dados.fornecedor.email) dadosForn.push(["E-mail:", dados.fornecedor.email]);
  if (dados.fornecedor.endereco) dadosForn.push(["Endereço:", dados.fornecedor.endereco]);
  if (dados.fornecedor.cep) dadosForn.push(["CEP:", dados.fornecedor.cep]);
  if (dados.fornecedor.cidade && dados.fornecedor.uf) {
    dadosForn.push(["Cidade/UF:", `${dados.fornecedor.cidade}/${dados.fornecedor.uf}`]);
  }
  if (dados.fornecedor.prazo_validade_dias) {
    dadosForn.push(["Prazo de Validade:", `${dados.fornecedor.prazo_validade_dias} dias`]);
  }
  if (dados.fornecedor.nome_responsavel) dadosForn.push(["Responsável:", dados.fornecedor.nome_responsavel]);
  if (dados.fornecedor.cpf_responsavel) dadosForn.push(["CPF Responsável:", dados.fornecedor.cpf_responsavel]);

  for (const [label, valor] of dadosForn) {
    doc.setFont("helvetica", "bold");
    doc.text(label, 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(valor, 50, y);
    y += 5;
  }

  // ── Tabela de Itens ──
  y += 8;

  const colunas = [
    { header: "#", dataKey: "ordem" },
    { header: "Descrição", dataKey: "descricao" },
    { header: "Un.", dataKey: "unidade" },
    { header: "Qtd.", dataKey: "quantidade" },
    { header: "Marca", dataKey: "marca" },
    { header: "Vl. Unit.", dataKey: "valor_unitario" },
    { header: "Vl. Total", dataKey: "valor_total" },
  ];

  // Adicionar coluna ANVISA se necessário
  const temAnvisa = dados.itens.some((i) => i.registro_anvisa);
  if (temAnvisa) {
    colunas.splice(5, 0, { header: "Reg. ANVISA", dataKey: "registro_anvisa" });
  }

  const linhas = dados.itens.map((item) => ({
    ordem: item.ordem,
    descricao: item.descricao,
    unidade: item.unidade,
    quantidade: item.quantidade,
    marca: item.marca ?? "—",
    valor_unitario: formatarMoeda(item.valor_unitario),
    valor_total: formatarMoeda(item.valor_total),
    registro_anvisa: item.registro_anvisa ?? "—",
    observacoes: item.observacoes ?? "",
  }));

  autoTable(doc, {
    startY: y,
    columns: colunas,
    body: linhas,
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8,
    },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      ordem: { cellWidth: 10, halign: "center" },
      descricao: { cellWidth: 55 },
      unidade: { cellWidth: 12, halign: "center" },
      quantidade: { cellWidth: 15, halign: "center" },
      marca: { cellWidth: 25 },
      valor_unitario: { cellWidth: 22, halign: "right" },
      valor_total: { cellWidth: 22, halign: "right" },
    },
    margin: { left: 14, right: 14 },
  });

  // Total geral
  const totalGeral = dados.itens.reduce((sum, i) => sum + i.valor_total, 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 5;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`VALOR TOTAL: ${formatarMoeda(totalGeral)}`, W - 14, y, { align: "right" });

  // ── Observações ──
  const comObs = dados.itens.filter((i) => i.observacoes);
  if (comObs.length > 0) {
    y += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("OBSERVAÇÕES POR ITEM", 14, y);
    y += 6;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    for (const item of comObs) {
      doc.text(`Item ${item.ordem}: ${item.observacoes}`, 14, y);
      y += 4;
      if (y > 270) { doc.addPage(); y = 15; }
    }
  }

  // ── Assinatura Eletrônica ──
  if (dados.assinatura) {
    // Se necessário, nova página
    if (y > 235) { doc.addPage(); y = 15; }

    y += 10;
    doc.setDrawColor(226, 232, 240);
    doc.line(14, y, W - 14, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("ASSINATURA ELETRÔNICA", 14, y);
    y += 7;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139); // slate-500

    const assinInfo = [
      `Assinado digitalmente em: ${new Date(dados.assinatura.data).toLocaleString("pt-BR")}`,
      `Hash SHA-256: ${dados.assinatura.hash.slice(0, 32)}...${dados.assinatura.hash.slice(-8)}`,
      `IP de origem: ${dados.assinatura.ip}`,
      `Agente: ${dados.assinatura.user_agent.slice(0, 80)}`,
      "",
      "Este documento possui assinatura eletrônica conforme Medida Provisória nº 2.200-2/2001",
      "e possui validade jurídica quando as partes concordam com sua utilização.",
    ];

    for (const line of assinInfo) {
      doc.text(line, 14, y);
      y += 4;
    }
  }

  return doc.output("blob");
}

// ╔══════════════════════════════════════════════════════╗
// ║  3. GERAR PDF A PARTIR DE DADOS DO PORTAL            ║
// ╚══════════════════════════════════════════════════════╝

/**
 * Conveniência: montar dados e gerar PDF a partir das respostas do portal.
 */
export async function gerarPDFRespostaPortal(
  fornecedorId: string,
  cotacaoTitulo: string,
  cotacaoDescricao: string | undefined,
  cotacaoDataAbertura: string,
  cotacaoDataEncerramento: string,
  entidadeSolicitante: string,
  fornecedorDados: {
    razao_social: string;
    cpf_cnpj?: string;
    email?: string;
    endereco?: string;
    cep?: string;
    cidade?: string;
    uf?: string;
    prazo_validade_dias?: number;
    nome_responsavel?: string;
    cpf_responsavel?: string;
  },
  respostas: (RespostaCotacao & { item_descricao: string; item_unidade: string; item_quantidade: number })[],
): Promise<{ blob: Blob; assinatura: AssinaturaEletronica }> {
  // 1) Criar assinatura
  const dadosAssinados = {
    fornecedor: fornecedorDados,
    respostas: respostas.map((r) => ({
      item: r.item_descricao,
      marca: r.marca,
      valor_unitario: r.valor_unitario,
      valor_total: r.valor_total,
    })),
    total: respostas.reduce((s, r) => s + (r.valor_total ?? r.valor_unitario * r.item_quantidade), 0),
    data: new Date().toISOString(),
  };

  const assinatura = await criarAssinaturaEletronica({
    tipo: "cotacao_resposta",
    referencia_tipo: "cotacao_fornecedor",
    referencia_id: fornecedorId,
    nome_assinante: fornecedorDados.nome_responsavel ?? fornecedorDados.razao_social,
    cpf_cnpj_assinante: fornecedorDados.cpf_responsavel ?? fornecedorDados.cpf_cnpj,
    email_assinante: fornecedorDados.email,
    dados_assinados: dadosAssinados,
  });

  // 2) Gerar PDF
  const blob = await gerarPDFCotacaoFornecedor({
    cotacao: {
      titulo: cotacaoTitulo,
      descricao: cotacaoDescricao,
      data_abertura: cotacaoDataAbertura,
      data_encerramento: cotacaoDataEncerramento,
    },
    entidade_solicitante: entidadeSolicitante,
    fornecedor: fornecedorDados,
    itens: respostas.map((r, idx) => ({
      ordem: idx + 1,
      descricao: r.item_descricao,
      unidade: r.item_unidade,
      quantidade: r.item_quantidade,
      marca: r.marca ?? undefined,
      valor_unitario: r.valor_unitario,
      valor_total: r.valor_total ?? r.valor_unitario * r.item_quantidade,
      registro_anvisa: r.registro_anvisa ?? undefined,
      observacoes: r.observacoes ?? undefined,
    })),
    assinatura: {
      hash: assinatura.hash_documento ?? "",
      data: assinatura.assinado_em,
      ip: assinatura.ip_assinante ?? "N/A",
      user_agent: assinatura.user_agent ?? "N/A",
    },
  });

  return { blob, assinatura };
}

// ── Helper ──
function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
