import { describe, it, expect } from "vitest";
import { parsePaginacao, respostaPaginada } from "../utils/paginacao.js";

describe("parsePaginacao", () => {
  it("retorna valores padrão quando query está vazia", () => {
    const p = parsePaginacao({});
    expect(p.pagina).toBe(1);
    expect(p.porPagina).toBe(20);
    expect(p.offset).toBe(0);
  });

  it("parseia página e porPagina corretamente", () => {
    const p = parsePaginacao({ pagina: "3", porPagina: "10" });
    expect(p.pagina).toBe(3);
    expect(p.porPagina).toBe(10);
    expect(p.offset).toBe(20);
  });

  it("limita porPagina ao máximo de 100", () => {
    const p = parsePaginacao({ porPagina: "500" });
    expect(p.porPagina).toBe(100);
  });

  it("trata porPagina 0 como fallback para 20 (padrão)", () => {
    const p = parsePaginacao({ porPagina: "0" });
    expect(p.porPagina).toBe(20);
  });

  it("limita porPagina negativa ao mínimo de 1", () => {
    const p = parsePaginacao({ porPagina: "-5" });
    expect(p.porPagina).toBe(1);
  });

  it("página mínima é 1", () => {
    const p = parsePaginacao({ pagina: "-5" });
    expect(p.pagina).toBe(1);
    expect(p.offset).toBe(0);
  });

  it("lida com valores não numéricos", () => {
    const p = parsePaginacao({ pagina: "abc", porPagina: "xyz" });
    expect(p.pagina).toBe(1);
    expect(p.porPagina).toBe(20);
  });

  it("calcula offset corretamente para página 5 com 25 itens", () => {
    const p = parsePaginacao({ pagina: "5", porPagina: "25" });
    expect(p.offset).toBe(100);
  });
});

describe("respostaPaginada", () => {
  it("monta resposta paginada corretamente", () => {
    const dados = [{ id: 1 }, { id: 2 }];
    const result = respostaPaginada(dados, 50, {
      pagina: 1,
      porPagina: 20,
      offset: 0,
    });

    expect(result.data).toEqual(dados);
    expect(result.total).toBe(50);
    expect(result.pagina).toBe(1);
    expect(result.porPagina).toBe(20);
    expect(result.totalPaginas).toBe(3);
  });

  it("calcula totalPaginas com arredondamento para cima", () => {
    const result = respostaPaginada([], 21, {
      pagina: 1,
      porPagina: 10,
      offset: 0,
    });
    expect(result.totalPaginas).toBe(3);
  });

  it("totalPaginas é 0 quando total é 0", () => {
    const result = respostaPaginada([], 0, {
      pagina: 1,
      porPagina: 20,
      offset: 0,
    });
    expect(result.totalPaginas).toBe(0);
  });
});
