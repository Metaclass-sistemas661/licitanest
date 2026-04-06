import { describe, it, expect, vi } from "vitest";

// Mock api antes de importar workflow
vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import {
  transicaoPermitida,
  proximasTransicoes,
  perfilPodeTransitar,
  LABELS_WORKFLOW,
  CORES_WORKFLOW,
  LABELS_METODOLOGIA,
} from "@/servicos/workflow";
import type { StatusWorkflow } from "@/tipos";

describe("Workflow — State Machine", () => {
  describe("transicaoPermitida", () => {
    it("permite rascunho → em_pesquisa", () => {
      expect(transicaoPermitida("rascunho", "em_pesquisa")).toBe(true);
    });

    it("bloqueia rascunho → aprovada (pula etapas)", () => {
      expect(transicaoPermitida("rascunho", "aprovada")).toBe(false);
    });

    it("bloqueia rascunho → publicada (pula etapas)", () => {
      expect(transicaoPermitida("rascunho", "publicada")).toBe(false);
    });

    it("permite em_pesquisa → em_analise", () => {
      expect(transicaoPermitida("em_pesquisa", "em_analise")).toBe(true);
    });

    it("permite em_pesquisa → rascunho (voltar)", () => {
      expect(transicaoPermitida("em_pesquisa", "rascunho")).toBe(true);
    });

    it("permite em_analise → aguardando_aprovacao", () => {
      expect(transicaoPermitida("em_analise", "aguardando_aprovacao")).toBe(true);
    });

    it("permite em_analise → devolvida", () => {
      expect(transicaoPermitida("em_analise", "devolvida")).toBe(true);
    });

    it("permite aguardando_aprovacao → aprovada", () => {
      expect(transicaoPermitida("aguardando_aprovacao", "aprovada")).toBe(true);
    });

    it("permite aguardando_aprovacao → devolvida", () => {
      expect(transicaoPermitida("aguardando_aprovacao", "devolvida")).toBe(true);
    });

    it("permite aprovada → publicada", () => {
      expect(transicaoPermitida("aprovada", "publicada")).toBe(true);
    });

    it("permite aprovada → arquivada", () => {
      expect(transicaoPermitida("aprovada", "arquivada")).toBe(true);
    });

    it("bloqueia publicada → aprovada (irreversível)", () => {
      expect(transicaoPermitida("publicada", "aprovada")).toBe(false);
    });

    it("permite publicada → arquivada", () => {
      expect(transicaoPermitida("publicada", "arquivada")).toBe(true);
    });

    it("bloqueia arquivada (terminal)", () => {
      expect(transicaoPermitida("arquivada", "rascunho")).toBe(false);
      expect(transicaoPermitida("arquivada", "em_pesquisa")).toBe(false);
    });

    it("permite expirada → em_pesquisa (reabrir)", () => {
      expect(transicaoPermitida("expirada", "em_pesquisa")).toBe(true);
    });

    it("bloqueia expirada → aprovada (deve refazer)", () => {
      expect(transicaoPermitida("expirada", "aprovada")).toBe(false);
    });
  });

  describe("proximasTransicoes", () => {
    it("retorna [em_pesquisa] para rascunho", () => {
      expect(proximasTransicoes("rascunho")).toEqual(["em_pesquisa"]);
    });

    it("retorna array vazio para arquivada", () => {
      expect(proximasTransicoes("arquivada")).toEqual([]);
    });

    it("retorna opções corretas para em_analise", () => {
      const transicoes = proximasTransicoes("em_analise");
      expect(transicoes).toContain("aguardando_aprovacao");
      expect(transicoes).toContain("em_pesquisa");
      expect(transicoes).toContain("devolvida");
      expect(transicoes).toHaveLength(3);
    });
  });

  describe("perfilPodeTransitar", () => {
    it("pesquisador pode alterar rascunho e em_pesquisa", () => {
      expect(perfilPodeTransitar("rascunho", "pesquisador")).toBe(true);
      expect(perfilPodeTransitar("em_pesquisa", "pesquisador")).toBe(true);
    });

    it("pesquisador NÃO pode aprovar", () => {
      expect(perfilPodeTransitar("aprovada", "pesquisador")).toBe(false);
      expect(perfilPodeTransitar("aguardando_aprovacao", "pesquisador")).toBe(false);
    });

    it("gestor pode analisar e devolver", () => {
      expect(perfilPodeTransitar("em_analise", "gestor")).toBe(true);
      expect(perfilPodeTransitar("aguardando_aprovacao", "gestor")).toBe(true);
      expect(perfilPodeTransitar("devolvida", "gestor")).toBe(true);
    });

    it("gestor NÃO pode publicar", () => {
      expect(perfilPodeTransitar("publicada", "gestor")).toBe(false);
    });

    it("administrador pode tudo", () => {
      const todosStatus: StatusWorkflow[] = [
        "rascunho", "em_pesquisa", "em_analise",
        "aguardando_aprovacao", "aprovada", "devolvida", "publicada",
      ];
      todosStatus.forEach((status) => {
        expect(perfilPodeTransitar(status, "administrador")).toBe(true);
      });
    });
  });

  describe("Labels e constantes", () => {
    const todosStatus: StatusWorkflow[] = [
      "rascunho", "em_pesquisa", "em_analise", "aguardando_aprovacao",
      "aprovada", "devolvida", "publicada", "arquivada", "expirada",
    ];

    it("todos os status têm label", () => {
      todosStatus.forEach((status) => {
        expect(LABELS_WORKFLOW[status]).toBeDefined();
        expect(LABELS_WORKFLOW[status].length).toBeGreaterThan(0);
      });
    });

    it("todos os status têm cor", () => {
      todosStatus.forEach((status) => {
        expect(CORES_WORKFLOW[status]).toBeDefined();
      });
    });

    it("todas as metodologias têm label", () => {
      expect(LABELS_METODOLOGIA.media).toBeDefined();
      expect(LABELS_METODOLOGIA.mediana).toBeDefined();
      expect(LABELS_METODOLOGIA.menor_preco).toBeDefined();
      expect(LABELS_METODOLOGIA.media_saneada).toBeDefined();
    });
  });
});
