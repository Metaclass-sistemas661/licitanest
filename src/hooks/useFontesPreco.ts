// Hooks para busca em fontes de preços governamentais
import { useCallback, useRef, useState } from "react";
import type {
  DadosFontePNCP,
  DadosFontePainel,
  DadosFonteTCE,
  ExecucaoCrawler,
  FiltroFonte,
} from "@/tipos";
import {
  buscarPNCP,
  buscarPainelPrecos,
  buscarTCEMG,
  buscarMultiplosTCEs,
  listarExecucoes,
  type UF,
} from "@/servicos/crawlers";
import {
  useBuscaBPS,
  useBuscaSINAPI,
  useBuscaCONAB,
  useBuscaCEASA,
  useBuscaCMED,
} from "./useFontesPrecoFase6";
import {
  useBuscaComprasNet,
  useBuscaCATMAT,
  useBuscaARP,
  useBuscaANP,
  useBuscaFNDE,
} from "./useFontesPrecoFase7";
import {
  useBuscaBPSSaude,
  useBuscaSIGTAP,
  useBuscaCEASANacional,
  useBuscaFIPE,
  useBuscaSIASG,
  useBuscaTCUPrecos,
} from "./useFontesPrecoFase7P1";
import {
  useBuscaCUB,
  useBuscaBNDES,
  useBuscaSIASIH,
  useBuscaAgenciasReg,
  useBuscaINCRA,
} from "./useFontesPrecoFase7P2";

// ── Estado genérico de busca ────────────────────────
interface EstadoBusca<T> {
  dados: T[];
  carregando: boolean;
  erro: string | null;
}

// ── Hook PNCP ───────────────────────────────────────
export function useBuscaPNCP() {
  const [state, setState] = useState<EstadoBusca<DadosFontePNCP>>({
    dados: [],
    carregando: false,
    erro: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const buscar = useCallback(async (filtro: FiltroFonte) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setState((prev) => ({ ...prev, carregando: true, erro: null }));
    try {
      const resultados = await buscarPNCP(filtro);
      setState({ dados: resultados, carregando: false, erro: null });
      return resultados;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return [];
      const msg = e instanceof Error ? e.message : "Erro ao buscar PNCP";
      setState((prev) => ({ ...prev, carregando: false, erro: msg }));
      return [];
    }
  }, []);

  const limpar = useCallback(() => {
    setState({ dados: [], carregando: false, erro: null });
  }, []);

  return { ...state, buscar, limpar };
}

// ── Hook Painel de Preços ───────────────────────────
export function useBuscaPainel() {
  const [state, setState] = useState<EstadoBusca<DadosFontePainel>>({
    dados: [],
    carregando: false,
    erro: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const buscar = useCallback(async (filtro: FiltroFonte) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setState((prev) => ({ ...prev, carregando: true, erro: null }));
    try {
      const resultados = await buscarPainelPrecos(filtro);
      setState({ dados: resultados, carregando: false, erro: null });
      return resultados;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return [];
      const msg =
        e instanceof Error ? e.message : "Erro ao buscar Painel de Preços";
      setState((prev) => ({ ...prev, carregando: false, erro: msg }));
      return [];
    }
  }, []);

  const limpar = useCallback(() => {
    setState({ dados: [], carregando: false, erro: null });
  }, []);

  return { ...state, buscar, limpar };
}

// ── Hook TCE/MG (retrocompatível) ───────────────────
export function useBuscaTCE() {
  const [state, setState] = useState<EstadoBusca<DadosFonteTCE>>({
    dados: [],
    carregando: false,
    erro: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const buscar = useCallback(async (filtro: FiltroFonte) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setState((prev) => ({ ...prev, carregando: true, erro: null }));
    try {
      const resultados = await buscarTCEMG(filtro);
      setState({ dados: resultados, carregando: false, erro: null });
      return resultados;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return [];
      const msg =
        e instanceof Error ? e.message : "Erro ao buscar TCE/MG";
      setState((prev) => ({ ...prev, carregando: false, erro: msg }));
      return [];
    }
  }, []);

  const limpar = useCallback(() => {
    setState({ dados: [], carregando: false, erro: null });
  }, []);

  return { ...state, buscar, limpar };
}

// ── Hook Multi-TCE (múltiplos estados) ──────────────
export function useBuscaMultiTCE() {
  const [state, setState] = useState<EstadoBusca<DadosFonteTCE>>({
    dados: [],
    carregando: false,
    erro: null,
  });
  const [ufsSelecionadas, setUfsSelecionadas] = useState<UF[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const buscar = useCallback(
    async (filtro: FiltroFonte, ufs?: UF[]) => {
      const ufsParaBuscar = ufs ?? ufsSelecionadas;
      if (ufsParaBuscar.length === 0) {
        setState({ dados: [], carregando: false, erro: "Selecione ao menos um estado" });
        return [];
      }
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setState((prev) => ({ ...prev, carregando: true, erro: null }));
      try {
        const resultados = await buscarMultiplosTCEs(ufsParaBuscar, filtro);
        setState({ dados: resultados, carregando: false, erro: null });
        return resultados;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return [];
        const msg = e instanceof Error ? e.message : "Erro ao buscar TCEs";
        setState((prev) => ({ ...prev, carregando: false, erro: msg }));
        return [];
      }
    },
    [ufsSelecionadas]
  );

  const limpar = useCallback(() => {
    setState({ dados: [], carregando: false, erro: null });
  }, []);

  /** Agrupar resultados por UF */
  const dadosPorUF = state.dados.reduce<Record<string, DadosFonteTCE[]>>((acc, item) => {
    const uf = item.uf ?? "??";
    if (!acc[uf]) acc[uf] = [];
    acc[uf].push(item);
    return acc;
  }, {});

  return { ...state, buscar, limpar, ufsSelecionadas, setUfsSelecionadas, dadosPorUF };
}

// ── Hook busca em todas as fontes ───────────────────
export function useBuscaTodasFontes() {
  const pncp = useBuscaPNCP();
  const painel = useBuscaPainel();
  const tce = useBuscaTCE();
  const multiTCE = useBuscaMultiTCE();
  const bps = useBuscaBPS();
  const sinapi = useBuscaSINAPI();
  const conab = useBuscaCONAB();
  const ceasa = useBuscaCEASA();
  const cmed = useBuscaCMED();
  const comprasnet = useBuscaComprasNet();
  const catmat = useBuscaCATMAT();
  const arp = useBuscaARP();
  const anp = useBuscaANP();
  const fnde = useBuscaFNDE();
  // Fase 7 — P1
  const bpsSaude = useBuscaBPSSaude();
  const sigtap = useBuscaSIGTAP();
  const ceasaNacional = useBuscaCEASANacional();
  const fipe = useBuscaFIPE();
  const siasg = useBuscaSIASG();
  const tcuPrecos = useBuscaTCUPrecos();
  // Fase 7 — P2+P3
  const cub = useBuscaCUB();
  const bndes = useBuscaBNDES();
  const siaSih = useBuscaSIASIH();
  const agenciasReg = useBuscaAgenciasReg();
  const incra = useBuscaINCRA();

  const buscarTodas = useCallback(
    async (filtro: FiltroFonte, ufs?: UF[]) => {
      const buscas: Promise<unknown>[] = [
        pncp.buscar(filtro),
        painel.buscar(filtro),
        // Fontes Fase 6 — termo genérico
        bps.buscar({ termo: filtro.termo, uf: filtro.uf, limite: filtro.limite }),
        sinapi.buscar({ termo: filtro.termo, uf: filtro.uf ?? "MG", limite: filtro.limite }),
        conab.buscar({ termo: filtro.termo, uf: filtro.uf, limite: filtro.limite }),
        ceasa.buscar({ termo: filtro.termo, limite: filtro.limite }),
        cmed.buscar({ termo: filtro.termo, limite: filtro.limite }),
        // Fontes Fase 7 — P0
        comprasnet.buscar({ termo: filtro.termo, uf: filtro.uf, limite: filtro.limite }),
        arp.buscar({ termo: filtro.termo, uf: filtro.uf, apenasVigentes: true, limite: filtro.limite }),
        anp.buscar({ produto: filtro.termo, uf: filtro.uf, limite: filtro.limite }),
        fnde.buscar({ termo: filtro.termo, uf: filtro.uf, limite: filtro.limite }),
        // Fontes Fase 7 — P1
        bpsSaude.buscar({ termo: filtro.termo, uf: filtro.uf, limite: filtro.limite }),
        sigtap.buscar({ termo: filtro.termo, limite: filtro.limite }),
        ceasaNacional.buscar({ termo: filtro.termo, uf: filtro.uf, limite: filtro.limite }),
        fipe.buscar({ termo: filtro.termo, limite: filtro.limite }),
        siasg.buscar({ termo: filtro.termo, limite: filtro.limite }),
        tcuPrecos.buscar({ termo: filtro.termo, limite: filtro.limite }),
        // Fontes Fase 7 — P2+P3
        bndes.buscar({ termo: filtro.termo, limite: filtro.limite }),
        siaSih.buscar({ termo: filtro.termo, uf: filtro.uf, limite: filtro.limite }),
        agenciasReg.buscar({ termo: filtro.termo, uf: filtro.uf, limite: filtro.limite }),
      ];
      if (ufs && ufs.length > 0) {
        buscas.push(multiTCE.buscar(filtro, ufs));
      } else {
        buscas.push(tce.buscar(filtro));
      }
      await Promise.allSettled(buscas);
    },
    [pncp, painel, tce, multiTCE, bps, sinapi, conab, ceasa, cmed,
     comprasnet, arp, anp, fnde,
     bpsSaude, sigtap, ceasaNacional, fipe, siasg, tcuPrecos,
     bndes, siaSih, agenciasReg]
  );

  const limparTodas = useCallback(() => {
    pncp.limpar();
    painel.limpar();
    tce.limpar();
    multiTCE.limpar();
    bps.limpar();
    sinapi.limpar();
    conab.limpar();
    ceasa.limpar();
    cmed.limpar();
    comprasnet.limpar();
    catmat.limpar();
    arp.limpar();
    anp.limpar();
    fnde.limpar();
    bpsSaude.limpar();
    sigtap.limpar();
    ceasaNacional.limpar();
    fipe.limpar();
    siasg.limpar();
    tcuPrecos.limpar();
    cub.limpar();
    bndes.limpar();
    siaSih.limpar();
    agenciasReg.limpar();
    incra.limpar();
  }, [pncp, painel, tce, multiTCE, bps, sinapi, conab, ceasa, cmed,
      comprasnet, catmat, arp, anp, fnde,
      bpsSaude, sigtap, ceasaNacional, fipe, siasg, tcuPrecos,
      cub, bndes, siaSih, agenciasReg, incra]);

  const carregando =
    pncp.carregando || painel.carregando || tce.carregando || multiTCE.carregando ||
    bps.carregando || sinapi.carregando || conab.carregando || ceasa.carregando || cmed.carregando ||
    comprasnet.carregando || catmat.carregando || arp.carregando || anp.carregando || fnde.carregando ||
    bpsSaude.carregando || sigtap.carregando || ceasaNacional.carregando || fipe.carregando ||
    siasg.carregando || tcuPrecos.carregando ||
    cub.carregando || bndes.carregando || siaSih.carregando || agenciasReg.carregando || incra.carregando;
  const totalResultados =
    pncp.dados.length +
    painel.dados.length +
    tce.dados.length +
    multiTCE.dados.length +
    bps.dados.length +
    sinapi.dados.length +
    conab.dados.length +
    ceasa.dados.length +
    cmed.dados.length +
    comprasnet.dados.length +
    catmat.dados.length +
    arp.dados.length +
    anp.dados.length +
    fnde.dados.length +
    bpsSaude.dados.length +
    sigtap.dados.length +
    ceasaNacional.dados.length +
    fipe.dados.length +
    siasg.dados.length +
    tcuPrecos.dados.length +
    cub.dados.length +
    bndes.dados.length +
    siaSih.dados.length +
    agenciasReg.dados.length +
    incra.dados.length;

  return {
    pncp,
    painel,
    tce,
    multiTCE,
    bps,
    sinapi,
    conab,
    ceasa,
    cmed,
    comprasnet,
    catmat,
    arp,
    anp,
    fnde,
    bpsSaude,
    sigtap,
    ceasaNacional,
    fipe,
    siasg,
    tcuPrecos,
    cub,
    bndes,
    siaSih,
    agenciasReg,
    incra,
    buscarTodas,
    limparTodas,
    carregando,
    totalResultados,
  };
}

// ── Hook execuções de crawler ───────────────────────
export function useExecucoesCrawler(fonteId?: string) {
  const [execucoes, setExecucoes] = useState<ExecucaoCrawler[]>([]);
  const [carregando, setCarregando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const data = await listarExecucoes(fonteId);
      setExecucoes(data);
    } catch {
      setExecucoes([]);
    } finally {
      setCarregando(false);
    }
  }, [fonteId]);

  return { execucoes, carregando, carregar };
}
