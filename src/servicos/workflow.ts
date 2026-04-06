// Serviço de Workflow de Aprovação — Tramitação formal de cestas de preço
// Implementa fluxo: Rascunho → Em Pesquisa → Em Análise → Aguardando Aprovação → Aprovada → Publicada
import { api } from "@/lib/api";
import type {
  StatusWorkflow,
  TramitacaoCesta,
  CestaWorkflow,
  ChecklistConformidade,
  CriterioChecklist,
  MetodologiaCalculo,
} from "@/tipos";

// ── Transições válidas ──────────────────────────────────
const TRANSICOES_VALIDAS: Record<StatusWorkflow, StatusWorkflow[]> = {
  rascunho: ["em_pesquisa"],
  em_pesquisa: ["em_analise", "rascunho"],
  em_analise: ["aguardando_aprovacao", "em_pesquisa", "devolvida"],
  aguardando_aprovacao: ["aprovada", "devolvida", "em_analise"],
  aprovada: ["publicada", "arquivada"],
  devolvida: ["em_pesquisa", "rascunho"],
  publicada: ["arquivada"],
  arquivada: [],
  expirada: ["em_pesquisa"],  // pode reabrir uma cesta expirada
};

// ── Labels para exibição ─────────────────────────────────
export const LABELS_WORKFLOW: Record<StatusWorkflow, string> = {
  rascunho: "Rascunho",
  em_pesquisa: "Em Pesquisa",
  em_analise: "Em Análise",
  aguardando_aprovacao: "Aguardando Aprovação",
  aprovada: "Aprovada",
  devolvida: "Devolvida",
  publicada: "Publicada",
  arquivada: "Arquivada",
  expirada: "Expirada",
};

export const CORES_WORKFLOW: Record<StatusWorkflow, string> = {
  rascunho: "bg-gray-100 text-gray-700",
  em_pesquisa: "bg-blue-100 text-blue-700",
  em_analise: "bg-amber-100 text-amber-700",
  aguardando_aprovacao: "bg-orange-100 text-orange-700",
  aprovada: "bg-green-100 text-green-700",
  devolvida: "bg-red-100 text-red-700",
  publicada: "bg-emerald-100 text-emerald-700",
  arquivada: "bg-slate-100 text-slate-500",
  expirada: "bg-rose-100 text-rose-600",
};

export const LABELS_METODOLOGIA: Record<MetodologiaCalculo, string> = {
  media: "Média Aritmética",
  mediana: "Mediana (Padrão IN 65/2021)",
  menor_preco: "Menor Preço",
  media_saneada: "Média Saneada (excluindo outliers IQR)",
};

// ── Verificar se transição é permitida ───────────────────
export function transicaoPermitida(
  statusAtual: StatusWorkflow,
  statusNovo: StatusWorkflow,
): boolean {
  return TRANSICOES_VALIDAS[statusAtual]?.includes(statusNovo) ?? false;
}

// ── Obter próximas transições possíveis ──────────────────
export function proximasTransicoes(statusAtual: StatusWorkflow): StatusWorkflow[] {
  return TRANSICOES_VALIDAS[statusAtual] ?? [];
}

// ── Verificar se perfil pode realizar transição ──────────
export function perfilPodeTransitar(
  status: StatusWorkflow,
  perfil: "administrador" | "gestor" | "pesquisador",
): boolean {
  switch (status) {
    case "em_pesquisa":
    case "rascunho":
      return true; // qualquer perfil
    case "em_analise":
      return perfil === "administrador" || perfil === "gestor";
    case "aguardando_aprovacao":
      return perfil === "administrador" || perfil === "gestor";
    case "aprovada":
    case "publicada":
      return perfil === "administrador";
    case "devolvida":
      return perfil === "administrador" || perfil === "gestor";
    default:
      return false;
  }
}

// ── Avançar workflow (tramitar cesta) ────────────────────
export async function tramitarCesta(
  cestaId: string,
  statusNovo: StatusWorkflow,
  servidorId: string,
  observacoes?: string,
  motivoDevolucao?: string,
) {
  // Buscar status atual
  const { data: cesta } = await api.get<{ data: { status_workflow: string; bloqueada: boolean } }>(
    `/api/workflow/cestas/${encodeURIComponent(cestaId)}`
  );

  if (!cesta) throw new Error("Cesta não encontrada");

  const statusAtual = (cesta.status_workflow ?? "rascunho") as StatusWorkflow;

  if (!transicaoPermitida(statusAtual, statusNovo)) {
    throw new Error(
      `Transição inválida: ${LABELS_WORKFLOW[statusAtual]} → ${LABELS_WORKFLOW[statusNovo]}`,
    );
  }

  // Tramitar via API
  await api.post(`/api/workflow/${encodeURIComponent(cestaId)}/transicionar`, {
    status_novo: statusNovo,
    servidor_id: servidorId,
    observacoes: observacoes ?? null,
    motivo_devolucao: motivoDevolucao ?? null,
  });
}

// ── Listar tramitações de uma cesta ──────────────────────
export async function listarTramitacoes(cestaId: string): Promise<TramitacaoCesta[]> {
  const { data } = await api.get<{ data: TramitacaoCesta[] }>(
    `/api/workflow/${encodeURIComponent(cestaId)}/tramitacoes`
  );
  return (data ?? []) as TramitacaoCesta[];
}

// ── Listar cestas com dados de workflow ──────────────────
export async function listarCestasWorkflow(filtros?: {
  status?: StatusWorkflow;
  secretariaId?: string;
  busca?: string;
}): Promise<CestaWorkflow[]> {
  const params = new URLSearchParams();
  if (filtros?.status) params.set("status", filtros.status);
  if (filtros?.secretariaId) params.set("secretaria_id", filtros.secretariaId);
  if (filtros?.busca) params.set("busca", filtros.busca);

  const { data } = await api.get<{ data: CestaWorkflow[] }>(
    `/api/workflow/cestas?${params}`
  );
  return (data ?? []) as CestaWorkflow[];
}

// ── Configurar metodologia da cesta ──────────────────────
export async function configurarMetodologia(
  cestaId: string,
  metodologia: MetodologiaCalculo,
  fundamentacaoLegal?: string,
  minimoFontes?: number,
  validadeMeses?: number,
) {
  const updates: Record<string, unknown> = {
    metodologia_calculo: metodologia,
  };
  if (fundamentacaoLegal !== undefined) updates.fundamentacao_legal = fundamentacaoLegal;
  if (minimoFontes !== undefined) updates.numero_minimo_fontes = minimoFontes;
  if (validadeMeses !== undefined) updates.validade_meses = validadeMeses;

  await api.put(`/api/workflow/${encodeURIComponent(cestaId)}/metodologia`, updates);
}

// ╔══════════════════════════════════════════════════════════╗
// ║  CHECKLIST DE CONFORMIDADE IN 65/2021                   ║
// ╚══════════════════════════════════════════════════════════╝

export const CRITERIOS_CHECKLIST: Record<CriterioChecklist, { label: string; descricao: string; artigo: string }> = {
  minimo_fontes_atendido: {
    label: "Mínimo de fontes atendido",
    descricao: "Pesquisa com no mínimo 3 fontes distintas",
    artigo: "IN 65/2021, Art. 5°, §2°",
  },
  diversidade_fontes: {
    label: "Diversidade de fontes",
    descricao: "Fontes incluem ao menos 2 categorias distintas (ex: PNCP + TCE + cotação direta)",
    artigo: "IN 65/2021, Art. 5°, §1°",
  },
  prazo_precos_valido: {
    label: "Prazo dos preços válido",
    descricao: "Preços coletados nos últimos 6 meses (180 dias)",
    artigo: "IN 65/2021, Art. 5°, §3°",
  },
  precos_dentro_validade: {
    label: "Preços dentro da validade",
    descricao: "Todos os preços utilizados estão dentro do prazo de validade da pesquisa",
    artigo: "Lei 14.133/2021, Art. 23, §1°",
  },
  outliers_tratados: {
    label: "Outliers tratados",
    descricao: "Preços discrepantes foram identificados e tratados (excluídos ou justificados)",
    artigo: "IN 65/2021, Art. 5°, §5°",
  },
  justificativa_exclusoes: {
    label: "Justificativas de exclusão",
    descricao: "Todos os preços excluídos possuem justificativa formal registrada",
    artigo: "IN 65/2021, Art. 5°, §5°",
  },
  documentos_comprobatorios: {
    label: "Documentos comprobatórios",
    descricao: "Existem documentos anexos comprovando a origem dos preços coletados",
    artigo: "IN 65/2021, Art. 5°, §4°",
  },
  metodologia_definida: {
    label: "Metodologia definida",
    descricao: "Metodologia de cálculo (média/mediana/menor) está selecionada e justificada",
    artigo: "IN 65/2021, Art. 5°, caput",
  },
  fundamentacao_legal_presente: {
    label: "Fundamentação legal",
    descricao: "Base legal da pesquisa de preços está indicada no documento",
    artigo: "Lei 14.133/2021, Art. 23",
  },
  assinaturas_presentes: {
    label: "Assinaturas presentes",
    descricao: "Documento possui assinatura eletrônica do responsável pela pesquisa",
    artigo: "IN 65/2021, Art. 7°",
  },
};

// ── Obter checklist de uma cesta ─────────────────────────
export async function obterChecklist(cestaId: string): Promise<ChecklistConformidade | null> {
  const { data } = await api.get<{ data: ChecklistConformidade | null }>(
    `/api/workflow/${encodeURIComponent(cestaId)}/checklist`
  );
  return data;
}

// ── Salvar / atualizar checklist ─────────────────────────
export async function salvarChecklist(
  cestaId: string,
  criterios: Partial<Record<CriterioChecklist, boolean>>,
  servidorId: string,
  observacoes?: string,
): Promise<ChecklistConformidade> {
  const todosCriterios = Object.keys(CRITERIOS_CHECKLIST) as CriterioChecklist[];
  const valoresAtuais = { ...criterios };
  const aprovado = todosCriterios.every((c) => valoresAtuais[c] === true);

  const payload = {
    cesta_id: cestaId,
    verificado_por: servidorId,
    verificado_em: new Date().toISOString(),
    ...criterios,
    aprovado,
    observacoes: observacoes ?? null,
    atualizado_em: new Date().toISOString(),
  };

  const { data } = await api.post<{ data: ChecklistConformidade }>(
    `/api/workflow/${encodeURIComponent(cestaId)}/checklist`,
    payload
  );

  return data as ChecklistConformidade;
}

// ── Auto-verificar checklist com base nos dados ──────────
export async function autoVerificarChecklist(
  cestaId: string,
  servidorId: string,
): Promise<ChecklistConformidade> {
  // Buscar dados da cesta para verificação automática
  const { data: cesta } = await api.get<{ data: Record<string, unknown> }>(
    `/api/workflow/cestas/${encodeURIComponent(cestaId)}?include=itens_cesta.precos_item.documentos_comprobatorios`
  );

  if (!cesta) throw new Error("Cesta não encontrada");

  const itens = (cesta as Record<string, unknown>).itens_cesta as Array<{
    id: string;
    precos_item: Array<{
      id: string;
      fonte_id: string;
      data_referencia: string;
      excluido_calculo: boolean;
      justificativa_exclusao: string | null;
      documentos_comprobatorios: Array<{ id: string }>;
    }>;
  }>;

  const todosPrecos = itens.flatMap((i) => i.precos_item ?? []);
  const precosAtivos = todosPrecos.filter((p) => !p.excluido_calculo);
  const precosExcluidos = todosPrecos.filter((p) => p.excluido_calculo);

  // Fontes distintas
  const fontesDistintas = new Set(precosAtivos.map((p) => p.fonte_id));

  // Prazo — verificar se preços são dos últimos 180 dias
  const seisAnoAtras = new Date();
  seisAnoAtras.setDate(seisAnoAtras.getDate() - 180);
  const todosRecentes = precosAtivos.every(
    (p) => new Date(p.data_referencia) >= seisAnoAtras,
  );

  // Justificativas de exclusão
  const todasJustificadas = precosExcluidos.every(
    (p) => p.justificativa_exclusao && p.justificativa_exclusao.trim().length > 0,
  );

  // Documentos
  const temDocumentos = todosPrecos.some(
    (p) => (p.documentos_comprobatorios?.length ?? 0) > 0,
  );

  const minimoFontes = (cesta as Record<string, unknown>).numero_minimo_fontes as number ?? 3;

  const criterios: Partial<Record<CriterioChecklist, boolean>> = {
    minimo_fontes_atendido: fontesDistintas.size >= minimoFontes,
    diversidade_fontes: fontesDistintas.size >= 2,
    prazo_precos_valido: todosRecentes,
    precos_dentro_validade: todosRecentes,
    outliers_tratados: precosExcluidos.length > 0 ? todasJustificadas : true,
    justificativa_exclusoes: precosExcluidos.length === 0 || todasJustificadas,
    documentos_comprobatorios: temDocumentos,
    metodologia_definida: !!(cesta as Record<string, unknown>).metodologia_calculo,
    fundamentacao_legal_presente:
      !!((cesta as Record<string, unknown>).fundamentacao_legal as string)?.trim(),
    assinaturas_presentes: false, // manual — precisa ser marcado pelo usuário
  };

  return salvarChecklist(cestaId, criterios, servidorId);
}
