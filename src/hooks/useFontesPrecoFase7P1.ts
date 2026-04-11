// Hooks para busca em fontes de preços — Fase 7 P1
// BPS Saúde, SIGTAP, CEASA Nacional, FIPE, SIASG, TCU
import { useCallback, useRef, useState } from "react";
import type {
  DadosFonteBPSSaude,
  DadosFonteSIGTAP,
  DadosFonteCEASANacional,
  DadosFonteFIPE,
  DadosFonteSIASG,
  DadosFonteTCU,
  FiltroBPSSaude,
  FiltroSIGTAP,
  FiltroCEASANacional,
  FiltroFIPE,
  FiltroSIASG,
  FiltroTCU,
} from "@/tipos";
import {
  buscarBPSSaude,
  buscarSIGTAP,
  buscarCEASANacional,
  buscarFIPE,
  buscarSIASG,
  buscarTCU,
} from "@/servicos/crawlersFase7P1";

interface EstadoBusca<T> {
  dados: T[];
  carregando: boolean;
  erro: string | null;
}

// ╔══════════════════════════════════════════════════════╗
// ║  Hook BPS Saúde Ampliado                            ║
// ╚══════════════════════════════════════════════════════╝
export function useBuscaBPSSaude() {
  const [state, setState] = useState<EstadoBusca<DadosFonteBPSSaude>>({
    dados: [], carregando: false, erro: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const buscar = useCallback(async (filtro: FiltroBPSSaude) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setState((prev) => ({ ...prev, carregando: true, erro: null }));
    try {
      const resultados = await buscarBPSSaude(filtro);
      setState({ dados: resultados, carregando: false, erro: null });
      return resultados;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return [];
      const msg = e instanceof Error ? e.message : "Erro ao buscar BPS Saúde";
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
// ║  Hook SIGTAP/SUS                                    ║
// ╚══════════════════════════════════════════════════════╝
export function useBuscaSIGTAP() {
  const [state, setState] = useState<EstadoBusca<DadosFonteSIGTAP>>({
    dados: [], carregando: false, erro: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const buscar = useCallback(async (filtro: FiltroSIGTAP) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setState((prev) => ({ ...prev, carregando: true, erro: null }));
    try {
      const resultados = await buscarSIGTAP(filtro);
      setState({ dados: resultados, carregando: false, erro: null });
      return resultados;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return [];
      const msg = e instanceof Error ? e.message : "Erro ao buscar SIGTAP";
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
// ║  Hook CEASA Nacional                                ║
// ╚══════════════════════════════════════════════════════╝
export function useBuscaCEASANacional() {
  const [state, setState] = useState<EstadoBusca<DadosFonteCEASANacional>>({
    dados: [], carregando: false, erro: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const buscar = useCallback(async (filtro: FiltroCEASANacional) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setState((prev) => ({ ...prev, carregando: true, erro: null }));
    try {
      const resultados = await buscarCEASANacional(filtro);
      setState({ dados: resultados, carregando: false, erro: null });
      return resultados;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return [];
      const msg = e instanceof Error ? e.message : "Erro ao buscar CEASA Nacional";
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
// ║  Hook FIPE — Veículos                               ║
// ╚══════════════════════════════════════════════════════╝
export function useBuscaFIPE() {
  const [state, setState] = useState<EstadoBusca<DadosFonteFIPE>>({
    dados: [], carregando: false, erro: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const buscar = useCallback(async (filtro: FiltroFIPE) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setState((prev) => ({ ...prev, carregando: true, erro: null }));
    try {
      const resultados = await buscarFIPE(filtro);
      setState({ dados: resultados, carregando: false, erro: null });
      return resultados;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return [];
      const msg = e instanceof Error ? e.message : "Erro ao buscar FIPE";
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
// ║  Hook SIASG/DW                                      ║
// ╚══════════════════════════════════════════════════════╝
export function useBuscaSIASG() {
  const [state, setState] = useState<EstadoBusca<DadosFonteSIASG>>({
    dados: [], carregando: false, erro: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const buscar = useCallback(async (filtro: FiltroSIASG) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setState((prev) => ({ ...prev, carregando: true, erro: null }));
    try {
      const resultados = await buscarSIASG(filtro);
      setState({ dados: resultados, carregando: false, erro: null });
      return resultados;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return [];
      const msg = e instanceof Error ? e.message : "Erro ao buscar SIASG";
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
// ║  Hook TCU e-Preços                                  ║
// ╚══════════════════════════════════════════════════════╝
export function useBuscaTCUPrecos() {
  const [state, setState] = useState<EstadoBusca<DadosFonteTCU>>({
    dados: [], carregando: false, erro: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const buscar = useCallback(async (filtro: FiltroTCU) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setState((prev) => ({ ...prev, carregando: true, erro: null }));
    try {
      const resultados = await buscarTCU(filtro);
      setState({ dados: resultados, carregando: false, erro: null });
      return resultados;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return [];
      const msg = e instanceof Error ? e.message : "Erro ao buscar TCU";
      setState((prev) => ({ ...prev, carregando: false, erro: msg }));
      return [];
    }
  }, []);

  const limpar = useCallback(() => {
    setState({ dados: [], carregando: false, erro: null });
  }, []);

  return { ...state, buscar, limpar };
}
