import type { FastifyRequest, FastifyReply } from "fastify";
import { getAuth } from "../config/firebase.js";
import { getPool } from "../config/database.js";

export interface UsuarioRequest {
  uid: string;
  email: string;
  servidor: {
    id: string;
    nome: string;
    perfil_id: string;
    perfil_nome: string;
    permissoes: Record<string, boolean> | null;
    secretaria_id: string;
    municipio_id: string;
  } | null;
}

declare module "fastify" {
  interface FastifyRequest {
    usuario?: UsuarioRequest;
  }
}

export async function verificarAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    reply.status(401).send({ error: "Token não fornecido" });
    return;
  }

  const token = header.slice(7);
  try {
    const decoded = await getAuth().verifyIdToken(token);

    const { rows } = await getPool().query(
      `SELECT s.id, s.nome, s.perfil_id, p.nome AS perfil_nome, p.permissoes,
              s.secretaria_id, sec.municipio_id
       FROM servidores s
       JOIN perfis p ON s.perfil_id = p.id
       JOIN secretarias sec ON s.secretaria_id = sec.id
       WHERE s.user_id = (SELECT id FROM usuarios WHERE firebase_uid = $1)
         AND s.deletado_em IS NULL
       LIMIT 1`,
      [decoded.uid],
    );

    request.usuario = {
      uid: decoded.uid,
      email: decoded.email ?? "",
      servidor: rows[0] ?? null,
    };
  } catch {
    reply.status(401).send({ error: "Token inválido" });
  }
}

/** Auth opcional — não bloqueia, mas popula request.usuario se houver token */
export async function authOpcional(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) return;

  try {
    const token = header.slice(7);
    const decoded = await getAuth().verifyIdToken(token);
    const { rows } = await getPool().query(
      `SELECT s.id, s.nome, s.perfil_id, p.nome AS perfil_nome, p.permissoes,
              s.secretaria_id, sec.municipio_id
       FROM servidores s
       JOIN perfis p ON s.perfil_id = p.id
       JOIN secretarias sec ON s.secretaria_id = sec.id
       WHERE s.user_id = (SELECT id FROM usuarios WHERE firebase_uid = $1)
         AND s.deletado_em IS NULL
       LIMIT 1`,
      [decoded.uid],
    );
    request.usuario = {
      uid: decoded.uid,
      email: decoded.email ?? "",
      servidor: rows[0] ?? null,
    };
  } catch {
    // ignora — auth é opcional
  }
}
