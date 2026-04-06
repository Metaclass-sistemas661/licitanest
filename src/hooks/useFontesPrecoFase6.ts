// Hooks para busca em fontes de preços — Fase 6
// BPS, SINAPI, CONAB, CEASA, CMED
import { useCallback, useRef, useState } from "react";
import type {
  DadosFonteBPS,
  DadosFonteSINAPI,
  DadosFonteCONAB,
  DadosFonteCEASA,
  DadosFonteCMED,
  FiltroBPS,
  FiltroSINAPI,
  FiltroCONAB,
  FiltroCEASA,
  FiltroCMED,
} from "@/tipos";
import {
  buscarBPS,
  buscarSINAPI,
  buscarCONAB,
  buscarCEASA,
  buscarCMED,
  buscarMediaPonderadaBPS,
} from "@/servicos/crawlersFase6";

// ── Estado genérico de busca ────────────────────────
interface EstadoBusca<T> {
  dados: T[];
  carregando: boolean;
  erro: string | null;
}

// ╔══════════════════════════════════════════════════════╗
// ║  Hook BPS — Banco de Preços em Saúde                ║
// ╚══════════════════════════════════════════════════════╝
export function useBuscaBPS() {
  const [state, setState] = useState<EstadoBusca<DadosFonteBPS>>({
    dados: [],
    carregando: false,
    erro: null,
  });
  const [mediaPonderada, setMediaPonderada] = useState<{
    media: number;
    total: number;
  } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const buscar = useCallback(async (filtro: FiltroBPS) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setState((prev) => ({ ...prev, carregando: true, erro: null }));
    setMediaPonderada(null);
    try {
      const resultados = await buscarBPS(filtro);
      setState({ dados: resultados, carregando: false, erro: null });

      // Se buscou por código BR, calcular média ponderada
      if (filtro.codigoBR) {
        try {
          const mp = await buscarMediaPonderadaBPS(filtro.codigoBR);
          setMediaPonderada({ media: mp.media, total: mp.total });
        } catch {
          // não bloqueia
        }
      }
      return resultados;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return [];
      const msg = e instanceof Error ? e.message : "Erro ao buscar BPS";
      setState((prev) => ({ ...prev, carregando: false, erro: msg }));
      return [];
    }
  }, []);

  const limpar = useCallback(() => {
    setState({ dados: [], carregando: false, erro: null });
    setMediaPonderada(null);
  }, []);

  return { ...state, buscar, limpar, mediaPonderada };
}

// ╔══════════════════════════════════════════════════════╗
// ║  Hook SINAPI                                        ║
// ╚══════════════════════════════════════════════════════╝
export function useBuscaSINAPI() {
  const [state, setState] = useState<EstadoBusca<DadosFonteSINAPI>>({
    dados: [],
    carregando: false,
    erro: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const buscar = useCallback(async (filtro: FiltroSINAPI) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setState((prev) => ({ ...prev, carregando: true, erro: null }));
    try {
      const resultados = await buscarSINAPI(filtro);
      setState({ dados: resultados, carregando: false, erro: null });
      return resultados;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return [];
      const msg = e instanceof Error ? e.message : "Erro ao buscar SINAPI";
      setState((prev) => ({ ...prev, carregando: false, erro: msg }));
      return [];
    }
  }, []);

  const limpar = useCallback(() => {
    setState({ dados: [], carregando: false, erro: null });
  }, []);

  return { ...state, buscar, limpar };
}

// ╔══════════════════════════════════════════════════════╗
// ║  Hook CONAB                                         ║
// ╚══════════════════════════════════════════════════════╝
export function useBuscaCONAB() {
  const [state, setState] = useState<EstadoBusca<DadosFonteCONAB>>({
    dados: [],
    carregando: false,
    erro: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const buscar = useCallback(async (filtro: FiltroCONAB) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setState((prev) => ({ ...prev, carregando: true, erro: null }));
    try {
      const resultados = await buscarCONAB(filtro);
      setState({ dados: resultados, carregando: false, erro: null });
      return resultados;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return [];
      const msg = e instanceof Error ? e.message : "Erro ao buscar CONAB";
      setState((prev) => ({ ...prev, carregando: false, erro: msg }));
      return [];
    }
  }, []);

  const limpar = useCallback(() => {
    setState({ dados: [], carregando: false, erro: null });
  }, []);

  return { ...state, buscar, limpar };
}

// ╔══════════════════════════════════════════════════════╗
// ║  Hook CEASA-MG                                      ║
// ╚══════════════════════════════════════════════════════╝
export function useBuscaCEASA() {
  const [state, setState] = useState<EstadoBusca<DadosFonteCEASA>>({
    dados: [],
    carregando: false,
    erro: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const buscar = useCallback(async (filtro: FiltroCEASA) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setState((prev) => ({ ...prev, carregando: true, erro: null }));
    try {
      const resultados = await buscarCEASA(filtro);
      setState({ dados: resultados, carregando: false, erro: null });
      return resultados;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return [];
      const msg = e instanceof Error ? e.message : "Erro ao buscar CEASA";
      setState((prev) => ({ ...prev, carregando: false, erro: msg }));
      return [];
    }
  }, []);

  const limpar = useCallback(() => {
    setState({ dados: [], carregando: false, erro: null });
  }, []);

  return { ...state, buscar, limpar };
}

// ╔══════════════════════════════════════════════════════╗
// ║  Hook CMED/ANVISA                                   ║
// ╚══════════════════════════════════════════════════════╝
export function useBuscaCMED() {
  const [state, setState] = useState<EstadoBusca<DadosFonteCMED>>({
    dados: [],
    carregando: false,
    erro: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const buscar = useCallback(async (filtro: FiltroCMED) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setState((prev) => ({ ...prev, carregando: true, erro: null }));
    try {
      const resultados = await buscarCMED(filtro);
      setState({ dados: resultados, carregando: false, erro: null });
      return resultados;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return [];
      const msg = e instanceof Error ? e.message : "Erro ao buscar CMED/ANVISA";
      setState((prev) => ({ ...prev, carregando: false, erro: msg }));
      return [];
    }
  }, []);

  const limpar = useCallback(() => {
    setState({ dados: [], carregando: false, erro: null });
  }, []);

  return { ...state, buscar, limpar };
}
