import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock estável do banco de dados
const mockQuery = vi.fn();

vi.mock("../config/database.js", () => ({
  getPool: () => ({ query: mockQuery }),
}));

import { exigirAceiteTermos } from "../middleware/termos.js";

function mockRequest(overrides: Record<string, any> = {}): any {
  return {
    url: "/api/cestas",
    usuario: undefined,
    ...overrides,
  };
}

function mockReply() {
  const reply: any = {};
  reply.status = vi.fn().mockReturnValue(reply);
  reply.send = vi.fn().mockReturnValue(reply);
  return reply;
}

describe("exigirAceiteTermos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ignora rotas isentas (/api/lgpd/aceite-pendente)", async () => {
    const req = mockRequest({ url: "/api/lgpd/aceite-pendente" });
    const reply = mockReply();

    await exigirAceiteTermos(req, reply);

    expect(reply.status).not.toHaveBeenCalled();
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("ignora rotas isentas (/api/lgpd/consentimentos)", async () => {
    const req = mockRequest({ url: "/api/lgpd/consentimentos?page=1" });
    const reply = mockReply();

    await exigirAceiteTermos(req, reply);

    expect(reply.status).not.toHaveBeenCalled();
  });

  it("ignora rotas isentas (/api/health)", async () => {
    const req = mockRequest({ url: "/api/health" });
    const reply = mockReply();

    await exigirAceiteTermos(req, reply);

    expect(reply.status).not.toHaveBeenCalled();
  });

  it("ignora quando não tem servidor (portal público)", async () => {
    const req = mockRequest({
      usuario: { uid: "u1", servidor: null },
    });
    const reply = mockReply();

    await exigirAceiteTermos(req, reply);

    expect(reply.status).not.toHaveBeenCalled();
  });

  it("permite quando ambos termos aceitos (count=2)", async () => {
    const req = mockRequest({
      usuario: { uid: "u1", servidor: { id: "srv-1" } },
    });
    const reply = mockReply();

    mockQuery.mockResolvedValue({
      rows: [{ aceitos: 2 }],
    });

    await exigirAceiteTermos(req, reply);

    expect(reply.status).not.toHaveBeenCalled();
  });

  it("retorna 451 quando termos não aceitos (count=0)", async () => {
    const req = mockRequest({
      usuario: { uid: "u1", servidor: { id: "srv-1" } },
    });
    const reply = mockReply();

    mockQuery.mockResolvedValue({
      rows: [{ aceitos: 0 }],
    });

    await exigirAceiteTermos(req, reply);

    expect(reply.status).toHaveBeenCalledWith(451);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        codigo: "TERMOS_PENDENTES",
      }),
    );
  });

  it("retorna 451 quando apenas 1 de 2 termos aceito", async () => {
    const req = mockRequest({
      usuario: { uid: "u1", servidor: { id: "srv-1" } },
    });
    const reply = mockReply();

    mockQuery.mockResolvedValue({
      rows: [{ aceitos: 1 }],
    });

    await exigirAceiteTermos(req, reply);

    expect(reply.status).toHaveBeenCalledWith(451);
  });

  it("remove query string ao verificar rotas isentas", async () => {
    const req = mockRequest({ url: "/api/health?check=1" });
    const reply = mockReply();

    await exigirAceiteTermos(req, reply);

    expect(reply.status).not.toHaveBeenCalled();
  });
});
