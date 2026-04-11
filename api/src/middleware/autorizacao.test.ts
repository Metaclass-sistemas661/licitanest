import { describe, it, expect, vi } from "vitest";
import {
  exigirServidor,
  exigirAdmin,
  exigirNivelGovBr,
  filtroMunicipio,
  filtroSecretaria,
} from "../middleware/autorizacao.js";

// Helpers para mock de request/reply Fastify
function mockRequest(overrides: Record<string, any> = {}): any {
  return {
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

// ── exigirServidor ───────────────────────────
describe("exigirServidor", () => {
  it("chama done() quando servidor existe", () => {
    const req = mockRequest({
      usuario: { uid: "u1", email: "a@b.com", servidor: { id: "s1" } },
    });
    const reply = mockReply();
    const done = vi.fn();

    exigirServidor(req, reply, done);
    expect(done).toHaveBeenCalled();
    expect(reply.status).not.toHaveBeenCalled();
  });

  it("retorna 403 quando servidor é null", () => {
    const req = mockRequest({
      usuario: { uid: "u1", email: "a@b.com", servidor: null },
    });
    const reply = mockReply();
    const done = vi.fn();

    exigirServidor(req, reply, done);
    expect(done).not.toHaveBeenCalled();
    expect(reply.status).toHaveBeenCalledWith(403);
  });

  it("retorna 403 quando usuario é undefined", () => {
    const req = mockRequest();
    const reply = mockReply();
    const done = vi.fn();

    exigirServidor(req, reply, done);
    expect(done).not.toHaveBeenCalled();
    expect(reply.status).toHaveBeenCalledWith(403);
  });
});

// ── exigirAdmin ──────────────────────────────
describe("exigirAdmin", () => {
  it("chama done() quando perfil é administrador", () => {
    const req = mockRequest({
      usuario: {
        uid: "u1",
        email: "a@b.com",
        servidor: { id: "s1", perfil_nome: "administrador" },
      },
    });
    const reply = mockReply();
    const done = vi.fn();

    exigirAdmin(req, reply, done);
    expect(done).toHaveBeenCalled();
  });

  it("retorna 403 para perfil pesquisador", () => {
    const req = mockRequest({
      usuario: {
        uid: "u1",
        email: "a@b.com",
        servidor: { id: "s1", perfil_nome: "pesquisador" },
      },
    });
    const reply = mockReply();
    const done = vi.fn();

    exigirAdmin(req, reply, done);
    expect(done).not.toHaveBeenCalled();
    expect(reply.status).toHaveBeenCalledWith(403);
  });

  it("retorna 403 para perfil gestor", () => {
    const req = mockRequest({
      usuario: {
        uid: "u1",
        email: "a@b.com",
        servidor: { id: "s1", perfil_nome: "gestor" },
      },
    });
    const reply = mockReply();
    const done = vi.fn();

    exigirAdmin(req, reply, done);
    expect(done).not.toHaveBeenCalled();
    expect(reply.status).toHaveBeenCalledWith(403);
  });
});

// ── exigirNivelGovBr ─────────────────────────
describe("exigirNivelGovBr", () => {
  it("permite bronze quando nível é ouro", () => {
    const middleware = exigirNivelGovBr("bronze");
    const req = mockRequest({
      usuario: {
        uid: "u1",
        servidor: { nivel_govbr: "ouro" },
      },
    });
    const reply = mockReply();
    const done = vi.fn();

    middleware(req, reply, done);
    expect(done).toHaveBeenCalled();
  });

  it("permite prata quando nível é prata", () => {
    const middleware = exigirNivelGovBr("prata");
    const req = mockRequest({
      usuario: {
        uid: "u1",
        servidor: { nivel_govbr: "prata" },
      },
    });
    const reply = mockReply();
    const done = vi.fn();

    middleware(req, reply, done);
    expect(done).toHaveBeenCalled();
  });

  it("bloqueia ouro quando nível é bronze", () => {
    const middleware = exigirNivelGovBr("ouro");
    const req = mockRequest({
      usuario: {
        uid: "u1",
        servidor: { nivel_govbr: "bronze" },
      },
    });
    const reply = mockReply();
    const done = vi.fn();

    middleware(req, reply, done);
    expect(done).not.toHaveBeenCalled();
    expect(reply.status).toHaveBeenCalledWith(403);
  });

  it("permite bronze sem nível govbr (login email/senha)", () => {
    const middleware = exigirNivelGovBr("bronze");
    const req = mockRequest({
      usuario: { uid: "u1", servidor: { nivel_govbr: null } },
    });
    const reply = mockReply();
    const done = vi.fn();

    middleware(req, reply, done);
    expect(done).toHaveBeenCalled();
  });

  it("bloqueia prata sem nível govbr", () => {
    const middleware = exigirNivelGovBr("prata");
    const req = mockRequest({
      usuario: { uid: "u1", servidor: { nivel_govbr: null } },
    });
    const reply = mockReply();
    const done = vi.fn();

    middleware(req, reply, done);
    expect(done).not.toHaveBeenCalled();
    expect(reply.status).toHaveBeenCalledWith(403);
  });
});

// ── filtroMunicipio ──────────────────────────
describe("filtroMunicipio", () => {
  it("adiciona cláusula WHERE com alias padrão", () => {
    const params: unknown[] = ["valor1"];
    const result = filtroMunicipio("SELECT * FROM t WHERE 1=1", params, "mun-123");

    expect(result.query).toBe("SELECT * FROM t WHERE 1=1 AND sec.municipio_id = $2");
    expect(result.params).toEqual(["valor1", "mun-123"]);
  });

  it("usa alias customizado", () => {
    const params: unknown[] = [];
    const result = filtroMunicipio("SELECT 1", params, "mun-456", "m");

    expect(result.query).toBe("SELECT 1 AND m.municipio_id = $1");
    expect(result.params).toEqual(["mun-456"]);
  });
});

// ── filtroSecretaria ─────────────────────────
describe("filtroSecretaria", () => {
  it("adiciona cláusula WHERE com coluna padrão", () => {
    const params: unknown[] = ["a"];
    const result = filtroSecretaria("SELECT 1 WHERE true", params, "sec-001");

    expect(result.query).toBe("SELECT 1 WHERE true AND secretaria_id = $2");
    expect(result.params).toEqual(["a", "sec-001"]);
  });

  it("usa coluna customizada", () => {
    const params: unknown[] = [];
    const result = filtroSecretaria("SELECT 1", params, "sec-002", "s.secretaria_id");

    expect(result.query).toBe("SELECT 1 AND s.secretaria_id = $1");
    expect(result.params).toEqual(["sec-002"]);
  });
});
