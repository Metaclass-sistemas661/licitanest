// Serviço de Importação em Lote — CSV/Excel para preços, produtos, fornecedores, ARP
import { api } from "@/lib/api";
import type { ImportacaoLote, TipoImportacao } from "@/tipos";

// ══════════════════════════════════════════════════════
// PARSER CSV
// ══════════════════════════════════════════════════════

export interface LinhaCSV {
  [campo: string]: string;
}

export function parseCSV(conteudo: string): LinhaCSV[] {
  const linhas = conteudo.split(/\r?\n/).filter((l) => l.trim());
  if (linhas.length < 2) return [];

  // Detectar separador (ponto-e-vírgula é comum no Brasil)
  const primeiraLinha = linhas[0];
  const separador = primeiraLinha.includes(";") ? ";" : ",";

  const cabecalho = linhas[0].split(separador).map((h) => h.trim().replace(/^"|"$/g, ""));
  const resultado: LinhaCSV[] = [];

  for (let i = 1; i < linhas.length; i++) {
    const valores = linhas[i].split(separador).map((v) => v.trim().replace(/^"|"$/g, ""));
    const obj: LinhaCSV = {};
    for (let j = 0; j < cabecalho.length; j++) {
      obj[cabecalho[j]] = valores[j] ?? "";
    }
    resultado.push(obj);
  }

  return resultado;
}

// ══════════════════════════════════════════════════════
// IMPORTAÇÃO DE PREÇOS
// ══════════════════════════════════════════════════════

/**
 * Campos esperados no CSV de preços:
 * descricao_item | fonte | orgao | valor_unitario | data_referencia | unidade | cnpj_orgao | documento_url
 */
export async function importarPrecosCSV(
  cestaId: string,
  conteudo: string,
  servidorId: string,
): Promise<ImportacaoLote> {
  const linhas = parseCSV(conteudo);

  // Enviar para a API processar
  const { data } = await api.post<{ data: ImportacaoLote }>("/api/importacao/precos", {
    cesta_id: cestaId,
    conteudo_csv: conteudo,
    servidor_id: servidorId,
    total_linhas: linhas.length,
  });

  return data as ImportacaoLote;
}

// ══════════════════════════════════════════════════════
// IMPORTAÇÃO DE FORNECEDORES
// ══════════════════════════════════════════════════════

/**
 * Campos esperados: razao_social | cpf_cnpj | email | telefone | cidade | uf | cep
 */
export async function importarFornecedoresCSV(
  conteudo: string,
  servidorId: string,
): Promise<ImportacaoLote> {
  const linhas = parseCSV(conteudo);

  // Enviar para a API processar
  const { data } = await api.post<{ data: ImportacaoLote }>("/api/importacao/fornecedores", {
    conteudo_csv: conteudo,
    servidor_id: servidorId,
    total_linhas: linhas.length,
  });

  return data as ImportacaoLote;
}

// ══════════════════════════════════════════════════════
// MODELO DE CSV / TEMPLATE
// ══════════════════════════════════════════════════════

export const TEMPLATES_CSV: Record<TipoImportacao, { cabecalho: string; exemplo: string }> = {
  precos: {
    cabecalho: "descricao_item;valor_unitario;data_referencia;orgao;fonte;cnpj_orgao;documento_url",
    exemplo: 'Arroz tipo 1 5kg;25,90;2025-01-15;Prefeitura de BH;Cotação Direta;18.715.383/0001-50;',
  },
  fornecedores: {
    cabecalho: "razao_social;cpf_cnpj;email;telefone;cidade;uf;cep",
    exemplo: "Distribuidora ABC Ltda;12.345.678/0001-90;contato@abc.com;(31)3333-4444;Belo Horizonte;MG;30130-000",
  },
  produtos: {
    cabecalho: "descricao;categoria;unidade_medida;codigo_catmat",
    exemplo: "Arroz tipo 1, pacote 5kg;Gêneros Alimentícios;kg;123456",
  },
  catmat: {
    cabecalho: "codigo;descricao;tipo;grupo;classe;unidade_fornecimento;sustentavel",
    exemplo: "428792;Arroz tipo 1, pacote 5kg;material;Gêneros Alimentícios;Cereais;KG;false",
  },
  arp: {
    cabecalho: "numero_ata;orgao;descricao_item;valor_unitario;quantidade;data_vigencia;cnpj_fornecedor",
    exemplo: "001/2025;PM Belo Horizonte;Arroz 5kg;22,50;1000;2025-12-31;12.345.678/0001-90",
  },
};

export function gerarTemplateCSV(tipo: TipoImportacao): string {
  const template = TEMPLATES_CSV[tipo];
  return `${template.cabecalho}\n${template.exemplo}\n`;
}

export function baixarTemplateCSV(tipo: TipoImportacao): void {
  const csv = gerarTemplateCSV(tipo);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `template_${tipo}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ── Listar importações ───────────────────────────────────
export async function listarImportacoes(
  filtro?: { cestaId?: string; tipo?: TipoImportacao },
): Promise<ImportacaoLote[]> {
  const params = new URLSearchParams();
  if (filtro?.cestaId) params.set("cesta_id", filtro.cestaId);
  if (filtro?.tipo) params.set("tipo", filtro.tipo);

  const { data } = await api.get<{ data: ImportacaoLote[] }>(
    `/api/importacao?${params}`
  );
  return (data ?? []) as ImportacaoLote[];
}

// ── Ler arquivo como texto ───────────────────────────────
export function lerArquivoTexto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, "UTF-8");
  });
}
