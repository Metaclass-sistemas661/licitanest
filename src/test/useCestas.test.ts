import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { useCestasPaginadas, useFontes } from "@/hooks/useCestas";

// Mock dos serviços
vi.mock("@/servicos/cestas", () => ({
  listarCestas: vi.fn().mockResolvedValue({
    data: [{ id: "c1", descricao_objeto: "Cesta 1" }],
    total: 1,
  }),
}));

vi.mock("@/servicos/itensCesta", () => ({
  listarItensCesta: vi.fn().mockResolvedValue([]),
  listarLotesCesta: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/servicos/fontes", () => ({
  listarFontes: vi.fn().mockResolvedValue([
    { id: "f1", nome: "Painel de Preços" },
  ]),
}));

function criarWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("useCestasPaginadas", () => {
  it("retorna valores iniciais antes de carregar", () => {
    const { result } = renderHook(() => useCestasPaginadas(), {
      wrapper: criarWrapper(),
    });

    expect(result.current.cestas).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.pagina).toBe(1);
    expect(result.current.porPagina).toBe(20);
  });

  it("carrega cestas do serviço", async () => {
    const { result } = renderHook(() => useCestasPaginadas(), {
      wrapper: criarWrapper(),
    });

    await waitFor(() => {
      expect(result.current.cestas.length).toBeGreaterThan(0);
    });

    expect(result.current.cestas[0].id).toBe("c1");
    expect(result.current.total).toBe(1);
  });

  it("expõe função mudarFiltros", () => {
    const { result } = renderHook(() => useCestasPaginadas(), {
      wrapper: criarWrapper(),
    });

    expect(typeof result.current.mudarFiltros).toBe("function");
    expect(typeof result.current.setPagina).toBe("function");
    expect(typeof result.current.recarregar).toBe("function");
  });
});

describe("useFontes", () => {
  it("retorna array de fontes", async () => {
    const { result } = renderHook(() => useFontes(), {
      wrapper: criarWrapper(),
    });

    await waitFor(() => {
      expect(result.current.length).toBeGreaterThan(0);
    });

    expect(result.current[0].nome).toBe("Painel de Preços");
  });
});
