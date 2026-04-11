// Hooks para busca em fontes de preços — Fase 7
// ComprasNet, CATMAT/CATSER, ARP, ANP, FNDE
import { useCallback, useRef, useState } from "react";
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
import {
  buscarComprasNet,
  buscarCATMAT,
  buscarARP,
  buscarANP,
  buscarFNDE,
} from "@/servicos/crawlersFase7";

interface EstadoBusca<T> {
  dados: T[];
  carregando: boolean;
  erro: string | null;
}

// ╔══════════════════════════════════════════════════════╗
// ║  Hook ComprasNet                                    ║
// ╚══════════════════════════════════════════════════════╝
export function useBuscaComprasNet() {
  const [state, setState] = useState<EstadoBusca<DadosFonteComprasNet>>({
    dados: [], carregando: false, erro: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const buscar = useCallback(async (filtro: FiltroComprasNet) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setState((prev) => ({ ...prev, carregando: true, erro: null }));
    try {
      const resultados = await buscarComprasNet(filtro);
      setState({ dados: resultados, carregando: false, erro: null });
      return resultados;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return [];
      const msg = e instanceof Error ? e.message : "Erro ao buscar ComprasNet";
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
// ║  Hook CATMAT/CATSER                                 ║
// ╚══════════════════════════════════════════════════════╝
export function useBuscaCATMAT() {
  const [state, setState] = useState<EstadoBusca<DadosFonteCATMAT>>({
    dados: [], carregando: false, erro: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const buscar = useCallback(async (filtro: FiltroCATMAT) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setState((prev) => ({ ...prev, carregando: true, erro: null }));
    try {
      const resultados = await buscarCATMAT(filtro);
      setState({ dados: resultados, carregando: false, erro: null });
      return resultados;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return [];
      const msg = e instanceof Error ? e.message : "Erro ao buscar CATMAT";
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
// ║  Hook ARP — Atas de Registro de Preço               ║
// ╚══════════════════════════════════════════════════════╝
export function useBuscaARP() {
  const [state, setState] = useState<EstadoBusca<DadosFonteARP>>({
    dados: [], carregando: false, erro: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const buscar = useCallback(async (filtro: FiltroARP) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setState((prev) => ({ ...prev, carregando: true, erro: null }));
    try {
      const resultados = await buscarARP(filtro);
      setState({ dados: resultados, carregando: false, erro: null });
      return resultados;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return [];
      const msg = e instanceof Error ? e.message : "Erro ao buscar ARP";
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
// ║  Hook ANP — Combustíveis                            ║
// ╚══════════════════════════════════════════════════════╝
export function useBuscaANP() {
  const [state, setState] = useState<EstadoBusca<DadosFonteANP>>({
    dados: [], carregando: false, erro: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const buscar = useCallback(async (filtro: FiltroANP) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setState((prev) => ({ ...prev, carregando: true, erro: null }));
    try {
      const resultados = await buscarANP(filtro);
      setState({ dados: resultados, carregando: false, erro: null });
      return resultados;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return [];
      const msg = e instanceof Error ? e.message : "Erro ao buscar ANP";
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
// ║  Hook FNDE/PNAE — Merenda Escolar                  ║
// ╚══════════════════════════════════════════════════════╝
export function useBuscaFNDE() {
  const [state, setState] = useState<EstadoBusca<DadosFonteFNDE>>({
    dados: [], carregando: false, erro: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const buscar = useCallback(async (filtro: FiltroFNDE) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setState((prev) => ({ ...prev, carregando: true, erro: null }));
    try {
      const resultados = await buscarFNDE(filtro);
      setState({ dados: resultados, carregando: false, erro: null });
      return resultados;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return [];
      const msg = e instanceof Error ? e.message : "Erro ao buscar FNDE";
      setState((prev) => ({ ...prev, carregando: false, erro: msg }));
      return [];
    }
  }, []);

  const limpar = useCallback(() => {
    setState({ dados: [], carregando: false, erro: null });
  }, []);

  return { ...state, buscar, limpar };
}
