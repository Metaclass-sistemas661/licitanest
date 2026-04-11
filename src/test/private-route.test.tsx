import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { createElement } from "react";

// Mock Firebase antes de qualquer import
vi.mock("@/lib/firebase", () => ({
  auth: {},
  firebaseApp: {},
}));

vi.mock("@/lib/api", () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

// Mock do useAuth
const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

import { PrivateRoute } from "@/componentes/auth/PrivateRoute";

function renderRota(
  props: Record<string, any> = {},
  initialEntries = ["/protegido"],
) {
  return render(
    createElement(
      MemoryRouter,
      { initialEntries },
      createElement(
        Routes,
        null,
        createElement(Route, {
          path: "/protegido",
          element: createElement(PrivateRoute, props, createElement("div", null, "Conteúdo protegido")),
        }),
        createElement(Route, {
          path: "/login",
          element: createElement("div", null, "Página de login"),
        }),
        createElement(Route, {
          path: "/",
          element: createElement("div", null, "Página inicial"),
        }),
      ),
    ),
  );
}

describe("PrivateRoute", () => {
  it("mostra loading spinner enquanto carrega", () => {
    mockUseAuth.mockReturnValue({
      usuario: null,
      servidor: null,
      perfil: null,
      carregando: true,
    });

    renderRota();
    expect(screen.getByText("Carregando...")).toBeInTheDocument();
  });

  it("redireciona para /login quando não autenticado", () => {
    mockUseAuth.mockReturnValue({
      usuario: null,
      servidor: null,
      perfil: null,
      carregando: false,
    });

    renderRota();
    expect(screen.getByText("Página de login")).toBeInTheDocument();
    expect(screen.queryByText("Conteúdo protegido")).not.toBeInTheDocument();
  });

  it("mostra loading de permissões quando autenticado mas sem servidor", () => {
    mockUseAuth.mockReturnValue({
      usuario: { uid: "u1" },
      servidor: null,
      perfil: null,
      carregando: false,
    });

    renderRota();
    expect(screen.getByText("Verificando permissões...")).toBeInTheDocument();
  });

  it("renderiza children quando autenticado com servidor", () => {
    mockUseAuth.mockReturnValue({
      usuario: { uid: "u1" },
      servidor: { id: "s1", nome: "Servidor" },
      perfil: "administrador",
      carregando: false,
    });

    renderRota();
    expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument();
  });

  it("bloqueia acesso quando perfil não é permitido", () => {
    mockUseAuth.mockReturnValue({
      usuario: { uid: "u1" },
      servidor: { id: "s1", nome: "Servidor" },
      perfil: "pesquisador",
      carregando: false,
    });

    renderRota({ perfisPermitidos: ["administrador"] });
    expect(screen.queryByText("Conteúdo protegido")).not.toBeInTheDocument();
    expect(screen.getByText("Página inicial")).toBeInTheDocument();
  });

  it("permite acesso quando perfil está na lista", () => {
    mockUseAuth.mockReturnValue({
      usuario: { uid: "u1" },
      servidor: { id: "s1", nome: "Servidor" },
      perfil: "gestor",
      carregando: false,
    });

    renderRota({ perfisPermitidos: ["administrador", "gestor"] });
    expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument();
  });

  it("permite qualquer perfil quando perfisPermitidos não é informado", () => {
    mockUseAuth.mockReturnValue({
      usuario: { uid: "u1" },
      servidor: { id: "s1", nome: "Servidor" },
      perfil: "pesquisador",
      carregando: false,
    });

    renderRota();
    expect(screen.getByText("Conteúdo protegido")).toBeInTheDocument();
  });
});
