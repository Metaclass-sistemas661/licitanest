import { describe, expect, it } from "vitest";
import {
  loginSchema,
  senhaSchema,
  redefinirSenhaSchema,
  cestaSchema,
  emailSchema,
  validarComZod,
} from "@/lib/validacao";

describe("senhaSchema", () => {
  it("rejeita senhas curtas", () => {
    const r = senhaSchema.safeParse("Ab1!");
    expect(r.success).toBe(false);
  });

  it("rejeita sem maiúscula", () => {
    const r = senhaSchema.safeParse("abcdef1!");
    expect(r.success).toBe(false);
  });

  it("rejeita sem minúscula", () => {
    const r = senhaSchema.safeParse("ABCDEF1!");
    expect(r.success).toBe(false);
  });

  it("rejeita sem número", () => {
    const r = senhaSchema.safeParse("Abcdefgh!");
    expect(r.success).toBe(false);
  });

  it("rejeita sem caractere especial", () => {
    const r = senhaSchema.safeParse("Abcdefg1");
    expect(r.success).toBe(false);
  });

  it("aceita senha forte", () => {
    const r = senhaSchema.safeParse("Abc12345!");
    expect(r.success).toBe(true);
  });
});

describe("emailSchema", () => {
  it("rejeita string vazia", () => {
    const r = emailSchema.safeParse("");
    expect(r.success).toBe(false);
  });

  it("rejeita email inválido", () => {
    const r = emailSchema.safeParse("nao-email");
    expect(r.success).toBe(false);
  });

  it("aceita email válido", () => {
    const r = emailSchema.safeParse("teste@prefeitura.gov.br");
    expect(r.success).toBe(true);
  });
});

describe("loginSchema", () => {
  it("rejeita sem email", () => {
    const r = validarComZod(loginSchema, { email: "", senha: "123456" });
    expect(r.sucesso).toBe(false);
  });

  it("rejeita senha curta", () => {
    const r = validarComZod(loginSchema, { email: "a@b.com", senha: "12345" });
    expect(r.sucesso).toBe(false);
  });

  it("aceita credenciais válidas", () => {
    const r = validarComZod(loginSchema, { email: "a@b.com", senha: "123456" });
    expect(r.sucesso).toBe(true);
  });
});

describe("redefinirSenhaSchema", () => {
  it("rejeita senhas diferentes", () => {
    const r = validarComZod(redefinirSenhaSchema, {
      novaSenha: "Abc12345!",
      confirmarSenha: "Abc12345@",
    });
    expect(r.sucesso).toBe(false);
  });

  it("aceita senhas iguais e fortes", () => {
    const r = validarComZod(redefinirSenhaSchema, {
      novaSenha: "Abc12345!",
      confirmarSenha: "Abc12345!",
    });
    expect(r.sucesso).toBe(true);
  });
});

describe("cestaSchema", () => {
  it("rejeita descrição curta", () => {
    const r = validarComZod(cestaSchema, {
      descricao_objeto: "ab",
      tipo_calculo: "media",
    });
    expect(r.sucesso).toBe(false);
  });

  it("aceita cesta válida", () => {
    const r = validarComZod(cestaSchema, {
      descricao_objeto: "Cesta de materiais de limpeza",
      tipo_calculo: "media",
    });
    expect(r.sucesso).toBe(true);
  });
});

describe("validarComZod helper", () => {
  it("retorna erros formatados por campo", () => {
    const r = validarComZod(loginSchema, { email: "", senha: "" });
    expect(r.sucesso).toBe(false);
    if (!r.sucesso) {
      expect(r.erros).toHaveProperty("email");
    }
  });
});
