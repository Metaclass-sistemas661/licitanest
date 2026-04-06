// Serviço de Crawlers — Integração com Fontes de Preços Governamentais
// PNCP, Painel de Preços, TCEs estaduais (todos os 27 estados), Portais de Transparência
import { api } from "@/lib/api";
import type {
  DadosFontePNCP,
  DadosFontePainel,
  DadosFonteTCE,
  ExecucaoCrawler,
  FiltroFonte,
  StatusExecucao,
} from "@/tipos";
import { buscarCache, salvarCache } from "./cacheConsultas";

// ── UFs do Brasil ───────────────────────────────────
export const UFS_BRASIL = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
] as const;

export type UF = (typeof UFS_BRASIL)[number];

// ╔══════════════════════════════════════════════════════╗
// ║  Registro de TCEs Estaduais e Portais               ║
// ╚══════════════════════════════════════════════════════╝

export interface PortalTCE {
  uf: UF;
  nome: string;
  sigla: string;
  urlBase: string;
  urlApi: string | null;
  endpointContratos: string | null;
  endpointPrecos: string | null;
  ativo: boolean;
  observacoes: string;
}

/**
 * Registro completo dos 27 TCEs estaduais do Brasil com URLs.
 * Portais com urlApi não-nulo possuem API de dados abertos utilizável.
 */
export const PORTAIS_TCE: PortalTCE[] = [
  // ── Sudeste ──
  { uf: "MG", nome: "TCE de Minas Gerais", sigla: "TCE/MG",
    urlBase: "https://www.tce.mg.gov.br",
    urlApi: "https://dadosabertos.tce.mg.gov.br/api/v1",
    endpointContratos: "/contratos", endpointPrecos: "/precos",
    ativo: true, observacoes: "API REST — Dados Abertos" },
  { uf: "SP", nome: "TCE de São Paulo", sigla: "TCE/SP",
    urlBase: "https://www.tce.sp.gov.br",
    urlApi: "https://transparencia.tce.sp.gov.br/api",
    endpointContratos: "/contratacoes", endpointPrecos: "/precos",
    ativo: true, observacoes: "Transparência Municipal" },
  { uf: "RJ", nome: "TCE do Rio de Janeiro", sigla: "TCE/RJ",
    urlBase: "https://www.tce.rj.gov.br",
    urlApi: "https://dadosabertos.tce.rj.gov.br/api/v1",
    endpointContratos: "/contratos", endpointPrecos: null,
    ativo: true, observacoes: "Dados Abertos — contratos municipais" },
  { uf: "ES", nome: "TCE do Espírito Santo", sigla: "TCE/ES",
    urlBase: "https://www.tce.es.gov.br",
    urlApi: "https://dados.tce.es.gov.br/api",
    endpointContratos: "/contratos", endpointPrecos: null,
    ativo: true, observacoes: "CidadES Fiscal" },
  // ── Sul ──
  { uf: "RS", nome: "TCE do Rio Grande do Sul", sigla: "TCE/RS",
    urlBase: "https://www.tce.rs.gov.br",
    urlApi: "https://dados.tce.rs.gov.br/api",
    endpointContratos: "/contratos", endpointPrecos: "/licitacoes/precos",
    ativo: true, observacoes: "LicitaCon" },
  { uf: "PR", nome: "TCE do Paraná", sigla: "TCE/PR",
    urlBase: "https://www.tce.pr.gov.br",
    urlApi: "https://servicos.tce.pr.gov.br/api",
    endpointContratos: "/contratos", endpointPrecos: null,
    ativo: true, observacoes: "SIM-AM" },
  { uf: "SC", nome: "TCE de Santa Catarina", sigla: "TCE/SC",
    urlBase: "https://www.tce.sc.gov.br",
    urlApi: "https://painel.tce.sc.gov.br/api",
    endpointContratos: "/contratos", endpointPrecos: null,
    ativo: true, observacoes: "e-Sfinge" },
  // ── Nordeste ──
  { uf: "BA", nome: "TCE da Bahia", sigla: "TCE/BA",
    urlBase: "https://www.tce.ba.gov.br",
    urlApi: "https://dadosabertos.tce.ba.gov.br/api",
    endpointContratos: "/contratos", endpointPrecos: null,
    ativo: true, observacoes: "Dados Abertos — licitações" },
  { uf: "PE", nome: "TCE de Pernambuco", sigla: "TCE/PE",
    urlBase: "https://www.tce.pe.gov.br",
    urlApi: "https://sistemas.tce.pe.gov.br/api",
    endpointContratos: "/contratos", endpointPrecos: null,
    ativo: true, observacoes: "SAGRES" },
  { uf: "CE", nome: "TCE do Ceará", sigla: "TCE/CE",
    urlBase: "https://www.tce.ce.gov.br",
    urlApi: "https://api.tce.ce.gov.br/v1",
    endpointContratos: "/contratos", endpointPrecos: null,
    ativo: true, observacoes: "S2GPR" },
  { uf: "MA", nome: "TCE do Maranhão", sigla: "TCE/MA",
    urlBase: "https://www.tce.ma.gov.br",
    urlApi: null, endpointContratos: null, endpointPrecos: null,
    ativo: true, observacoes: "Portal de Transparência" },
  { uf: "PB", nome: "TCE da Paraíba", sigla: "TCE/PB",
    urlBase: "https://www.tce.pb.gov.br",
    urlApi: "https://dados.tce.pb.gov.br/api",
    endpointContratos: "/contratos", endpointPrecos: null,
    ativo: true, observacoes: "SAGRES Online" },
  { uf: "RN", nome: "TCE do Rio Grande do Norte", sigla: "TCE/RN",
    urlBase: "https://www.tce.rn.gov.br",
    urlApi: null, endpointContratos: null, endpointPrecos: null,
    ativo: true, observacoes: "Portal de Transparência" },
  { uf: "AL", nome: "TCE de Alagoas", sigla: "TCE/AL",
    urlBase: "https://www.tce.al.gov.br",
    urlApi: null, endpointContratos: null, endpointPrecos: null,
    ativo: true, observacoes: "Portal de Transparência" },
  { uf: "SE", nome: "TCE de Sergipe", sigla: "TCE/SE",
    urlBase: "https://www.tce.se.gov.br",
    urlApi: null, endpointContratos: null, endpointPrecos: null,
    ativo: true, observacoes: "Portal de Transparência" },
  { uf: "PI", nome: "TCE do Piauí", sigla: "TCE/PI",
    urlBase: "https://www.tce.pi.gov.br",
    urlApi: null, endpointContratos: null, endpointPrecos: null,
    ativo: true, observacoes: "Portal de Transparência" },
  // ── Centro-Oeste ──
  { uf: "GO", nome: "TCE de Goiás", sigla: "TCE/GO",
    urlBase: "https://www.tce.go.gov.br",
    urlApi: "https://dados.tce.go.gov.br/api",
    endpointContratos: "/contratos", endpointPrecos: null,
    ativo: true, observacoes: "Dados Abertos TCE/GO" },
  { uf: "MT", nome: "TCE de Mato Grosso", sigla: "TCE/MT",
    urlBase: "https://www.tce.mt.gov.br",
    urlApi: "https://dadosabertos.tce.mt.gov.br/api",
    endpointContratos: "/contratos", endpointPrecos: null,
    ativo: true, observacoes: "GEO-Obras" },
  { uf: "MS", nome: "TCE de Mato Grosso do Sul", sigla: "TCE/MS",
    urlBase: "https://www.tce.ms.gov.br",
    urlApi: null, endpointContratos: null, endpointPrecos: null,
    ativo: true, observacoes: "Portal de Transparência" },
  { uf: "DF", nome: "TCDF (Distrito Federal)", sigla: "TCDF",
    urlBase: "https://www.tc.df.gov.br",
    urlApi: "https://dados.tc.df.gov.br/api",
    endpointContratos: "/contratos", endpointPrecos: null,
    ativo: true, observacoes: "SINCONFI" },
  // ── Norte ──
  { uf: "PA", nome: "TCE do Pará", sigla: "TCE/PA",
    urlBase: "https://www.tce.pa.gov.br",
    urlApi: null, endpointContratos: null, endpointPrecos: null,
    ativo: true, observacoes: "Portal de Transparência" },
  { uf: "AM", nome: "TCE do Amazonas", sigla: "TCE/AM",
    urlBase: "https://www.tce.am.gov.br",
    urlApi: null, endpointContratos: null, endpointPrecos: null,
    ativo: true, observacoes: "e-Contas" },
  { uf: "RO", nome: "TCE de Rondônia", sigla: "TCE/RO",
    urlBase: "https://www.tce.ro.gov.br",
    urlApi: null, endpointContratos: null, endpointPrecos: null,
    ativo: true, observacoes: "SIGAP" },
  { uf: "TO", nome: "TCE do Tocantins", sigla: "TCE/TO",
    urlBase: "https://www.tce.to.gov.br",
    urlApi: null, endpointContratos: null, endpointPrecos: null,
    ativo: true, observacoes: "SICAP" },
  { uf: "AC", nome: "TCE do Acre", sigla: "TCE/AC",
    urlBase: "https://www.tce.ac.gov.br",
    urlApi: null, endpointContratos: null, endpointPrecos: null,
    ativo: true, observacoes: "Portal de Transparência" },
  { uf: "AP", nome: "TCE do Amapá", sigla: "TCE/AP",
    urlBase: "https://www.tce.ap.gov.br",
    urlApi: null, endpointContratos: null, endpointPrecos: null,
    ativo: true, observacoes: "Portal de Transparência" },
  { uf: "RR", nome: "TCE de Roraima", sigla: "TCE/RR",
    urlBase: "https://www.tce.rr.gov.br",
    urlApi: null, endpointContratos: null, endpointPrecos: null,
    ativo: true, observacoes: "Portal de Transparência" },
];

/** Obter portal por UF */
export function obterPortalTCE(uf: UF): PortalTCE | undefined {
  return PORTAIS_TCE.find((p) => p.uf === uf);
}

/** Listar portais com API disponível */
export function listarPortaisComAPI(): PortalTCE[] {
  return PORTAIS_TCE.filter((p) => p.ativo && p.urlApi);
}

/** Listar todos os portais ativos */
export function listarPortaisAtivos(): PortalTCE[] {
  return PORTAIS_TCE.filter((p) => p.ativo);
}

/** Regiões geográficas com UFs */
export const REGIOES_BRASIL: Record<string, UF[]> = {
  "Sudeste": ["ES", "MG", "RJ", "SP"],
  "Sul": ["PR", "RS", "SC"],
  "Nordeste": ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"],
  "Centro-Oeste": ["DF", "GO", "MS", "MT"],
  "Norte": ["AC", "AM", "AP", "PA", "RO", "RR", "TO"],
};

/** Nomes de UF por extenso */
export const NOMES_UF: Record<UF, string> = {
  AC: "Acre", AL: "Alagoas", AM: "Amazonas", AP: "Amapá",
  BA: "Bahia", CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo",
  GO: "Goiás", MA: "Maranhão", MG: "Minas Gerais", MS: "Mato Grosso do Sul",
  MT: "Mato Grosso", PA: "Pará", PB: "Paraíba", PE: "Pernambuco",
  PI: "Piauí", PR: "Paraná", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte",
  RO: "Rondônia", RR: "Roraima", RS: "Rio Grande do Sul", SC: "Santa Catarina",
  SE: "Sergipe", SP: "São Paulo", TO: "Tocantins",
};

// ── URLs base das APIs federais ─────────────────────
const PNCP_API_BASE = "https://pncp.gov.br/api/consulta/v1";
const PAINEL_API_BASE = "https://paineldeprecos.planejamento.gov.br/api/v1";

// ╔══════════════════════════════════════════════════════╗
// ║  Execuções de Crawler                               ║
// ╚══════════════════════════════════════════════════════╝

export async function registrarInicioExecucao(fonteId: string): Promise<string> {
  const { data } = await api.post<{ data: { id: string } }>("/api/execucoes-crawler", {
    fonte_id: fonteId,
    status: "executando" as StatusExecucao,
    itens_processados: 0,
    itens_novos: 0,
    itens_atualizados: 0,
    iniciado_em: new Date().toISOString(),
  });
  return data.id;
}

export async function finalizarExecucao(
  execucaoId: string,
  resultado: {
    status: StatusExecucao;
    itens_processados: number;
    itens_novos: number;
    itens_atualizados: number;
    erro_mensagem?: string;
  }
): Promise<void> {
  const agora = new Date();
  const { data: exec } = await api.get<{ data: { iniciado_em: string } }>(
    `/api/execucoes-crawler/${encodeURIComponent(execucaoId)}`
  );

  const duracao = exec
    ? Math.round((agora.getTime() - new Date(exec.iniciado_em).getTime()) / 1000)
    : null;

  await api.put(`/api/execucoes-crawler/${encodeURIComponent(execucaoId)}`, {
    ...resultado,
    finalizado_em: agora.toISOString(),
    duracao_segundos: duracao,
  });
}

export async function listarExecucoes(fonteId?: string, limite = 20): Promise<ExecucaoCrawler[]> {
  const params = new URLSearchParams();
  params.set("limite", String(limite));
  if (fonteId) params.set("fonte_id", fonteId);

  const { data } = await api.get<{ data: ExecucaoCrawler[] }>(
    `/api/execucoes-crawler?${params}`
  );
  return (data ?? []) as ExecucaoCrawler[];
}

// ╔══════════════════════════════════════════════════════╗
// ║  PNCP — Portal Nacional de Contratações Públicas    ║
// ╚══════════════════════════════════════════════════════╝

export async function buscarPNCP(filtro: FiltroFonte): Promise<DadosFontePNCP[]> {
  const cacheKey = { fonte: "pncp", ...filtro };
  const cached = await buscarCache<DadosFontePNCP[]>("pncp", cacheKey);
  if (cached) return cached;

  try {
    const resultados = await consultarAPIPNCP(filtro);
    if (resultados.length > 0) {
      await persistirDadosPNCP(resultados);
      await salvarCache("pncp", cacheKey, resultados);
      return resultados;
    }
  } catch (err) {
    console.warn("[PNCP] API indisponível, usando dados locais:", err);
  }

  const locais = await buscarPNCPLocal(filtro);
  if (locais.length > 0) await salvarCache("pncp", cacheKey, locais);
  return locais;
}

async function consultarAPIPNCP(filtro: FiltroFonte): Promise<DadosFontePNCP[]> {
  const params = new URLSearchParams();
  params.set("q", filtro.termo);
  if (filtro.uf) params.set("uf", filtro.uf);
  if (filtro.dataInicio) params.set("dataInicial", filtro.dataInicio);
  if (filtro.dataFim) params.set("dataFinal", filtro.dataFim);
  params.set("pagina", "1");
  params.set("tamanhoPagina", String(filtro.limite ?? 50));

  const resp = await fetch(`${PNCP_API_BASE}/contratos?${params}`, {
    signal: AbortSignal.timeout(15000),
    headers: { Accept: "application/json" },
  });
  if (!resp.ok) throw new Error(`PNCP HTTP ${resp.status}`);
  const json = await resp.json();

  const items: unknown[] = json.data ?? json.resultado ?? json ?? [];
  return (Array.isArray(items) ? items : []).map((item: unknown) => {
    const raw = item as Record<string, unknown>;
    return {
      id: crypto.randomUUID(),
      orgao: String(raw.nomeOrgao ?? raw.orgao ?? ""),
      cnpj_orgao: raw.cnpjOrgao ? String(raw.cnpjOrgao) : null,
      uf_orgao: raw.uf ? String(raw.uf) : null,
      cidade_orgao: raw.municipio ? String(raw.municipio) : null,
      descricao_item: String(raw.descricao ?? raw.objeto ?? filtro.termo),
      unidade: raw.unidadeMedida ? String(raw.unidadeMedida) : null,
      quantidade: raw.quantidade ? Number(raw.quantidade) : null,
      valor_unitario: Number(raw.valorUnitario ?? raw.valor ?? 0),
      valor_total: raw.valorTotal ? Number(raw.valorTotal) : null,
      data_homologacao: raw.dataHomologacao ? String(raw.dataHomologacao) : null,
      numero_contrato: raw.numeroContrato ? String(raw.numeroContrato) : null,
      modalidade: raw.modalidade ? String(raw.modalidade) : null,
      documento_url: raw.linkDocumento ? String(raw.linkDocumento) : null,
      codigo_item: raw.codigoItem ? String(raw.codigoItem) : null,
      criado_em: new Date().toISOString(),
    };
  }) as DadosFontePNCP[];
}

async function persistirDadosPNCP(dados: DadosFontePNCP[]): Promise<void> {
  if (!dados.length) return;
  try {
    await api.post("/api/dados-fonte-pncp", { items: dados.map(({ id: _id, criado_em: _c, ...rest }) => rest) });
  } catch (err) {
    console.warn("[PNCP] Erro ao persistir:", err);
  }
}

async function buscarPNCPLocal(filtro: FiltroFonte): Promise<DadosFontePNCP[]> {
  const params = new URLSearchParams();
  params.set("termo", filtro.termo);
  params.set("limite", String(filtro.limite ?? 50));
  if (filtro.uf) params.set("uf", filtro.uf);
  if (filtro.dataInicio) params.set("data_inicio", filtro.dataInicio);
  if (filtro.dataFim) params.set("data_fim", filtro.dataFim);

  const { data } = await api.get<{ data: DadosFontePNCP[] }>(`/api/dados-fonte-pncp?${params}`);
  return (data ?? []) as DadosFontePNCP[];
}

// ╔══════════════════════════════════════════════════════╗
// ║  Painel de Preços — Governo Federal                 ║
// ╚══════════════════════════════════════════════════════╝

export async function buscarPainelPrecos(filtro: FiltroFonte): Promise<DadosFontePainel[]> {
  const cacheKey = { fonte: "painel_precos", ...filtro };
  const cached = await buscarCache<DadosFontePainel[]>("painel_precos", cacheKey);
  if (cached) return cached;

  try {
    const resultados = await consultarAPIPainel(filtro);
    if (resultados.length > 0) {
      await persistirDadosPainel(resultados);
      await salvarCache("painel_precos", cacheKey, resultados);
      return resultados;
    }
  } catch (err) {
    console.warn("[Painel] API indisponível, usando dados locais:", err);
  }

  const locais = await buscarPainelLocal(filtro);
  if (locais.length > 0) await salvarCache("painel_precos", cacheKey, locais);
  return locais;
}

async function consultarAPIPainel(filtro: FiltroFonte): Promise<DadosFontePainel[]> {
  const params = new URLSearchParams();
  params.set("termo", filtro.termo);
  if (filtro.dataInicio) params.set("dataInicio", filtro.dataInicio);
  if (filtro.dataFim) params.set("dataFim", filtro.dataFim);
  params.set("pagina", "1");
  params.set("tamanho", String(filtro.limite ?? 50));

  const resp = await fetch(`${PAINEL_API_BASE}/precos?${params}`, {
    signal: AbortSignal.timeout(15000),
    headers: { Accept: "application/json" },
  });
  if (!resp.ok) throw new Error(`Painel HTTP ${resp.status}`);
  const json = await resp.json();

  const items: unknown[] = json.data ?? json.resultado ?? json ?? [];
  return (Array.isArray(items) ? items : []).map((item: unknown) => {
    const raw = item as Record<string, unknown>;
    return {
      id: crypto.randomUUID(),
      orgao: String(raw.nomeOrgao ?? raw.orgao ?? ""),
      descricao_item: String(raw.descricao ?? raw.objeto ?? filtro.termo),
      unidade: raw.unidadeMedida ? String(raw.unidadeMedida) : null,
      valor_unitario: Number(raw.valorUnitario ?? raw.preco ?? 0),
      data_compra: raw.dataCompra ? String(raw.dataCompra) : null,
      modalidade: raw.modalidade ? String(raw.modalidade) : null,
      numero_processo: raw.numeroProcesso ? String(raw.numeroProcesso) : null,
      documento_url: raw.linkDocumento ? String(raw.linkDocumento) : null,
      criado_em: new Date().toISOString(),
    };
  }) as DadosFontePainel[];
}

async function persistirDadosPainel(dados: DadosFontePainel[]): Promise<void> {
  if (!dados.length) return;
  try {
    await api.post("/api/dados-fonte-painel", { items: dados.map(({ id: _id, criado_em: _c, ...rest }) => rest) });
  } catch (err) {
    console.warn("[Painel] Erro ao persistir:", err);
  }
}

async function buscarPainelLocal(filtro: FiltroFonte): Promise<DadosFontePainel[]> {
  const params = new URLSearchParams();
  params.set("termo", filtro.termo);
  params.set("limite", String(filtro.limite ?? 50));
  if (filtro.dataInicio) params.set("data_inicio", filtro.dataInicio);
  if (filtro.dataFim) params.set("data_fim", filtro.dataFim);

  const { data } = await api.get<{ data: DadosFontePainel[] }>(`/api/dados-fonte-painel?${params}`);
  return (data ?? []) as DadosFontePainel[];
}

// ╔══════════════════════════════════════════════════════╗
// ║  TCEs ESTADUAIS — Consulta Multi-Estado             ║
// ╚══════════════════════════════════════════════════════╝

/**
 * Busca contratos/preços em um TCE específico por UF.
 * Tenta API quando disponível, senão consulta dados locais na API.
 */
export async function buscarTCE(uf: UF, filtro: FiltroFonte): Promise<DadosFonteTCE[]> {
  const chave = `tce_${uf.toLowerCase()}`;
  const cacheKey = { fonte: chave, uf, ...filtro };

  const cached = await buscarCache<DadosFonteTCE[]>(chave, cacheKey);
  if (cached) return cached;

  const portal = obterPortalTCE(uf);

  if (portal?.urlApi && portal.endpointContratos) {
    try {
      const resultados = await consultarAPITCE(portal, filtro);
      if (resultados.length > 0) {
        await persistirDadosTCE(resultados);
        await salvarCache(chave, cacheKey, resultados);
        return resultados;
      }
    } catch (err) {
      console.warn(`[${portal.sigla}] API indisponível, dados locais:`, err);
    }
  }

  const locais = await buscarTCELocal(uf, filtro);
  if (locais.length > 0) await salvarCache(chave, cacheKey, locais);
  return locais;
}

/**
 * Busca em múltiplos TCEs em paralelo.
 */
export async function buscarMultiplosTCEs(ufs: UF[], filtro: FiltroFonte): Promise<DadosFonteTCE[]> {
  const resultados = await Promise.allSettled(ufs.map((uf) => buscarTCE(uf, filtro)));
  const todos: DadosFonteTCE[] = [];
  for (const r of resultados) {
    if (r.status === "fulfilled") todos.push(...r.value);
  }
  todos.sort((a, b) => a.valor_unitario - b.valor_unitario);
  return todos;
}

/**
 * Busca em todos os TCEs de uma região geográfica.
 */
export async function buscarTCEsPorRegiao(regiao: string, filtro: FiltroFonte): Promise<DadosFonteTCE[]> {
  const ufs = REGIOES_BRASIL[regiao];
  if (!ufs) return [];
  return buscarMultiplosTCEs(ufs, filtro);
}

/** Retrocompatibilidade — busca apenas MG */
export async function buscarTCEMG(filtro: FiltroFonte): Promise<DadosFonteTCE[]> {
  return buscarTCE("MG", filtro);
}

async function consultarAPITCE(portal: PortalTCE, filtro: FiltroFonte): Promise<DadosFonteTCE[]> {
  const params = new URLSearchParams();
  params.set("q", filtro.termo);
  if (filtro.municipio) params.set("municipio", filtro.municipio);
  if (filtro.dataInicio) params.set("dataInicio", filtro.dataInicio);
  if (filtro.dataFim) params.set("dataFim", filtro.dataFim);
  params.set("pagina", "1");
  params.set("tamanhoPagina", String(filtro.limite ?? 50));

  const resp = await fetch(`${portal.urlApi}${portal.endpointContratos}?${params}`, {
    signal: AbortSignal.timeout(15000),
    headers: { Accept: "application/json" },
  });
  if (!resp.ok) throw new Error(`${portal.sigla} HTTP ${resp.status}`);
  const json = await resp.json();

  const items: unknown[] = json.data ?? json.resultado ?? json ?? [];
  return (Array.isArray(items) ? items : []).map((item: unknown) => {
    const raw = item as Record<string, unknown>;
    return {
      id: crypto.randomUUID(),
      orgao: String(raw.nomeOrgao ?? raw.orgao ?? ""),
      uf: portal.uf,
      municipio: raw.municipio ? String(raw.municipio) : null,
      descricao_item: String(raw.descricao ?? raw.objeto ?? filtro.termo),
      unidade: raw.unidadeMedida ? String(raw.unidadeMedida) : null,
      valor_unitario: Number(raw.valorUnitario ?? raw.valor ?? 0),
      data_contrato: raw.dataContrato ? String(raw.dataContrato) : null,
      numero_contrato: raw.numeroContrato ? String(raw.numeroContrato) : null,
      documento_url: raw.linkDocumento ? String(raw.linkDocumento) : null,
      fonte_tce: portal.sigla,
      criado_em: new Date().toISOString(),
    };
  }) as DadosFonteTCE[];
}

async function persistirDadosTCE(dados: DadosFonteTCE[]): Promise<void> {
  if (!dados.length) return;
  try {
    await api.post("/api/dados-fonte-tce", { items: dados.map(({ id: _id, criado_em: _c, ...rest }) => rest) });
  } catch (err) {
    console.warn("[TCE] Erro ao persistir:", err);
  }
}

async function buscarTCELocal(uf: UF, filtro: FiltroFonte): Promise<DadosFonteTCE[]> {
  const params = new URLSearchParams();
  params.set("termo", filtro.termo);
  params.set("uf", uf);
  params.set("limite", String(filtro.limite ?? 50));
  if (filtro.municipio) params.set("municipio", filtro.municipio);
  if (filtro.dataInicio) params.set("data_inicio", filtro.dataInicio);
  if (filtro.dataFim) params.set("data_fim", filtro.dataFim);

  const { data } = await api.get<{ data: DadosFonteTCE[] }>(`/api/dados-fonte-tce?${params}`);
  return (data ?? []).map((d) => ({
    ...d,
    uf: d.uf ?? uf,
    fonte_tce: d.fonte_tce ?? `TCE/${uf}`,
  })) as DadosFonteTCE[];
}

// ╔══════════════════════════════════════════════════════╗
// ║  Importação de preço → item da cesta                ║
// ╚══════════════════════════════════════════════════════╝

export type FonteTipoCrawler = "pncp" | "painel_precos" | "tce";

export interface DadosFonteGenerico {
  fonte_tipo: FonteTipoCrawler;
  fonte_detalhe?: string; // ex: "TCE/MG", "TCE/SP"
  descricao_item: string;
  orgao: string;
  uf?: string;
  municipio?: string;
  valor_unitario: number;
  data_referencia: string | null;
  documento_url: string | null;
}

export function normalizarDadosFonte(
  dados: DadosFontePNCP | DadosFontePainel | DadosFonteTCE,
  tipo: FonteTipoCrawler
): DadosFonteGenerico {
  if (tipo === "pncp") {
    const d = dados as DadosFontePNCP;
    return {
      fonte_tipo: "pncp",
      descricao_item: d.descricao_item,
      orgao: d.orgao,
      uf: d.uf_orgao ?? undefined,
      valor_unitario: d.valor_unitario,
      data_referencia: d.data_homologacao,
      documento_url: d.documento_url,
    };
  }
  if (tipo === "painel_precos") {
    const d = dados as DadosFontePainel;
    return {
      fonte_tipo: "painel_precos",
      descricao_item: d.descricao_item,
      orgao: d.orgao,
      valor_unitario: d.valor_unitario,
      data_referencia: d.data_compra,
      documento_url: d.documento_url,
    };
  }
  const d = dados as DadosFonteTCE;
  return {
    fonte_tipo: "tce",
    fonte_detalhe: d.fonte_tce,
    descricao_item: d.descricao_item,
    orgao: d.orgao,
    uf: d.uf,
    municipio: d.municipio ?? undefined,
    valor_unitario: d.valor_unitario,
    data_referencia: d.data_contrato,
    documento_url: d.documento_url,
  };
}
