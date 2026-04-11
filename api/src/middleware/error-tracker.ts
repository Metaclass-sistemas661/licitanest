import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import crypto from "node:crypto";
import { getPool } from "../config/database.js";

/**
 * Gera um fingerprint determinístico para agrupar erros iguais.
 */
function gerarFingerprint(mensagem: string, arquivo?: string, linha?: number): string {
  const input = `${mensagem}|${arquivo ?? ""}|${linha ?? ""}`;
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 64);
}

interface ErroPayload {
  origem: string;
  severidade?: string;
  mensagem: string;
  stack_trace?: string;
  arquivo?: string;
  linha?: number;
  coluna?: number;
  funcao?: string;
  modulo?: string;
  url_requisicao?: string;
  metodo_http?: string;
  status_http?: number;
  user_agent?: string;
  browser?: string;
  os?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Registra um erro no banco, agrupando por fingerprint.
 * Incrementa ocorrências se já existir um erro não resolvido com o mesmo fingerprint.
 */
export async function registrarErro(
  payload: ErroPayload,
  request?: FastifyRequest,
): Promise<void> {
  const pool = getPool();
  const fingerprint = gerarFingerprint(payload.mensagem, payload.arquivo, payload.linha);
  const severidade = payload.severidade || "error";
  const origem = payload.origem || "api";

  try {
    // Tentar incrementar ocorrência de erro existente
    const { rowCount } = await pool.query(
      `UPDATE superadmin.erros_sistema
         SET ocorrencias = ocorrencias + 1,
             ultima_ocorrencia = now()
       WHERE fingerprint = $1 AND resolvido = false`,
      [fingerprint],
    );

    if (rowCount && rowCount > 0) return;

    // Inserir novo erro
    await pool.query(
      `INSERT INTO superadmin.erros_sistema (
        origem, severidade, mensagem, stack_trace,
        arquivo, linha, coluna, funcao, modulo,
        url_requisicao, metodo_http, status_http,
        usuario_id, municipio_id,
        user_agent, ip_address, browser, os,
        fingerprint, metadata
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
      [
        origem,
        severidade,
        payload.mensagem.slice(0, 5000),
        payload.stack_trace?.slice(0, 10000) ?? null,
        payload.arquivo?.slice(0, 500) ?? null,
        payload.linha ?? null,
        payload.coluna ?? null,
        payload.funcao?.slice(0, 300) ?? null,
        payload.modulo?.slice(0, 200) ?? null,
        payload.url_requisicao?.slice(0, 2000) ?? request?.url ?? null,
        payload.metodo_http ?? request?.method ?? null,
        payload.status_http ?? null,
        request?.usuario?.servidor?.id ?? null,
        request?.usuario?.servidor?.municipio_id ?? null,
        payload.user_agent ?? request?.headers["user-agent"] ?? null,
        request?.ip ?? null,
        payload.browser ?? null,
        payload.os ?? null,
        fingerprint,
        JSON.stringify(payload.metadata ?? {}),
      ],
    );
  } catch (err) {
    // Não pode falhar silenciosamente, mas também não pode derrubar a request
    console.error("[error-tracker] Falha ao registrar erro:", err);
  }
}

/**
 * Hook Fastify onError — captura erros não tratados e persiste automaticamente.
 */
export function registrarErrorTrackerHook(app: FastifyInstance): void {
  app.addHook("onError", async (request: FastifyRequest, reply: FastifyReply, error: Error) => {
    await registrarErro(
      {
        origem: "api",
        severidade: (reply.statusCode ?? 500) >= 500 ? "error" : "warning",
        mensagem: error.message,
        stack_trace: error.stack,
        url_requisicao: request.url,
        metodo_http: request.method,
        status_http: reply.statusCode,
      },
      request,
    );
  });
}
