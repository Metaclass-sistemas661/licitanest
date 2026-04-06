import { api } from "@/lib/api";
import type { AuditLog } from "@/tipos";

/**
 * Registra uma ação no audit_log.
 * Captura user-agent automaticamente; IP real é capturado no server-side.
 */
export async function registrarAuditoria(params: {
  servidor_id: string;
  acao: string;
  tabela?: string;
  registro_id?: string;
  dados_anteriores?: Record<string, unknown>;
  dados_novos?: Record<string, unknown>;
}) {
  try {
    await api.post("/api/auditoria", {
      servidor_id: params.servidor_id,
      acao: params.acao,
      tabela: params.tabela || null,
      registro_id: params.registro_id || null,
      dados_anteriores: params.dados_anteriores || null,
      dados_novos: params.dados_novos || null,
      user_agent: navigator.userAgent ?? null,
    });
  } catch (err) {
    console.error("Erro ao registrar auditoria:", err instanceof Error ? err.message : err);
  }
}

export async function listarAuditoria(limite = 50) {
  const { data } = await api.get<{
    data: (AuditLog & { servidor: { id: string; nome: string; email: string } | null })[];
  }>(`/api/auditoria?limite=${limite}`);
  return data;
}
