import type { FastifyRequest, FastifyReply } from "fastify";

/**
 * Verifica se o usuário tem servidor vinculado.
 * Deve ser chamado APÓS verificarAuth.
 */
export function exigirServidor(
  request: FastifyRequest,
  reply: FastifyReply,
  done: () => void,
): void {
  if (!request.usuario?.servidor) {
    reply.status(403).send({ error: "Servidor não vinculado à conta" });
    return;
  }
  done();
}

/**
 * Verifica se o usuário é administrador.
 */
export function exigirAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
  done: () => void,
): void {
  if (request.usuario?.servidor?.perfil_nome !== "administrador") {
    reply.status(403).send({ error: "Acesso restrito a administradores" });
    return;
  }
  done();
}

/**
 * Adiciona filtro WHERE por município na query SQL.
 * Filtra dados por município do servidor autenticado.
 */
export function filtroMunicipio(
  query: string,
  params: unknown[],
  municipioId: string,
  alias = "sec",
): { query: string; params: unknown[] } {
  params.push(municipioId);
  return {
    query: `${query} AND ${alias}.municipio_id = $${params.length}`,
    params,
  };
}

/**
 * Adiciona filtro WHERE por secretaria na query SQL.
 */
export function filtroSecretaria(
  query: string,
  params: unknown[],
  secretariaId: string,
  coluna = "secretaria_id",
): { query: string; params: unknown[] } {
  params.push(secretariaId);
  return {
    query: `${query} AND ${coluna} = $${params.length}`,
    params,
  };
}
