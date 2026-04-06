// Tipos globais do LicitaNest

// ---- Perfis e Permissões ----
export type PerfilNome = "administrador" | "gestor" | "pesquisador";

export interface Perfil {
  id: string;
  nome: PerfilNome;
  descricao: string;
  permissoes: Record<string, string>;
  criado_em: string;
}

// ---- Usuários / Servidores ----
export interface Servidor {
  id: string;
  auth_user_id: string | null;
  nome: string;
  email: string;
  cpf: string | null;
  matricula: string | null;
  perfil_id: string;
  secretaria_id: string;
  telefone: string | null;
  ativo: boolean;
  ultimo_acesso: string | null;
  criado_em: string;
  atualizado_em: string;
  deletado_em: string | null;
  // joins
  perfil?: Perfil;
  secretaria?: Secretaria;
}

/** Alias retrocompatível */
export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilNome;
  perfil_id: string;
  secretaria_id: string;
  ativo: boolean;
  criado_em: string;
}

// ---- Municípios ----
export interface Municipio {
  id: string;
  nome: string;
  uf: string;
  codigo_ibge: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
  deletado_em: string | null;
}

// ---- Secretarias ----
export interface Secretaria {
  id: string;
  nome: string;
  sigla: string | null;
  municipio_id: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
  deletado_em: string | null;
}

// ---- Cidades da Região ----
export interface CidadeRegiao {
  id: string;
  nome: string;
  uf: string;
  codigo_ibge: string | null;
  municipio_id: string;
  distancia_km: number | null;
  ativo: boolean;
  criado_em: string;
  deletado_em: string | null;
}

// ---- Catálogo ----
export interface Categoria {
  id: string;
  nome: string;
  descricao: string | null;
  icone: string | null;
  ordem: number;
  ativo: boolean;
  criado_em: string;
  deletado_em: string | null;
}

export interface UnidadeMedida {
  id: string;
  sigla: string;
  descricao: string;
  criado_em: string;
}

export interface ElementoDespesa {
  id: string;
  codigo: string;
  descricao: string;
  criado_em: string;
}

export interface ProdutoCatalogo {
  id: string;
  descricao: string;
  descricao_detalhada: string | null;
  categoria_id: string;
  unidade_medida_id: string;
  elemento_despesa_id: string | null;
  codigo_catmat: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
  deletado_em: string | null;
  // joins
  categoria?: Categoria;
  unidade_medida?: UnidadeMedida;
  elemento_despesa?: ElementoDespesa | null;
}

export type StatusSolicitacao = "pendente" | "aprovada" | "recusada";

export interface SolicitacaoCatalogo {
  id: string;
  descricao: string;
  justificativa: string | null;
  categoria_id: string | null;
  unidade_medida_id: string | null;
  solicitante_id: string;
  status: StatusSolicitacao;
  resposta: string | null;
  produto_criado_id: string | null;
  respondido_por: string | null;
  respondido_em: string | null;
  criado_em: string;
  // joins
  solicitante?: Servidor;
  categoria?: Categoria | null;
  unidade_medida?: UnidadeMedida | null;
  respondido_por_servidor?: Servidor | null;
}

// ---- Cestas de Preços ----
export type StatusCesta = "rascunho" | "em_andamento" | "concluida" | "arquivada";
export type TipoCalculo = "media" | "mediana" | "menor_preco";
export type TipoCorrecao = "ipca" | "igpm" | "nenhuma";

export interface CestaPrecos {
  id: string;
  descricao_objeto: string;
  data: string;
  tipo_calculo: TipoCalculo;
  tipo_correcao: TipoCorrecao;
  indice_correcao: string | null;
  status: StatusCesta;
  percentual_alerta: number;
  secretaria_id: string;
  criado_por: string;
  concluida_em: string | null;
  criado_em: string;
  atualizado_em: string;
  deletado_em: string | null;
  data_base_correcao: string | null;
  correcao_aplicada_em: string | null;
  // joins
  secretaria?: Secretaria;
  criado_por_servidor?: Servidor;
  itens?: ItemCesta[];
  lotes?: LoteCesta[];
}

// ---- Fornecedores ----
export interface Fornecedor {
  id: string;
  cpf_cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  rua: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cep: string | null;
  cidade: string | null;
  uf: string | null;
  telefone: string | null;
  email: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
  deletado_em: string | null;
}

// ---- Fontes de Preço ----
export type TipoFonte =
  | "pncp"
  | "painel_precos"
  | "tce"
  | "tce_mg"
  | "tce_sp"
  | "tce_rj"
  | "tce_rs"
  | "tce_pr"
  | "tce_sc"
  | "tce_ba"
  | "tce_pe"
  | "tce_ce"
  | "tce_go"
  | "tce_pa"
  | "tce_ma"
  | "tce_mt"
  | "tce_ms"
  | "tce_es"
  | "tce_pb"
  | "tce_rn"
  | "tce_al"
  | "tce_se"
  | "tce_pi"
  | "tce_am"
  | "tce_ro"
  | "tce_to"
  | "tce_ac"
  | "tce_ap"
  | "tce_rr"
  | "tce_df"
  | "bps"
  | "sinapi"
  | "conab"
  | "ceasa"
  | "cmed"
  | "transparencia"
  | "portal_transparencia_municipal"
  | "diario_oficial"
  | "cotacao_direta";

export interface FontePreco {
  id: string;
  nome: string;
  sigla: string;
  tipo: TipoFonte;
  url_base: string | null;
  descricao: string | null;
  ativo: boolean;
  criado_em: string;
}

// ---- Dados das Fontes de Preços (Crawlers) ----
export type StatusExecucao = "executando" | "sucesso" | "falha" | "parcial";

export interface DadosFontePNCP {
  id: string;
  orgao: string;
  cnpj_orgao: string | null;
  uf_orgao: string | null;
  cidade_orgao: string | null;
  descricao_item: string;
  unidade: string | null;
  quantidade: number | null;
  valor_unitario: number;
  valor_total: number | null;
  data_homologacao: string | null;
  numero_contrato: string | null;
  modalidade: string | null;
  documento_url: string | null;
  codigo_item: string | null;
  criado_em: string;
}

export interface DadosFontePainel {
  id: string;
  orgao: string;
  descricao_item: string;
  unidade: string | null;
  valor_unitario: number;
  data_compra: string | null;
  modalidade: string | null;
  numero_processo: string | null;
  documento_url: string | null;
  criado_em: string;
}

export interface DadosFonteTCE {
  id: string;
  orgao: string;
  uf: string;
  municipio: string | null;
  descricao_item: string;
  unidade: string | null;
  valor_unitario: number;
  data_contrato: string | null;
  numero_contrato: string | null;
  documento_url: string | null;
  fonte_tce: string; // ex: "TCE/MG", "TCE/SP", etc.
  criado_em: string;
}

export interface ExecucaoCrawler {
  id: string;
  fonte_id: string;
  status: StatusExecucao;
  itens_processados: number;
  itens_novos: number;
  itens_atualizados: number;
  erro_mensagem: string | null;
  iniciado_em: string;
  finalizado_em: string | null;
  duracao_segundos: number | null;
  // joins
  fonte?: FontePreco;
}

export interface CacheConsulta {
  id: string;
  fonte_tipo: string;
  chave_consulta: string;
  resultado: unknown;
  consultado_em: string;
  expira_em: string;
}

export interface FiltroFonte {
  termo: string;
  uf?: string;
  ufs?: string[];          // múltiplas UFs para busca em vários TCEs
  municipio?: string;      // filtro por município específico
  dataInicio?: string;
  dataFim?: string;
  limite?: number;
}

// ---- Lotes da Cesta ----
export interface LoteCesta {
  id: string;
  cesta_id: string;
  numero: number;
  descricao: string | null;
  ordem: number;
  criado_em: string;
  // computed
  itens?: ItemCesta[];
}

// ---- Itens da Cesta ----
export interface ItemCesta {
  id: string;
  cesta_id: string;
  produto_id: string;
  lote_id: string | null;
  quantidade: number;
  ordem: number;
  menor_preco: number | null;
  maior_preco: number | null;
  media: number | null;
  mediana: number | null;
  criado_em: string;
  atualizado_em: string;
  // joins
  produto?: ProdutoCatalogo;
  lote?: LoteCesta | null;
  precos?: PrecoItem[];
}

// ---- Preços por Item ----
export interface PrecoItem {
  id: string;
  item_cesta_id: string;
  fonte_id: string;
  valor_unitario: number;
  valor_corrigido: number | null;
  data_referencia: string;
  orgao: string | null;
  cnpj_orgao: string | null;
  descricao_fonte: string | null;
  unidade_fonte: string | null;
  documento_url: string | null;
  excluido_calculo: boolean;
  justificativa_exclusao: string | null;
  excluido_por: string | null;
  excluido_em: string | null;
  criado_em: string;
  // joins
  fonte?: FontePreco;
  excluido_por_servidor?: Servidor | null;
  documentos?: DocumentoComprobatorio[];
}

// ---- Documentos Comprobatórios ----
export interface DocumentoComprobatorio {
  id: string;
  preco_item_id: string;
  nome_arquivo: string;
  tipo_arquivo: string;
  tamanho_bytes: number | null;
  storage_path: string;
  criado_em: string;
}

// ---- Versionamento de Cestas ----
export interface CestaVersao {
  id: string;
  cesta_id: string;
  versao: number;
  dados_snapshot: Record<string, unknown>;
  alterado_por: string;
  descricao: string | null;
  criado_em: string;
  // joins
  alterado_por_servidor?: Servidor;
}

// ---- Audit Log ----
export interface AuditLog {
  id: string;
  servidor_id: string | null;
  acao: string;
  tabela: string | null;
  registro_id: string | null;
  dados_anteriores: Record<string, unknown> | null;
  dados_novos: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  criado_em: string;
}

// ---- Permissões por rota ----
export type PermissaoRota = PerfilNome[];

export interface RotaProtegida {
  perfis_permitidos?: PermissaoRota;
}

// ---- Dados Fonte BPS (Banco de Preços em Saúde) ----
export interface DadosFonteBPS {
  id: string;
  codigo_br: string | null;
  descricao_item: string;
  apresentacao: string | null;
  unidade: string | null;
  valor_unitario: number;
  quantidade: number | null;
  instituicao: string | null;
  uf: string | null;
  data_compra: string | null;
  modalidade: string | null;
  media_ponderada: number | null;
  total_registros_consulta: number | null;
  criado_em: string;
}

// ---- Dados Fonte SINAPI (Construção Civil) ----
export interface DadosFonteSINAPI {
  id: string;
  codigo_sinapi: string;
  descricao_item: string;
  unidade: string | null;
  valor_unitario: number;
  uf: string;
  mes_referencia: string;
  tipo: string | null;           // 'insumo' | 'composicao'
  desonerado: boolean;
  origem: string | null;         // 'CEF' | 'IBGE'
  criado_em: string;
}

// ---- Dados Fonte CONAB (Gêneros Alimentícios) ----
export interface DadosFonteCONAB {
  id: string;
  descricao_item: string;
  unidade: string | null;
  valor_unitario: number;
  cidade: string | null;
  uf: string;
  data_referencia: string;
  tipo_produto: string | null;
  criado_em: string;
}

// ---- Dados Fonte CEASA (Hortifrúti) ----
export interface DadosFonteCEASA {
  id: string;
  descricao_item: string;
  variedade: string | null;
  unidade: string | null;
  valor_minimo: number | null;
  valor_maximo: number | null;
  valor_comum: number;
  data_cotacao: string;
  turno: string | null;
  criado_em: string;
}

// ---- Dados Fonte CMED/ANVISA (Medicamentos) ----
export interface DadosFonteCMED {
  id: string;
  registro_anvisa: string | null;
  principio_ativo: string;
  descricao_produto: string;
  apresentacao: string | null;
  laboratorio: string | null;
  ean: string | null;
  pmvg_sem_impostos: number | null;
  pmvg_com_impostos: number | null;
  pmc: number | null;
  icms_0: number | null;
  lista_concessao: string | null;
  tipo_produto: string | null;
  regime_preco: string | null;
  data_publicacao: string | null;
  criado_em: string;
}

// ---- Filtro estendido para novas fontes ----
export interface FiltroBPS {
  codigoBR?: string;
  termo?: string;
  uf?: string;
  dataInicio?: string;
  dataFim?: string;
  limite?: number;
}

export interface FiltroSINAPI {
  codigoSinapi?: string;
  termo?: string;
  uf?: string;
  mesReferencia?: string;
  tipo?: "insumo" | "composicao";
  desonerado?: boolean;
  limite?: number;
}

export interface FiltroCONAB {
  termo?: string;
  cidade?: string;
  uf?: string;
  dataInicio?: string;
  dataFim?: string;
  limite?: number;
}

export interface FiltroCEASA {
  termo?: string;
  variedade?: string;
  dataInicio?: string;
  dataFim?: string;
  limite?: number;
}

export interface FiltroCMED {
  registroAnvisa?: string;
  principioAtivo?: string;
  termo?: string;
  laboratorio?: string;
  limite?: number;
}

// ---- Correção Monetária (Fase 8) ----
export type TipoIndice = "ipca" | "igpm";

export interface IndiceCorrecao {
  id: string;
  tipo: TipoIndice;
  ano: number;
  mes: number;
  valor: number;            // variação mensal %
  acumulado_12m: number | null;
  fonte: string | null;
  importado_em: string;
}

export interface LogImportacaoIndices {
  id: string;
  tipo: TipoIndice;
  registros_importados: number;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  fonte_url: string | null;
  erro: string | null;
  criado_em: string;
}

/** Resultado do cálculo de correção para um preço */
export interface ResultadoCorrecao {
  preco_id: string;
  valor_original: number;
  valor_corrigido: number;
  fator_correcao: number;       // multiplicador (ex: 1.0523)
  percentual_correcao: number;  // em % (ex: 5.23)
  indice_tipo: TipoIndice;
  data_origem: string;          // data_referencia do preço
  data_base: string;            // data para a qual se corrigiu
  meses_correcao: number;
}

/** Resumo de correção da cesta completa */
export interface ResumoCorrecaoCesta {
  tipo_indice: TipoIndice;
  data_base: string;
  total_precos_corrigidos: number;
  total_precos_sem_correcao: number;
  acumulado_periodo: number;     // % acumulado no período
  itens: {
    item_id: string;
    produto_descricao: string;
    correcoes: ResultadoCorrecao[];
  }[];
}

// ====================================================================
// FASE 9 — COTAÇÃO ELETRÔNICA COM FORNECEDORES
// ====================================================================

export type StatusCotacao = "rascunho" | "enviada" | "em_resposta" | "encerrada" | "cancelada";
export type MeioRecebimento = "email" | "whatsapp" | "telefone" | "presencial" | "manual";

export interface Cotacao {
  id: string;
  cesta_id: string;
  numero: number;
  titulo: string;
  descricao: string | null;
  data_abertura: string;
  data_encerramento: string;
  status: StatusCotacao;
  criado_por: string;
  criado_em: string;
  atualizado_em: string;
  deletado_em: string | null;
  // joins
  cesta?: CestaPrecos;
  criado_por_servidor?: Servidor;
  itens?: CotacaoItem[];
  fornecedores?: CotacaoFornecedor[];
}

export interface CotacaoItem {
  id: string;
  cotacao_id: string;
  item_cesta_id: string;
  descricao_complementar: string | null;
  quantidade: number;
  unidade: string | null;
  exige_anvisa: boolean;
  ordem: number;
  criado_em: string;
  // joins
  item_cesta?: ItemCesta;
}

export interface CotacaoFornecedor {
  id: string;
  cotacao_id: string;
  fornecedor_id: string | null;
  razao_social: string;
  cpf_cnpj: string | null;
  email: string;
  telefone: string | null;
  token_acesso: string;
  token_expira_em: string;
  email_enviado: boolean;
  email_enviado_em: string | null;
  acessou_portal: boolean;
  acessou_em: string | null;
  criado_em: string;
  // computed
  respostas?: RespostaCotacao[];
}

export interface RespostaCotacao {
  id: string;
  cotacao_fornecedor_id: string;
  cotacao_item_id: string;
  marca: string | null;
  valor_unitario: number;
  valor_total: number | null;
  observacoes: string | null;
  registro_anvisa: string | null;
  endereco_completo: string | null;
  cep: string | null;
  cidade: string | null;
  uf: string | null;
  prazo_validade_dias: number | null;
  nome_responsavel: string | null;
  cpf_responsavel: string | null;
  respondido_em: string;
  transferido_cesta: boolean;
  transferido_em: string | null;
  transferido_por: string | null;
  // joins
  cotacao_item?: CotacaoItem;
  cotacao_fornecedor?: CotacaoFornecedor;
}

export interface LancamentoManual {
  id: string;
  cotacao_id: string;
  item_cesta_id: string;
  razao_social: string;
  cpf_cnpj: string | null;
  email: string | null;
  telefone: string | null;
  marca: string | null;
  valor_unitario: number;
  valor_total: number | null;
  observacoes: string | null;
  registro_anvisa: string | null;
  meio_recebimento: MeioRecebimento;
  lancado_por: string;
  lancado_em: string;
  transferido_cesta: boolean;
  transferido_em: string | null;
}

/** DTO para criar cotação */
export interface CriarCotacaoDTO {
  cesta_id: string;
  titulo: string;
  descricao?: string;
  data_encerramento: string;
  criado_por: string;
  itens: {
    item_cesta_id: string;
    descricao_complementar?: string;
    quantidade: number;
    unidade?: string;
    exige_anvisa?: boolean;
  }[];
  fornecedores: {
    fornecedor_id?: string;
    razao_social: string;
    cpf_cnpj?: string;
    email: string;
    telefone?: string;
  }[];
}

// ====================================================================
// FASE 10 — ANÁLISE CRÍTICA, ALERTAS E DASHBOARD
// ====================================================================

export type ClassificacaoSemaforo = "verde" | "amarelo" | "vermelho";
export type TipoAtividade =
  | "cesta_criada" | "cesta_concluida" | "cesta_arquivada"
  | "item_adicionado" | "item_removido"
  | "preco_adicionado" | "preco_excluido" | "preco_reincluido"
  | "cotacao_criada" | "cotacao_enviada" | "cotacao_respondida"
  | "correcao_aplicada"
  | "catalogo_produto_criado" | "catalogo_solicitacao"
  | "relatorio_gerado";

/** Resultado da análise crítica de um preço individual */
export interface AnalisePreco {
  preco_id: string;
  valor: number;                     // valor_unitario ou valor_corrigido
  media: number;
  divergencia_percentual: number;    // % de divergência em relação à média
  classificacao: ClassificacaoSemaforo;
  excluido: boolean;
  justificativa_exclusao: string | null;
  fonte_nome: string;
  fonte_sigla: string;
  orgao: string | null;
  data_referencia: string;
}

/** Análise crítica de um item da cesta */
export interface AnaliseCriticaItem {
  item_id: string;
  produto_descricao: string;
  categoria: string;
  unidade: string;
  quantidade: number;
  precos: AnalisePreco[];
  total_precos: number;
  total_excluidos: number;
  media: number | null;
  mediana: number | null;
  menor_preco: number | null;
  maior_preco: number | null;
  desvio_padrao: number | null;
  coeficiente_variacao: number | null;  // desvio_padrão / media * 100
  tem_alerta: boolean;                  // algum preço > percentual_alerta
}

/** Métricas globais do dashboard */
export interface MetricasDashboard {
  total_cestas: number;
  cestas_ativas: number;
  cestas_concluidas: number;
  cestas_mes_atual: number;
  total_produtos_catalogo: number;
  total_precos: number;
  total_precos_excluidos: number;
  total_fornecedores: number;
  total_cotacoes: number;
  cotacoes_ativas: number;
}

/** Métrica por secretaria (painel gestor) */
export interface MetricaSecretaria {
  secretaria_id: string;
  secretaria_nome: string;
  secretaria_sigla: string | null;
  total_cestas: number;
  cestas_ativas: number;
  cestas_concluidas: number;
  cestas_pendentes_antigas: number;
  economia_estimada: number;
  valor_total_media: number;
  percentual_economia: number;   // calculado client-side
}

/** Fonte de preço com contagem de uso */
export interface FonteUtilizacao {
  fonte_id: string;
  nome: string;
  sigla: string;
  tipo: TipoFonte;
  total_precos: number;
  total_itens_distintos: number;
}

/** Atividade recente (feed) */
export interface Atividade {
  id: string;
  servidor_id: string | null;
  secretaria_id: string | null;
  tipo: TipoAtividade;
  descricao: string;
  entidade_tipo: string | null;
  entidade_id: string | null;
  dados_extra: Record<string, unknown> | null;
  criado_em: string;
  // joins
  servidor?: Servidor;
  secretaria?: Secretaria;
}

/** IPCA acumulado para exibição no dashboard */
export interface IpcaAcumulado {
  acumulado_12m: number;
  ultimo_mes: string;      // ex: "2026-02"
}

/** Dados do portal público do fornecedor */
export interface DadosPortalFornecedor {
  cotacao: Pick<Cotacao, "id" | "titulo" | "descricao" | "data_abertura" | "data_encerramento" | "status">;
  fornecedor: Pick<CotacaoFornecedor, "id" | "razao_social" | "cpf_cnpj" | "email">;
  itens: (CotacaoItem & { item_cesta?: ItemCesta })[];
  respostas_existentes: RespostaCotacao[];
  cesta_descricao: string;
  entidade_solicitante: string;
}

// ====================================================================
// FASE 11 — RELATÓRIOS E EXPORTAÇÕES
// ====================================================================

export type TipoRelatorio =
  | "mapa_apuracao"
  | "fontes_precos"
  | "correcao_monetaria";

export type FormatoExportacao = "pdf" | "xlsx";

/** Configuração para geração de relatório */
export interface ConfigRelatorio {
  tipo: TipoRelatorio;
  formato: FormatoExportacao;
  cesta_id: string;
  incluir_excluidos?: boolean;     // mostrar preços excluídos (tachado)
  incluir_documentos?: boolean;    // anexar docs comprobatórios
  cabecalho?: CabecalhoRelatorio;
}

/** Cabeçalho institucional do relatório */
export interface CabecalhoRelatorio {
  nome_orgao: string;
  nome_municipio: string;
  uf: string;
  brasao_url?: string;             // URL do brasão no storage
  objeto: string;
  data_geracao: string;
  servidor_nome: string;
  servidor_cargo?: string;
}

/** Linha do mapa de apuração — um item com preços por fonte */
export interface LinhaMapaApuracao {
  item_id: string;
  ordem: number;
  descricao: string;
  unidade: string;
  quantidade: number;
  precos_por_fonte: {
    fonte_nome: string;
    fonte_sigla: string;
    valor_unitario: number;
    valor_corrigido: number | null;
    orgao: string | null;
    data_referencia: string;
    excluido: boolean;
    justificativa_exclusao: string | null;
    documento_url: string | null;
  }[];
  media: number | null;
  mediana: number | null;
  menor_preco: number | null;
  valor_total: number | null;     // media * quantidade
}

/** Linha do relatório de fontes */
export interface LinhaRelatorioFontes {
  fonte_nome: string;
  fonte_sigla: string;
  tipo: TipoFonte;
  total_precos: number;
  itens_atendidos: string[];
  documentos: {
    nome_arquivo: string;
    storage_path: string;
    tamanho_bytes: number | null;
  }[];
}

/** Linha do relatório de correção monetária */
export interface LinhaRelatorioCorrecao {
  item_descricao: string;
  fonte_nome: string;
  orgao: string | null;
  valor_original: number;
  indice_utilizado: string;
  periodo: string;               // "jan/2025 — dez/2025"
  percentual_acumulado: number;
  valor_correcao: number;        // diferença
  valor_corrigido: number;
}

/** Registro de relatório gerado (log) */
export interface RelatorioGerado {
  id: string;
  cesta_id: string;
  tipo: TipoRelatorio;
  formato: FormatoExportacao;
  nome_arquivo: string;
  storage_path: string | null;
  tamanho_bytes: number | null;
  gerado_por: string;
  gerado_em: string;
  // joins
  gerado_por_servidor?: Servidor;
  cesta?: CestaPrecos;
}

// ====================================================================
// FASE 13 — FUNCIONALIDADES AVANÇADAS (v2.0)
// ====================================================================

// ---- Comparador de Cestas ----
export interface ComparacaoCesta {
  cesta: CestaPrecos;
  itens: ItemCesta[];
  total_media: number;
  total_mediana: number;
  total_menor: number;
}

export interface ItemComparado {
  produto_id: string;
  descricao: string;
  unidade: string;
  categoria: string;
  cesta_a: {
    item_id: string | null;
    quantidade: number;
    media: number | null;
    mediana: number | null;
    menor_preco: number | null;
    total_fontes: number;
  } | null;
  cesta_b: {
    item_id: string | null;
    quantidade: number;
    media: number | null;
    mediana: number | null;
    menor_preco: number | null;
    total_fontes: number;
  } | null;
  diferenca_percentual: number | null;
}

// ---- Templates de Cestas ----
export type CategoriaTemplate =
  | "merenda_escolar"
  | "medicamentos_basicos"
  | "material_escritorio"
  | "limpeza_higiene"
  | "informatica"
  | "construcao_civil"
  | "alimentos_geral"
  | "saude"
  | "combustiveis"
  | "personalizado";

export interface TemplateCesta {
  id: string;
  nome: string;
  descricao: string;
  categoria: CategoriaTemplate;
  icone: string;
  itens: TemplateItem[];
  criado_em?: string;
  atualizado_em?: string;
  publico: boolean;
  criado_por?: string;
}

export interface TemplateItem {
  descricao: string;
  unidade: string;
  quantidade_sugerida: number;
  categoria?: string;
  codigo_catmat?: string;
}

// ---- Histórico de Preços ----
export interface PontoHistoricoPreco {
  data: string;          // YYYY-MM
  valor_medio: number;
  valor_minimo: number;
  valor_maximo: number;
  total_fontes: number;
  fonte_principal?: string;
}

export interface HistoricoPrecoItem {
  produto_id: string;
  descricao: string;
  unidade: string;
  pontos: PontoHistoricoPreco[];
  variacao_12m: number | null;   // % variação nos últimos 12 meses
  tendencia: "alta" | "estavel" | "baixa";
}

// ---- Mapa de Calor Regional ----
export interface PrecoRegional {
  uf: string;
  municipio?: string;
  valor_medio: number;
  total_registros: number;
  variacao_media_nacional: number;  // % acima/abaixo da média nacional
}

export interface MapaCalorDados {
  produto_descricao: string;
  media_nacional: number;
  regioes: PrecoRegional[];
}

// ---- Alertas de Variação de Preço ----
export type TipoAlerta = "variacao_preco" | "novo_preco" | "preco_expirado";
export type StatusAlerta = "ativo" | "silenciado" | "resolvido";

export interface ConfigAlerta {
  id: string;
  servidor_id: string;
  produto_id: string | null;
  cesta_id: string | null;
  tipo: TipoAlerta;
  percentual_gatilho: number;    // ex: 15 = gatilho quando varia 15%
  notificar_email: boolean;
  ativo: boolean;
  criado_em: string;
  // joins
  produto?: ProdutoCatalogo;
  cesta?: CestaPrecos;
}

export interface AlertaPreco {
  id: string;
  config_id: string;
  produto_id: string;
  valor_anterior: number;
  valor_atual: number;
  variacao_percentual: number;
  fonte_nome: string;
  status: StatusAlerta;
  criado_em: string;
  resolvido_em: string | null;
  // joins
  produto?: ProdutoCatalogo;
  config?: ConfigAlerta;
}

// ---- Sugestão de Fontes com IA ----
export interface SugestaoFonteIA {
  fonte_sugerida: string;
  url: string | null;
  justificativa: string;
  confianca: number;       // 0-100
  tipo_fonte: TipoFonte | string;
}

export interface RespostaIA {
  produto_descricao: string;
  sugestoes: SugestaoFonteIA[];
  dicas_pesquisa: string[];
  palavras_chave: string[];
  gerado_em: string;
}

// ---- Exportação SICOM ----
export interface ConfigSICOM {
  codigo_municipio_ibge: string;
  exercicio: number;
  mes_referencia: number;
  tipo_aquisicao: "licitacao" | "dispensa" | "inexigibilidade";
  numero_processo: string;
  responsavel_nome: string;
  responsavel_cpf: string;
}

export interface LinhaSICOM {
  sequencial: number;
  codigo_item: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  fornecedor_cnpj: string | null;
  fornecedor_razao: string | null;
  fonte_referencia: string;
}

// ---- OCR Importação ----
export type StatusOCR = "processando" | "concluido" | "erro";

export interface ResultadoOCR {
  id: string;
  nome_arquivo: string;
  status: StatusOCR;
  texto_extraido: string | null;
  itens_encontrados: ItemOCR[];
  confianca_media: number;
  processado_em: string | null;
  erro_mensagem: string | null;
}

export interface ItemOCR {
  descricao: string;
  valor_unitario: number | null;
  quantidade: number | null;
  unidade: string | null;
  confianca: number;      // 0-100
  linha_original: string;
}

// ============================================================================
// FASE 14 — MULTI-TENANCY, BILLING E ESCALABILIDADE
// ============================================================================

// ---- Planos e Assinaturas ----
export type NomePlano = "gratuito" | "basico" | "profissional" | "enterprise";
export type StatusAssinatura = "ativa" | "trial" | "cancelada" | "inadimplente" | "expirada";
export type IntervaloCobranca = "mensal" | "anual";

export interface Plano {
  id: string;
  nome: NomePlano;
  titulo: string;
  descricao: string;
  preco_mensal: number;       // centavos (R$)
  preco_anual: number;        // centavos (R$)
  limite_usuarios: number;
  limite_cestas: number;
  limite_cotacoes_mes: number;
  funcionalidades: string[];   // lista de features habilitadas
  ativo: boolean;
  stripe_price_id_mensal: string | null;
  stripe_price_id_anual: string | null;
  criado_em: string;
}

export interface Assinatura {
  id: string;
  municipio_id: string;
  plano_id: string;
  status: StatusAssinatura;
  intervalo: IntervaloCobranca;
  inicio: string;
  fim: string | null;
  trial_fim: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  valor_corrente: number;     // centavos
  criado_em: string;
  atualizado_em: string;
  cancelado_em: string | null;
  // joins
  plano?: Plano;
  municipio?: Municipio;
}

// ---- Faturas ----
export type StatusFatura = "pendente" | "paga" | "vencida" | "cancelada";

export interface Fatura {
  id: string;
  assinatura_id: string;
  municipio_id: string;
  numero: string;
  valor: number;             // centavos
  status: StatusFatura;
  vencimento: string;
  pago_em: string | null;
  stripe_invoice_id: string | null;
  url_boleto: string | null;
  url_nf: string | null;
  criado_em: string;
  // joins
  assinatura?: Assinatura;
}

// ---- Onboarding ----
export type EtapaOnboarding = "dados_municipio" | "dados_responsavel" | "escolha_plano" | "confirmacao";

export interface DadosOnboarding {
  // Etapa 1
  municipio_nome: string;
  municipio_uf: string;
  municipio_codigo_ibge: string;
  // Etapa 2
  responsavel_nome: string;
  responsavel_email: string;
  responsavel_cpf?: string;
  responsavel_cargo: string;
  responsavel_telefone?: string;
  responsavel_senha?: string;
  // Etapa 3
  plano_escolhido?: NomePlano;
  plano_selecionado?: NomePlano;
  intervalo?: IntervaloCobranca;
}

// ---- Métricas de Uso ----
export interface MetricasUsoMunicipio {
  id?: string;
  municipio_id: string;
  municipio_nome?: string;
  municipio_uf?: string;
  total_usuarios: number;
  total_cestas: number;
  total_cotacoes: number;
  total_produtos_catalogo: number;
  cestas_ultimo_mes: number;
  cotacoes_ultimo_mes: number;
  ultimo_acesso: string | null;
  plano_atual?: NomePlano | null;
  status_assinatura?: StatusAssinatura | null;
  armazenamento_mb: number;
  atualizado_em: string;
}

// ---- Painel Admin Metaclass ----
export interface TenantResumo {
  municipio: Municipio;
  assinatura: Assinatura | null;
  metricas: MetricasUsoMunicipio | null;
}

export interface EstatisticasPlataforma {
  total_municipios: number;
  municipios_ativos?: number;
  total_usuarios?: number;
  total_cestas?: number;
  total_cotacoes?: number;
  mrr: number;                // Monthly Recurring Revenue em centavos
  arr: number;                // Annual RR em centavos
  churn_rate: number;         // %
  planos_distribuicao: Record<string, number>;
}

// ══════════════════════════════════════════════════════════════════════════════
// FASE 16 — Consolidação e Qualidade
// ══════════════════════════════════════════════════════════════════════════════

// ---- Serviço de Email ----
export type StatusEmail = "pendente" | "enviado" | "falhou" | "entregue" | "bounced";
export type ProvedorEmail = "resend" | "sendgrid" | "smtp";
export type TipoEmail = "cotacao_convite" | "cotacao_lembrete" | "notificacao" | "alerta_preco" | "boas_vindas";

export interface EmailEnviado {
  id: string;
  tipo: TipoEmail;
  destinatario_email: string;
  destinatario_nome?: string | null;
  assunto: string;
  corpo_html?: string | null;
  corpo_texto?: string | null;
  referencia_tipo?: string | null;
  referencia_id?: string | null;
  provedor: ProvedorEmail;
  provedor_message_id?: string | null;
  status: StatusEmail;
  tentativas: number;
  ultimo_erro?: string | null;
  enviado_em?: string | null;
  entregue_em?: string | null;
  criado_em: string;
  criado_por?: string | null;
}

export interface EnviarEmailDTO {
  tipo: TipoEmail;
  para: { email: string; nome?: string };
  assunto: string;
  html?: string;
  texto?: string;
  referencia_tipo?: string;
  referencia_id?: string;
}

// ---- Assinatura Eletrônica ----
export interface AssinaturaEletronica {
  id: string;
  tipo: "cotacao_resposta" | "relatorio" | "cesta";
  referencia_tipo: string;
  referencia_id: string;
  nome_assinante: string;
  cpf_cnpj_assinante?: string | null;
  email_assinante?: string | null;
  ip_assinante?: string | null;
  user_agent?: string | null;
  hash_documento?: string | null;
  dados_assinados?: Record<string, unknown> | null;
  assinado_em: string;
  criado_em: string;
}

export interface CriarAssinaturaDTO {
  tipo: AssinaturaEletronica["tipo"];
  referencia_tipo: string;
  referencia_id: string;
  nome_assinante: string;
  cpf_cnpj_assinante?: string;
  email_assinante?: string;
  dados_assinados?: Record<string, unknown>;
}

// ---- API REST Pública ----
export interface ApiKey {
  id: string;
  municipio_id: string;
  nome: string;
  chave_hash: string;
  prefixo: string;
  permissoes: string[];
  rate_limit_rpm: number;
  ativo: boolean;
  ultimo_uso_em?: string | null;
  total_requisicoes: number;
  expira_em?: string | null;
  criado_em: string;
  criado_por?: string | null;
  revogado_em?: string | null;
  revogado_por?: string | null;
}

export interface CriarApiKeyDTO {
  municipio_id: string;
  nome: string;
  permissoes?: string[];
  rate_limit_rpm?: number;
  expira_em?: string;
}

export interface ApiKeyComChave extends ApiKey {
  chave_texto: string;  // Apenas no momento da criação
}

export interface ApiLog {
  id: string;
  api_key_id?: string | null;
  metodo: string;
  endpoint: string;
  status_code?: number | null;
  ip?: string | null;
  user_agent?: string | null;
  latencia_ms?: number | null;
  request_body?: Record<string, unknown> | null;
  response_resumo?: string | null;
  criado_em: string;
}

export interface ApiEstatisticas {
  api_key_id: string;
  nome: string;
  prefixo: string;
  municipio_id: string;
  ativo: boolean;
  total_requisicoes: number;
  ultimo_uso_em?: string | null;
  requisicoes_24h: number;
  requisicoes_1h: number;
  latencia_media_24h?: number | null;
}

// ---- Índice de atualização Log ----
export interface IndiceAtualizacaoLog {
  id: string;
  indice: string;
  mes_referencia: string;
  valor_anterior?: number | null;
  valor_novo: number;
  fonte_url?: string | null;
  metodo: string;
  sucesso: boolean;
  erro?: string | null;
  executado_em: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// FASE 17 — Melhorias Enterprise
// ══════════════════════════════════════════════════════════════════════════════

// ---- Workflow de Aprovação ----
export type StatusWorkflow =
  | "rascunho"
  | "em_pesquisa"
  | "em_analise"
  | "aguardando_aprovacao"
  | "aprovada"
  | "devolvida"
  | "publicada"
  | "arquivada"
  | "expirada";

export interface TramitacaoCesta {
  id: string;
  cesta_id: string;
  status_anterior: string;
  status_novo: string;
  servidor_id: string;
  observacoes: string | null;
  motivo_devolucao: string | null;
  criado_em: string;
  // joins
  servidor?: Servidor;
}

export type MetodologiaCalculo = "media" | "mediana" | "menor_preco" | "media_saneada";

export interface CestaWorkflow {
  id: string;
  descricao_objeto: string;
  status_workflow: StatusWorkflow;
  metodologia_calculo: MetodologiaCalculo;
  bloqueada: boolean;
  expira_em: string | null;
  validade_meses: number;
  fundamentacao_legal: string | null;
  numero_minimo_fontes: number;
  aprovador_id: string | null;
  aprovada_em: string | null;
  publicada_em: string | null;
  secretaria_nome?: string;
  municipio_nome?: string;
  uf?: string;
  criador_nome?: string;
  aprovador_nome?: string | null;
  total_itens?: number;
  total_fontes_distintas?: number;
  checklist_aprovado?: boolean | null;
  ultima_tramitacao?: string | null;
  criado_em: string;
}

// ---- Checklist de Conformidade IN 65/2021 ----
export interface ChecklistConformidade {
  id: string;
  cesta_id: string;
  verificado_por: string | null;
  verificado_em: string | null;
  minimo_fontes_atendido: boolean;
  diversidade_fontes: boolean;
  prazo_precos_valido: boolean;
  precos_dentro_validade: boolean;
  outliers_tratados: boolean;
  justificativa_exclusoes: boolean;
  documentos_comprobatorios: boolean;
  metodologia_definida: boolean;
  fundamentacao_legal_presente: boolean;
  assinaturas_presentes: boolean;
  aprovado: boolean;
  observacoes: string | null;
  criado_em: string;
  atualizado_em: string;
}

export type CriterioChecklist = keyof Omit<
  ChecklistConformidade,
  "id" | "cesta_id" | "verificado_por" | "verificado_em" | "aprovado" | "observacoes" | "criado_em" | "atualizado_em"
>;

// ---- CATMAT/CATSER ----
export type TipoCatmat = "material" | "servico";

export interface CatmatCatser {
  id: string;
  codigo: string;
  descricao: string;
  tipo: TipoCatmat;
  grupo: string | null;
  classe: string | null;
  padrao_descritivo: string | null;
  unidade_fornecimento: string | null;
  sustentavel: boolean;
  ativo: boolean;
  atualizado_em: string;
}

export interface FiltroCatmat {
  termo?: string;
  tipo?: TipoCatmat;
  grupo?: string;
  classe?: string;
  sustentavel?: boolean;
  limite?: number;
  offset?: number;
}

// ---- LGPD ----
export type TipoConsentimento = "termos_uso" | "politica_privacidade" | "cookies" | "marketing";
export type TipoSolicitacaoLgpd = "exclusao" | "portabilidade" | "retificacao" | "anonimizacao" | "revogacao";
export type StatusSolicitacaoLgpd = "pendente" | "em_andamento" | "concluida" | "recusada";

export interface ConsentimentoLgpd {
  id: string;
  servidor_id: string;
  tipo: TipoConsentimento;
  aceito: boolean;
  ip_address: string | null;
  user_agent: string | null;
  versao_documento: string;
  aceito_em: string | null;
  revogado_em: string | null;
  criado_em: string;
}

export interface SolicitacaoLgpd {
  id: string;
  servidor_id: string;
  tipo: TipoSolicitacaoLgpd;
  status: StatusSolicitacaoLgpd;
  descricao: string | null;
  resposta: string | null;
  respondido_por: string | null;
  respondido_em: string | null;
  prazo_legal: string;
  criado_em: string;
  // joins
  servidor?: Servidor;
}

// ---- Importação em Lote ----
export type TipoImportacao = "precos" | "produtos" | "catmat" | "fornecedores" | "arp";
export type StatusImportacao = "processando" | "concluida" | "parcial" | "falhou";

export interface ImportacaoLote {
  id: string;
  cesta_id: string | null;
  tipo: TipoImportacao;
  nome_arquivo: string;
  tamanho_bytes: number | null;
  total_linhas: number;
  linhas_importadas: number;
  linhas_erro: number;
  erros: Array<{ linha: number; campo?: string; mensagem: string }>;
  status: StatusImportacao;
  importado_por: string;
  criado_em: string;
  finalizado_em: string | null;
}

// ---- IA Generativa ----
export type TipoInteracaoIA =
  | "sugestao_fonte"
  | "analise_preco"
  | "texto_justificativa"
  | "pesquisa_natural"
  | "memorial_calculo";

export interface InteracaoIA {
  id: string;
  servidor_id: string;
  tipo: TipoInteracaoIA;
  prompt: string;
  resposta: string | null;
  modelo: string;
  tokens_input: number | null;
  tokens_output: number | null;
  custo_estimado: number | null;
  duracao_ms: number | null;
  avaliacao_usuario: number | null;
  criado_em: string;
}

// ---- Login gov.br ----
export interface ConfigGovBr {
  client_id: string;
  redirect_uri: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  scopes: string[];
}

export interface UsuarioGovBr {
  cpf: string;
  nome: string;
  email: string;
  telefone?: string;
  nivel_confiabilidade: "bronze" | "prata" | "ouro";
  foto_url?: string;
}

// ---- Memorial de Cálculo ----
export interface MemorialCalculo {
  cesta_id: string;
  descricao_objeto: string;
  fundamentacao_legal: string;
  metodologia: MetodologiaCalculo;
  data_geracao: string;
  orgao: string;
  municipio: string;
  uf: string;
  responsavel: string;
  itens: MemorialItemCalculo[];
  resumo: {
    total_itens: number;
    total_fontes: number;
    valor_total_estimado: number;
    percentual_economia?: number;
  };
}

export interface MemorialItemCalculo {
  ordem: number;
  descricao: string;
  unidade: string;
  quantidade: number;
  precos_coletados: Array<{
    fonte: string;
    orgao: string;
    data_referencia: string;
    valor_unitario: number;
    valor_corrigido: number | null;
    excluido: boolean;
    justificativa_exclusao?: string;
  }>;
  estatisticas: {
    media: number | null;
    mediana: number | null;
    menor_preco: number | null;
    maior_preco: number | null;
    desvio_padrao: number | null;
    coeficiente_variacao: number | null;
    preco_referencia: number | null;
    metodo_adotado: MetodologiaCalculo;
  };
  valor_total_estimado: number;
}
