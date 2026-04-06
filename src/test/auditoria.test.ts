import { describe, it, expect, vi } from "vitest";

// Mock API client
vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("Auditoria", () => {
  it("registrarAuditoria é exportada", async () => {
    const { registrarAuditoria } = await import("@/servicos/auditoria");
    expect(registrarAuditoria).toBeTypeOf("function");
  });

  it("listarAuditoria é exportada", async () => {
    const { listarAuditoria } = await import("@/servicos/auditoria");
    expect(listarAuditoria).toBeTypeOf("function");
  });

  it("registrarAuditoria não lança erro em uso normal", async () => {
    const { registrarAuditoria } = await import("@/servicos/auditoria");
    await expect(
      registrarAuditoria({
        servidor_id: "test-id",
        acao: "TESTE",
        tabela: "cestas",
        registro_id: "123",
      }),
    ).resolves.not.toThrow();
  });
});
