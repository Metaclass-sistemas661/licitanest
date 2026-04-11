// ═══════════════════════════════════════════════════════════════════════════════
// Serviço de Crawlers — Fase 7: Fontes P0
// ComprasNet, CATMAT/CATSER, ARP (Atas Reg. Preço), ANP, FNDE/PNAE
// ═══════════════════════════════════════════════════════════════════════════════
import { api } from "@/lib/api";
import type {
  DadosFonteComprasNet,
  DadosFonteCATMAT,
  DadosFonteARP,
  DadosFonteANP,
  DadosFonteFNDE,
  FiltroComprasNet,
  FiltroCATMAT,
  FiltroARP,
  FiltroANP,
  FiltroFNDE,
} from "@/tipos";
import { buscarCache, salvarCache } from "./cacheConsultas";

// ── URLs das APIs ──────────────────────────
const COMPRASNET_API = "https://compras.dados.gov.br";
const CATMAT_API = "https://compras.dados.gov.br/materiais/v1";
const CATSER_API = "https://compras.dados.gov.br/servicos/v1";
const ARP_API = "https://pncp.gov.br/api/consulta/v1";
const ANP_API = "https://dados.gov.br/api/3/action";
const FNDE_API = "https://www.fnde.gov.br/dadosabertos/api";

// ╔══════════════════════════════════════════════════════╗
// ║  ComprasNet — Compras Federais (histórico)          ║
// ╚══════════════════════════════════════════════════════╝

export async function buscarComprasNet(filtro: FiltroComprasNet): Promise<DadosFonteComprasNet[]> {
  const cacheKey = { fonte: "comprasnet", ...filtro };
  const cached = await buscarCache<DadosFonteComprasNet[]>("comprasnet", cacheKey);
  if (cached) return cached;

  try {
    const resultados = await consultarAPIComprasNet(filtro);
    if (resultados.length > 0) {
      await persistirDadosComprasNet(resultados);
      await salvarCache("comprasnet", cacheKey, resultados);
      return resultados;
    }
  } catch (err) {
    console.warn("[ComprasNet] API indisponível, usando dados locais:", err);
  }

  const locais = await buscarComprasNetLocal(filtro);
  if (locais.length > 0) await salvarCache("comprasnet", cacheKey, locais);
  return locais;
}

async function consultarAPIComprasNet(filtro: FiltroComprasNet): Promise<DadosFonteComprasNet[]> {
  const params = new URLSearchParams();
  if (filtro.termo) params.set("descricao", filtro.termo);
  if (filtro.uasg) params.set("uasg", filtro.uasg);
  if (filtro.uf) params.set("uf", filtro.uf);
  if (filtro.modalidade) params.set("modalidade", filtro.modalidade);
  if (filtro.dataInicio) params.set("dtInicio", filtro.dataInicio);
  if (filtro.dataFim) params.set("dtFim", filtro.dataFim);
  params.set("offset", "0");
  params.set("limit", String(filtro.limite ?? 50));

  const endpoint = filtro.tipoRegistro === "ata"
    ? "/atas-registro-precos/v1/atas.json"
    : "/contratos/v1/contratos.json";

  const resp = await fetch(`${COMPRASNET_API}${endpoint}?${params}`, {
    signal: AbortSignal.timeout(15000),
    headers: { Accept: "application/json" },
  });
  if (!resp.ok) throw new Error(`ComprasNet HTTP ${resp.status}`);
  const json = await resp.json();

  const items: unknown[] = json._embedded?.contratos ?? json._embedded?.atas ?? json.data ?? [];
  return (Array.isArray(items) ? items : []).map((item: unknown) => {
    const raw = item as Record<string, unknown>;
    return {
      id: crypto.randomUUID(),
      orgao: String(raw.nomeOrgao ?? raw.orgao ?? ""),
      uasg: raw.uasg ? String(raw.uasg) : null,
      descricao_item: String(raw.objeto ?? raw.descricao ?? filtro.termo ?? ""),
      unidade: raw.unidadeMedida ? String(raw.unidadeMedida) : null,
      quantidade: raw.quantidade ? Number(raw.quantidade) : null,
      valor_unitario: Number(raw.valorUnitario ?? raw.valor ?? 0),
      valor_total: raw.valorTotal ? Number(raw.valorTotal) : null,
      modalidade: raw.modalidade ? String(raw.modalidade) : null,
      numero_contrato: raw.numeroContrato ? String(raw.numeroContrato) : null,
      numero_ata: raw.numeroAta ? String(raw.numeroAta) : null,
      data_publicacao: raw.dataPublicacao ? String(raw.dataPublicacao) : null,
      uf: raw.uf ? String(raw.uf) : null,
      tipo_registro: (filtro.tipoRegistro ?? "contrato") as "contrato" | "ata" | "material",
      criado_em: new Date().toISOString(),
    };
  }) as DadosFonteComprasNet[];
}

async function persistirDadosComprasNet(dados: DadosFonteComprasNet[]): Promise<void> {
  if (!dados.length) return;
  try {
    await api.post("/api/dados-fonte-comprasnet", {
      items: dados.map(({ id: _id, criado_em: _c, ...rest }) => rest),
    });
  } catch (err) {
    console.warn("[ComprasNet] Erro ao persistir:", err);
  }
}

async function buscarComprasNetLocal(filtro: FiltroComprasNet): Promise<DadosFonteComprasNet[]> {
  const params = new URLSearchParams();
  params.set("limite", String(filtro.limite ?? 50));
  if (filtro.termo) params.set("termo", filtro.termo);
  if (filtro.uasg) params.set("uasg", filtro.uasg);
  if (filtro.uf) params.set("uf", filtro.uf);
  if (filtro.modalidade) params.set("modalidade", filtro.modalidade);
  if (filtro.dataInicio) params.set("data_inicio", filtro.dataInicio);
  if (filtro.dataFim) params.set("data_fim", filtro.dataFim);

  const { data } = await api.get<{ data: DadosFonteComprasNet[] }>(`/api/dados-fonte-comprasnet?${params}`);
  return (data ?? []) as DadosFonteComprasNet[];
}

// ╔══════════════════════════════════════════════════════╗
// ║  CATMAT/CATSER — Catálogo de Materiais e Serviços   ║
// ╚══════════════════════════════════════════════════════╝

export async function buscarCATMAT(filtro: FiltroCATMAT): Promise<DadosFonteCATMAT[]> {
  const cacheKey = { fonte: "catmat", ...filtro };
  const cached = await buscarCache<DadosFonteCATMAT[]>("catmat", cacheKey);
  if (cached) return cached;

  try {
    const resultados = await consultarAPICATMAT(filtro);
    if (resultados.length > 0) {
      await persistirDadosCATMAT(resultados);
      await salvarCache("catmat", cacheKey, resultados);
      return resultados;
    }
  } catch (err) {
    console.warn("[CATMAT] API indisponível, usando dados locais:", err);
  }

  const locais = await buscarCATMATLocal(filtro);
  if (locais.length > 0) await salvarCache("catmat", cacheKey, locais);
  return locais;
}

async function consultarAPICATMAT(filtro: FiltroCATMAT): Promise<DadosFonteCATMAT[]> {
  const params = new URLSearchParams();
  if (filtro.termo) params.set("descricao", filtro.termo);
  if (filtro.codigo) params.set("codigo", filtro.codigo);
  if (filtro.grupo) params.set("grupo", filtro.grupo);
  if (filtro.classe) params.set("classe", filtro.classe);
  if (filtro.sustentavel !== undefined) params.set("sustentavel", String(filtro.sustentavel));
  params.set("offset", "0");
  params.set("limit", String(filtro.limite ?? 50));

  const baseUrl = filtro.tipoRegistro === "servico" ? CATSER_API : CATMAT_API;
  const endpoint = filtro.tipoRegistro === "servico" ? "/servicos.json" : "/materiais.json";

  const resp = await fetch(`${baseUrl}${endpoint}?${params}`, {
    signal: AbortSignal.timeout(15000),
    headers: { Accept: "application/json" },
  });
  if (!resp.ok) throw new Error(`CATMAT HTTP ${resp.status}`);
  const json = await resp.json();

  const items: unknown[] = json._embedded?.materiais ?? json._embedded?.servicos ?? json.data ?? [];
  return (Array.isArray(items) ? items : []).map((item: unknown) => {
    const raw = item as Record<string, unknown>;
    return {
      id: crypto.randomUUID(),
      codigo_catmat: String(raw.codigo ?? raw.codigoItem ?? ""),
      descricao: String(raw.descricao ?? raw.nomeItem ?? filtro.termo ?? ""),
      grupo: raw.nomeGrupo ? String(raw.nomeGrupo) : null,
      classe: raw.nomeClasse ? String(raw.nomeClasse) : null,
      pdm: raw.pdm ? String(raw.pdm) : null,
      status: raw.statusItem ? String(raw.statusItem) : "ativo",
      sustentavel: Boolean(raw.sustentavel ?? false),
      tipo_registro: (filtro.tipoRegistro ?? "material") as "material" | "servico",
      criado_em: new Date().toISOString(),
    };
  }) as DadosFonteCATMAT[];
}

async function persistirDadosCATMAT(dados: DadosFonteCATMAT[]): Promise<void> {
  if (!dados.length) return;
  try {
    await api.post("/api/dados-fonte-catmat-fase7", {
      items: dados.map(({ id: _id, criado_em: _c, ...rest }) => rest),
    });
  } catch (err) {
    console.warn("[CATMAT] Erro ao persistir:", err);
  }
}

async function buscarCATMATLocal(filtro: FiltroCATMAT): Promise<DadosFonteCATMAT[]> {
  const params = new URLSearchParams();
  params.set("limite", String(filtro.limite ?? 50));
  if (filtro.termo) params.set("termo", filtro.termo);
  if (filtro.codigo) params.set("codigo", filtro.codigo);
  if (filtro.grupo) params.set("grupo", filtro.grupo);
  if (filtro.classe) params.set("classe", filtro.classe);
  if (filtro.sustentavel !== undefined) params.set("sustentavel", String(filtro.sustentavel));
  if (filtro.tipoRegistro) params.set("tipo_registro", filtro.tipoRegistro);

  const { data } = await api.get<{ data: DadosFonteCATMAT[] }>(`/api/dados-fonte-catmat-fase7?${params}`);
  return (data ?? []) as DadosFonteCATMAT[];
}

// ╔══════════════════════════════════════════════════════╗
// ║  ARP — Atas de Registro de Preço Vigentes           ║
// ╚══════════════════════════════════════════════════════╝

export async function buscarARP(filtro: FiltroARP): Promise<DadosFonteARP[]> {
  const cacheKey = { fonte: "arp", ...filtro };
  const cached = await buscarCache<DadosFonteARP[]>("arp", cacheKey);
  if (cached) return cached;

  try {
    const resultados = await consultarAPIARP(filtro);
    if (resultados.length > 0) {
      await persistirDadosARP(resultados);
      await salvarCache("arp", cacheKey, resultados);
      return resultados;
    }
  } catch (err) {
    console.warn("[ARP] API indisponível, usando dados locais:", err);
  }

  const locais = await buscarARPLocal(filtro);
  if (locais.length > 0) await salvarCache("arp", cacheKey, locais);
  return locais;
}

async function consultarAPIARP(filtro: FiltroARP): Promise<DadosFonteARP[]> {
  const params = new URLSearchParams();
  if (filtro.termo) params.set("q", filtro.termo);
  if (filtro.uf) params.set("uf", filtro.uf);
  if (filtro.fornecedor) params.set("fornecedor", filtro.fornecedor);
  if (filtro.apenasVigentes !== false) {
    params.set("dataVigenciaInicio", new Date().toISOString().slice(0, 10));
  }
  params.set("pagina", "1");
  params.set("tamanhoPagina", String(filtro.limite ?? 50));

  const resp = await fetch(`${ARP_API}/atas?${params}`, {
    signal: AbortSignal.timeout(15000),
    headers: { Accept: "application/json" },
  });
  if (!resp.ok) throw new Error(`ARP/PNCP HTTP ${resp.status}`);
  const json = await resp.json();

  const items: unknown[] = json.data ?? json.resultado ?? json ?? [];
  return (Array.isArray(items) ? items : []).map((item: unknown) => {
    const raw = item as Record<string, unknown>;
    const vigFim = raw.dataVigenciaFim ? String(raw.dataVigenciaFim) : new Date().toISOString().slice(0, 10);
    return {
      id: crypto.randomUUID(),
      orgao: String(raw.nomeOrgao ?? raw.orgao ?? ""),
      numero_ata: raw.numeroAta ? String(raw.numeroAta) : null,
      numero_licitacao: raw.numeroLicitacao ? String(raw.numeroLicitacao) : null,
      descricao_item: String(raw.objeto ?? raw.descricao ?? filtro.termo ?? ""),
      marca: raw.marca ? String(raw.marca) : null,
      unidade: raw.unidadeMedida ? String(raw.unidadeMedida) : null,
      quantidade: raw.quantidade ? Number(raw.quantidade) : null,
      valor_unitario: Number(raw.valorUnitario ?? raw.valor ?? 0),
      fornecedor: raw.nomeFornecedor ? String(raw.nomeFornecedor) : null,
      cnpj_fornecedor: raw.cnpjFornecedor ? String(raw.cnpjFornecedor) : null,
      data_vigencia_inicio: raw.dataVigenciaInicio ? String(raw.dataVigenciaInicio) : new Date().toISOString().slice(0, 10),
      data_vigencia_fim: vigFim,
      uf: raw.uf ? String(raw.uf) : null,
      vigente: new Date(vigFim) >= new Date(),
      criado_em: new Date().toISOString(),
    };
  }) as DadosFonteARP[];
}

async function persistirDadosARP(dados: DadosFonteARP[]): Promise<void> {
  if (!dados.length) return;
  try {
    await api.post("/api/dados-fonte-arp", {
      items: dados.map(({ id: _id, criado_em: _c, vigente: _v, ...rest }) => rest),
    });
  } catch (err) {
    console.warn("[ARP] Erro ao persistir:", err);
  }
}

async function buscarARPLocal(filtro: FiltroARP): Promise<DadosFonteARP[]> {
  const params = new URLSearchParams();
  params.set("limite", String(filtro.limite ?? 50));
  if (filtro.termo) params.set("termo", filtro.termo);
  if (filtro.uf) params.set("uf", filtro.uf);
  if (filtro.fornecedor) params.set("fornecedor", filtro.fornecedor);
  if (filtro.apenasVigentes !== false) params.set("apenas_vigentes", "true");

  const { data } = await api.get<{ data: DadosFonteARP[] }>(`/api/dados-fonte-arp?${params}`);
  return (data ?? []) as DadosFonteARP[];
}

// ╔══════════════════════════════════════════════════════╗
// ║  ANP — Preços de Combustíveis                       ║
// ╚══════════════════════════════════════════════════════╝

export async function buscarANP(filtro: FiltroANP): Promise<DadosFonteANP[]> {
  const cacheKey = { fonte: "anp", ...filtro };
  const cached = await buscarCache<DadosFonteANP[]>("anp", cacheKey);
  if (cached) return cached;

  try {
    const resultados = await consultarAPIANP(filtro);
    if (resultados.length > 0) {
      await persistirDadosANP(resultados);
      await salvarCache("anp", cacheKey, resultados);
      return resultados;
    }
  } catch (err) {
    console.warn("[ANP] API indisponível, usando dados locais:", err);
  }

  const locais = await buscarANPLocal(filtro);
  if (locais.length > 0) await salvarCache("anp", cacheKey, locais);
  return locais;
}

async function consultarAPIANP(filtro: FiltroANP): Promise<DadosFonteANP[]> {
  // ANP usa CSV via dados.gov.br; o endpoint CKAN retorna metadata do dataset
  const params = new URLSearchParams();
  params.set("resource_id", "ca0b222e-5a58-4dbf-b977-e42c6661a789"); // ID do recurso ANP semanal
  if (filtro.produto) params.set("q", filtro.produto);
  params.set("limit", String(filtro.limite ?? 50));

  const resp = await fetch(`${ANP_API}/datastore_search?${params}`, {
    signal: AbortSignal.timeout(15000),
    headers: { Accept: "application/json" },
  });
  if (!resp.ok) throw new Error(`ANP HTTP ${resp.status}`);
  const json = await resp.json();

  const records: unknown[] = json.result?.records ?? [];
  return records.map((item: unknown) => {
    const raw = item as Record<string, unknown>;
    return {
      id: crypto.randomUUID(),
      produto: String(raw.PRODUTO ?? raw.produto ?? filtro.produto ?? ""),
      bandeira: raw.BANDEIRA ? String(raw.BANDEIRA) : null,
      valor_revenda: Number(raw["PREÇO MÉDIO REVENDA"] ?? raw.valor_revenda ?? raw.preco ?? 0),
      valor_distribuicao: raw["PREÇO MÉDIO DISTRIBUIÇÃO"] ? Number(raw["PREÇO MÉDIO DISTRIBUIÇÃO"]) : null,
      municipio: raw.MUNICÍPIO ? String(raw.MUNICÍPIO) : (raw.municipio ? String(raw.municipio) : null),
      uf: String(raw.ESTADO ?? raw.uf ?? filtro.uf ?? ""),
      data_coleta: String(raw["DATA INICIAL"] ?? raw.data_coleta ?? new Date().toISOString().slice(0, 10)),
      nome_posto: raw["NOME DA REVENDA"] ? String(raw["NOME DA REVENDA"]) : null,
      cnpj_posto: raw["CNPJ DA REVENDA"] ? String(raw["CNPJ DA REVENDA"]) : null,
      criado_em: new Date().toISOString(),
    };
  }) as DadosFonteANP[];
}

async function persistirDadosANP(dados: DadosFonteANP[]): Promise<void> {
  if (!dados.length) return;
  try {
    await api.post("/api/dados-fonte-anp", {
      items: dados.map(({ id: _id, criado_em: _c, ...rest }) => rest),
    });
  } catch (err) {
    console.warn("[ANP] Erro ao persistir:", err);
  }
}

async function buscarANPLocal(filtro: FiltroANP): Promise<DadosFonteANP[]> {
  const params = new URLSearchParams();
  params.set("limite", String(filtro.limite ?? 50));
  if (filtro.produto) params.set("produto", filtro.produto);
  if (filtro.municipio) params.set("municipio", filtro.municipio);
  if (filtro.uf) params.set("uf", filtro.uf);
  if (filtro.dataInicio) params.set("data_inicio", filtro.dataInicio);
  if (filtro.dataFim) params.set("data_fim", filtro.dataFim);

  const { data } = await api.get<{ data: DadosFonteANP[] }>(`/api/dados-fonte-anp?${params}`);
  return (data ?? []) as DadosFonteANP[];
}

// ╔══════════════════════════════════════════════════════╗
// ║  FNDE/PNAE — Merenda Escolar                       ║
// ╚══════════════════════════════════════════════════════╝

export async function buscarFNDE(filtro: FiltroFNDE): Promise<DadosFonteFNDE[]> {
  const cacheKey = { fonte: "fnde", ...filtro };
  const cached = await buscarCache<DadosFonteFNDE[]>("fnde", cacheKey);
  if (cached) return cached;

  try {
    const resultados = await consultarAPIFNDE(filtro);
    if (resultados.length > 0) {
      await persistirDadosFNDE(resultados);
      await salvarCache("fnde", cacheKey, resultados);
      return resultados;
    }
  } catch (err) {
    console.warn("[FNDE] API indisponível, usando dados locais:", err);
  }

  const locais = await buscarFNDELocal(filtro);
  if (locais.length > 0) await salvarCache("fnde", cacheKey, locais);
  return locais;
}

async function consultarAPIFNDE(filtro: FiltroFNDE): Promise<DadosFonteFNDE[]> {
  const params = new URLSearchParams();
  if (filtro.termo) params.set("descricao", filtro.termo);
  if (filtro.uf) params.set("uf", filtro.uf);
  if (filtro.regiao) params.set("regiao", filtro.regiao);
  if (filtro.tipoAgricultura) params.set("tipoAgricultura", filtro.tipoAgricultura);
  if (filtro.programa) params.set("programa", filtro.programa);
  params.set("pagina", "1");
  params.set("limite", String(filtro.limite ?? 50));

  const resp = await fetch(`${FNDE_API}/pnae/precos-referencia?${params}`, {
    signal: AbortSignal.timeout(15000),
    headers: { Accept: "application/json" },
  });
  if (!resp.ok) throw new Error(`FNDE HTTP ${resp.status}`);
  const json = await resp.json();

  const items: unknown[] = json.data ?? json.resultado ?? json ?? [];
  return (Array.isArray(items) ? items : []).map((item: unknown) => {
    const raw = item as Record<string, unknown>;
    return {
      id: crypto.randomUUID(),
      descricao_item: String(raw.descricao ?? raw.nomeAlimento ?? filtro.termo ?? ""),
      unidade: raw.unidade ? String(raw.unidade) : null,
      valor_referencia: Number(raw.valorReferencia ?? raw.preco ?? raw.valor ?? 0),
      regiao: raw.regiao ? String(raw.regiao) : null,
      uf: raw.uf ? String(raw.uf) : null,
      tipo_agricultura: (raw.tipoAgricultura ? String(raw.tipoAgricultura) : "convencional") as "familiar" | "convencional",
      programa: (raw.programa ? String(raw.programa) : "PNAE") as "PNAE" | "PNAC",
      vigencia: raw.vigencia ? String(raw.vigencia) : null,
      criado_em: new Date().toISOString(),
    };
  }) as DadosFonteFNDE[];
}

async function persistirDadosFNDE(dados: DadosFonteFNDE[]): Promise<void> {
  if (!dados.length) return;
  try {
    await api.post("/api/dados-fonte-fnde", {
      items: dados.map(({ id: _id, criado_em: _c, ...rest }) => rest),
    });
  } catch (err) {
    console.warn("[FNDE] Erro ao persistir:", err);
  }
}

async function buscarFNDELocal(filtro: FiltroFNDE): Promise<DadosFonteFNDE[]> {
  const params = new URLSearchParams();
  params.set("limite", String(filtro.limite ?? 50));
  if (filtro.termo) params.set("termo", filtro.termo);
  if (filtro.uf) params.set("uf", filtro.uf);
  if (filtro.regiao) params.set("regiao", filtro.regiao);
  if (filtro.tipoAgricultura) params.set("tipo_agricultura", filtro.tipoAgricultura);
  if (filtro.programa) params.set("programa", filtro.programa);

  const { data } = await api.get<{ data: DadosFonteFNDE[] }>(`/api/dados-fonte-fnde?${params}`);
  return (data ?? []) as DadosFonteFNDE[];
}
