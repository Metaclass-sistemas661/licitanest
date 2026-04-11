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

// Hierarquia Gov.br: ouro > prata > bronze
const HIERARQUIA_GOVBR: Record<string, number> = { bronze: 1, prata: 2, ouro: 3 };

/**
 * Exige nível mínimo de confiabilidade Gov.br.
 * Política: bronze = somente leitura, prata = operação, ouro = administração.
 */
export function exigirNivelGovBr(nivelMinimo: "bronze" | "prata" | "ouro") {
  return function (
    request: FastifyRequest,
    reply: FastifyReply,
    done: () => void,
  ): void {
    const nivel = request.usuario?.servidor?.nivel_govbr;
    if (!nivel) {
      // Sem nível Gov.br = acesso via email/senha; permitir operações básicas (equivale a bronze)
      if (nivelMinimo === "bronze") {
        done();
        return;
      }
      reply.status(403).send({
        error: `Acesso requer autenticação Gov.br nível ${nivelMinimo} ou superior`,
        nivel_atual: null,
        nivel_minimo: nivelMinimo,
      });
      return;
    }

    const nivelAtual = HIERARQUIA_GOVBR[nivel] ?? 0;
    const nivelRequerido = HIERARQUIA_GOVBR[nivelMinimo] ?? 0;

    if (nivelAtual < nivelRequerido) {
      reply.status(403).send({
        error: `Nível Gov.br insuficiente. Requer ${nivelMinimo}, atual: ${nivel}`,
        nivel_atual: nivel,
        nivel_minimo: nivelMinimo,
      });
      return;
    }

    done();
  };
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
