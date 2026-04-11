import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { exigirServidor } from "../middleware/autorizacao.js";
import { tratarErro } from "../utils/erros.js";
import { notificarCotacaoRespondida } from "../utils/push.js";
import { parsePaginacao, respostaPaginada } from "../utils/paginacao.js";
import {
  validarBody, validarParams, idParamsSchema,
  criarCotacaoSchema, atualizarCotacaoSchema, adicionarItemCotacaoSchema,
  adicionarFornecedorCotacaoSchema, lancamentoManualSchema, respostaPortalSchema,
} from "../middleware/validacao.js";

export async function rotasCotacoes(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  // GET /api/cotacoes
  app.get("/api/cotacoes", {
    schema: {
      tags: ["Cotações"],
      summary: "Listar cotações",
      description: "Retorna cotações do município com filtros por status e busca.",
      security: [{ bearerAuth: [] }],
      querystring: {
        type: "object",
        properties: {
          busca: { type: "string" },
          status: { type: "string", enum: ["rascunho", "aberta", "encerrada", "cancelada"] },
          pagina: { type: "integer", minimum: 1 },
          por_pagina: { type: "integer", minimum: 1, maximum: 100 },
        },
      },
    },
  }, async (req, reply) => {
    try {
      const q = req.query as Record<string, string>;
      const pag = parsePaginacao(q);
      const params: unknown[] = [];
      let where = `cot.deletado_em IS NULL`;

      if (q.status) { params.push(q.status); where += ` AND cot.status = $${params.length}`; }
      if (q.cesta_id) { params.push(q.cesta_id); where += ` AND cot.cesta_id = $${params.length}`; }

      params.push(req.usuario!.servidor!.municipio_id);
      where += ` AND sec.municipio_id = $${params.length}`;

      const countRes = await getPool().query(
        `SELECT COUNT(*) FROM cotacoes cot
         JOIN cestas c ON cot.cesta_id = c.id
         JOIN secretarias sec ON c.secretaria_id = sec.id
         WHERE ${where}`, params,
      );
      const total = parseInt(countRes.rows[0].count);

      params.push(pag.porPagina, pag.offset);
      const { rows } = await getPool().query(
        `SELECT cot.*, c.descricao_objeto AS cesta_descricao, srv.nome AS criado_por_nome
         FROM cotacoes cot
         JOIN cestas c ON cot.cesta_id = c.id
         JOIN secretarias sec ON c.secretaria_id = sec.id
         LEFT JOIN servidores srv ON cot.criado_por = srv.id
         WHERE ${where}
         ORDER BY cot.criado_em DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      );
      reply.send(respostaPaginada(rows, total, pag));
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/cotacoes/:id
  app.get("/api/cotacoes/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const { rows } = await getPool().query(
        `SELECT cot.*, c.descricao_objeto AS cesta_descricao
         FROM cotacoes cot
         JOIN cestas c ON cot.cesta_id = c.id
         JOIN secretarias sec ON c.secretaria_id = sec.id
         WHERE cot.id = $1 AND sec.municipio_id = $2`, [id, req.usuario!.servidor!.municipio_id],
      );
      if (!rows[0]) return reply.status(404).send({ error: "Cotação não encontrada" });

      // Carregar itens, fornecedores e respostas
      const [itens, fornecedores, respostas] = await Promise.all([
        getPool().query(`SELECT ci.*, pc.descricao AS produto_descricao
           FROM cotacao_itens ci JOIN itens_cesta ic ON ci.item_cesta_id = ic.id
           JOIN produtos_catalogo pc ON ic.produto_id = pc.id
           WHERE ci.cotacao_id = $1`, [id]),
        getPool().query(`SELECT * FROM cotacao_fornecedores WHERE cotacao_id = $1`, [id]),
        getPool().query(`SELECT * FROM respostas_cotacao WHERE cotacao_id = $1`, [id]),
      ]);

      reply.send({
        data: {
          ...rows[0],
          itens: itens.rows,
          fornecedores: fornecedores.rows,
          respostas: respostas.rows,
        },
      });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/cotacoes
  app.post("/api/cotacoes", { preHandler: validarBody(criarCotacaoSchema) }, async (req, reply) => {
    try {
      const b = req.body as {
        cesta_id: string; titulo: string; descricao?: string;
        prazo_resposta: string; criado_por: string;
      };

      // Validar que a cesta pertence ao município do usuário (prevenir cross-tenant)
      const { rows: cestaCheck } = await getPool().query(
        `SELECT 1 FROM cestas c JOIN secretarias sec ON c.secretaria_id = sec.id
         WHERE c.id = $1 AND sec.municipio_id = $2`,
        [b.cesta_id, req.usuario!.servidor!.municipio_id],
      );
      if (!cestaCheck[0]) return reply.status(403).send({ error: "Cesta não pertence ao seu município" });

      const { rows } = await getPool().query(
        `INSERT INTO cotacoes (cesta_id, titulo, descricao, prazo_resposta, criado_por)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [b.cesta_id, b.titulo, b.descricao, b.prazo_resposta, b.criado_por],
      );
      reply.status(201).send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // PUT /api/cotacoes/:id
  app.put("/api/cotacoes/:id", { preHandler: [validarParams(idParamsSchema), validarBody(atualizarCotacaoSchema)] }, async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const body = req.body as Record<string, unknown>;
      const campos = ["titulo", "descricao", "prazo_resposta", "status"];
      const sets: string[] = [];
      const params: unknown[] = [];
      for (const c of campos) {
        if (body[c] !== undefined) { params.push(body[c]); sets.push(`${c} = $${params.length}`); }
      }
      params.push(new Date().toISOString()); sets.push(`atualizado_em = $${params.length}`);
      params.push(id);
      const { rows } = await getPool().query(
        `UPDATE cotacoes SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING *`, params,
      );
      reply.send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // DELETE /api/cotacoes/:id
  app.delete("/api/cotacoes/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      await getPool().query(`UPDATE cotacoes SET deletado_em = NOW() WHERE id = $1`, [id]);
      reply.status(204).send();
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/cotacoes/:id/itens
  app.post("/api/cotacoes/:id/itens", { preHandler: [validarParams(idParamsSchema), validarBody(adicionarItemCotacaoSchema)] }, async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const { item_cesta_id, quantidade_estimada } = req.body as { item_cesta_id: string; quantidade_estimada?: number };
      const { rows } = await getPool().query(
        `INSERT INTO cotacao_itens (cotacao_id, item_cesta_id, quantidade_estimada)
         VALUES ($1,$2,$3) RETURNING *`,
        [id, item_cesta_id, quantidade_estimada],
      );
      reply.status(201).send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // DELETE /api/cotacao-itens/:id
  app.delete("/api/cotacao-itens/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      await getPool().query(`DELETE FROM cotacao_itens WHERE id = $1`, [id]);
      reply.status(204).send();
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/cotacoes/:id/fornecedores
  app.post("/api/cotacoes/:id/fornecedores", { preHandler: [validarParams(idParamsSchema), validarBody(adicionarFornecedorCotacaoSchema)] }, async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const b = req.body as { fornecedor_id?: string; nome: string; email: string; cnpj_cpf?: string; telefone?: string };
      const token = crypto.randomBytes(32).toString("hex");
      const expiraEm = new Date();
      expiraEm.setDate(expiraEm.getDate() + 30);
      const { rows } = await getPool().query(
        `INSERT INTO cotacao_fornecedores (cotacao_id, fornecedor_id, nome, email, cnpj_cpf, telefone, token_acesso, token_expira_em)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [id, b.fornecedor_id, b.nome, b.email, b.cnpj_cpf, b.telefone, token, expiraEm.toISOString()],
      );
      reply.status(201).send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // DELETE /api/cotacao-fornecedores/:id
  app.delete("/api/cotacao-fornecedores/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      await getPool().query(`DELETE FROM cotacao_fornecedores WHERE id = $1`, [id]);
      reply.status(204).send();
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/cotacoes/:id/enviar
  app.post("/api/cotacoes/:id/enviar", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      await getPool().query(
        `UPDATE cotacoes SET status = 'enviada', enviado_em = NOW(), atualizado_em = NOW() WHERE id = $1`, [id],
      );
      reply.send({ ok: true });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/cotacoes/:id/lancamentos
  app.post("/api/cotacoes/:id/lancamentos", { preHandler: [validarParams(idParamsSchema), validarBody(lancamentoManualSchema)] }, async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const b = req.body as {
        item_cesta_id: string; fornecedor_nome: string; valor: number;
        marca?: string; observacao?: string; servidor_id: string;
      };
      const { rows } = await getPool().query(
        `INSERT INTO cotacao_lancamentos_manuais (cotacao_id, item_cesta_id, fornecedor_nome, valor, marca, observacao, servidor_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [id, b.item_cesta_id, b.fornecedor_nome, b.valor, b.marca, b.observacao, b.servidor_id],
      );
      reply.status(201).send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  app.get("/api/cotacoes/:id/lancamentos", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const { rows } = await getPool().query(
        `SELECT * FROM cotacao_lancamentos_manuais WHERE cotacao_id = $1 ORDER BY criado_em DESC`, [id],
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });
}

// ── Portal público (sem auth) ────────────────────
// Rate limit em memória por IP para portal (10 req/min)
const portalHits = new Map<string, { count: number; resetAt: number }>();

function verificarRateLimitPortal(ip: string): boolean {
  const now = Date.now();
  const entry = portalHits.get(ip);
  if (!entry || now > entry.resetAt) {
    portalHits.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  entry.count++;
  return entry.count <= 10;
}

// ── CSRF Token para Portal (Fase 12.4) ──────────
const CSRF_SECRET = process.env.CSRF_SECRET || crypto.randomBytes(32).toString("hex");
const CSRF_TTL_MS = 60 * 60 * 1000; // 1 hora

function gerarCsrfToken(portalToken: string): string {
  const timestamp = Date.now().toString(36);
  const payload = `${portalToken}:${timestamp}`;
  const hmac = crypto.createHmac("sha256", CSRF_SECRET).update(payload).digest("hex");
  return `${timestamp}.${hmac}`;
}

function validarCsrfToken(portalToken: string, csrfToken: string | undefined): boolean {
  if (!csrfToken || typeof csrfToken !== "string") return false;
  const parts = csrfToken.split(".");
  if (parts.length !== 2) return false;
  const [timestamp, hmacRecebido] = parts;

  // Verificar expiração (1 hora)
  const emitidoEm = parseInt(timestamp, 36);
  if (isNaN(emitidoEm) || Date.now() - emitidoEm > CSRF_TTL_MS) return false;

  // Verificar HMAC com timing-safe comparison
  const payload = `${portalToken}:${timestamp}`;
  const hmacEsperado = crypto.createHmac("sha256", CSRF_SECRET).update(payload).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(hmacRecebido, "hex"), Buffer.from(hmacEsperado, "hex"));
  } catch {
    return false;
  }
}

export async function rotasPortalCotacao(app: FastifyInstance) {
  // GET /api/portal/:token
  app.get("/api/portal/:token", async (req, reply) => {
    try {
      const ip = (req.headers["x-forwarded-for"] as string) ?? req.ip;
      if (!verificarRateLimitPortal(ip)) {
        reply.header("Retry-After", "60");
        return reply.status(429).send({ error: "Muitas requisições. Tente novamente em 1 minuto." });
      }

      const { token } = req.params as { token: string };
      if (!token || token.length < 16) return reply.status(400).send({ error: "Token inválido" });

      const { rows } = await getPool().query(
        `SELECT cf.*, cot.titulo, cot.descricao, cot.prazo_resposta
         FROM cotacao_fornecedores cf
         JOIN cotacoes cot ON cf.cotacao_id = cot.id
         WHERE cf.token_acesso = $1 AND cot.status IN ('enviada','aberta')`,
        [token],
      );
      if (!rows[0]) return reply.status(404).send({ error: "Cotação não encontrada ou expirada" });

      // Verificar expiração do token
      if (rows[0].token_expira_em && new Date(rows[0].token_expira_em) < new Date()) {
        return reply.status(410).send({ error: "Token expirado. Solicite um novo link ao comprador." });
      }

      // Registrar acesso no audit_log
      await getPool().query(
        `INSERT INTO audit_log (tabela, acao, registro_id, dados_novos, ip_address, user_agent)
         VALUES ('cotacao_fornecedores', 'PORTAL_ACESSO', $1, $2, $3, $4)`,
        [
          rows[0].id,
          JSON.stringify({ cotacao_id: rows[0].cotacao_id }),
          ip,
          req.headers["user-agent"] ?? "",
        ],
      );

      // Marcar que acessou
      if (!rows[0].acessou_portal) {
        await getPool().query(
          `UPDATE cotacao_fornecedores SET acessou_portal = true, acessou_em = NOW() WHERE id = $1`,
          [rows[0].id],
        );
      }

      const itens = await getPool().query(
        `SELECT ci.*, pc.descricao AS produto_descricao, um.sigla AS unidade_sigla
         FROM cotacao_itens ci
         JOIN itens_cesta ic ON ci.item_cesta_id = ic.id
         JOIN produtos_catalogo pc ON ic.produto_id = pc.id
         LEFT JOIN unidades_medida um ON pc.unidade_medida_id = um.id
         WHERE ci.cotacao_id = $1`,
        [rows[0].cotacao_id],
      );

      reply.send({ data: { ...rows[0], itens: itens.rows, csrf_token: gerarCsrfToken(token) } });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/portal/:token/responder
  app.post("/api/portal/:token/responder", { preHandler: validarBody(respostaPortalSchema) }, async (req, reply) => {
    try {
      const ip = (req.headers["x-forwarded-for"] as string) ?? req.ip;
      if (!verificarRateLimitPortal(ip)) {
        reply.header("Retry-After", "60");
        return reply.status(429).send({ error: "Muitas requisições. Tente novamente em 1 minuto." });
      }

      const { token } = req.params as { token: string };
      if (!token || token.length < 16) return reply.status(400).send({ error: "Token inválido" });

      // Validar CSRF token (Fase 12.4)
      const csrfToken = (req.body as Record<string, unknown>).csrf_token as string | undefined
        ?? req.headers["x-csrf-token"] as string | undefined;
      if (!validarCsrfToken(token, csrfToken)) {
        return (reply as any).status(403).send({ error: "Token CSRF inválido ou expirado. Recarregue a página." });
      }

      const { respostas, dados_fornecedor } = req.body as {
        respostas: { item_cotacao_id: string; valor: number; marca?: string; observacao?: string }[];
        dados_fornecedor?: { nome?: string; telefone?: string };
      };

      const { rows: [forn] } = await getPool().query(
        `SELECT * FROM cotacao_fornecedores WHERE token_acesso = $1`, [token],
      );
      if (!forn) return reply.status(404).send({ error: "Token inválido" });

      // Verificar expiração
      if (forn.token_expira_em && new Date(forn.token_expira_em) < new Date()) {
        return reply.status(410).send({ error: "Token expirado. Solicite um novo link ao comprador." });
      }

      const pool = getPool();
      for (const r of respostas) {
        await pool.query(
          `INSERT INTO respostas_cotacao (cotacao_id, cotacao_fornecedor_id, cotacao_item_id, valor, marca, observacao)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (cotacao_fornecedor_id, cotacao_item_id)
           DO UPDATE SET valor = $4, marca = $5, observacao = $6, atualizado_em = NOW()`,
          [forn.cotacao_id, forn.id, r.item_cotacao_id, r.valor, r.marca, r.observacao],
        );
      }

      // Atualizar status fornecedor
      await pool.query(
        `UPDATE cotacao_fornecedores SET respondido = true, respondido_em = NOW() WHERE id = $1`, [forn.id],
      );

      if (dados_fornecedor) {
        const sets: string[] = [];
        const params: unknown[] = [];
        if (dados_fornecedor.nome) { params.push(dados_fornecedor.nome); sets.push(`nome = $${params.length}`); }
        if (dados_fornecedor.telefone) { params.push(dados_fornecedor.telefone); sets.push(`telefone = $${params.length}`); }
        if (sets.length > 0) {
          params.push(forn.id);
          await pool.query(`UPDATE cotacao_fornecedores SET ${sets.join(", ")} WHERE id = $${params.length}`, params);
        }
      }

      // Push notification para gestores do município (Fase 13.4)
      const { rows: [cotInfo] } = await pool.query(
        `SELECT c.titulo, s.municipio_id, cf.razao_social
         FROM cotacoes c
         JOIN cestas ce ON ce.id = c.cesta_id
         JOIN secretarias s ON s.id = ce.secretaria_id
         JOIN cotacao_fornecedores cf ON cf.cotacao_id = c.id
         WHERE cf.id = $1`, [forn.id],
      );
      if (cotInfo) {
        notificarCotacaoRespondida(
          cotInfo.municipio_id, cotInfo.titulo, cotInfo.razao_social ?? "Fornecedor", forn.cotacao_id,
        ).catch(() => { /* fire-and-forget */ });
      }

      reply.send({ ok: true });
    } catch (e) { tratarErro(e, reply); }
  });
}
