import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock do Sentry para testar a inicialização
vi.mock("@sentry/react", () => ({
  init: vi.fn(),
  setUser: vi.fn(),
  setTag: vi.fn(),
  captureException: vi.fn(),
  browserTracingIntegration: vi.fn(() => ({})),
  replayIntegration: vi.fn(() => ({})),
}));

describe("Sentry — Inicialização", () => {
  const originalEnv = import.meta.env;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    Object.defineProperty(import.meta, "env", { value: originalEnv });
  });

  it("exporta setSentryUser e clearSentryUser", async () => {
    const { setSentryUser, clearSentryUser } = await import("@/lib/sentry");
    expect(setSentryUser).toBeTypeOf("function");
    expect(clearSentryUser).toBeTypeOf("function");
  });

  it("exporta captureError", async () => {
    const { captureError } = await import("@/lib/sentry");
    expect(captureError).toBeTypeOf("function");
  });

  it("initSentry não lança erro sem DSN", async () => {
    const { initSentry } = await import("@/lib/sentry");
    expect(() => initSentry()).not.toThrow();
  });
});
