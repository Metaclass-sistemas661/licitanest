// ═══════════════════════════════════════════════════════════════════════════════
// Serviço de Crawlers — Fase 7: Fontes P1
// BPS Saúde Ampliado, SIGTAP/SUS, CEASA Nacional, FIPE, SIASG/DW, TCU e-Preços
// ═══════════════════════════════════════════════════════════════════════════════
import { api } from "@/lib/api";
import type {
  DadosFonteBPSSaude,
  DadosFonteSIGTAP,
  DadosFonteCEASANacional,
  DadosFonteFIPE,
  DadosFonteSIASG,
  DadosFonteTCU,
  FiltroBPSSaude,
  FiltroSIGTAP,
  FiltroCEASANacional,
  FiltroFIPE,
  FiltroSIASG,
  FiltroTCU,
} from "@/tipos";
import { buscarCache, salvarCache } from "./cacheConsultas";

// ── URLs das APIs ──────────────────────────
const BPS_SAUDE_API = "https://bfrancodeprecos.saude.gov.br/api";
const SIGTAP_API = "https://sigtap.datasus.gov.br/tabela-unificada";
const CEAGESP_API = "https://ceagesp.gov.br/cotacoes";
const FIPE_API = "https://brasilapi.com.br/api/fipe";
const SIASG_API = "https://dw.comprasnet.gov.br/dwcompras/servlet";
const TCU_API = "https://portal.tcu.gov.br/dados-abertos";

// ╔══════════════════════════════════════════════════════╗
// ║  7.2 — BPS Saúde Ampliado (Equipamentos/EPIs)      ║
// ╚══════════════════════════════════════════════════════╝

export async function buscarBPSSaude(filtro: FiltroBPSSaude): Promise<DadosFonteBPSSaude[]> {
  const cacheKey = { fonte: "bps_saude", ...filtro };
  const cached = await buscarCache<DadosFonteBPSSaude[]>("bps_saude", cacheKey);
  if (cached) return cached;

  try {
    const resultados = await consultarAPIBPSSaude(filtro);
    if (resultados.length > 0) {
      await persistirDadosBPSSaude(resultados);
      await salvarCache("bps_saude", cacheKey, resultados);
      return resultados;
    }
  } catch (err) {
    console.warn("[BPS Saúde] API indisponível, usando dados locais:", err);
  }

  const locais = await buscarBPSSaudeLocal(filtro);
  if (locais.length > 0) await salvarCache("bps_saude", cacheKey, locais);
  return locais;
}

async function consultarAPIBPSSaude(filtro: FiltroBPSSaude): Promise<DadosFonteBPSSaude[]> {
  const params = new URLSearchParams();
  if (filtro.termo) params.set("descricao", filtro.termo);
  if (filtro.tipoItem) params.set("tipo", filtro.tipoItem);
  if (filtro.uf) params.set("uf", filtro.uf);
  params.set("limite", String(filtro.limite ?? 50));

  const resp = await fetch(`${BPS_SAUDE_API}/itens?${params}`);
  if (!resp.ok) throw new Error(`BPS Saúde HTTP ${resp.status}`);
  const json = await resp.json();
  return (json.data ?? json ?? []).map((r: Record<string, unknown>) => ({
    id: r.id ?? crypto.randomUUID(),
    codigo_br_saude: r.codigo_br_saude ?? r.codigoBR ?? null,
    descricao: r.descricao ?? r.nome ?? "",
    tipo_item: r.tipo_item ?? r.tipo ?? "equipamento",
    fabricante: r.fabricante ?? null,
    modelo: r.modelo ?? null,
    unidade: r.unidade ?? null,
    preco_unitario: Number(r.preco_unitario ?? r.preco ?? 0),
    quantidade: r.quantidade ? Number(r.quantidade) : null,
    orgao_comprador: r.orgao_comprador ?? r.orgao ?? null,
    uf: r.uf ?? null,
    data_compra: r.data_compra ?? null,
    criado_em: r.criado_em ?? new Date().toISOString(),
  }));
}

async function persistirDadosBPSSaude(dados: DadosFonteBPSSaude[]): Promise<void> {
  try { await api.post("/api/dados-fonte-bps-saude", dados); } catch { /* silent */ }
}

async function buscarBPSSaudeLocal(filtro: FiltroBPSSaude): Promise<DadosFonteBPSSaude[]> {
  const params = new URLSearchParams();
  if (filtro.termo) params.set("termo", filtro.termo);
  if (filtro.tipoItem) params.set("tipoItem", filtro.tipoItem);
  if (filtro.uf) params.set("uf", filtro.uf);
  params.set("limite", String(filtro.limite ?? 50));
  const { data } = await api.get<{ data: DadosFonteBPSSaude[] }>(`/api/dados-fonte-bps-saude?${params}`);
  return data;
}

// ╔══════════════════════════════════════════════════════╗
// ║  7.3 — SIGTAP/SUS — Procedimentos                  ║
// ╚══════════════════════════════════════════════════════╝

export async function buscarSIGTAP(filtro: FiltroSIGTAP): Promise<DadosFonteSIGTAP[]> {
  const cacheKey = { fonte: "sigtap", ...filtro };
  const cached = await buscarCache<DadosFonteSIGTAP[]>("sigtap", cacheKey);
  if (cached) return cached;

  try {
    const resultados = await consultarAPISIGTAP(filtro);
    if (resultados.length > 0) {
      await persistirDadosSIGTAP(resultados);
      await salvarCache("sigtap", cacheKey, resultados);
      return resultados;
    }
  } catch (err) {
    console.warn("[SIGTAP] API indisponível, usando dados locais:", err);
  }

  const locais = await buscarSIGTAPLocal(filtro);
  if (locais.length > 0) await salvarCache("sigtap", cacheKey, locais);
  return locais;
}

async function consultarAPISIGTAP(filtro: FiltroSIGTAP): Promise<DadosFonteSIGTAP[]> {
  const params = new URLSearchParams();
  if (filtro.termo) params.set("descricao", filtro.termo);
  if (filtro.codigo) params.set("codigo", filtro.codigo);
  if (filtro.complexidade) params.set("complexidade", filtro.complexidade);
  params.set("limite", String(filtro.limite ?? 50));

  const resp = await fetch(`${SIGTAP_API}/procedimentos?${params}`);
  if (!resp.ok) throw new Error(`SIGTAP HTTP ${resp.status}`);
  const json = await resp.json();
  return (json.data ?? json ?? []).map((r: Record<string, unknown>) => ({
    id: r.id ?? crypto.randomUUID(),
    codigo_procedimento: r.codigo_procedimento ?? r.co_procedimento ?? "",
    nome_procedimento: r.nome_procedimento ?? r.no_procedimento ?? "",
    grupo: r.grupo ?? r.no_grupo ?? null,
    subgrupo: r.subgrupo ?? r.no_subgrupo ?? null,
    forma_organizacao: r.forma_organizacao ?? null,
    complexidade: r.complexidade ?? r.tp_complexidade ?? null,
    valor_ambulatorial: r.valor_ambulatorial != null ? Number(r.valor_ambulatorial) : null,
    valor_hospitalar: r.valor_hospitalar != null ? Number(r.valor_hospitalar) : null,
    competencia: r.competencia ?? r.co_competencia ?? null,
    criado_em: r.criado_em ?? new Date().toISOString(),
  }));
}

async function persistirDadosSIGTAP(dados: DadosFonteSIGTAP[]): Promise<void> {
  try { await api.post("/api/dados-fonte-sigtap", dados); } catch { /* silent */ }
}

async function buscarSIGTAPLocal(filtro: FiltroSIGTAP): Promise<DadosFonteSIGTAP[]> {
  const params = new URLSearchParams();
  if (filtro.termo) params.set("termo", filtro.termo);
  if (filtro.codigo) params.set("codigo", filtro.codigo);
  if (filtro.complexidade) params.set("complexidade", filtro.complexidade);
  params.set("limite", String(filtro.limite ?? 50));
  const { data } = await api.get<{ data: DadosFonteSIGTAP[] }>(`/api/dados-fonte-sigtap?${params}`);
  return data;
}

// ╔══════════════════════════════════════════════════════╗
// ║  7.6 — CEASAs Nacional (Multi-Estado)               ║
// ╚══════════════════════════════════════════════════════╝

export async function buscarCEASANacional(filtro: FiltroCEASANacional): Promise<DadosFonteCEASANacional[]> {
  const cacheKey = { fonte: "ceasa_nacional", ...filtro };
  const cached = await buscarCache<DadosFonteCEASANacional[]>("ceasa_nacional", cacheKey);
  if (cached) return cached;

  try {
    const resultados = await consultarAPICEASANacional(filtro);
    if (resultados.length > 0) {
      await persistirDadosCEASANacional(resultados);
      await salvarCache("ceasa_nacional", cacheKey, resultados);
      return resultados;
    }
  } catch (err) {
    console.warn("[CEASA Nacional] API indisponível, usando dados locais:", err);
  }

  const locais = await buscarCEASANacionalLocal(filtro);
  if (locais.length > 0) await salvarCache("ceasa_nacional", cacheKey, locais);
  return locais;
}

async function consultarAPICEASANacional(filtro: FiltroCEASANacional): Promise<DadosFonteCEASANacional[]> {
  const params = new URLSearchParams();
  if (filtro.termo) params.set("produto", filtro.termo);
  if (filtro.uf) params.set("uf", filtro.uf);
  if (filtro.ceasaOrigem) params.set("ceasa", filtro.ceasaOrigem);
  if (filtro.dataInicio) params.set("dtInicio", filtro.dataInicio);
  if (filtro.dataFim) params.set("dtFim", filtro.dataFim);
  params.set("limite", String(filtro.limite ?? 50));

  const resp = await fetch(`${CEAGESP_API}/cotacoes?${params}`);
  if (!resp.ok) throw new Error(`CEASA Nacional HTTP ${resp.status}`);
  const json = await resp.json();
  return (json.data ?? json ?? []).map((r: Record<string, unknown>) => ({
    id: r.id ?? crypto.randomUUID(),
    produto: r.produto ?? r.nome_produto ?? "",
    variedade: r.variedade ?? null,
    unidade: r.unidade ?? null,
    preco_minimo: r.preco_minimo != null ? Number(r.preco_minimo) : null,
    preco_maximo: r.preco_maximo != null ? Number(r.preco_maximo) : null,
    preco_comum: r.preco_comum != null ? Number(r.preco_comum) : null,
    ceasa_origem: r.ceasa_origem ?? r.ceasa ?? "",
    uf: r.uf ?? "",
    data_cotacao: r.data_cotacao ?? "",
    criado_em: r.criado_em ?? new Date().toISOString(),
  }));
}

async function persistirDadosCEASANacional(dados: DadosFonteCEASANacional[]): Promise<void> {
  try { await api.post("/api/dados-fonte-ceasa-nacional", dados); } catch { /* silent */ }
}

async function buscarCEASANacionalLocal(filtro: FiltroCEASANacional): Promise<DadosFonteCEASANacional[]> {
  const params = new URLSearchParams();
  if (filtro.termo) params.set("termo", filtro.termo);
  if (filtro.uf) params.set("uf", filtro.uf);
  if (filtro.ceasaOrigem) params.set("ceasaOrigem", filtro.ceasaOrigem);
  params.set("limite", String(filtro.limite ?? 50));
  const { data } = await api.get<{ data: DadosFonteCEASANacional[] }>(`/api/dados-fonte-ceasa-nacional?${params}`);
  return data;
}

// ╔══════════════════════════════════════════════════════╗
// ║  7.8 — Tabela FIPE — Veículos                      ║
// ╚══════════════════════════════════════════════════════╝

export async function buscarFIPE(filtro: FiltroFIPE): Promise<DadosFonteFIPE[]> {
  const cacheKey = { fonte: "fipe", ...filtro };
  const cached = await buscarCache<DadosFonteFIPE[]>("fipe", cacheKey);
  if (cached) return cached;

  try {
    const resultados = await consultarAPIFIPE(filtro);
    if (resultados.length > 0) {
      await persistirDadosFIPE(resultados);
      await salvarCache("fipe", cacheKey, resultados);
      return resultados;
    }
  } catch (err) {
    console.warn("[FIPE] API indisponível, usando dados locais:", err);
  }

  const locais = await buscarFIPELocal(filtro);
  if (locais.length > 0) await salvarCache("fipe", cacheKey, locais);
  return locais;
}

async function consultarAPIFIPE(filtro: FiltroFIPE): Promise<DadosFonteFIPE[]> {
  const tipo = filtro.tipoVeiculo ?? "carros";
  const tipoPath = tipo === "moto" ? "motos" : tipo === "caminhao" ? "caminhoes" : "carros";
  const params = new URLSearchParams();
  if (filtro.termo) params.set("nome", filtro.termo);
  if (filtro.marca) params.set("marca", filtro.marca);
  params.set("limite", String(filtro.limite ?? 50));

  const resp = await fetch(`${FIPE_API}/preco/v1/${tipoPath}?${params}`);
  if (!resp.ok) throw new Error(`FIPE HTTP ${resp.status}`);
  const json = await resp.json();
  return (Array.isArray(json) ? json : json.data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id ?? crypto.randomUUID(),
    codigo_fipe: r.codigoFipe ?? r.codigo_fipe ?? "",
    tipo_veiculo: r.tipoVeiculo ?? filtro.tipoVeiculo ?? "carro",
    marca: r.marca ?? "",
    modelo: r.modelo ?? "",
    ano_modelo: r.anoModelo ?? r.ano_modelo ?? null,
    combustivel: r.combustivel ?? null,
    valor: Number(String(r.valor ?? "0").replace(/[^\d,.-]/g, "").replace(",", ".")),
    mes_referencia: r.mesReferencia ?? r.mes_referencia ?? null,
    criado_em: r.criado_em ?? new Date().toISOString(),
  }));
}

async function persistirDadosFIPE(dados: DadosFonteFIPE[]): Promise<void> {
  try { await api.post("/api/dados-fonte-fipe", dados); } catch { /* silent */ }
}

async function buscarFIPELocal(filtro: FiltroFIPE): Promise<DadosFonteFIPE[]> {
  const params = new URLSearchParams();
  if (filtro.termo) params.set("termo", filtro.termo);
  if (filtro.tipoVeiculo) params.set("tipoVeiculo", filtro.tipoVeiculo);
  if (filtro.marca) params.set("marca", filtro.marca);
  params.set("limite", String(filtro.limite ?? 50));
  const { data } = await api.get<{ data: DadosFonteFIPE[] }>(`/api/dados-fonte-fipe?${params}`);
  return data;
}

// ╔══════════════════════════════════════════════════════╗
// ║  7.10 — SIASG/DW — Dados Agregados de Compras      ║
// ╚══════════════════════════════════════════════════════╝

export async function buscarSIASG(filtro: FiltroSIASG): Promise<DadosFonteSIASG[]> {
  const cacheKey = { fonte: "siasg", ...filtro };
  const cached = await buscarCache<DadosFonteSIASG[]>("siasg", cacheKey);
  if (cached) return cached;

  try {
    const resultados = await consultarAPISIASG(filtro);
    if (resultados.length > 0) {
      await persistirDadosSIASG(resultados);
      await salvarCache("siasg", cacheKey, resultados);
      return resultados;
    }
  } catch (err) {
    console.warn("[SIASG] API indisponível, usando dados locais:", err);
  }

  const locais = await buscarSIASGLocal(filtro);
  if (locais.length > 0) await salvarCache("siasg", cacheKey, locais);
  return locais;
}

async function consultarAPISIASG(filtro: FiltroSIASG): Promise<DadosFonteSIASG[]> {
  const params = new URLSearchParams();
  if (filtro.termo) params.set("descricao", filtro.termo);
  if (filtro.codigoItem) params.set("codigo", filtro.codigoItem);
  params.set("limite", String(filtro.limite ?? 50));

  const resp = await fetch(`${SIASG_API}/DWConsultaPreco?${params}`);
  if (!resp.ok) throw new Error(`SIASG HTTP ${resp.status}`);
  const json = await resp.json();
  return (json.data ?? json ?? []).map((r: Record<string, unknown>) => ({
    id: r.id ?? crypto.randomUUID(),
    codigo_item: r.codigo_item ?? r.codigoItem ?? null,
    descricao: r.descricao ?? r.nomeItem ?? "",
    unidade: r.unidade ?? null,
    preco_medio: r.preco_medio != null ? Number(r.preco_medio) : null,
    preco_minimo: r.preco_minimo != null ? Number(r.preco_minimo) : null,
    preco_maximo: r.preco_maximo != null ? Number(r.preco_maximo) : null,
    desvio_padrao: r.desvio_padrao != null ? Number(r.desvio_padrao) : null,
    quantidade_compras: r.quantidade_compras != null ? Number(r.quantidade_compras) : null,
    quantidade_orgaos: r.quantidade_orgaos != null ? Number(r.quantidade_orgaos) : null,
    periodo_inicio: r.periodo_inicio ?? null,
    periodo_fim: r.periodo_fim ?? null,
    criado_em: r.criado_em ?? new Date().toISOString(),
  }));
}

async function persistirDadosSIASG(dados: DadosFonteSIASG[]): Promise<void> {
  try { await api.post("/api/dados-fonte-siasg", dados); } catch { /* silent */ }
}

async function buscarSIASGLocal(filtro: FiltroSIASG): Promise<DadosFonteSIASG[]> {
  const params = new URLSearchParams();
  if (filtro.termo) params.set("termo", filtro.termo);
  if (filtro.codigoItem) params.set("codigoItem", filtro.codigoItem);
  params.set("limite", String(filtro.limite ?? 50));
  const { data } = await api.get<{ data: DadosFonteSIASG[] }>(`/api/dados-fonte-siasg?${params}`);
  return data;
}

// ╔══════════════════════════════════════════════════════╗
// ║  7.14 — TCU e-Preços — Estimativas de Preços        ║
// ╚══════════════════════════════════════════════════════╝

export async function buscarTCU(filtro: FiltroTCU): Promise<DadosFonteTCU[]> {
  const cacheKey = { fonte: "tcu", ...filtro };
  const cached = await buscarCache<DadosFonteTCU[]>("tcu", cacheKey);
  if (cached) return cached;

  try {
    const resultados = await consultarAPITCU(filtro);
    if (resultados.length > 0) {
      await persistirDadosTCU(resultados);
      await salvarCache("tcu", cacheKey, resultados);
      return resultados;
    }
  } catch (err) {
    console.warn("[TCU] API indisponível, usando dados locais:", err);
  }

  const locais = await buscarTCULocal(filtro);
  if (locais.length > 0) await salvarCache("tcu", cacheKey, locais);
  return locais;
}

async function consultarAPITCU(filtro: FiltroTCU): Promise<DadosFonteTCU[]> {
  const params = new URLSearchParams();
  if (filtro.termo) params.set("descricao", filtro.termo);
  params.set("limite", String(filtro.limite ?? 50));

  const resp = await fetch(`${TCU_API}/estimativas?${params}`);
  if (!resp.ok) throw new Error(`TCU HTTP ${resp.status}`);
  const json = await resp.json();
  return (json.data ?? json ?? []).map((r: Record<string, unknown>) => ({
    id: r.id ?? crypto.randomUUID(),
    descricao: r.descricao ?? r.nome ?? "",
    unidade: r.unidade ?? null,
    mediana: r.mediana != null ? Number(r.mediana) : null,
    quartil_1: r.quartil_1 ?? r.quartil1 != null ? Number(r.quartil_1 ?? r.quartil1) : null,
    quartil_3: r.quartil_3 ?? r.quartil3 != null ? Number(r.quartil_3 ?? r.quartil3) : null,
    preco_minimo: r.preco_minimo != null ? Number(r.preco_minimo) : null,
    preco_maximo: r.preco_maximo != null ? Number(r.preco_maximo) : null,
    quantidade_amostras: r.quantidade_amostras != null ? Number(r.quantidade_amostras) : null,
    metodologia: r.metodologia ?? null,
    periodo_referencia: r.periodo_referencia ?? null,
    criado_em: r.criado_em ?? new Date().toISOString(),
  }));
}

async function persistirDadosTCU(dados: DadosFonteTCU[]): Promise<void> {
  try { await api.post("/api/dados-fonte-tcu", dados); } catch { /* silent */ }
}

async function buscarTCULocal(filtro: FiltroTCU): Promise<DadosFonteTCU[]> {
  const params = new URLSearchParams();
  if (filtro.termo) params.set("termo", filtro.termo);
  params.set("limite", String(filtro.limite ?? 50));
  const { data } = await api.get<{ data: DadosFonteTCU[] }>(`/api/dados-fonte-tcu?${params}`);
  return data;
}
