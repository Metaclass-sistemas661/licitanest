// Hooks para Cestas de Preços — com TanStack Query
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  FontePreco,
} from "@/tipos";
import * as cestasSvc from "@/servicos/cestas";
import * as itensSvc from "@/servicos/itensCesta";
import * as fontesSvc from "@/servicos/fontes";
import type { FiltrosCestas } from "@/servicos/cestas";

// ── Lista paginada de cestas ─────────────────────────
export function useCestasPaginadas(filtrosIniciais: FiltrosCestas = {}) {
  const [pagina, setPagina] = useState(1);
  const [filtros, setFiltros] = useState<FiltrosCestas>(filtrosIniciais);
  const porPagina = 20;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["cestas", filtros, pagina],
    queryFn: () => cestasSvc.listarCestas(filtros, pagina, porPagina),
  });

  const mudarFiltros = (novosFiltros: FiltrosCestas) => {
    setFiltros(novosFiltros);
    setPagina(1);
  };

  return {
    cestas: data?.data ?? [],
    total: data?.total ?? 0,
    pagina,
    porPagina,
    carregando: isLoading,
    erro: error ? (error instanceof Error ? error.message : "Erro ao carregar cestas") : null,
    filtros,
    setPagina,
    mudarFiltros,
    recarregar: refetch,
  };
}

// ── Detalhe de uma cesta ─────────────────────────────
export function useCestaDetalhe(cestaId: string | undefined) {
  const cestaQuery = useQuery({
    queryKey: ["cesta", cestaId],
    queryFn: () => cestasSvc.obterCesta(cestaId!),
    enabled: !!cestaId,
  });

  const itensQuery = useQuery({
    queryKey: ["cesta-itens", cestaId],
    queryFn: () => itensSvc.listarItensCesta(cestaId!),
    enabled: !!cestaId,
  });

  const lotesQuery = useQuery({
    queryKey: ["cesta-lotes", cestaId],
    queryFn: () => itensSvc.listarLotesCesta(cestaId!),
    enabled: !!cestaId,
  });

  const carregando = cestaQuery.isLoading || itensQuery.isLoading || lotesQuery.isLoading;
  const erroAny = cestaQuery.error || itensQuery.error || lotesQuery.error;

  return {
    cesta: cestaQuery.data ?? null,
    itens: itensQuery.data ?? [],
    lotes: lotesQuery.data ?? [],
    carregando,
    erro: erroAny ? (erroAny instanceof Error ? erroAny.message : "Erro ao carregar cesta") : null,
    recarregar: () => {
      cestaQuery.refetch();
      itensQuery.refetch();
      lotesQuery.refetch();
    },
    setCesta: () => {}, // compatibilidade — invalidar query no lugar
    setItens: () => {},
    setLotes: () => {},
  };
}

// ── Fontes de preço ──────────────────────────────────
export function useFontes() {
  const { data } = useQuery({
    queryKey: ["fontes-preco"],
    queryFn: () => fontesSvc.listarFontes(),
    staleTime: 10 * 60 * 1000, // 10 min — muda pouco
  });

  return data ?? ([] as FontePreco[]);
}
