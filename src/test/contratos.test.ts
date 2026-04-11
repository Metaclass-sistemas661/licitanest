import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the api module
vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { api } from "@/lib/api";
import {
  listarContratos,
  buscarContrato,
  criarContrato,
  atualizarContrato,
  deletarContrato,
  criarAditivo,
  buscarHistoricoContrato,
  buscarDashboardContratos,
  listarContratosPortal,
  buscarContratoPortal,
  listarFaturasContrato,
  listarNotificacoesPortal,
  marcarNotificacaoLida,
  verificarAcessoContrato,
  assinarContrato,
  contarContratosPendentes,
  enviarContratoParaMunicipio,
  ativarContrato,
  downloadPdfContrato,
} from "@/servicos/contratos";

const mockedApi = vi.mocked(api);

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════
// SuperAdmin — CRUD
// ═══════════════════════════════════════════════════════════════

describe("Contratos — SuperAdmin CRUD", () => {
  it("listarContratos sem filtros", async () => {
    const payload = { data: [], total: 0, page: 1, limit: 20 };
    mockedApi.get.mockResolvedValue(payload);

    const result = await listarContratos();
    expect(mockedApi.get).toHaveBeenCalledWith("/api/contratos");
    expect(result).toEqual(payload);
  });

  it("listarContratos com filtros", async () => {
    const payload = { data: [], total: 0, page: 2, limit: 10 };
    mockedApi.get.mockResolvedValue(payload);

    await listarContratos({ status: "ativo", municipio_id: "abc", page: 2, limit: 10 });
    expect(mockedApi.get).toHaveBeenCalledWith(
      expect.stringContaining("status=ativo"),
    );
    expect(mockedApi.get).toHaveBeenCalledWith(
      expect.stringContaining("municipio_id=abc"),
    );
    expect(mockedApi.get).toHaveBeenCalledWith(
      expect.stringContaining("page=2"),
    );
  });

  it("buscarContrato por ID", async () => {
    const contrato = { data: { id: "c1", titulo: "Contrato Teste", aditivos: [] } };
    mockedApi.get.mockResolvedValue(contrato);

    const result = await buscarContrato("c1");
    expect(mockedApi.get).toHaveBeenCalledWith("/api/contratos/c1");
    expect(result.data.id).toBe("c1");
  });

  it("buscarContrato faz encodeURIComponent no ID", async () => {
    mockedApi.get.mockResolvedValue({ data: {} });
    await buscarContrato("id com espaço");
    expect(mockedApi.get).toHaveBeenCalledWith("/api/contratos/id%20com%20espa%C3%A7o");
  });

  it("criarContrato envia dados via POST", async () => {
    const dados = { objeto: "Licença de uso", valor_total: 120000, valor_mensal: 10000 };
    const resp = { data: { id: "c2", ...dados } };
    mockedApi.post.mockResolvedValue(resp);

    const result = await criarContrato(dados);
    expect(mockedApi.post).toHaveBeenCalledWith("/api/contratos", dados);
    expect(result.data.objeto).toBe("Licença de uso");
  });

  it("atualizarContrato envia dados via PUT", async () => {
    mockedApi.put.mockResolvedValue({ data: { id: "c1", objeto: "Atualizado" } });

    await atualizarContrato("c1", { objeto: "Atualizado" });
    expect(mockedApi.put).toHaveBeenCalledWith("/api/contratos/c1", { objeto: "Atualizado" });
  });

  it("deletarContrato envia DELETE", async () => {
    mockedApi.delete.mockResolvedValue(undefined);

    await deletarContrato("c1");
    expect(mockedApi.delete).toHaveBeenCalledWith("/api/contratos/c1");
  });

  it("criarAditivo envia POST com contratoId", async () => {
    const aditivo = { descricao: "Aditivo 1", tipo: "valor" as const };
    mockedApi.post.mockResolvedValue({ data: { id: "a1", ...aditivo } });

    await criarAditivo("c1", aditivo);
    expect(mockedApi.post).toHaveBeenCalledWith("/api/contratos/c1/aditivo", aditivo);
  });

  it("buscarHistoricoContrato retorna lista", async () => {
    const historico = { data: [{ id: "h1", acao: "criado" }] };
    mockedApi.get.mockResolvedValue(historico);

    const result = await buscarHistoricoContrato("c1");
    expect(mockedApi.get).toHaveBeenCalledWith("/api/contratos/c1/historico");
    expect(result.data).toHaveLength(1);
  });

  it("buscarDashboardContratos retorna resumo", async () => {
    const resumo = { data: { contratos_ativos: 10, pendentes_assinatura: 5, valor_total_ativos: 50000 } };
    mockedApi.get.mockResolvedValue(resumo);

    const result = await buscarDashboardContratos();
    expect(mockedApi.get).toHaveBeenCalledWith("/api/contratos/dashboard/resumo");
    expect(result.data.contratos_ativos).toBe(10);
  });
});

// ═══════════════════════════════════════════════════════════════
// SuperAdmin — Ações
// ═══════════════════════════════════════════════════════════════

describe("Contratos — Ações SuperAdmin", () => {
  it("enviarContratoParaMunicipio faz POST", async () => {
    mockedApi.post.mockResolvedValue({ data: { status: "enviado" } });

    const result = await enviarContratoParaMunicipio("c1");
    expect(mockedApi.post).toHaveBeenCalledWith("/api/contratos/c1/enviar");
    expect(result.data.status).toBe("enviado");
  });

  it("ativarContrato faz POST e retorna faturas geradas", async () => {
    mockedApi.post.mockResolvedValue({ data: { status: "ativo", faturas_geradas: 12 } });

    const result = await ativarContrato("c1");
    expect(mockedApi.post).toHaveBeenCalledWith("/api/contratos/c1/ativar");
    expect(result.data.faturas_geradas).toBe(12);
  });

  it("downloadPdfContrato retorna URL assinada", async () => {
    mockedApi.get.mockResolvedValue({ data: { url: "https://storage.example.com/signed", nome: "contrato.pdf" } });

    const result = await downloadPdfContrato("c1");
    expect(mockedApi.get).toHaveBeenCalledWith("/api/contratos/c1/pdf/download");
    expect(result.data.url).toContain("https://");
  });
});

// ═══════════════════════════════════════════════════════════════
// Portal do Município
// ═══════════════════════════════════════════════════════════════

describe("Contratos — Portal do Município", () => {
  it("listarContratosPortal busca rota do portal", async () => {
    mockedApi.get.mockResolvedValue({ data: [] });

    await listarContratosPortal();
    expect(mockedApi.get).toHaveBeenCalledWith("/api/portal/contratos");
  });

  it("buscarContratoPortal por ID", async () => {
    mockedApi.get.mockResolvedValue({ data: { id: "c1", aditivos: [] } });

    await buscarContratoPortal("c1");
    expect(mockedApi.get).toHaveBeenCalledWith("/api/portal/contratos/c1");
  });

  it("listarFaturasContrato busca faturas do contrato", async () => {
    mockedApi.get.mockResolvedValue({ data: [{ id: "f1", valor: 5000 }] });

    const result = await listarFaturasContrato("c1");
    expect(mockedApi.get).toHaveBeenCalledWith("/api/portal/contratos/c1/faturas");
    expect(result.data).toHaveLength(1);
  });

  it("listarNotificacoesPortal busca notificações", async () => {
    mockedApi.get.mockResolvedValue({ data: [] });

    await listarNotificacoesPortal();
    expect(mockedApi.get).toHaveBeenCalledWith("/api/portal/notificacoes");
  });

  it("marcarNotificacaoLida envia PUT", async () => {
    mockedApi.put.mockResolvedValue(undefined);

    await marcarNotificacaoLida("n1");
    expect(mockedApi.put).toHaveBeenCalledWith("/api/portal/notificacoes/n1/lido");
  });

  it("contarContratosPendentes retorna contagem", async () => {
    mockedApi.get.mockResolvedValue({ data: { pendentes: 3 } });

    const result = await contarContratosPendentes();
    expect(mockedApi.get).toHaveBeenCalledWith("/api/portal/contratos/pendentes/count");
    expect(result.data.pendentes).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════
// Verificação de acesso (CPF + data nascimento)
// ═══════════════════════════════════════════════════════════════

describe("Contratos — Verificação de Acesso", () => {
  it("verificarAcessoContrato envia CPF e data de nascimento", async () => {
    mockedApi.post.mockResolvedValue({ data: { token: "jwt-token-xyz" } });

    const result = await verificarAcessoContrato("c1", "529.982.247-25", "1990-01-15");
    expect(mockedApi.post).toHaveBeenCalledWith(
      "/api/portal/contratos/c1/verificar-acesso",
      { cpf: "529.982.247-25", data_nascimento: "1990-01-15" },
    );
    expect(result.data.token).toBe("jwt-token-xyz");
  });

  it("verificarAcessoContrato faz encodeURIComponent no ID", async () => {
    mockedApi.post.mockResolvedValue({ data: { token: "t" } });
    await verificarAcessoContrato("id/especial", "12345678901", "2000-01-01");
    expect(mockedApi.post).toHaveBeenCalledWith(
      "/api/portal/contratos/id%2Fespecial/verificar-acesso",
      expect.any(Object),
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// Assinatura Digital
// ═══════════════════════════════════════════════════════════════

describe("Contratos — Assinatura Digital", () => {
  it("assinarContrato etapa validar envia dados corretos", async () => {
    const certInfo = {
      data: {
        certificado: {
          titular: "João da Silva",
          cpf: "529.982.247-25",
          emissor: "AC TESTE",
          validade_inicio: "2024-01-01",
          validade_fim: "2027-01-01",
          serial: "ABC123",
        },
      },
    };
    mockedApi.post.mockResolvedValue(certInfo);

    const result = await assinarContrato("c1", {
      certificado_base64: "base64data==",
      senha_certificado: "senha123",
      token_acesso: "jwt-token",
      etapa: "validar",
    });

    expect(mockedApi.post).toHaveBeenCalledWith("/api/portal/contratos/c1/assinar", {
      certificado_base64: "base64data==",
      senha_certificado: "senha123",
      token_acesso: "jwt-token",
      etapa: "validar",
    });
    expect(result.data.certificado?.titular).toBe("João da Silva");
  });

  it("assinarContrato etapa assinar retorna status", async () => {
    mockedApi.post.mockResolvedValue({ data: { status: "assinado" } });

    const result = await assinarContrato("c1", {
      certificado_base64: "base64data==",
      senha_certificado: "senha123",
      token_acesso: "jwt-token",
      etapa: "assinar",
    });

    expect(result.data.status).toBe("assinado");
  });
});
