import { api } from "@/lib/api";
import type { SolicitacaoCatalogo, StatusSolicitacao } from "@/tipos";

// ─── Listar solicitações ───────────────────────────────────

export async function listarSolicitacoes(
  status?: StatusSolicitacao,
): Promise<SolicitacaoCatalogo[]> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  const qs = params.toString();

  const { data } = await api.get<{ data: SolicitacaoCatalogo[] }>(
    `/api/solicitacoes-catalogo${qs ? `?${qs}` : ""}`,
  );
  return data ?? [];
}

// ─── Listar minhas solicitações ────────────────────────────

export async function listarMinhasSolicitacoes(
  servidorId: string,
): Promise<SolicitacaoCatalogo[]> {
  const { data } = await api.get<{ data: SolicitacaoCatalogo[] }>(
    `/api/solicitacoes-catalogo?solicitante_id=${encodeURIComponent(servidorId)}`,
  );
  return data ?? [];
}

// ─── Criar solicitação ─────────────────────────────────────

export interface CriarSolicitacaoDTO {
  descricao: string;
  justificativa?: string;
  categoria_id?: string;
  unidade_medida_id?: string;
  solicitante_id: string;
}

export async function criarSolicitacao(
  dto: CriarSolicitacaoDTO,
): Promise<SolicitacaoCatalogo> {
  const { data } = await api.post<{ data: SolicitacaoCatalogo }>(
    "/api/solicitacoes-catalogo",
    { ...dto, status: "pendente" },
  );
  return data;
}

// ─── Aprovar solicitação ───────────────────────────────────

export async function aprovarSolicitacao(
  id: string,
  respondidoPor: string,
  produtoCriadoId?: string,
): Promise<SolicitacaoCatalogo> {
  const { data } = await api.put<{ data: SolicitacaoCatalogo }>(
    `/api/solicitacoes-catalogo/${encodeURIComponent(id)}`,
    {
      status: "aprovada" as StatusSolicitacao,
      respondido_por: respondidoPor,
      respondido_em: new Date().toISOString(),
      produto_criado_id: produtoCriadoId ?? null,
    },
  );
  return data;
}

// ─── Recusar solicitação ───────────────────────────────────

export async function recusarSolicitacao(
  id: string,
  respondidoPor: string,
  justificativa: string,
): Promise<SolicitacaoCatalogo> {
  if (!justificativa.trim()) {
    throw new Error("Justificativa é obrigatória para recusar uma solicitação.");
  }

  const { data } = await api.put<{ data: SolicitacaoCatalogo }>(
    `/api/solicitacoes-catalogo/${encodeURIComponent(id)}`,
    {
      status: "recusada" as StatusSolicitacao,
      respondido_por: respondidoPor,
      respondido_em: new Date().toISOString(),
      resposta: justificativa,
    },
  );
  return data;
}
