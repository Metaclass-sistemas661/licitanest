import type { FastifyReply } from "fastify";

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function tratarErro(error: unknown, reply: FastifyReply): void {
  if (error instanceof AppError) {
    reply.status(error.statusCode).send({ error: error.message });
    return;
  }

  const msg = error instanceof Error ? error.message : "Erro interno";
  console.error("[API Error]", error);
  reply.status(500).send({ error: msg });
}
