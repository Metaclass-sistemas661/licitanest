import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock api
vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("iaGenerativa — Segurança", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("NÃO expõe chaves de API no código frontend", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(__dirname, "../servicos/iaGenerativa.ts");
    const source = fs.readFileSync(filePath, "utf-8");
    expect(source).not.toContain("VITE_OPENAI_API_KEY");
    expect(source).not.toContain("VITE_ANTHROPIC_API_KEY");
    expect(source).not.toContain("VITE_VERTEX_API_KEY");
  });

  it("isIAConfigurada retorna true (Edge Function decide)", async () => {
    const { isIAConfigurada } = await import("@/servicos/iaGenerativa");
    expect(isIAConfigurada()).toBe(true);
  });
});
