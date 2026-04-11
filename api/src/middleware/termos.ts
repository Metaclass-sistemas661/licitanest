import type { FastifyRequest, FastifyReply } from "fastify";
import { getPool } from "../config/database.js";

const VERSAO_TERMOS_ATUAL = "1.1";

// Rotas que NÃO exigem aceite de termos (para não criar deadlock)
const ROTAS_ISENTAS = new Set([
  "/api/lgpd/aceite-pendente",
  "/api/lgpd/consentimentos",
  "/api/health",
]);

/**
 * Middleware que bloqueia acesso se o servidor não aceitou
 * a versão atual dos termos de uso e política de privacidade.
 */
export async function exigirAceiteTermos(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  // Rotas isentas + rotas sem servidor (ex: portal público)
  const path = request.url.split("?")[0];
  if (ROTAS_ISENTAS.has(path) || !request.usuario?.servidor) return;

  const servidorId = request.usuario.servidor.id;

  const { rows } = await getPool().query(
    `SELECT COUNT(*)::int AS aceitos FROM consentimentos_lgpd
     WHERE servidor_id = $1
       AND tipo IN ('termos_uso', 'politica_privacidade')
       AND aceito = true
       AND versao_documento = $2`,
    [servidorId, VERSAO_TERMOS_ATUAL],
  );

  if (rows[0].aceitos < 2) {
    reply.status(451).send({
      error: "Aceite de termos pendente",
      codigo: "TERMOS_PENDENTES",
      versao_atual: VERSAO_TERMOS_ATUAL,
    });
  }
}
