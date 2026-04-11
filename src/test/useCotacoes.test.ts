import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCotacoesPaginadas, useCotacaoDetalhe } from "@/hooks/useCotacoes";

// Mock de todos os serviços de cotação
vi.mock("@/servicos/cotacoes", () => ({
  listarCotacoes: vi.fn().mockResolvedValue({
    data: [{ id: "cot-1", titulo: "Cotação Teste" }],
    total: 1,
  }),
  obterCotacao: vi.fn().mockResolvedValue({
    id: "cot-1",
    titulo: "Cotação Teste",
    status: "rascunho",
  }),
  criarCotacao: vi.fn().mockResolvedValue({
    id: "cot-2",
    titulo: "Nova Cotação",
    status: "rascunho",
  }),
  atualizarCotacao: vi.fn().mockResolvedValue({
    id: "cot-1",
    titulo: "Atualizada",
  }),
  alterarStatusCotacao: vi.fn().mockResolvedValue({
    id: "cot-1",
    status: "enviada",
  }),
  excluirCotacao: vi.fn().mockResolvedValue(undefined),
  enviarCotacao: vi.fn().mockResolvedValue({
    id: "cot-1",
    status: "enviada",
  }),
  listarRespostasCotacao: vi.fn().mockResolvedValue([]),
  listarLancamentosManuais: vi.fn().mockResolvedValue([]),
  criarLancamentoManual: vi.fn(),
  transferirRespostaParaCesta: vi.fn(),
  transferirLancamentoParaCesta: vi.fn(),
  buscarPortalPorToken: vi.fn(),
  salvarRespostasPortal: vi.fn(),
}));

describe("useCotacoesPaginadas", () => {
  it("inicia com estado vazio", () => {
    const { result } = renderHook(() => useCotacoesPaginadas());

    expect(result.current.cotacoes).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.carregando).toBe(false);
    expect(result.current.erro).toBeNull();
  });

  it("carrega cotações com carregar()", async () => {
    const { result } = renderHook(() => useCotacoesPaginadas());

    await act(async () => {
      await result.current.carregar();
    });

    expect(result.current.cotacoes).toHaveLength(1);
    expect(result.current.cotacoes[0].id).toBe("cot-1");
    expect(result.current.total).toBe(1);
  });
});

describe("useCotacaoDetalhe", () => {
  it("inicia com estado null", () => {
    const { result } = renderHook(() => useCotacaoDetalhe());

    expect(result.current.cotacao).toBeNull();
    expect(result.current.respostas).toEqual([]);
    expect(result.current.lancamentos).toEqual([]);
    expect(result.current.carregando).toBe(false);
    expect(result.current.erro).toBeNull();
  });

  it("carrega detalhe de cotação", async () => {
    const { result } = renderHook(() => useCotacaoDetalhe());

    await act(async () => {
      await result.current.carregar("cot-1");
    });

    expect(result.current.cotacao).toBeDefined();
    expect(result.current.cotacao!.id).toBe("cot-1");
  });

  it("cria nova cotação", async () => {
    const { result } = renderHook(() => useCotacaoDetalhe());

    let novaCotacao: any;
    await act(async () => {
      novaCotacao = await result.current.criar({
        titulo: "Nova Cotação",
        cesta_id: "cesta-1",
      } as any);
    });

    expect(novaCotacao).toBeDefined();
    expect(novaCotacao.id).toBe("cot-2");
  });

  it("expõe funções de CRUD", () => {
    const { result } = renderHook(() => useCotacaoDetalhe());

    expect(typeof result.current.carregar).toBe("function");
    expect(typeof result.current.criar).toBe("function");
    expect(typeof result.current.atualizar).toBe("function");
    expect(typeof result.current.alterarStatus).toBe("function");
    expect(typeof result.current.enviar).toBe("function");
    expect(typeof result.current.excluir).toBe("function");
  });
});
