// ═══════════════════════════════════════════════════════════════════════════════
// Serviço de Crawlers — Fase 6: Fontes Setoriais
// BPS (Saúde), SINAPI (Construção), CONAB (Alimentação), CEASA (Hortifrúti),
// CMED/ANVISA (Medicamentos)
// ═══════════════════════════════════════════════════════════════════════════════
import { api } from "@/lib/api";
import type {
  DadosFonteBPS,
  DadosFonteSINAPI,
  DadosFonteCONAB,
  DadosFonteCEASA,
  DadosFonteCMED,
  FiltroBPS,
  FiltroSINAPI,
  FiltroCONAB,
  FiltroCEASA,
  FiltroCMED,
} from "@/tipos";
import { buscarCache, salvarCache } from "./cacheConsultas";

// ── URLs das APIs oficiais ──────────────────────────
const BPS_API_BASE = "https://bps.saude.gov.br/api/v1";
const SINAPI_API_BASE = "https://api.caixa.gov.br/sinapi/v1";
const CONAB_API_BASE = "https://consultaweb.conab.gov.br/consultas/consultaPreco";
const CEASA_API_BASE = "https://api.ceasaminas.com.br/v1";
const CMED_API_BASE = "https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos/api";

// ╔══════════════════════════════════════════════════════╗
// ║  BPS — Banco de Preços em Saúde                     ║
// ╚══════════════════════════════════════════════════════╝

export async function buscarBPS(filtro: FiltroBPS): Promise<DadosFonteBPS[]> {
  const cacheKey = { fonte: "bps", ...filtro };
  const cached = await buscarCache<DadosFonteBPS[]>("bps", cacheKey);
  if (cached) return cached;

  try {
    const resultados = await consultarAPIBPS(filtro);
    if (resultados.length > 0) {
      await persistirDadosBPS(resultados);
      await salvarCache("bps", cacheKey, resultados);
      return resultados;
    }
  } catch (err) {
    console.warn("[BPS] API indisponível, usando dados locais:", err);
  }

  const locais = await buscarBPSLocal(filtro);
  if (locais.length > 0) await salvarCache("bps", cacheKey, locais);
  return locais;
}

/**
 * Calcula média ponderada por Código BR — regra BPS.
 * NÃO permite seleção parcial: retorna o conjunto completo.
 */
export async function buscarMediaPonderadaBPS(
  codigoBR: string
): Promise<{ media: number; total: number; registros: DadosFonteBPS[] }> {
  const { data } = await api.get<{ data: DadosFonteBPS[] }>(
    `/api/dados-fonte-bps?codigo_br=${encodeURIComponent(codigoBR)}`
  );
  const registros = (data ?? []) as DadosFonteBPS[];
  if (registros.length === 0) return { media: 0, total: 0, registros: [] };

  // Média ponderada: Σ(valor × qtd) / Σ(qtd)
  let somaVQ = 0;
  let somaQ = 0;
  for (const r of registros) {
    const q = r.quantidade ?? 1;
    somaVQ += r.valor_unitario * q;
    somaQ += q;
  }
  const media = somaQ > 0 ? Math.round((somaVQ / somaQ) * 10000) / 10000 : 0;

  return { media, total: registros.length, registros };
}

async function consultarAPIBPS(filtro: FiltroBPS): Promise<DadosFonteBPS[]> {
  const params = new URLSearchParams();
  if (filtro.codigoBR) params.set("codigoBR", filtro.codigoBR);
  if (filtro.termo) params.set("descricao", filtro.termo);
  if (filtro.uf) params.set("uf", filtro.uf);
  if (filtro.dataInicio) params.set("dataInicio", filtro.dataInicio);
  if (filtro.dataFim) params.set("dataFim", filtro.dataFim);
  params.set("pagina", "1");
  params.set("tamanhoPagina", String(filtro.limite ?? 50));

  const resp = await fetch(`${BPS_API_BASE}/precos?${params}`, {
    signal: AbortSignal.timeout(15000),
    headers: { Accept: "application/json" },
  });
  if (!resp.ok) throw new Error(`BPS HTTP ${resp.status}`);
  const json = await resp.json();

  const items: unknown[] = json.data ?? json.resultado ?? json ?? [];
  return (Array.isArray(items) ? items : []).map((item: unknown) => {
    const raw = item as Record<string, unknown>;
    return {
      id: crypto.randomUUID(),
      codigo_br: raw.codigoBR ? String(raw.codigoBR) : null,
      descricao_item: String(raw.descricao ?? raw.nomeItem ?? filtro.termo ?? ""),
      apresentacao: raw.apresentacao ? String(raw.apresentacao) : null,
      unidade: raw.unidadeMedida ? String(raw.unidadeMedida) : null,
      valor_unitario: Number(raw.valorUnitario ?? raw.preco ?? 0),
      quantidade: raw.quantidade ? Number(raw.quantidade) : null,
      instituicao: raw.instituicao ? String(raw.instituicao) : null,
      uf: raw.uf ? String(raw.uf) : null,
      data_compra: raw.dataCompra ? String(raw.dataCompra) : null,
      modalidade: raw.modalidade ? String(raw.modalidade) : null,
      media_ponderada: null,
      total_registros_consulta: null,
      criado_em: new Date().toISOString(),
    };
  }) as DadosFonteBPS[];
}

async function persistirDadosBPS(dados: DadosFonteBPS[]): Promise<void> {
  if (!dados.length) return;
  try {
    await api.post("/api/dados-fonte-bps", { items: dados.map(({ id: _id, criado_em: _c, ...rest }) => rest) });
  } catch (err) {
    console.warn("[BPS] Erro ao persistir:", err);
  }
}

async function buscarBPSLocal(filtro: FiltroBPS): Promise<DadosFonteBPS[]> {
  const params = new URLSearchParams();
  params.set("limite", String(filtro.limite ?? 50));
  if (filtro.codigoBR) params.set("codigo_br", filtro.codigoBR);
  if (filtro.termo) params.set("termo", filtro.termo);
  if (filtro.uf) params.set("uf", filtro.uf);
  if (filtro.dataInicio) params.set("data_inicio", filtro.dataInicio);
  if (filtro.dataFim) params.set("data_fim", filtro.dataFim);

  const { data } = await api.get<{ data: DadosFonteBPS[] }>(`/api/dados-fonte-bps?${params}`);
  return (data ?? []) as DadosFonteBPS[];
}

// ╔══════════════════════════════════════════════════════╗
// ║  SINAPI — Sistema Nacional de Pesquisa de Custos    ║
// ╚══════════════════════════════════════════════════════╝

export async function buscarSINAPI(filtro: FiltroSINAPI): Promise<DadosFonteSINAPI[]> {
  const cacheKey = { fonte: "sinapi", ...filtro };
  const cached = await buscarCache<DadosFonteSINAPI[]>("sinapi", cacheKey);
  if (cached) return cached;

  try {
    const resultados = await consultarAPISINAPI(filtro);
    if (resultados.length > 0) {
      await persistirDadosSINAPI(resultados);
      await salvarCache("sinapi", cacheKey, resultados);
      return resultados;
    }
  } catch (err) {
    console.warn("[SINAPI] API indisponível, usando dados locais:", err);
  }

  const locais = await buscarSINAPILocal(filtro);
  if (locais.length > 0) await salvarCache("sinapi", cacheKey, locais);
  return locais;
}

async function consultarAPISINAPI(filtro: FiltroSINAPI): Promise<DadosFonteSINAPI[]> {
  const params = new URLSearchParams();
  if (filtro.codigoSinapi) params.set("codigo", filtro.codigoSinapi);
  if (filtro.termo) params.set("descricao", filtro.termo);
  if (filtro.uf) params.set("uf", filtro.uf);
  if (filtro.mesReferencia) params.set("mesReferencia", filtro.mesReferencia);
  if (filtro.tipo) params.set("tipo", filtro.tipo);
  if (filtro.desonerado !== undefined) params.set("desonerado", String(filtro.desonerado));
  params.set("pagina", "1");
  params.set("tamanhoPagina", String(filtro.limite ?? 50));

  const resp = await fetch(`${SINAPI_API_BASE}/insumos?${params}`, {
    signal: AbortSignal.timeout(15000),
    headers: { Accept: "application/json" },
  });
  if (!resp.ok) throw new Error(`SINAPI HTTP ${resp.status}`);
  const json = await resp.json();

  const items: unknown[] = json.data ?? json.resultado ?? json ?? [];
  return (Array.isArray(items) ? items : []).map((item: unknown) => {
    const raw = item as Record<string, unknown>;
    return {
      id: crypto.randomUUID(),
      codigo_sinapi: String(raw.codigo ?? raw.codigoSinapi ?? ""),
      descricao_item: String(raw.descricao ?? raw.nome ?? filtro.termo ?? ""),
      unidade: raw.unidade ? String(raw.unidade) : null,
      valor_unitario: Number(raw.valorUnitario ?? raw.preco ?? raw.custoTotal ?? 0),
      uf: String(raw.uf ?? filtro.uf ?? "MG"),
      mes_referencia: String(raw.mesReferencia ?? filtro.mesReferencia ?? new Date().toISOString().slice(0, 7)),
      tipo: raw.tipo ? String(raw.tipo) : null,
      desonerado: Boolean(raw.desonerado ?? false),
      origem: raw.origem ? String(raw.origem) : "CEF",
      criado_em: new Date().toISOString(),
    };
  }) as DadosFonteSINAPI[];
}

async function persistirDadosSINAPI(dados: DadosFonteSINAPI[]): Promise<void> {
  if (!dados.length) return;
  try {
    await api.post("/api/dados-fonte-sinapi", { items: dados.map(({ id: _id, criado_em: _c, ...rest }) => rest) });
  } catch (err) {
    console.warn("[SINAPI] Erro ao persistir:", err);
  }
}

async function buscarSINAPILocal(filtro: FiltroSINAPI): Promise<DadosFonteSINAPI[]> {
  const params = new URLSearchParams();
  params.set("limite", String(filtro.limite ?? 50));
  if (filtro.codigoSinapi) params.set("codigo_sinapi", filtro.codigoSinapi);
  if (filtro.termo) params.set("termo", filtro.termo);
  if (filtro.uf) params.set("uf", filtro.uf);
  if (filtro.mesReferencia) params.set("mes_referencia", filtro.mesReferencia);
  if (filtro.tipo) params.set("tipo", filtro.tipo);
  if (filtro.desonerado !== undefined) params.set("desonerado", String(filtro.desonerado));

  const { data } = await api.get<{ data: DadosFonteSINAPI[] }>(`/api/dados-fonte-sinapi?${params}`);
  return (data ?? []) as DadosFonteSINAPI[];
}

// ╔══════════════════════════════════════════════════════╗
// ║  CONAB — Companhia Nacional de Abastecimento        ║
// ╚══════════════════════════════════════════════════════╝

export async function buscarCONAB(filtro: FiltroCONAB): Promise<DadosFonteCONAB[]> {
  const cacheKey = { fonte: "conab", ...filtro };
  const cached = await buscarCache<DadosFonteCONAB[]>("conab", cacheKey);
  if (cached) return cached;

  try {
    const resultados = await consultarAPICONAB(filtro);
    if (resultados.length > 0) {
      await persistirDadosCONAB(resultados);
      await salvarCache("conab", cacheKey, resultados);
      return resultados;
    }
  } catch (err) {
    console.warn("[CONAB] API indisponível, usando dados locais:", err);
  }

  const locais = await buscarCONABLocal(filtro);
  if (locais.length > 0) await salvarCache("conab", cacheKey, locais);
  return locais;
}

async function consultarAPICONAB(filtro: FiltroCONAB): Promise<DadosFonteCONAB[]> {
  const params = new URLSearchParams();
  if (filtro.termo) params.set("produto", filtro.termo);
  if (filtro.cidade) params.set("praca", filtro.cidade);
  if (filtro.uf) params.set("uf", filtro.uf);
  if (filtro.dataInicio) params.set("dataInicio", filtro.dataInicio);
  if (filtro.dataFim) params.set("dataFim", filtro.dataFim);
  params.set("pagina", "1");
  params.set("tamanhoPagina", String(filtro.limite ?? 50));

  const resp = await fetch(`${CONAB_API_BASE}?${params}`, {
    signal: AbortSignal.timeout(15000),
    headers: { Accept: "application/json" },
  });
  if (!resp.ok) throw new Error(`CONAB HTTP ${resp.status}`);
  const json = await resp.json();

  const items: unknown[] = json.data ?? json.resultado ?? json ?? [];
  return (Array.isArray(items) ? items : []).map((item: unknown) => {
    const raw = item as Record<string, unknown>;
    return {
      id: crypto.randomUUID(),
      descricao_item: String(raw.produto ?? raw.descricao ?? filtro.termo ?? ""),
      unidade: raw.unidade ? String(raw.unidade) : null,
      valor_unitario: Number(raw.preco ?? raw.valorUnitario ?? 0),
      cidade: raw.praca ? String(raw.praca) : (raw.cidade ? String(raw.cidade) : null),
      uf: String(raw.uf ?? filtro.uf ?? "MG"),
      data_referencia: String(raw.data ?? raw.dataReferencia ?? new Date().toISOString().slice(0, 10)),
      tipo_produto: raw.tipoProduto ? String(raw.tipoProduto) : null,
      criado_em: new Date().toISOString(),
    };
  }) as DadosFonteCONAB[];
}

async function persistirDadosCONAB(dados: DadosFonteCONAB[]): Promise<void> {
  if (!dados.length) return;
  try {
    await api.post("/api/dados-fonte-conab", { items: dados.map(({ id: _id, criado_em: _c, ...rest }) => rest) });
  } catch (err) {
    console.warn("[CONAB] Erro ao persistir:", err);
  }
}

async function buscarCONABLocal(filtro: FiltroCONAB): Promise<DadosFonteCONAB[]> {
  const params = new URLSearchParams();
  params.set("limite", String(filtro.limite ?? 50));
  if (filtro.termo) params.set("termo", filtro.termo);
  if (filtro.cidade) params.set("cidade", filtro.cidade);
  if (filtro.uf) params.set("uf", filtro.uf);
  if (filtro.dataInicio) params.set("data_inicio", filtro.dataInicio);
  if (filtro.dataFim) params.set("data_fim", filtro.dataFim);

  const { data } = await api.get<{ data: DadosFonteCONAB[] }>(`/api/dados-fonte-conab?${params}`);
  return (data ?? []) as DadosFonteCONAB[];
}

// ╔══════════════════════════════════════════════════════╗
// ║  CEASA-MG — Central de Abastecimento                ║
// ╚══════════════════════════════════════════════════════╝

export async function buscarCEASA(filtro: FiltroCEASA): Promise<DadosFonteCEASA[]> {
  const cacheKey = { fonte: "ceasa", ...filtro };
  const cached = await buscarCache<DadosFonteCEASA[]>("ceasa", cacheKey);
  if (cached) return cached;

  try {
    const resultados = await consultarAPICEASA(filtro);
    if (resultados.length > 0) {
      await persistirDadosCEASA(resultados);
      await salvarCache("ceasa", cacheKey, resultados);
      return resultados;
    }
  } catch (err) {
    console.warn("[CEASA] API indisponível, usando dados locais:", err);
  }

  const locais = await buscarCEASALocal(filtro);
  if (locais.length > 0) await salvarCache("ceasa", cacheKey, locais);
  return locais;
}

async function consultarAPICEASA(filtro: FiltroCEASA): Promise<DadosFonteCEASA[]> {
  const params = new URLSearchParams();
  if (filtro.termo) params.set("produto", filtro.termo);
  if (filtro.variedade) params.set("variedade", filtro.variedade);
  if (filtro.dataInicio) params.set("dataInicio", filtro.dataInicio);
  if (filtro.dataFim) params.set("dataFim", filtro.dataFim);
  params.set("pagina", "1");
  params.set("tamanhoPagina", String(filtro.limite ?? 50));

  const resp = await fetch(`${CEASA_API_BASE}/cotacoes?${params}`, {
    signal: AbortSignal.timeout(15000),
    headers: { Accept: "application/json" },
  });
  if (!resp.ok) throw new Error(`CEASA HTTP ${resp.status}`);
  const json = await resp.json();

  const items: unknown[] = json.data ?? json.resultado ?? json ?? [];
  return (Array.isArray(items) ? items : []).map((item: unknown) => {
    const raw = item as Record<string, unknown>;
    return {
      id: crypto.randomUUID(),
      descricao_item: String(raw.produto ?? raw.descricao ?? filtro.termo ?? ""),
      variedade: raw.variedade ? String(raw.variedade) : null,
      unidade: raw.unidade ? String(raw.unidade) : null,
      valor_minimo: raw.valorMinimo != null ? Number(raw.valorMinimo) : null,
      valor_maximo: raw.valorMaximo != null ? Number(raw.valorMaximo) : null,
      valor_comum: Number(raw.valorComum ?? raw.precoComum ?? raw.preco ?? 0),
      data_cotacao: String(raw.dataCotacao ?? raw.data ?? new Date().toISOString().slice(0, 10)),
      turno: raw.turno ? String(raw.turno) : null,
      criado_em: new Date().toISOString(),
    };
  }) as DadosFonteCEASA[];
}

async function persistirDadosCEASA(dados: DadosFonteCEASA[]): Promise<void> {
  if (!dados.length) return;
  try {
    await api.post("/api/dados-fonte-ceasa", { items: dados.map(({ id: _id, criado_em: _c, ...rest }) => rest) });
  } catch (err) {
    console.warn("[CEASA] Erro ao persistir:", err);
  }
}

async function buscarCEASALocal(filtro: FiltroCEASA): Promise<DadosFonteCEASA[]> {
  const params = new URLSearchParams();
  params.set("limite", String(filtro.limite ?? 50));
  if (filtro.termo) params.set("termo", filtro.termo);
  if (filtro.variedade) params.set("variedade", filtro.variedade);
  if (filtro.dataInicio) params.set("data_inicio", filtro.dataInicio);
  if (filtro.dataFim) params.set("data_fim", filtro.dataFim);

  const { data } = await api.get<{ data: DadosFonteCEASA[] }>(`/api/dados-fonte-ceasa?${params}`);
  return (data ?? []) as DadosFonteCEASA[];
}

// ╔══════════════════════════════════════════════════════╗
// ║  CMED/ANVISA — Câmara de Regulação de Medicamentos  ║
// ╚══════════════════════════════════════════════════════╝

export async function buscarCMED(filtro: FiltroCMED): Promise<DadosFonteCMED[]> {
  const cacheKey = { fonte: "cmed", ...filtro };
  const cached = await buscarCache<DadosFonteCMED[]>("cmed", cacheKey);
  if (cached) return cached;

  try {
    const resultados = await consultarAPICMED(filtro);
    if (resultados.length > 0) {
      await persistirDadosCMED(resultados);
      await salvarCache("cmed", cacheKey, resultados);
      return resultados;
    }
  } catch (err) {
    console.warn("[CMED] API indisponível, usando dados locais:", err);
  }

  const locais = await buscarCMEDLocal(filtro);
  if (locais.length > 0) await salvarCache("cmed", cacheKey, locais);
  return locais;
}

async function consultarAPICMED(filtro: FiltroCMED): Promise<DadosFonteCMED[]> {
  const params = new URLSearchParams();
  if (filtro.registroAnvisa) params.set("registro", filtro.registroAnvisa);
  if (filtro.principioAtivo) params.set("principioAtivo", filtro.principioAtivo);
  if (filtro.termo) params.set("descricao", filtro.termo);
  if (filtro.laboratorio) params.set("laboratorio", filtro.laboratorio);
  params.set("pagina", "1");
  params.set("tamanhoPagina", String(filtro.limite ?? 50));

  const resp = await fetch(`${CMED_API_BASE}/medicamentos?${params}`, {
    signal: AbortSignal.timeout(15000),
    headers: { Accept: "application/json" },
  });
  if (!resp.ok) throw new Error(`CMED HTTP ${resp.status}`);
  const json = await resp.json();

  const items: unknown[] = json.data ?? json.resultado ?? json ?? [];
  return (Array.isArray(items) ? items : []).map((item: unknown) => {
    const raw = item as Record<string, unknown>;
    return {
      id: crypto.randomUUID(),
      registro_anvisa: raw.registro ? String(raw.registro) : null,
      principio_ativo: String(raw.principioAtivo ?? raw.substancia ?? ""),
      descricao_produto: String(raw.descricao ?? raw.produto ?? filtro.termo ?? ""),
      apresentacao: raw.apresentacao ? String(raw.apresentacao) : null,
      laboratorio: raw.laboratorio ? String(raw.laboratorio) : null,
      ean: raw.ean ? String(raw.ean) : null,
      pmvg_sem_impostos: raw.pmvgSemImpostos != null ? Number(raw.pmvgSemImpostos) : null,
      pmvg_com_impostos: raw.pmvgComImpostos != null ? Number(raw.pmvgComImpostos) : null,
      pmc: raw.pmc != null ? Number(raw.pmc) : null,
      icms_0: raw.icms0 != null ? Number(raw.icms0) : null,
      lista_concessao: raw.listaConcessao ? String(raw.listaConcessao) : null,
      tipo_produto: raw.tipoProduto ? String(raw.tipoProduto) : null,
      regime_preco: raw.regimenPreco ? String(raw.regimenPreco) : null,
      data_publicacao: raw.dataPublicacao ? String(raw.dataPublicacao) : null,
      criado_em: new Date().toISOString(),
    };
  }) as DadosFonteCMED[];
}

async function persistirDadosCMED(dados: DadosFonteCMED[]): Promise<void> {
  if (!dados.length) return;
  try {
    await api.post("/api/dados-fonte-cmed", { items: dados.map(({ id: _id, criado_em: _c, ...rest }) => rest) });
  } catch (err) {
    console.warn("[CMED] Erro ao persistir:", err);
  }
}

async function buscarCMEDLocal(filtro: FiltroCMED): Promise<DadosFonteCMED[]> {
  const params = new URLSearchParams();
  params.set("limite", String(filtro.limite ?? 50));
  if (filtro.registroAnvisa) params.set("registro_anvisa", filtro.registroAnvisa);
  if (filtro.principioAtivo) params.set("principio_ativo", filtro.principioAtivo);
  if (filtro.termo) params.set("termo", filtro.termo);
  if (filtro.laboratorio) params.set("laboratorio", filtro.laboratorio);

  const { data } = await api.get<{ data: DadosFonteCMED[] }>(`/api/dados-fonte-cmed?${params}`);
  return (data ?? []) as DadosFonteCMED[];
}

// ╔══════════════════════════════════════════════════════╗
// ║  Normalização genérica — Fase 6                     ║
// ╚══════════════════════════════════════════════════════╝

export type FonteTipoFase6 = "bps" | "sinapi" | "conab" | "ceasa" | "cmed";

export interface DadosFonteGenericoFase6 {
  fonte_tipo: FonteTipoFase6;
  fonte_detalhe?: string;
  descricao_item: string;
  orgao: string;
  uf?: string;
  valor_unitario: number;
  data_referencia: string | null;
  documento_url: string | null;
  /** Campos extras por fonte */
  codigo_referencia?: string;         // Código BR (BPS), Código SINAPI, Registro ANVISA
  apresentacao?: string;              // BPS/CMED
  media_ponderada?: number | null;    // BPS
  valor_minimo?: number | null;       // CEASA
  valor_maximo?: number | null;       // CEASA
  pmvg?: number | null;              // CMED
}

export function normalizarDadosFonteFase6(
  dados: DadosFonteBPS | DadosFonteSINAPI | DadosFonteCONAB | DadosFonteCEASA | DadosFonteCMED,
  tipo: FonteTipoFase6
): DadosFonteGenericoFase6 {
  switch (tipo) {
    case "bps": {
      const d = dados as DadosFonteBPS;
      return {
        fonte_tipo: "bps",
        fonte_detalhe: "BPS",
        descricao_item: d.descricao_item,
        orgao: d.instituicao ?? "BPS/MS",
        uf: d.uf ?? undefined,
        valor_unitario: d.valor_unitario,
        data_referencia: d.data_compra,
        documento_url: null,
        codigo_referencia: d.codigo_br ?? undefined,
        apresentacao: d.apresentacao ?? undefined,
        media_ponderada: d.media_ponderada,
      };
    }
    case "sinapi": {
      const d = dados as DadosFonteSINAPI;
      return {
        fonte_tipo: "sinapi",
        fonte_detalhe: "SINAPI",
        descricao_item: d.descricao_item,
        orgao: "CAIXA/IBGE",
        uf: d.uf,
        valor_unitario: d.valor_unitario,
        data_referencia: d.mes_referencia,
        documento_url: null,
        codigo_referencia: d.codigo_sinapi,
      };
    }
    case "conab": {
      const d = dados as DadosFonteCONAB;
      return {
        fonte_tipo: "conab",
        fonte_detalhe: "CONAB",
        descricao_item: d.descricao_item,
        orgao: "CONAB",
        uf: d.uf,
        valor_unitario: d.valor_unitario,
        data_referencia: d.data_referencia,
        documento_url: null,
      };
    }
    case "ceasa": {
      const d = dados as DadosFonteCEASA;
      return {
        fonte_tipo: "ceasa",
        fonte_detalhe: "CEASA-MG",
        descricao_item: `${d.descricao_item}${d.variedade ? ` (${d.variedade})` : ""}`,
        orgao: "CEASA-MG",
        valor_unitario: d.valor_comum,
        data_referencia: d.data_cotacao,
        documento_url: null,
        valor_minimo: d.valor_minimo,
        valor_maximo: d.valor_maximo,
      };
    }
    case "cmed": {
      const d = dados as DadosFonteCMED;
      return {
        fonte_tipo: "cmed",
        fonte_detalhe: "CMED/ANVISA",
        descricao_item: d.descricao_produto,
        orgao: d.laboratorio ?? "ANVISA",
        valor_unitario: d.pmvg_sem_impostos ?? d.pmvg_com_impostos ?? d.pmc ?? 0,
        data_referencia: d.data_publicacao,
        documento_url: null,
        codigo_referencia: d.registro_anvisa ?? undefined,
        apresentacao: d.apresentacao ?? undefined,
        pmvg: d.pmvg_sem_impostos,
      };
    }
  }
}
