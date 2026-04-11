// ═══════════════════════════════════════════════════════════════════════════════
// Serviço de Crawlers — Fase 7: Fontes P2 + P3
// CUB/SINDUSCON, BNDES, SIA/SIH-SUS, Agências Reguladoras, INCRA/EMBRAPA
// ═══════════════════════════════════════════════════════════════════════════════
import { api } from "@/lib/api";
import type {
  DadosFonteCUB,
  DadosFonteBNDES,
  DadosFonteSIASIH,
  DadosFonteAgenciasReg,
  DadosFonteINCRA,
  FiltroCUB,
  FiltroBNDES,
  FiltroSIASIH,
  FiltroAgenciasReg,
  FiltroINCRA,
} from "@/tipos";
import { buscarCache, salvarCache } from "./cacheConsultas";

// ── URLs das APIs ──────────────────────────
const CUB_API = "https://sindusconsp.com.br/wp-json/api/cub";
const BNDES_API = "https://www.cartaobndes.gov.br/cartaobndes/PaginaServico";
const SIA_SIH_API = "https://apidadosabertos.saude.gov.br";
const ANEEL_API = "https://dadosabertos.aneel.gov.br/api/3/action";
const ANATEL_API = "https://informacoes.anatel.gov.br/paineis/api";
const ANTT_API = "https://dados.antt.gov.br/dataset";
const INCRA_API = "https://www.gov.br/incra/pt-br/assuntos/governanca-fundiaria";

// ╔══════════════════════════════════════════════════════╗
// ║  7.9 — CUB/SINDUSCON — Custo Unitário Básico        ║
// ╚══════════════════════════════════════════════════════╝

export async function buscarCUB(filtro: FiltroCUB): Promise<DadosFonteCUB[]> {
  const cacheKey = { fonte: "cub", ...filtro };
  const cached = await buscarCache<DadosFonteCUB[]>("cub", cacheKey);
  if (cached) return cached;

  try {
    const resultados = await consultarAPICUB(filtro);
    if (resultados.length > 0) {
      await persistirDadosCUB(resultados);
      await salvarCache("cub", cacheKey, resultados);
      return resultados;
    }
  } catch (err) {
    console.warn("[CUB] API indisponível, usando dados locais:", err);
  }

  const locais = await buscarCUBLocal(filtro);
  if (locais.length > 0) await salvarCache("cub", cacheKey, locais);
  return locais;
}

async function consultarAPICUB(filtro: FiltroCUB): Promise<DadosFonteCUB[]> {
  const params = new URLSearchParams();
  if (filtro.uf) params.set("uf", filtro.uf);
  if (filtro.padraoConstrutivo) params.set("padrao", filtro.padraoConstrutivo);
  if (filtro.mesReferencia) params.set("mes", filtro.mesReferencia);
  params.set("limite", String(filtro.limite ?? 50));

  const resp = await fetch(`${CUB_API}/valores?${params}`);
  if (!resp.ok) throw new Error(`CUB HTTP ${resp.status}`);
  const json = await resp.json();
  return (json.data ?? json ?? []).map((r: Record<string, unknown>) => ({
    id: r.id ?? crypto.randomUUID(),
    uf: r.uf ?? "",
    padrao_construtivo: r.padrao_construtivo ?? r.padrao ?? "",
    tipo_custo: r.tipo_custo ?? "total",
    valor_m2: Number(r.valor_m2 ?? r.valor ?? 0),
    mes_referencia: r.mes_referencia ?? r.mes ?? "",
    criado_em: r.criado_em ?? new Date().toISOString(),
  }));
}

async function persistirDadosCUB(dados: DadosFonteCUB[]): Promise<void> {
  try { await api.post("/api/dados-fonte-cub", dados); } catch { /* silent */ }
}

async function buscarCUBLocal(filtro: FiltroCUB): Promise<DadosFonteCUB[]> {
  const params = new URLSearchParams();
  if (filtro.uf) params.set("uf", filtro.uf);
  if (filtro.padraoConstrutivo) params.set("padraoConstrutivo", filtro.padraoConstrutivo);
  if (filtro.mesReferencia) params.set("mesReferencia", filtro.mesReferencia);
  params.set("limite", String(filtro.limite ?? 50));
  const { data } = await api.get<{ data: DadosFonteCUB[] }>(`/api/dados-fonte-cub?${params}`);
  return data;
}

// ╔══════════════════════════════════════════════════════╗
// ║  7.12 — BNDES — Cartão BNDES Credenciados           ║
// ╚══════════════════════════════════════════════════════╝

export async function buscarBNDES(filtro: FiltroBNDES): Promise<DadosFonteBNDES[]> {
  const cacheKey = { fonte: "bndes", ...filtro };
  const cached = await buscarCache<DadosFonteBNDES[]>("bndes", cacheKey);
  if (cached) return cached;

  try {
    const resultados = await consultarAPIBNDES(filtro);
    if (resultados.length > 0) {
      await persistirDadosBNDES(resultados);
      await salvarCache("bndes", cacheKey, resultados);
      return resultados;
    }
  } catch (err) {
    console.warn("[BNDES] API indisponível, usando dados locais:", err);
  }

  const locais = await buscarBNDESLocal(filtro);
  if (locais.length > 0) await salvarCache("bndes", cacheKey, locais);
  return locais;
}

async function consultarAPIBNDES(filtro: FiltroBNDES): Promise<DadosFonteBNDES[]> {
  const params = new URLSearchParams();
  if (filtro.termo) params.set("descricao", filtro.termo);
  if (filtro.categoria) params.set("categoria", filtro.categoria);
  params.set("limite", String(filtro.limite ?? 50));

  const resp = await fetch(`${BNDES_API}/ConsultaProdutos?${params}`);
  if (!resp.ok) throw new Error(`BNDES HTTP ${resp.status}`);
  const json = await resp.json();
  return (json.data ?? json ?? []).map((r: Record<string, unknown>) => ({
    id: r.id ?? crypto.randomUUID(),
    codigo_produto: r.codigo_produto ?? r.codigo ?? null,
    descricao: r.descricao ?? r.nome ?? "",
    categoria: r.categoria ?? null,
    fabricante: r.fabricante ?? null,
    fornecedor: r.fornecedor ?? null,
    preco: Number(r.preco ?? r.valor ?? 0),
    condicao_pagamento: r.condicao_pagamento ?? null,
    data_catalogo: r.data_catalogo ?? null,
    criado_em: r.criado_em ?? new Date().toISOString(),
  }));
}

async function persistirDadosBNDES(dados: DadosFonteBNDES[]): Promise<void> {
  try { await api.post("/api/dados-fonte-bndes", dados); } catch { /* silent */ }
}

async function buscarBNDESLocal(filtro: FiltroBNDES): Promise<DadosFonteBNDES[]> {
  const params = new URLSearchParams();
  if (filtro.termo) params.set("termo", filtro.termo);
  if (filtro.categoria) params.set("categoria", filtro.categoria);
  params.set("limite", String(filtro.limite ?? 50));
  const { data } = await api.get<{ data: DadosFonteBNDES[] }>(`/api/dados-fonte-bndes?${params}`);
  return data;
}

// ╔══════════════════════════════════════════════════════╗
// ║  7.13 — SIA/SIH-SUS — Ambulatório e Internações     ║
// ╚══════════════════════════════════════════════════════╝

export async function buscarSIASIH(filtro: FiltroSIASIH): Promise<DadosFonteSIASIH[]> {
  const cacheKey = { fonte: "sia_sih", ...filtro };
  const cached = await buscarCache<DadosFonteSIASIH[]>("sia_sih", cacheKey);
  if (cached) return cached;

  try {
    const resultados = await consultarAPISIASIH(filtro);
    if (resultados.length > 0) {
      await persistirDadosSIASIH(resultados);
      await salvarCache("sia_sih", cacheKey, resultados);
      return resultados;
    }
  } catch (err) {
    console.warn("[SIA/SIH] API indisponível, usando dados locais:", err);
  }

  const locais = await buscarSIASIHLocal(filtro);
  if (locais.length > 0) await salvarCache("sia_sih", cacheKey, locais);
  return locais;
}

async function consultarAPISIASIH(filtro: FiltroSIASIH): Promise<DadosFonteSIASIH[]> {
  const params = new URLSearchParams();
  if (filtro.termo) params.set("descricao", filtro.termo);
  if (filtro.tipoRegistro) params.set("tipo", filtro.tipoRegistro);
  if (filtro.uf) params.set("uf", filtro.uf);
  if (filtro.complexidade) params.set("complexidade", filtro.complexidade);
  params.set("limite", String(filtro.limite ?? 50));

  const resp = await fetch(`${SIA_SIH_API}/cnes/procedimentos?${params}`);
  if (!resp.ok) throw new Error(`SIA/SIH HTTP ${resp.status}`);
  const json = await resp.json();
  return (json.data ?? json ?? []).map((r: Record<string, unknown>) => ({
    id: r.id ?? crypto.randomUUID(),
    codigo_procedimento: r.codigo_procedimento ?? r.co_procedimento ?? "",
    nome_procedimento: r.nome_procedimento ?? r.no_procedimento ?? "",
    tipo_registro: r.tipo_registro ?? filtro.tipoRegistro ?? "SIA",
    complexidade: r.complexidade ?? null,
    valor_unitario: r.valor_unitario != null ? Number(r.valor_unitario) : null,
    valor_medio: r.valor_medio != null ? Number(r.valor_medio) : null,
    quantidade_aprovada: r.quantidade_aprovada != null ? Number(r.quantidade_aprovada) : null,
    competencia: r.competencia ?? null,
    uf: r.uf ?? null,
    criado_em: r.criado_em ?? new Date().toISOString(),
  }));
}

async function persistirDadosSIASIH(dados: DadosFonteSIASIH[]): Promise<void> {
  try { await api.post("/api/dados-fonte-sia-sih", dados); } catch { /* silent */ }
}

async function buscarSIASIHLocal(filtro: FiltroSIASIH): Promise<DadosFonteSIASIH[]> {
  const params = new URLSearchParams();
  if (filtro.termo) params.set("termo", filtro.termo);
  if (filtro.tipoRegistro) params.set("tipoRegistro", filtro.tipoRegistro);
  if (filtro.uf) params.set("uf", filtro.uf);
  params.set("limite", String(filtro.limite ?? 50));
  const { data } = await api.get<{ data: DadosFonteSIASIH[] }>(`/api/dados-fonte-sia-sih?${params}`);
  return data;
}

// ╔══════════════════════════════════════════════════════╗
// ║  7.15 — Agências Reguladoras (ANEEL/ANATEL/ANTT)    ║
// ╚══════════════════════════════════════════════════════╝

export async function buscarAgenciasReg(filtro: FiltroAgenciasReg): Promise<DadosFonteAgenciasReg[]> {
  const cacheKey = { fonte: "agencia_reg", ...filtro };
  const cached = await buscarCache<DadosFonteAgenciasReg[]>("agencia_reg", cacheKey);
  if (cached) return cached;

  try {
    const resultados = await consultarAPIAgenciasReg(filtro);
    if (resultados.length > 0) {
      await persistirDadosAgenciasReg(resultados);
      await salvarCache("agencia_reg", cacheKey, resultados);
      return resultados;
    }
  } catch (err) {
    console.warn("[Agências Reg.] API indisponível, usando dados locais:", err);
  }

  const locais = await buscarAgenciasRegLocal(filtro);
  if (locais.length > 0) await salvarCache("agencia_reg", cacheKey, locais);
  return locais;
}

async function consultarAPIAgenciasReg(filtro: FiltroAgenciasReg): Promise<DadosFonteAgenciasReg[]> {
  const agencia = filtro.agencia ?? "ANEEL";
  const baseUrl = agencia === "ANATEL" ? ANATEL_API : agencia === "ANTT" ? ANTT_API : ANEEL_API;

  const params = new URLSearchParams();
  if (filtro.termo) params.set("q", filtro.termo);
  if (filtro.uf) params.set("uf", filtro.uf);
  params.set("limit", String(filtro.limite ?? 50));

  const resp = await fetch(`${baseUrl}/datastore_search?${params}`);
  if (!resp.ok) throw new Error(`Agência ${agencia} HTTP ${resp.status}`);
  const json = await resp.json();
  const records = json.result?.records ?? json.data ?? json ?? [];
  return (Array.isArray(records) ? records : []).map((r: Record<string, unknown>) => ({
    id: String(r.id ?? crypto.randomUUID()),
    agencia: String(r.agencia ?? agencia),
    descricao: String(r.descricao ?? r.nome ?? r.DscTarifa ?? ""),
    tipo_tarifa: r.tipo_tarifa ?? r.DscModalidade ?? null,
    valor: Number(r.valor ?? r.VlrTarifa ?? 0),
    unidade: r.unidade ?? null,
    distribuidora_operadora: r.distribuidora_operadora ?? r.SigAgente ?? null,
    uf: r.uf ?? r.SigUF ?? null,
    vigencia_inicio: r.vigencia_inicio ?? r.DatInicioVigencia ?? null,
    vigencia_fim: r.vigencia_fim ?? r.DatFimVigencia ?? null,
    criado_em: String(r.criado_em ?? new Date().toISOString()),
  } as DadosFonteAgenciasReg));
}

async function persistirDadosAgenciasReg(dados: DadosFonteAgenciasReg[]): Promise<void> {
  try { await api.post("/api/dados-fonte-agencias-reg", dados); } catch { /* silent */ }
}

async function buscarAgenciasRegLocal(filtro: FiltroAgenciasReg): Promise<DadosFonteAgenciasReg[]> {
  const params = new URLSearchParams();
  if (filtro.agencia) params.set("agencia", filtro.agencia);
  if (filtro.termo) params.set("termo", filtro.termo);
  if (filtro.uf) params.set("uf", filtro.uf);
  params.set("limite", String(filtro.limite ?? 50));
  const { data } = await api.get<{ data: DadosFonteAgenciasReg[] }>(`/api/dados-fonte-agencias-reg?${params}`);
  return data;
}

// ╔══════════════════════════════════════════════════════╗
// ║  7.16 — INCRA/EMBRAPA — Preço de Terras             ║
// ╚══════════════════════════════════════════════════════╝

export async function buscarINCRA(filtro: FiltroINCRA): Promise<DadosFonteINCRA[]> {
  const cacheKey = { fonte: "incra", ...filtro };
  const cached = await buscarCache<DadosFonteINCRA[]>("incra", cacheKey);
  if (cached) return cached;

  try {
    const resultados = await consultarAPIINCRA(filtro);
    if (resultados.length > 0) {
      await persistirDadosINCRA(resultados);
      await salvarCache("incra", cacheKey, resultados);
      return resultados;
    }
  } catch (err) {
    console.warn("[INCRA] API indisponível, usando dados locais:", err);
  }

  const locais = await buscarINCRALocal(filtro);
  if (locais.length > 0) await salvarCache("incra", cacheKey, locais);
  return locais;
}

async function consultarAPIINCRA(filtro: FiltroINCRA): Promise<DadosFonteINCRA[]> {
  const params = new URLSearchParams();
  if (filtro.tipoTerra) params.set("tipo", filtro.tipoTerra);
  if (filtro.uf) params.set("uf", filtro.uf);
  if (filtro.regiao) params.set("regiao", filtro.regiao);
  params.set("limite", String(filtro.limite ?? 50));

  const resp = await fetch(`${INCRA_API}/precos-terras?${params}`);
  if (!resp.ok) throw new Error(`INCRA HTTP ${resp.status}`);
  const json = await resp.json();
  return (json.data ?? json ?? []).map((r: Record<string, unknown>) => ({
    id: r.id ?? crypto.randomUUID(),
    tipo_terra: r.tipo_terra ?? r.tipo ?? "misto",
    regiao: r.regiao ?? null,
    municipio_referencia: r.municipio_referencia ?? r.municipio ?? null,
    uf: r.uf ?? "",
    valor_hectare: Number(r.valor_hectare ?? r.valor ?? 0),
    semestre_referencia: r.semestre_referencia ?? r.semestre ?? null,
    fonte_dados: r.fonte_dados ?? "INCRA",
    criado_em: r.criado_em ?? new Date().toISOString(),
  }));
}

async function persistirDadosINCRA(dados: DadosFonteINCRA[]): Promise<void> {
  try { await api.post("/api/dados-fonte-incra", dados); } catch { /* silent */ }
}

async function buscarINCRALocal(filtro: FiltroINCRA): Promise<DadosFonteINCRA[]> {
  const params = new URLSearchParams();
  if (filtro.tipoTerra) params.set("tipoTerra", filtro.tipoTerra);
  if (filtro.uf) params.set("uf", filtro.uf);
  if (filtro.regiao) params.set("regiao", filtro.regiao);
  params.set("limite", String(filtro.limite ?? 50));
  const { data } = await api.get<{ data: DadosFonteINCRA[] }>(`/api/dados-fonte-incra?${params}`);
  return data;
}
