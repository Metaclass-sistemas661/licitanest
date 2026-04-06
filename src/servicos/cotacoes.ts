// ═══════════════════════════════════════════════════════════════════════════════
// Serviço de Cotação Eletrônica — Fase 9
// CRUD de cotações, convites a fornecedores, respostas, lançamentos manuais,
// portal público, transferência para cesta
// ═══════════════════════════════════════════════════════════════════════════════
import { api } from "@/lib/api";
import type {
  Cotacao,
  CotacaoItem,
  CotacaoFornecedor,
  RespostaCotacao,
  LancamentoManual,
  CriarCotacaoDTO,
  StatusCotacao,
  DadosPortalFornecedor,
  MeioRecebimento,
} from "@/tipos";

// ===========================================================================
// 1. CRUD DE COTAÇÕES
// ===========================================================================

export interface FiltrosCotacoes {
  busca?: string;
  status?: StatusCotacao;
  cesta_id?: string;
}

/** Listar cotações com paginação */
export async function listarCotacoes(
  filtros: FiltrosCotacoes = {},
  pagina = 1,
  porPagina = 20,
) {
  const params = new URLSearchParams();
  params.set("pagina", String(pagina));
  params.set("porPagina", String(porPagina));
  if (filtros.busca) params.set("busca", filtros.busca);
  if (filtros.status) params.set("status", filtros.status);
  if (filtros.cesta_id) params.set("cesta_id", filtros.cesta_id);

  const result = await api.get<{ data: Cotacao[]; total: number }>(
    `/api/cotacoes?${params.toString()}`,
  );
  return { data: result.data ?? [], total: result.total ?? 0 };
}

/** Obter cotação completa */
export async function obterCotacao(id: string) {
  const { data } = await api.get<{ data: Cotacao }>(`/api/cotacoes/${encodeURIComponent(id)}`);
  return data;
}

/** Criar cotação com itens e fornecedores de uma vez */
export async function criarCotacao(dto: CriarCotacaoDTO) {
  const { data } = await api.post<{ data: Cotacao }>("/api/cotacoes", dto);
  return data;
}

/** Atualizar dados da cotação */
export async function atualizarCotacao(
  id: string,
  campos: Partial<Pick<Cotacao, "titulo" | "descricao" | "data_encerramento">>,
) {
  const { data } = await api.put<{ data: Cotacao }>(`/api/cotacoes/${encodeURIComponent(id)}`, campos);
  return data;
}

/** Alterar status da cotação */
export async function alterarStatusCotacao(id: string, novoStatus: StatusCotacao) {
  const { data } = await api.put<{ data: Cotacao }>(
    `/api/cotacoes/${encodeURIComponent(id)}`,
    { status: novoStatus },
  );
  return data;
}

/** Excluir (soft delete) cotação */
export async function excluirCotacao(id: string) {
  await api.delete(`/api/cotacoes/${encodeURIComponent(id)}`);
}

// ===========================================================================
// 2. ITENS DA COTAÇÃO
// ===========================================================================

export async function adicionarItemCotacao(
  cotacaoId: string,
  itemCestaId: string,
  opts: { descricao_complementar?: string; quantidade?: number; unidade?: string; exige_anvisa?: boolean } = {},
) {
  const { data } = await api.post<{ data: CotacaoItem }>(
    `/api/cotacoes/${encodeURIComponent(cotacaoId)}/itens`,
    { item_cesta_id: itemCestaId, ...opts },
  );
  return data;
}

export async function removerItemCotacao(itemId: string) {
  await api.delete(`/api/cotacao-itens/${encodeURIComponent(itemId)}`);
}

// ===========================================================================
// 3. FORNECEDORES CONVIDADOS
// ===========================================================================

export async function adicionarFornecedorCotacao(
  cotacaoId: string,
  fornecedor: {
    fornecedor_id?: string;
    razao_social: string;
    cpf_cnpj?: string;
    email: string;
    telefone?: string;
  },
  dataEncerramento: string,
) {
  const { data } = await api.post<{ data: CotacaoFornecedor }>(
    `/api/cotacoes/${encodeURIComponent(cotacaoId)}/fornecedores`,
    { ...fornecedor, data_encerramento: dataEncerramento },
  );
  return data;
}

export async function removerFornecedorCotacao(fornecedorId: string) {
  await api.delete(`/api/cotacao-fornecedores/${encodeURIComponent(fornecedorId)}`);
}

/** Marcar e-mail como enviado */
export async function marcarEmailEnviado(fornecedorId: string) {
  await api.put(`/api/cotacao-fornecedores/${encodeURIComponent(fornecedorId)}`, {
    email_enviado: true,
  });
}

/** Enviar cotação: altera status e marca fornecedores como e-mail enviado */
export async function enviarCotacao(cotacaoId: string) {
  const { data } = await api.post<{ data: Cotacao }>(
    `/api/cotacoes/${encodeURIComponent(cotacaoId)}/enviar`,
    {},
  );
  return data;
}

// ===========================================================================
// 4. PORTAL DO FORNECEDOR (acesso público via token)
// ===========================================================================

/** Buscar dados do portal pelo token de acesso */
export async function buscarPortalPorToken(token: string): Promise<DadosPortalFornecedor> {
  const { data } = await api.get<{ data: DadosPortalFornecedor }>(
    `/api/cotacoes/portal/${encodeURIComponent(token)}`,
  );
  return data;
}

/** Salvar respostas de um fornecedor no portal público */
export async function salvarRespostasPortal(
  fornecedorId: string,
  respostas: {
    cotacao_item_id: string;
    marca?: string;
    valor_unitario: number;
    valor_total?: number;
    observacoes?: string;
    registro_anvisa?: string;
  }[],
  dadosFornecedor?: {
    endereco_completo?: string;
    cep?: string;
    cidade?: string;
    uf?: string;
    prazo_validade_dias?: number;
    nome_responsavel?: string;
    cpf_responsavel?: string;
  },
) {
  const { data } = await api.post<{ data: number }>(
    `/api/cotacao-fornecedores/${encodeURIComponent(fornecedorId)}/respostas`,
    { respostas, dadosFornecedor },
  );
  return data;
}

// ===========================================================================
// 5. RESPOSTAS E LANÇAMENTOS MANUAIS
// ===========================================================================

/** Listar todas as respostas de uma cotação */
export async function listarRespostasCotacao(cotacaoId: string) {
  const { data } = await api.get<{ data: RespostaCotacao[] }>(
    `/api/cotacoes/${encodeURIComponent(cotacaoId)}/lancamentos?tipo=respostas`,
  );
  return data ?? [];
}

/** Criar lançamento manual */
export async function criarLancamentoManual(
  cotacaoId: string,
  lancamento: {
    item_cesta_id: string;
    razao_social: string;
    cpf_cnpj?: string;
    email?: string;
    telefone?: string;
    marca?: string;
    valor_unitario: number;
    valor_total?: number;
    observacoes?: string;
    registro_anvisa?: string;
    meio_recebimento: MeioRecebimento;
    lancado_por: string;
  },
) {
  const { data } = await api.post<{ data: LancamentoManual }>(
    `/api/cotacoes/${encodeURIComponent(cotacaoId)}/lancamentos`,
    lancamento,
  );
  return data;
}

/** Listar lançamentos manuais de uma cotação */
export async function listarLancamentosManuais(cotacaoId: string) {
  const { data } = await api.get<{ data: LancamentoManual[] }>(
    `/api/cotacoes/${encodeURIComponent(cotacaoId)}/lancamentos`,
  );
  return data ?? [];
}

// ===========================================================================
// 6. TRANSFERÊNCIA PARA CESTA
// ===========================================================================

/** Transferir uma resposta de cotação para a cesta como preço do item */
export async function transferirRespostaParaCesta(
  respostaId: string,
  servidorId: string,
) {
  await api.post(`/api/cotacoes/respostas/${encodeURIComponent(respostaId)}/transferir`, {
    servidorId,
  });
}

/** Transferir lançamento manual para a cesta */
export async function transferirLancamentoParaCesta(
  lancamentoId: string,
  _servidorId: string,
) {
  await api.post(`/api/cotacoes/lancamentos/${encodeURIComponent(lancamentoId)}/transferir`, {
    servidorId: _servidorId,
  });
}

// ===========================================================================
// 7. CONTADORES E HELPERS
// ===========================================================================

/** Contar respostas por fornecedor em uma cotação */
export async function contarRespostasPorFornecedor(cotacaoId: string) {
  const { data } = await api.get<{ data: { id: string; razao_social: string; email: string; total_respostas: number }[] }>(
    `/api/cotacoes/${encodeURIComponent(cotacaoId)}/fornecedores?contarRespostas=true`,
  );
  return data ?? [];
}

/** Gerar link do portal para um fornecedor */
export function gerarLinkPortal(token: string) {
  const baseUrl = window.location.origin;
  return `${baseUrl}/portal/cotacao/${token}`;
}

/** Labels de status */
export const STATUS_COTACAO_LABELS: Record<StatusCotacao, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  em_resposta: "Em Resposta",
  encerrada: "Encerrada",
  cancelada: "Cancelada",
};

export const STATUS_COTACAO_CORES: Record<StatusCotacao, string> = {
  rascunho: "bg-gray-100 text-gray-700",
  enviada: "bg-blue-100 text-blue-700",
  em_resposta: "bg-amber-100 text-amber-700",
  encerrada: "bg-green-100 text-green-700",
  cancelada: "bg-red-100 text-red-700",
};

export const MEIO_LABELS: Record<MeioRecebimento, string> = {
  email: "E-mail",
  whatsapp: "WhatsApp",
  telefone: "Telefone",
  presencial: "Presencial",
  manual: "Manual",
};
