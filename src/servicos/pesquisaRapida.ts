// Serviço de Pesquisa Rápida — Fase 7
// Deduplicação, cálculos estatísticos por fonte, envio para cesta
import { api } from "@/lib/api";
import type {
  DadosFontePNCP,
  DadosFontePainel,
  DadosFonteTCE,
  DadosFonteBPS,
  DadosFonteSINAPI,
  DadosFonteCONAB,
  DadosFonteCEASA,
  DadosFonteCMED,
  CestaPrecos,
  FontePreco,
} from "@/tipos";
import { adicionarItem, adicionarPreco, recalcularEstatisticasItem } from "./itensCesta";

// ── Interfaces ──────────────────────────────────────

/** Item unificado de resultado da pesquisa rápida */
export interface ResultadoPesquisaUnificado {
  id: string;
  fonte_tipo: string;
  fonte_detalhe: string;
  descricao_item: string;
  orgao: string;
  uf?: string;
  valor_unitario: number;
  data_referencia: string | null;
  documento_url?: string | null;
  /** Chave de deduplicação */
  _dedup_key: string;
}

/** Estatísticas por fonte */
export interface EstatisticasFonte {
  fonte_tipo: string;
  fonte_nome: string;
  quantidade: number;
  menor_preco: number;
  maior_preco: number;
  media: number;
  mediana: number;
}

/** Estatísticas globais (todas as fontes) */
export interface EstatisticasGlobais {
  total: number;
  menor_preco: number;
  maior_preco: number;
  media: number;
  mediana: number;
  por_fonte: EstatisticasFonte[];
}

// ── Nomes legíveis das fontes ───────────────────────
const NOMES_FONTE: Record<string, string> = {
  pncp: "PNCP",
  painel_precos: "Painel de Preços",
  tce: "TCEs Estaduais",
  bps: "BPS (Saúde)",
  sinapi: "SINAPI (Construção)",
  conab: "CONAB (Alimentação)",
  ceasa: "CEASA-MG (Hortifrúti)",
  cmed: "CMED/ANVISA (Medicamentos)",
};

export function nomeFonteLegivel(tipo: string): string {
  return NOMES_FONTE[tipo] ?? tipo.toUpperCase();
}

// ── Normalizar dados de qualquer fonte para formato unificado ──

export function normalizarParaUnificado(
  dados: unknown[],
  fonteTipo: string
): ResultadoPesquisaUnificado[] {
  return dados.map((item) => {
    const raw = item as Record<string, unknown>;
    switch (fonteTipo) {
      case "pncp": {
        const d = item as DadosFontePNCP;
        return {
          id: d.id,
          fonte_tipo: "pncp",
          fonte_detalhe: "PNCP",
          descricao_item: d.descricao_item,
          orgao: d.orgao,
          uf: d.uf_orgao ?? undefined,
          valor_unitario: d.valor_unitario,
          data_referencia: d.data_homologacao,
          documento_url: d.documento_url,
          _dedup_key: `pncp|${d.orgao}|${d.valor_unitario}|${d.data_homologacao}`,
        };
      }
      case "painel_precos": {
        const d = item as DadosFontePainel;
        return {
          id: d.id,
          fonte_tipo: "painel_precos",
          fonte_detalhe: "Painel de Preços",
          descricao_item: d.descricao_item,
          orgao: d.orgao,
          valor_unitario: d.valor_unitario,
          data_referencia: d.data_compra,
          documento_url: d.documento_url,
          _dedup_key: `painel|${d.orgao}|${d.valor_unitario}|${d.data_compra}`,
        };
      }
      case "tce": {
        const d = item as DadosFonteTCE;
        return {
          id: d.id,
          fonte_tipo: "tce",
          fonte_detalhe: d.fonte_tce ?? "TCE",
          descricao_item: d.descricao_item,
          orgao: d.orgao,
          uf: d.uf,
          valor_unitario: d.valor_unitario,
          data_referencia: d.data_contrato,
          documento_url: d.documento_url,
          _dedup_key: `tce|${d.uf}|${d.orgao}|${d.valor_unitario}|${d.data_contrato}`,
        };
      }
      case "bps": {
        const d = item as DadosFonteBPS;
        return {
          id: d.id,
          fonte_tipo: "bps",
          fonte_detalhe: "BPS",
          descricao_item: d.descricao_item,
          orgao: d.instituicao ?? "BPS/MS",
          uf: d.uf ?? undefined,
          valor_unitario: d.valor_unitario,
          data_referencia: d.data_compra,
          _dedup_key: `bps|${d.instituicao}|${d.valor_unitario}|${d.data_compra}`,
        };
      }
      case "sinapi": {
        const d = item as DadosFonteSINAPI;
        return {
          id: d.id,
          fonte_tipo: "sinapi",
          fonte_detalhe: "SINAPI",
          descricao_item: d.descricao_item,
          orgao: "CAIXA/IBGE",
          uf: d.uf,
          valor_unitario: d.valor_unitario,
          data_referencia: d.mes_referencia,
          _dedup_key: `sinapi|${d.codigo_sinapi}|${d.uf}|${d.mes_referencia}`,
        };
      }
      case "conab": {
        const d = item as DadosFonteCONAB;
        return {
          id: d.id,
          fonte_tipo: "conab",
          fonte_detalhe: "CONAB",
          descricao_item: d.descricao_item,
          orgao: "CONAB",
          uf: d.uf,
          valor_unitario: d.valor_unitario,
          data_referencia: d.data_referencia,
          _dedup_key: `conab|${d.cidade}|${d.valor_unitario}|${d.data_referencia}`,
        };
      }
      case "ceasa": {
        const d = item as DadosFonteCEASA;
        return {
          id: d.id,
          fonte_tipo: "ceasa",
          fonte_detalhe: "CEASA-MG",
          descricao_item: `${d.descricao_item}${d.variedade ? ` (${d.variedade})` : ""}`,
          orgao: "CEASA-MG",
          valor_unitario: d.valor_comum,
          data_referencia: d.data_cotacao,
          _dedup_key: `ceasa|${d.descricao_item}|${d.valor_comum}|${d.data_cotacao}`,
        };
      }
      case "cmed": {
        const d = item as DadosFonteCMED;
        return {
          id: d.id,
          fonte_tipo: "cmed",
          fonte_detalhe: "CMED/ANVISA",
          descricao_item: d.descricao_produto,
          orgao: d.laboratorio ?? "ANVISA",
          valor_unitario: d.pmvg_sem_impostos ?? d.pmvg_com_impostos ?? d.pmc ?? 0,
          data_referencia: d.data_publicacao,
          _dedup_key: `cmed|${d.registro_anvisa}|${d.principio_ativo}|${d.data_publicacao}`,
        };
      }
      default:
        return {
          id: String(raw.id ?? crypto.randomUUID()),
          fonte_tipo: fonteTipo,
          fonte_detalhe: fonteTipo.toUpperCase(),
          descricao_item: String(raw.descricao_item ?? raw.descricao ?? ""),
          orgao: String(raw.orgao ?? ""),
          valor_unitario: Number(raw.valor_unitario ?? 0),
          data_referencia: raw.data_referencia ? String(raw.data_referencia) : null,
          _dedup_key: `${fonteTipo}|${raw.id}`,
        };
    }
  });
}

// ── Deduplicação ────────────────────────────────────

export function deduplicarResultados(
  resultados: ResultadoPesquisaUnificado[]
): ResultadoPesquisaUnificado[] {
  const vistos = new Set<string>();
  return resultados.filter((r) => {
    if (vistos.has(r._dedup_key)) return false;
    vistos.add(r._dedup_key);
    return true;
  });
}

// ── Cálculos estatísticos ───────────────────────────

function calcularMediana(valores: number[]): number {
  if (valores.length === 0) return 0;
  const sorted = [...valores].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function calcularEstatisticasPesquisa(
  resultados: ResultadoPesquisaUnificado[]
): EstatisticasGlobais {
  if (resultados.length === 0) {
    return {
      total: 0,
      menor_preco: 0,
      maior_preco: 0,
      media: 0,
      mediana: 0,
      por_fonte: [],
    };
  }

  const valores = resultados.map((r) => r.valor_unitario).filter((v) => v > 0);

  // Agrupar por fonte
  const porFonte = new Map<string, ResultadoPesquisaUnificado[]>();
  for (const r of resultados) {
    const key = r.fonte_tipo;
    if (!porFonte.has(key)) porFonte.set(key, []);
    porFonte.get(key)!.push(r);
  }

  const estatsPorFonte: EstatisticasFonte[] = [];
  for (const [tipo, items] of porFonte) {
    const vals = items.map((i) => i.valor_unitario).filter((v) => v > 0);
    if (vals.length === 0) continue;
    estatsPorFonte.push({
      fonte_tipo: tipo,
      fonte_nome: nomeFonteLegivel(tipo),
      quantidade: vals.length,
      menor_preco: Math.min(...vals),
      maior_preco: Math.max(...vals),
      media: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100,
      mediana: Math.round(calcularMediana(vals) * 100) / 100,
    });
  }

  return {
    total: resultados.length,
    menor_preco: valores.length > 0 ? Math.min(...valores) : 0,
    maior_preco: valores.length > 0 ? Math.max(...valores) : 0,
    media:
      valores.length > 0
        ? Math.round((valores.reduce((a, b) => a + b, 0) / valores.length) * 100) / 100
        : 0,
    mediana: Math.round(calcularMediana(valores) * 100) / 100,
    por_fonte: estatsPorFonte.sort((a, b) => a.media - b.media),
  };
}

// ── Filtros de período ──────────────────────────────

export type PeriodoPesquisa = "3m" | "6m" | "12m" | "custom";

export function calcularDataInicioPeriodo(periodo: PeriodoPesquisa): string {
  const d = new Date();
  switch (periodo) {
    case "3m":
      d.setMonth(d.getMonth() - 3);
      break;
    case "6m":
      d.setMonth(d.getMonth() - 6);
      break;
    case "12m":
      d.setFullYear(d.getFullYear() - 1);
      break;
    case "custom":
      return "";
  }
  return d.toISOString().slice(0, 10);
}

// ── Enviar para cesta ───────────────────────────────

export interface EnvioParaCestaDTO {
  cestaId: string;
  produtoId: string;
  quantidade: number;
  resultados: ResultadoPesquisaUnificado[];
  fontes: FontePreco[];
}

/**
 * Cria um item na cesta e adiciona os preços selecionados.
 * Retorna o ID do item criado.
 */
export async function enviarParaCesta(dto: EnvioParaCestaDTO): Promise<string> {
  // 1. Criar item na cesta
  const item = await adicionarItem(
    dto.cestaId,
    dto.produtoId,
    dto.quantidade
  );

  // 2. Para cada resultado selecionado, criar preço
  for (const r of dto.resultados) {
    // Encontrar fonte cadastrada
    const fonte = dto.fontes.find((f) => f.tipo === r.fonte_tipo || f.tipo === "tce");
    if (!fonte) continue;

    await adicionarPreco({
      item_cesta_id: item.id,
      fonte_id: fonte.id,
      valor_unitario: r.valor_unitario,
      data_referencia: r.data_referencia ?? new Date().toISOString().slice(0, 10),
      orgao: r.orgao || undefined,
      descricao_fonte: `${r.descricao_item} — ${r.fonte_detalhe}${r.uf ? ` (${r.uf})` : ""}`,
    });
  }

  // 3. Recalcular estatísticas
  await recalcularEstatisticasItem(item.id);

  return item.id;
}

// ── Listar cestas ativas para seleção ───────────────

export async function listarCestasAtivas(): Promise<
  Pick<CestaPrecos, "id" | "descricao_objeto" | "status" | "criado_em">[]
> {
  const { data } = await api.get<{ data: Pick<CestaPrecos, "id" | "descricao_objeto" | "status" | "criado_em">[] }>(
    "/api/cestas?status=rascunho,em_andamento&limite=50",
  );
  return data ?? [];
}
