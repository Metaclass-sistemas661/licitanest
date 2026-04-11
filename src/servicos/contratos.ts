import { api } from "@/lib/api";
import type {
  Contrato,
  ContratoAditivo,
  ContratoHistorico,
  ContratoNotificacao,
  ContratoDashboardResumo,
} from "@/tipos";

// ═══════════════════════════════════════════════════════════════
// Serviço de Contratos — SuperAdmin
// ═══════════════════════════════════════════════════════════════

export async function listarContratos(params?: {
  status?: string;
  municipio_id?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: Contrato[]; total: number; page: number; limit: number }> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.municipio_id) query.set("municipio_id", params.municipio_id);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));

  const qs = query.toString();
  return api.get(`/api/contratos${qs ? `?${qs}` : ""}`);
}

export async function buscarContrato(id: string): Promise<{ data: Contrato & { aditivos: ContratoAditivo[] } }> {
  return api.get(`/api/contratos/${encodeURIComponent(id)}`);
}

export async function criarContrato(dados: Partial<Contrato>): Promise<{ data: Contrato }> {
  return api.post("/api/contratos", dados);
}

export async function atualizarContrato(id: string, dados: Partial<Contrato>): Promise<{ data: Contrato }> {
  return api.put(`/api/contratos/${encodeURIComponent(id)}`, dados);
}

export async function deletarContrato(id: string): Promise<void> {
  return api.delete(`/api/contratos/${encodeURIComponent(id)}`);
}

export async function criarAditivo(
  contratoId: string,
  dados: Partial<ContratoAditivo>,
): Promise<{ data: ContratoAditivo }> {
  return api.post(`/api/contratos/${encodeURIComponent(contratoId)}/aditivo`, dados);
}

export async function buscarHistoricoContrato(contratoId: string): Promise<{ data: ContratoHistorico[] }> {
  return api.get(`/api/contratos/${encodeURIComponent(contratoId)}/historico`);
}

export async function buscarDashboardContratos(): Promise<{ data: ContratoDashboardResumo }> {
  return api.get("/api/contratos/dashboard/resumo");
}

// ── Upload / Download de PDF ──────────────────────────────────

export async function uploadPdfContrato(
  contratoId: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<{ data: { storagePath: string; hash: string; tamanho: number } }> {
  const formData = new FormData();
  formData.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/contratos/${encodeURIComponent(contratoId)}/pdf`);

    // Auth token
    const token = localStorage.getItem("fb_token");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        try { reject(JSON.parse(xhr.responseText)); } catch { reject(new Error(xhr.statusText)); }
      }
    });
    xhr.addEventListener("error", () => reject(new Error("Erro de rede")));
    xhr.send(formData);
  });
}

export async function downloadPdfContrato(
  contratoId: string,
): Promise<{ data: { url: string; nome: string } }> {
  return api.get(`/api/contratos/${encodeURIComponent(contratoId)}/pdf/download`);
}

// ── Enviar contrato para município ────────────────────────────

export async function enviarContratoParaMunicipio(
  contratoId: string,
): Promise<{ data: { status: string } }> {
  return api.post(`/api/contratos/${encodeURIComponent(contratoId)}/enviar`);
}

// ── Ativar contrato + gerar faturas ───────────────────────────

export async function ativarContrato(
  contratoId: string,
): Promise<{ data: { status: string; faturas_geradas: number } }> {
  return api.post(`/api/contratos/${encodeURIComponent(contratoId)}/ativar`);
}

// ═══════════════════════════════════════════════════════════════
// Serviço de Contratos — Portal do Município
// ═══════════════════════════════════════════════════════════════

export async function listarContratosPortal(): Promise<{ data: Contrato[] }> {
  return api.get("/api/portal/contratos");
}

export async function buscarContratoPortal(id: string): Promise<{ data: Contrato & { aditivos: ContratoAditivo[] } }> {
  return api.get(`/api/portal/contratos/${encodeURIComponent(id)}`);
}

export async function listarFaturasContrato(contratoId: string): Promise<{ data: unknown[] }> {
  return api.get(`/api/portal/contratos/${encodeURIComponent(contratoId)}/faturas`);
}

export async function listarNotificacoesPortal(): Promise<{ data: ContratoNotificacao[] }> {
  return api.get("/api/portal/notificacoes");
}

export async function marcarNotificacaoLida(id: string): Promise<void> {
  return api.put(`/api/portal/notificacoes/${encodeURIComponent(id)}/lido`);
}

// ── Verificação de identidade para acesso ao contrato ─────────

export async function verificarAcessoContrato(
  contratoId: string,
  cpf: string,
  dataNascimento: string,
): Promise<{ data: { token: string } }> {
  return api.post(`/api/portal/contratos/${encodeURIComponent(contratoId)}/verificar-acesso`, {
    cpf,
    data_nascimento: dataNascimento,
  });
}

// ── Assinatura digital do contrato ────────────────────────────

export async function assinarContrato(
  contratoId: string,
  dados: {
    certificado_base64: string;
    senha_certificado: string;
    token_acesso: string;
    etapa: "validar" | "assinar";
  },
): Promise<{ data: { certificado?: { titular: string; cpf: string; emissor: string; validade_inicio: string; validade_fim: string; serial: string }; status?: string } }> {
  return api.post(`/api/portal/contratos/${encodeURIComponent(contratoId)}/assinar`, dados);
}

// ── Contagem de contratos pendentes (para sidebar badge) ──────

export async function contarContratosPendentes(): Promise<{ data: { pendentes: number } }> {
  return api.get("/api/portal/contratos/pendentes/count");
}
