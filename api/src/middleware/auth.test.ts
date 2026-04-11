import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FastifyRequest, FastifyReply } from "fastify";

// Mocks estáveis — mesma referência a cada chamada
const mockVerifyIdToken = vi.fn();
const mockQuery = vi.fn();

vi.mock("../config/firebase.js", () => ({
  getAuth: () => ({ verifyIdToken: mockVerifyIdToken }),
}));

vi.mock("../config/database.js", () => ({
  getPool: () => ({ query: mockQuery }),
}));

import { verificarAuth, authOpcional } from "../middleware/auth.js";

function mockRequest(headers: Record<string, string> = {}): any {
  return { headers, usuario: undefined };
}

function mockReply() {
  const reply: any = {};
  reply.status = vi.fn().mockReturnValue(reply);
  reply.send = vi.fn().mockReturnValue(reply);
  return reply;
}

describe("verificarAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 401 quando header Authorization está ausente", async () => {
    const req = mockRequest();
    const reply = mockReply();

    await verificarAuth(req, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({ error: "Token não fornecido" });
  });

  it("retorna 401 quando header não começa com Bearer", async () => {
    const req = mockRequest({ authorization: "Basic abc123" });
    const reply = mockReply();

    await verificarAuth(req, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({ error: "Token não fornecido" });
  });

  it("retorna 401 quando token é inválido", async () => {
    const req = mockRequest({ authorization: "Bearer token-invalido" });
    const reply = mockReply();

    mockVerifyIdToken.mockRejectedValue(new Error("Token inválido"));

    await verificarAuth(req, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({ error: "Token inválido" });
  });

  it("popula request.usuario quando token é válido e servidor existe", async () => {
    const req = mockRequest({ authorization: "Bearer valid-token" });
    const reply = mockReply();

    mockVerifyIdToken.mockResolvedValue({
      uid: "firebase-uid-1",
      email: "teste@gov.br",
    });

    mockQuery.mockResolvedValue({
      rows: [
        {
          id: "srv-1",
          nome: "João",
          perfil_id: "p1",
          perfil_nome: "administrador",
          permissoes: { cestas: true },
          secretaria_id: "sec-1",
          municipio_id: "mun-1",
          nivel_govbr: "ouro",
        },
      ],
    });

    await verificarAuth(req, reply);

    expect(req.usuario).toBeDefined();
    expect(req.usuario.uid).toBe("firebase-uid-1");
    expect(req.usuario.email).toBe("teste@gov.br");
    expect(req.usuario.servidor.id).toBe("srv-1");
    expect(req.usuario.servidor.perfil_nome).toBe("administrador");
    expect(reply.status).not.toHaveBeenCalled();
  });

  it("popula servidor como null quando não há registro", async () => {
    const req = mockRequest({ authorization: "Bearer valid-token" });
    const reply = mockReply();

    mockVerifyIdToken.mockResolvedValue({
      uid: "firebase-uid-2",
      email: "novo@gov.br",
    });

    mockQuery.mockResolvedValue({ rows: [] });

    await verificarAuth(req, reply);

    expect(req.usuario).toBeDefined();
    expect(req.usuario.uid).toBe("firebase-uid-2");
    expect(req.usuario.servidor).toBeNull();
  });
});

describe("authOpcional", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("não faz nada quando sem header Authorization", async () => {
    const req = mockRequest();
    const reply = mockReply();

    await authOpcional(req, reply);

    expect(req.usuario).toBeUndefined();
    expect(reply.status).not.toHaveBeenCalled();
  });

  it("popula usuario quando token válido", async () => {
    const req = mockRequest({ authorization: "Bearer valid-token" });
    const reply = mockReply();

    mockVerifyIdToken.mockResolvedValue({
      uid: "uid-opt",
      email: "opt@gov.br",
    });

    mockQuery.mockResolvedValue({ rows: [] });

    await authOpcional(req, reply);

    expect(req.usuario).toBeDefined();
    expect(req.usuario.uid).toBe("uid-opt");
    expect(reply.status).not.toHaveBeenCalled();
  });

  it("ignora silenciosamente token inválido", async () => {
    const req = mockRequest({ authorization: "Bearer bad-token" });
    const reply = mockReply();

    mockVerifyIdToken.mockRejectedValue(new Error("fail"));

    await authOpcional(req, reply);

    expect(req.usuario).toBeUndefined();
    expect(reply.status).not.toHaveBeenCalled();
  });
});
