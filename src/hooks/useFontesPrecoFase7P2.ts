// Hooks para busca em fontes de preços — Fase 7 P2+P3
// CUB, BNDES, SIA/SIH, Agências Reguladoras, INCRA
import { useCallback, useRef, useState } from "react";
import type {
  DadosFonteCUB,
  DadosFonteBNDES,
  DadosFonteSIASIH,
  DadosFonteAgenciasReg,
  DadosFonteINCRA,
  FiltroCUB,
  FiltroBNDES,
  FiltroSIASIH,
  FiltroAgenciasReg,
  FiltroINCRA,
} from "@/tipos";
import {
  buscarCUB,
  buscarBNDES,
  buscarSIASIH,
  buscarAgenciasReg,
  buscarINCRA,
} from "@/servicos/crawlersFase7P2";

interface EstadoBusca<T> {
  dados: T[];
  carregando: boolean;
  erro: string | null;
}

// ╔══════════════════════════════════════════════════════╗
// ║  Hook CUB/SINDUSCON                                 ║
// ╚══════════════════════════════════════════════════════╝
export function useBuscaCUB() {
  const [state, setState] = useState<EstadoBusca<DadosFonteCUB>>({
    dados: [], carregando: false, erro: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const buscar = useCallback(async (filtro: FiltroCUB) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setState((prev) => ({ ...prev, carregando: true, erro: null }));
    try {
      const resultados = await buscarCUB(filtro);
      setState({ dados: resultados, carregando: false, erro: null });
      return resultados;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return [];
      const msg = e instanceof Error ? e.message : "Erro ao buscar CUB";
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
// ║  Hook BNDES — Cartão BNDES                          ║
// ╚══════════════════════════════════════════════════════╝
export function useBuscaBNDES() {
  const [state, setState] = useState<EstadoBusca<DadosFonteBNDES>>({
    dados: [], carregando: false, erro: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const buscar = useCallback(async (filtro: FiltroBNDES) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setState((prev) => ({ ...prev, carregando: true, erro: null }));
    try {
      const resultados = await buscarBNDES(filtro);
      setState({ dados: resultados, carregando: false, erro: null });
      return resultados;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return [];
      const msg = e instanceof Error ? e.message : "Erro ao buscar BNDES";
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
// ║  Hook SIA/SIH-SUS                                   ║
// ╚══════════════════════════════════════════════════════╝
export function useBuscaSIASIH() {
  const [state, setState] = useState<EstadoBusca<DadosFonteSIASIH>>({
    dados: [], carregando: false, erro: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const buscar = useCallback(async (filtro: FiltroSIASIH) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setState((prev) => ({ ...prev, carregando: true, erro: null }));
    try {
      const resultados = await buscarSIASIH(filtro);
      setState({ dados: resultados, carregando: false, erro: null });
      return resultados;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return [];
      const msg = e instanceof Error ? e.message : "Erro ao buscar SIA/SIH";
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
// ║  Hook Agências Reguladoras                          ║
// ╚══════════════════════════════════════════════════════╝
export function useBuscaAgenciasReg() {
  const [state, setState] = useState<EstadoBusca<DadosFonteAgenciasReg>>({
    dados: [], carregando: false, erro: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const buscar = useCallback(async (filtro: FiltroAgenciasReg) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setState((prev) => ({ ...prev, carregando: true, erro: null }));
    try {
      const resultados = await buscarAgenciasReg(filtro);
      setState({ dados: resultados, carregando: false, erro: null });
      return resultados;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return [];
      const msg = e instanceof Error ? e.message : "Erro ao buscar Agências Reguladoras";
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
// ║  Hook INCRA/EMBRAPA — Terras                        ║
// ╚══════════════════════════════════════════════════════╝
export function useBuscaINCRA() {
  const [state, setState] = useState<EstadoBusca<DadosFonteINCRA>>({
    dados: [], carregando: false, erro: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const buscar = useCallback(async (filtro: FiltroINCRA) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setState((prev) => ({ ...prev, carregando: true, erro: null }));
    try {
      const resultados = await buscarINCRA(filtro);
      setState({ dados: resultados, carregando: false, erro: null });
      return resultados;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return [];
      const msg = e instanceof Error ? e.message : "Erro ao buscar INCRA";
      setState((prev) => ({ ...prev, carregando: false, erro: msg }));
      return [];
    }
  }, []);

  const limpar = useCallback(() => {
    setState({ dados: [], carregando: false, erro: null });
  }, []);

  return { ...state, buscar, limpar };
}
