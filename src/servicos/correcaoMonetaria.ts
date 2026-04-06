// ═══════════════════════════════════════════════════════════════════════════════
// Serviço de Correção Monetária — Fase 8
// Motor de cálculo IPCA/IGP-M, persistência de índices, aplicação em cestas
// ═══════════════════════════════════════════════════════════════════════════════
import { api } from "@/lib/api";
import type {
  IndiceCorrecao,
  TipoIndice,
  ResultadoCorrecao,
  ResumoCorrecaoCesta,
  PrecoItem,
  LogImportacaoIndices,
} from "@/tipos";

// ╔══════════════════════════════════════════════════════╗
// ║  1. CRUD de índices                                  ║
// ╚══════════════════════════════════════════════════════╝

/** Buscar índices por tipo e período */
export async function listarIndices(
  tipo: TipoIndice,
  anoInicio?: number,
  anoFim?: number,
): Promise<IndiceCorrecao[]> {
  const params = new URLSearchParams({ tipo });
  if (anoInicio) params.set("anoInicio", String(anoInicio));
  if (anoFim) params.set("anoFim", String(anoFim));

  const { data } = await api.get<{ data: IndiceCorrecao[] }>(`/api/indices?${params}`);
  return (data ?? []) as IndiceCorrecao[];
}

/** Buscar índices num intervalo de meses específico */
export async function buscarIndicesIntervalo(
  tipo: TipoIndice,
  mesInicio: { ano: number; mes: number },
  mesFim: { ano: number; mes: number },
): Promise<IndiceCorrecao[]> {
  const params = new URLSearchParams({
    tipo,
    mesInicio: `${mesInicio.ano}-${String(mesInicio.mes).padStart(2, "0")}`,
    mesFim: `${mesFim.ano}-${String(mesFim.mes).padStart(2, "0")}`,
  });

  const { data } = await api.get<{ data: IndiceCorrecao[] }>(`/api/indices?${params}`);
  return (data ?? []) as IndiceCorrecao[];
}

/** Obter último índice disponível */
export async function ultimoIndiceDisponivel(
  tipo: TipoIndice,
): Promise<IndiceCorrecao | null> {
  const { data } = await api.get<{ data: IndiceCorrecao[] }>(`/api/indices?tipo=${tipo}&ultimo=true`);
  return (data && data.length > 0 ? data[0] : null) as IndiceCorrecao | null;
}

/** Inserir ou atualizar índices (upsert) */
export async function upsertIndices(
  indices: Omit<IndiceCorrecao, "id" | "importado_em">[],
): Promise<number> {
  if (indices.length === 0) return 0;

  const { data } = await api.post<{ data: { count: number } }>("/api/indices/importar", { indices });
  return data?.count ?? indices.length;
}

/** Registrar log de importação */
export async function registrarLogImportacao(
  log: Omit<LogImportacaoIndices, "id" | "criado_em">,
): Promise<void> {
  await api.post("/api/auditoria", { ...log, tipo: "importacao_indices" });
}

/** Listar logs de importação */
export async function listarLogsImportacao(
  limite = 20,
): Promise<LogImportacaoIndices[]> {
  const { data } = await api.get<{ data: LogImportacaoIndices[] }>(`/api/auditoria?tipo=importacao_indices&limite=${limite}`);
  return (data ?? []) as LogImportacaoIndices[];
}

// ╔══════════════════════════════════════════════════════╗
// ║  2. Motor de cálculo de correção                     ║
// ╚══════════════════════════════════════════════════════╝

/**
 * Calcula o fator de correção monetária entre duas datas.
 *
 * Usa a fórmula:
 *   fator = Π (1 + indice_mensal/100) para cada mês do período
 *
 * O mês de início NÃO entra no cálculo (pega-se do mês seguinte ao da
 * data de origem até o mês da data-base).
 */
export function calcularFatorCorrecao(
  indices: IndiceCorrecao[],
  dataOrigem: string,
  dataBase: string,
): { fator: number; percentual: number; meses: number } {
  const dOrigem = new Date(dataOrigem + "T00:00:00");
  const dBase = new Date(dataBase + "T00:00:00");

  // Mês seguinte à data de origem
  let mesInicio = dOrigem.getMonth() + 2; // +1 para 1-indexed, +1 para mês seguinte
  let anoInicio = dOrigem.getFullYear();
  if (mesInicio > 12) {
    mesInicio = 1;
    anoInicio++;
  }

  const mesFim = dBase.getMonth() + 1;
  const anoFim = dBase.getFullYear();

  // Filtrar índices no intervalo
  const indicesRelevantes = indices.filter((idx) => {
    const periodo = idx.ano * 100 + idx.mes;
    return periodo >= anoInicio * 100 + mesInicio && periodo <= anoFim * 100 + mesFim;
  });

  if (indicesRelevantes.length === 0) {
    return { fator: 1, percentual: 0, meses: 0 };
  }

  // Calcular fator acumulado
  let fator = 1;
  for (const idx of indicesRelevantes) {
    fator *= 1 + idx.valor / 100;
  }

  const percentual = (fator - 1) * 100;
  return {
    fator: Math.round(fator * 100000000) / 100000000,
    percentual: Math.round(percentual * 10000) / 10000,
    meses: indicesRelevantes.length,
  };
}

/**
 * Calcula a correção para um único preço.
 */
export function calcularCorrecaoPreco(
  preco: PrecoItem,
  indices: IndiceCorrecao[],
  tipoIndice: TipoIndice,
  dataBase: string,
): ResultadoCorrecao {
  const dataOrigem = preco.data_referencia;
  const { fator, percentual, meses } = calcularFatorCorrecao(indices, dataOrigem, dataBase);
  const valorCorrigido = Math.round(preco.valor_unitario * fator * 10000) / 10000;

  return {
    preco_id: preco.id,
    valor_original: preco.valor_unitario,
    valor_corrigido: valorCorrigido,
    fator_correcao: fator,
    percentual_correcao: percentual,
    indice_tipo: tipoIndice,
    data_origem: dataOrigem,
    data_base: dataBase,
    meses_correcao: meses,
  };
}

// ╔══════════════════════════════════════════════════════╗
// ║  3. Aplicação em preços individuais                  ║
// ╚══════════════════════════════════════════════════════╝

/** Aplicar correção a um preço específico e persistir no banco */
export async function aplicarCorrecaoPreco(
  precoId: string,
  resultado: ResultadoCorrecao,
): Promise<void> {
  await api.post("/api/indices/corrigir", {
    precoId,
    valor_corrigido: resultado.valor_corrigido,
    indice_tipo: resultado.indice_tipo,
    data_base: resultado.data_base,
    fator_correcao: resultado.fator_correcao,
  });
}

/** Remover correção de um preço */
export async function removerCorrecaoPreco(precoId: string): Promise<void> {
  await api.post("/api/indices/corrigir", { precoId, remover: true });
}

// ╔══════════════════════════════════════════════════════╗
// ║  4. Correção da cesta completa                       ║
// ╚══════════════════════════════════════════════════════╝

/**
 * Aplica correção monetária a TODOS os preços de todos os itens de uma cesta.
 * Retorna um resumo consolidado.
 */
export async function aplicarCorrecaoCesta(
  cestaId: string,
  tipoIndice: TipoIndice,
  dataBase: string,
): Promise<ResumoCorrecaoCesta> {
  const { data } = await api.post<{ data: ResumoCorrecaoCesta }>("/api/indices/corrigir", {
    cestaId,
    tipoIndice,
    dataBase,
  });
  return data;
}

/** Remover toda correção monetária da cesta */
export async function removerCorrecaoCesta(cestaId: string): Promise<void> {
  await api.post("/api/indices/corrigir", { cestaId, remover: true });
}

// ╔══════════════════════════════════════════════════════╗
// ║  5. Importação de índices (IBGE/FGV)                 ║
// ╚══════════════════════════════════════════════════════╝

/**
 * Série IPCA mensal — API SIDRA/IBGE
 * Tabela 1737 — IPCA, variação mensal (%)
 * URL: https://apisidra.ibge.gov.br/values/t/1737/n1/all/v/63/p/all/d/v63%202
 *
 * Retorna array de índices prontos para upsert.
 */
export async function importarIPCA(
  anoInicio = 2015,
): Promise<Omit<IndiceCorrecao, "id" | "importado_em">[]> {
  // Construir URL SIDRA
  // p/ = período: aaaamm-aaaamm
  const mesAtual = new Date();
  const pFim = `${mesAtual.getFullYear()}${String(mesAtual.getMonth() + 1).padStart(2, "0")}`;
  const pInicio = `${anoInicio}01`;
  const url = `https://apisidra.ibge.gov.br/values/t/1737/n1/all/v/63/p/${pInicio}-${pFim}/d/v63%202`;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`SIDRA IPCA retornou ${resp.status}`);

  const json = (await resp.json()) as Record<string, string>[];
  // Primeira linha é cabeçalho
  const dados = json.slice(1);
  const indices: Omit<IndiceCorrecao, "id" | "importado_em">[] = [];

  for (const row of dados) {
    const periodo = row["D3C"]; // ex: "202501" = janeiro 2025
    const valor = parseFloat(row["V"]);
    if (!periodo || isNaN(valor)) continue;

    const ano = parseInt(periodo.slice(0, 4));
    const mes = parseInt(periodo.slice(4, 6));

    indices.push({
      tipo: "ipca",
      ano,
      mes,
      valor,
      acumulado_12m: null, // calculado depois
      fonte: "IBGE/SIDRA",
    });
  }

  // Calcular acumulado 12m para cada mês
  for (let i = 0; i < indices.length; i++) {
    if (i >= 11) {
      let acum = 1;
      for (let j = i - 11; j <= i; j++) {
        acum *= 1 + indices[j].valor / 100;
      }
      indices[i].acumulado_12m = Math.round((acum - 1) * 10000) / 100;
    }
  }

  return indices;
}

/**
 * Série IGP-M mensal — simulação com estrutura similar.
 * Em produção, usaria API da FGV/IBRE ou scraping do Banco Central.
 * Implementação via API do BCB (SGS - Sistema Gerenciador de Séries Temporais)
 * Série 189 = IGP-M variação mensal
 */
export async function importarIGPM(
  anoInicio = 2015,
): Promise<Omit<IndiceCorrecao, "id" | "importado_em">[]> {
  const dataInicio = `01/01/${anoInicio}`;
  const hoje = new Date();
  const dataFim = `${String(hoje.getDate()).padStart(2, "0")}/${String(hoje.getMonth() + 1).padStart(2, "0")}/${hoje.getFullYear()}`;
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.189/dados?formato=json&dataInicial=${dataInicio}&dataFinal=${dataFim}`;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`BCB IGP-M retornou ${resp.status}`);

  const json = (await resp.json()) as { data: string; valor: string }[];
  const indices: Omit<IndiceCorrecao, "id" | "importado_em">[] = [];

  for (const row of json) {
    const [_dia, mesStr, anoStr] = row.data.split("/");
    const valor = parseFloat(row.valor);
    if (isNaN(valor)) continue;

    const ano = parseInt(anoStr);
    const mes = parseInt(mesStr);

    indices.push({
      tipo: "igpm",
      ano,
      mes,
      valor,
      acumulado_12m: null,
      fonte: "BCB/SGS",
    });
  }

  // Calcular acumulado 12m
  for (let i = 0; i < indices.length; i++) {
    if (i >= 11) {
      let acum = 1;
      for (let j = i - 11; j <= i; j++) {
        acum *= 1 + indices[j].valor / 100;
      }
      indices[i].acumulado_12m = Math.round((acum - 1) * 10000) / 100;
    }
  }

  return indices;
}

/**
 * Importar e persistir índices de um tipo.
 * Retorna quantidade de registros importados.
 */
export async function importarEPersistirIndices(
  tipo: TipoIndice,
  anoInicio = 2015,
): Promise<{ importados: number; erro?: string }> {
  try {
    const dados =
      tipo === "ipca"
        ? await importarIPCA(anoInicio)
        : await importarIGPM(anoInicio);

    const importados = await upsertIndices(dados);

    await registrarLogImportacao({
      tipo,
      registros_importados: importados,
      periodo_inicio: `${anoInicio}-01`,
      periodo_fim: dados.length > 0
        ? `${dados[dados.length - 1].ano}-${String(dados[dados.length - 1].mes).padStart(2, "0")}`
        : null,
      fonte_url: tipo === "ipca" ? "IBGE/SIDRA" : "BCB/SGS",
      erro: null,
    });

    return { importados };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";

    await registrarLogImportacao({
      tipo,
      registros_importados: 0,
      periodo_inicio: null,
      periodo_fim: null,
      fonte_url: null,
      erro: msg,
    });

    return { importados: 0, erro: msg };
  }
}

// ╔══════════════════════════════════════════════════════╗
// ║  6. Helpers / Labels                                 ║
// ╚══════════════════════════════════════════════════════╝

export const NOME_INDICE: Record<TipoIndice, string> = {
  ipca: "IPCA (IBGE)",
  igpm: "IGP-M (FGV)",
};

export const DESCRICAO_INDICE: Record<TipoIndice, string> = {
  ipca: "Índice Nacional de Preços ao Consumidor Amplo — medido pelo IBGE. Índice oficial de inflação do Brasil.",
  igpm: "Índice Geral de Preços do Mercado — medido pela FGV/IBRE. Muito utilizado em contratos e aluguéis.",
};

export function formatarPeriodo(ano: number, mes: number): string {
  const meses = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];
  return `${meses[mes - 1]}/${ano}`;
}

export function formatarFator(fator: number): string {
  return fator.toFixed(6);
}

export function formatarPercentual(percentual: number): string {
  return `${percentual >= 0 ? "+" : ""}${percentual.toFixed(2)}%`;
}
