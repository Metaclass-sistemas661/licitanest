import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";

// jsdom não implementa scrollIntoView — polyfill para cmdk
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// Mock do useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import { CommandPalette } from "@/componentes/ui/command-palette";

function renderComRouter() {
  return render(
    createElement(MemoryRouter, null, createElement(CommandPalette)),
  );
}

function pressCtrlK() {
  act(() => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }),
    );
  });
}

function pressEscape() {
  act(() => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
  });
}

describe("CommandPalette", () => {
  it("não renderiza nada por padrão (fechada)", () => {
    renderComRouter();
    expect(screen.queryByPlaceholderText("Navegar para...")).not.toBeInTheDocument();
  });

  it("abre com Ctrl+K", () => {
    renderComRouter();
    pressCtrlK();
    expect(screen.getByPlaceholderText("Navegar para...")).toBeInTheDocument();
  });

  it("fecha com Escape", () => {
    renderComRouter();
    pressCtrlK();
    expect(screen.getByPlaceholderText("Navegar para...")).toBeInTheDocument();

    pressEscape();
    expect(screen.queryByPlaceholderText("Navegar para...")).not.toBeInTheDocument();
  });

  it("toggle com Ctrl+K (abre e fecha)", () => {
    renderComRouter();
    pressCtrlK();
    expect(screen.getByPlaceholderText("Navegar para...")).toBeInTheDocument();

    pressCtrlK();
    expect(screen.queryByPlaceholderText("Navegar para...")).not.toBeInTheDocument();
  });

  it("mostra rotas quando aberta", () => {
    renderComRouter();
    pressCtrlK();

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Cestas de Preços")).toBeInTheDocument();
    expect(screen.getByText("Catálogo CATMAT")).toBeInTheDocument();
    expect(screen.getByText("Cotação Eletrônica")).toBeInTheDocument();
    expect(screen.getByText("Configurações")).toBeInTheDocument();
    expect(screen.getByText("Relatórios")).toBeInTheDocument();
  });

  it("exibe texto 'Páginas' como heading de grupo", () => {
    renderComRouter();
    pressCtrlK();
    expect(screen.getByText("Páginas")).toBeInTheDocument();
  });
});
