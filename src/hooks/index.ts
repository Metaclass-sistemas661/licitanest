// Hooks customizados do LicitaNest
export { useAuth } from "./useAuth";
export { useDadosReferencia, useProdutosPaginados, useAutocompleteProdutos } from "./useCatalogo";
export { useCestasPaginadas, useCestaDetalhe, useFontes } from "./useCestas";
export {
  useBuscaPNCP,
  useBuscaPainel,
  useBuscaTCE,
  useBuscaMultiTCE,
  useBuscaTodasFontes,
  useExecucoesCrawler,
} from "./useFontesPreco";
export {
  useBuscaBPS,
  useBuscaSINAPI,
  useBuscaCONAB,
  useBuscaCEASA,
  useBuscaCMED,
} from "./useFontesPrecoFase6";
export {
  useIndicesCorrecao,
  useImportacaoIndices,
  useCorrecaoCesta,
} from "./useCorrecaoMonetaria";
export {
  useCotacoesPaginadas,
  useCotacaoDetalhe,
  usePortalFornecedor,
} from "./useCotacoes";
export { useAnaliseCritica } from "./useAnaliseCritica";
export { useRelatorios, useDocumentos } from "./useRelatorios";
export { useDashboard, usePainelGestor } from "./useDashboard";
