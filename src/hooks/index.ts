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
  useBuscaComprasNet,
  useBuscaCATMAT,
  useBuscaARP,
  useBuscaANP,
  useBuscaFNDE,
} from "./useFontesPrecoFase7";
export {
  useBuscaBPSSaude,
  useBuscaSIGTAP,
  useBuscaCEASANacional,
  useBuscaFIPE,
  useBuscaSIASG,
  useBuscaTCUPrecos,
} from "./useFontesPrecoFase7P1";
export {
  useBuscaCUB,
  useBuscaBNDES,
  useBuscaSIASIH,
  useBuscaAgenciasReg,
  useBuscaINCRA,
} from "./useFontesPrecoFase7P2";
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
