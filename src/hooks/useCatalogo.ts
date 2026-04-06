import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Categoria, ElementoDespesa, UnidadeMedida, ProdutoCatalogo } from "@/tipos";
import {
  listarCategorias,
  listarElementosDespesa,
  listarUnidadesMedida,
} from "@/servicos/catalogoRefs";
import {
  listarProdutosCatalogo,
  buscarAutocompleteProdutos,
  type FiltrosCatalogo,
} from "@/servicos/produtosCatalogo";

// ─── Custom hook: dados de referência (categorias, etc.) ───

export function useDadosReferencia() {
  const { data, isLoading } = useQuery({
    queryKey: ["dados-referencia"],
    queryFn: async () => {
      const [cats, uns, els] = await Promise.all([
        listarCategorias(),
        listarUnidadesMedida(),
        listarElementosDespesa(),
      ]);
      return { categorias: cats, unidades: uns, elementos: els };
    },
    staleTime: 10 * 60 * 1000, // 10 min — dados de referência mudam pouco
  });

  return {
    categorias: data?.categorias ?? ([] as Categoria[]),
    unidades: data?.unidades ?? ([] as UnidadeMedida[]),
    elementos: data?.elementos ?? ([] as ElementoDespesa[]),
    carregando: isLoading,
  };
}

// ─── Custom hook: listagem paginada com filtros ────────────

export function useProdutosPaginados() {
  const [filtros, setFiltros] = useState<FiltrosCatalogo>({});
  const [pagina, setPagina] = useState(1);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["produtos-catalogo", filtros, pagina],
    queryFn: () => listarProdutosCatalogo(filtros, { pagina, porPagina: 50 }),
  });

  const atualizarFiltros = (novosFiltros: FiltrosCatalogo) => {
    setFiltros(novosFiltros);
    setPagina(1);
  };

  return {
    dados: data?.dados ?? [],
    total: data?.total ?? 0,
    pagina: data?.pagina ?? pagina,
    totalPaginas: data?.totalPaginas ?? 0,
    filtros,
    carregando: isLoading,
    erro: error ? (error instanceof Error ? error.message : "Erro ao carregar catálogo.") : null,
    setPagina,
    atualizarFiltros,
    recarregar: refetch,
  };
}

// ─── Custom hook: autocomplete com debounce ────────────────

export function useAutocompleteProdutos(debounceMs = 300) {
  const [termo, setTermo] = useState("");
  const [sugestoes, setSugestoes] = useState<
    Pick<ProdutoCatalogo, "id" | "descricao" | "codigo_catmat">[]
  >([]);
  const [buscando, setBuscando] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (termo.trim().length < 3) {
      setSugestoes([]);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      setBuscando(true);
      try {
        const res = await buscarAutocompleteProdutos(termo);
        setSugestoes(res);
      } catch {
        setSugestoes([]);
      } finally {
        setBuscando(false);
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [termo, debounceMs]);

  const limpar = () => {
    setTermo("");
    setSugestoes([]);
  };

  return { termo, setTermo, sugestoes, buscando, limpar };
}
