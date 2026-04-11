import { describe, it, expect, vi } from "vitest";
import { AppError, tratarErro } from "../utils/erros.js";

describe("AppError", () => {
  it("cria erro com mensagem e status padrão 400", () => {
    const err = new AppError("campo inválido");
    expect(err.message).toBe("campo inválido");
    expect(err.statusCode).toBe(400);
    expect(err).toBeInstanceOf(Error);
  });

  it("cria erro com status code customizado", () => {
    const err = new AppError("não encontrado", 404);
    expect(err.statusCode).toBe(404);
  });

  it("cria erro 409 conflito", () => {
    const err = new AppError("já existe", 409);
    expect(err.statusCode).toBe(409);
    expect(err.message).toBe("já existe");
  });
});

describe("tratarErro", () => {
  const mockReply = () => {
    const reply: any = {};
    reply.status = vi.fn().mockReturnValue(reply);
    reply.send = vi.fn().mockReturnValue(reply);
    return reply;
  };

  it("responde com statusCode do AppError", () => {
    const reply = mockReply();
    tratarErro(new AppError("não autorizado", 401), reply);
    expect(reply.status).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({ error: "não autorizado" });
  });

  it("responde com 500 para erro genérico", () => {
    const reply = mockReply();
    tratarErro(new Error("falha inesperada"), reply);
    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith({ error: "falha inesperada" });
  });

  it("responde com 500 e mensagem padrão para valor não-Error", () => {
    const reply = mockReply();
    tratarErro("string de erro", reply);
    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith({ error: "Erro interno" });
  });

  it("loga erro no console", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const reply = mockReply();
    tratarErro(new Error("teste"), reply);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
