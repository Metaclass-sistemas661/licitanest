// ═══════════════════════════════════════════════════════════════════════════════
// Hooks de Cotação Eletrônica — Fase 9
// ═══════════════════════════════════════════════════════════════════════════════
import { useCallback, useRef, useState } from "react";
import type {
  Cotacao,
  CriarCotacaoDTO,
  StatusCotacao,
  RespostaCotacao,
  LancamentoManual,
  DadosPortalFornecedor,
  MeioRecebimento,
} from "@/tipos";
import {
  listarCotacoes,
  obterCotacao,
  criarCotacao,
  atualizarCotacao,
  alterarStatusCotacao,
  excluirCotacao,
  enviarCotacao,
  listarRespostasCotacao,
  listarLancamentosManuais,
  criarLancamentoManual,
  transferirRespostaParaCesta,
  transferirLancamentoParaCesta,
  buscarPortalPorToken,
  salvarRespostasPortal,
  type FiltrosCotacoes,
} from "@/servicos/cotacoes";

// ── Hook: lista paginada de cotações ──────────────────────────────────────────
export function useCotacoesPaginadas() {
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const carregar = useCallback(async (filtros?: FiltrosCotacoes, pagina = 1) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setCarregando(true);
    setErro(null);
    try {
      const result = await listarCotacoes(filtros, pagina);
      setCotacoes(result.data);
      setTotal(result.total);
    } catch (e: any) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  return { cotacoes, total, carregando, erro, carregar };
}

// ── Hook: detalhe de cotação ──────────────────────────────────────────────────
export function useCotacaoDetalhe() {
  const [cotacao, setCotacao] = useState<Cotacao | null>(null);
  const [respostas, setRespostas] = useState<RespostaCotacao[]>([]);
  const [lancamentos, setLancamentos] = useState<LancamentoManual[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const carregar = useCallback(async (id: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setCarregando(true);
    setErro(null);
    try {
      const [cot, resps, lancs] = await Promise.all([
        obterCotacao(id),
        listarRespostasCotacao(id),
        listarLancamentosManuais(id),
      ]);
      setCotacao(cot);
      setRespostas(resps);
      setLancamentos(lancs);
    } catch (e: any) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  const criar = useCallback(async (dto: CriarCotacaoDTO) => {
    setCarregando(true);
    setErro(null);
    try {
      const c = await criarCotacao(dto);
      setCotacao(c);
      return c;
    } catch (e: any) {
      setErro(e.message);
      return null;
    } finally {
      setCarregando(false);
    }
  }, []);

  const atualizar = useCallback(async (id: string, campos: Partial<Pick<Cotacao, "titulo" | "descricao" | "data_encerramento">>) => {
    try {
      const c = await atualizarCotacao(id, campos);
      setCotacao(c);
      return c;
    } catch (e: any) {
      setErro(e.message);
      return null;
    }
  }, []);

  const alterarStatus = useCallback(async (id: string, status: StatusCotacao) => {
    try {
      const c = await alterarStatusCotacao(id, status);
      setCotacao(prev => prev ? { ...prev, status: c.status } : prev);
      return c;
    } catch (e: any) {
      setErro(e.message);
      return null;
    }
  }, []);

  const enviar = useCallback(async (id: string) => {
    setCarregando(true);
    try {
      const c = await enviarCotacao(id);
      setCotacao(c);
      return c;
    } catch (e: any) {
      setErro(e.message);
      return null;
    } finally {
      setCarregando(false);
    }
  }, []);

  const excluir = useCallback(async (id: string) => {
    try {
      await excluirCotacao(id);
      setCotacao(null);
    } catch (e: any) {
      setErro(e.message);
    }
  }, []);

  const transferirResposta = useCallback(async (respostaId: string, servidorId: string) => {
    try {
      await transferirRespostaParaCesta(respostaId, servidorId);
      // Recarregar respostas
      if (cotacao) {
        const resps = await listarRespostasCotacao(cotacao.id);
        setRespostas(resps);
      }
    } catch (e: any) {
      setErro(e.message);
    }
  }, [cotacao]);

  const lancarManual = useCallback(async (
    cotacaoId: string,
    lancamento: {
      item_cesta_id: string;
      razao_social: string;
      cpf_cnpj?: string;
      email?: string;
      telefone?: string;
      marca?: string;
      valor_unitario: number;
      valor_total?: number;
      observacoes?: string;
      registro_anvisa?: string;
      meio_recebimento: MeioRecebimento;
      lancado_por: string;
    },
  ) => {
    try {
      const lanc = await criarLancamentoManual(cotacaoId, lancamento);
      setLancamentos(prev => [lanc, ...prev]);
      return lanc;
    } catch (e: any) {
      setErro(e.message);
      return null;
    }
  }, []);

  const transferirLancamento = useCallback(async (lancamentoId: string, servidorId: string) => {
    try {
      await transferirLancamentoParaCesta(lancamentoId, servidorId);
      setLancamentos(prev => prev.map(l => l.id === lancamentoId ? { ...l, transferido_cesta: true, transferido_em: new Date().toISOString() } : l));
    } catch (e: any) {
      setErro(e.message);
    }
  }, []);

  return {
    cotacao,
    respostas,
    lancamentos,
    carregando,
    erro,
    carregar,
    criar,
    atualizar,
    alterarStatus,
    enviar,
    excluir,
    transferirResposta,
    lancarManual,
    transferirLancamento,
  };
}

// ── Hook: portal do fornecedor (público) ──────────────────────────────────────
export function usePortalFornecedor() {
  const [dados, setDados] = useState<DadosPortalFornecedor | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const carregarPorToken = useCallback(async (token: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setCarregando(true);
    setErro(null);
    try {
      const d = await buscarPortalPorToken(token);
      setDados(d);
    } catch (e: any) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  const salvarRespostas = useCallback(async (
    fornecedorId: string,
    respostas: {
      cotacao_item_id: string;
      marca?: string;
      valor_unitario: number;
      valor_total?: number;
      observacoes?: string;
      registro_anvisa?: string;
    }[],
    dadosFornecedor?: {
      endereco_completo?: string;
      cep?: string;
      cidade?: string;
      uf?: string;
      prazo_validade_dias?: number;
      nome_responsavel?: string;
      cpf_responsavel?: string;
    },
    csrfToken?: string,
  ) => {
    setSalvando(true);
    setErro(null);
    setSucesso(false);
    try {
      await salvarRespostasPortal(fornecedorId, respostas, dadosFornecedor, csrfToken);
      setSucesso(true);
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }, []);

  return { dados, carregando, salvando, erro, sucesso, carregarPorToken, salvarRespostas };
}
