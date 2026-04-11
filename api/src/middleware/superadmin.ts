import type { FastifyRequest, FastifyReply } from "fastify";
import { getPool } from "../config/database.js";

/**
 * Middleware que exige acesso SuperAdmin.
 * Verifica a flag is_superadmin diretamente no banco (não confia apenas no token).
 * Deve ser chamado APÓS verificarAuth e exigirServidor.
 */
export async function exigirSuperAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const servidorId = request.usuario?.servidor?.id;
  if (!servidorId) {
    reply.status(403).send({ error: "Acesso negado" });
    return;
  }

  try {
    const { rows } = await getPool().query(
      `SELECT is_superadmin FROM servidores WHERE id = $1 AND deletado_em IS NULL`,
      [servidorId],
    );

    if (!rows[0]?.is_superadmin) {
      // Registrar tentativa não autorizada no audit_log
      await getPool().query(
        `INSERT INTO audit_log (tabela, registro_id, acao, dados_novos, usuario_id)
         VALUES ('superadmin_access', $1, 'DENIED', $2, $1)`,
        [servidorId, JSON.stringify({ ip: request.ip, url: request.url })],
      ).catch(() => { /* não bloquear por falha de log */ });

      reply.status(403).send({ error: "Acesso restrito ao administrador da plataforma" });
      return;
    }
  } catch {
    reply.status(500).send({ error: "Erro ao verificar permissões" });
  }
}
