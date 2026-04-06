import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "@/componentes/ui/error-boundary";

function BomComponente() {
  return <div>Tudo certo</div>;
}

function ComponenteComErro(): never {
  throw new Error("Erro de teste");
}

describe("ErrorBoundary", () => {
  it("renderiza children quando não há erro", () => {
    render(
      <ErrorBoundary>
        <BomComponente />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Tudo certo")).toBeInTheDocument();
  });

  it("renderiza fallback quando filho lança erro", () => {
    // Suprimir console.error do React para este teste
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ComponenteComErro />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Algo deu errado")).toBeInTheDocument();
    expect(screen.getByText("Recarregar página")).toBeInTheDocument();

    spy.mockRestore();
  });

  it("renderiza fallback customizado", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary fallback={<div>Fallback customizado</div>}>
        <ComponenteComErro />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Fallback customizado")).toBeInTheDocument();

    spy.mockRestore();
  });
});
