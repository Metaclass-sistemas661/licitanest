import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

// Mock Firebase antes de qualquer import que o use
vi.mock("@/lib/firebase", () => ({
  auth: {},
  firebaseApp: {},
}));

// Mock do módulo api também (usado pelo AuthProvider)
vi.mock("@/lib/api", () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { useAuth } from "@/hooks/useAuth";

describe("useAuth", () => {
  it("lança erro quando usado fora do AuthProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow("useAuth deve ser usado dentro de um <AuthProvider>");

    spy.mockRestore();
  });
});
