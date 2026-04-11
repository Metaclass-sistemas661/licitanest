import { describe, it, expect } from "vitest";
import { validarCPF, validarCNPJ } from "../utils/validacao.js";

describe("validarCPF", () => {
  it("aceita CPF válido (sem formatação)", () => {
    expect(validarCPF("52998224725")).toBe(true);
  });

  it("aceita CPF válido (com formatação)", () => {
    expect(validarCPF("529.982.247-25")).toBe(true);
  });

  it("rejeita CPF com dígito verificador errado", () => {
    expect(validarCPF("52998224700")).toBe(false);
  });

  it("rejeita CPF com todos dígitos iguais", () => {
    expect(validarCPF("11111111111")).toBe(false);
    expect(validarCPF("00000000000")).toBe(false);
    expect(validarCPF("99999999999")).toBe(false);
  });

  it("rejeita CPF com tamanho errado", () => {
    expect(validarCPF("1234567890")).toBe(false);
    expect(validarCPF("123456789012")).toBe(false);
    expect(validarCPF("")).toBe(false);
  });

  it("aceita outro CPF válido", () => {
    // CPF gerado: 111.444.777-35
    expect(validarCPF("11144477735")).toBe(true);
  });
});

describe("validarCNPJ", () => {
  it("aceita CNPJ válido (sem formatação)", () => {
    expect(validarCNPJ("11222333000181")).toBe(true);
  });

  it("aceita CNPJ válido (com formatação)", () => {
    expect(validarCNPJ("11.222.333/0001-81")).toBe(true);
  });

  it("rejeita CNPJ com dígito verificador errado", () => {
    expect(validarCNPJ("11222333000199")).toBe(false);
  });

  it("rejeita CNPJ com todos dígitos iguais", () => {
    expect(validarCNPJ("11111111111111")).toBe(false);
    expect(validarCNPJ("00000000000000")).toBe(false);
  });

  it("rejeita CNPJ com tamanho errado", () => {
    expect(validarCNPJ("1122233300018")).toBe(false);
    expect(validarCNPJ("112223330001811")).toBe(false);
    expect(validarCNPJ("")).toBe(false);
  });
});
