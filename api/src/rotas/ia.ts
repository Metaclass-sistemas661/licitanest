import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { exigirServidor } from "../middleware/autorizacao.js";
import { tratarErro, AppError } from "../utils/erros.js";
import { VertexAI, HarmCategory, HarmBlockThreshold } from "@google-cloud/vertexai";
import { validarBody, validarParams, idParamsSchema, completarIASchema, avaliarIASchema } from "../middleware/validacao.js";

// ── Vertex AI (Gemini) — única IA permitida ──────────────
const PROJECT_ID = process.env.GCP_PROJECT_ID || process.env.GCP_PROJECT || "sistema-de-gestao-16e15";
const LOCATION = process.env.VERTEX_LOCATION || "us-central1";
const MODELO_GEMINI = process.env.VERTEX_MODEL || "gemini-2.0-flash";

const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });
const model = vertexAI.getGenerativeModel({
  model: MODELO_GEMINI,
  generationConfig: {
    maxOutputTokens: 2048,
    temperature: 0.3,
    topP: 0.8,
  },
  safetySettings: [
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  ],
});

// ── Rate limit por servidor: máx 20 req/hora ────────────
const IA_MAX_POR_HORA = 20;
const IA_PROMPT_MAX_CHARS = 4000;
const iaRateMap = new Map<string, { count: number; windowStart: number }>();

function verificarRateLimitIA(servidorId: string): void {
  const agora = Date.now();
  const entry = iaRateMap.get(servidorId);

  if (!entry || agora - entry.windowStart > 3600_000) {
    iaRateMap.set(servidorId, { count: 1, windowStart: agora });
    return;
  }

  if (entry.count >= IA_MAX_POR_HORA) {
    const minutosRestantes = Math.ceil((3600_000 - (agora - entry.windowStart)) / 60_000);
    throw new AppError(
      `Limite de ${IA_MAX_POR_HORA} consultas IA por hora atingido. Aguarde ${minutosRestantes} minutos.`,
      429,
    );
  }

  entry.count++;
}

export async function rotasIA(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  // POST /api/ia/completar
  app.post("/api/ia/completar", { preHandler: validarBody(completarIASchema) }, async (req, reply) => {
    try {
      const b = req.body as {
        tipo: string; prompt: string; servidor_id: string;
        dados_contexto?: unknown;
      };

      // Validar que o servidor_id pertence ao usuário autenticado
      if (b.servidor_id !== req.usuario!.servidor!.id) {
        return reply.status(403).send({ error: "Sem permissão para usar IA como outro servidor" });
      }

      // Rate limit por servidor
      verificarRateLimitIA(b.servidor_id);

      // Limitar tamanho do prompt (proteção contra bill shock)
      if (!b.prompt || typeof b.prompt !== "string" || b.prompt.trim().length === 0) {
        throw new AppError("Prompt é obrigatório", 400);
      }
      if (b.prompt.length > IA_PROMPT_MAX_CHARS) {
        throw new AppError(`Prompt excede o limite de ${IA_PROMPT_MAX_CHARS} caracteres (enviado: ${b.prompt.length})`, 400);
      }

      const pool = getPool();

      // Registrar interação
      const { rows } = await pool.query(
        `INSERT INTO interacoes_ia (servidor_id, tipo, prompt, dados_contexto, status)
         VALUES ($1, $2, $3, $4, 'processando') RETURNING *`,
        [b.servidor_id, b.tipo, b.prompt, b.dados_contexto ? JSON.stringify(b.dados_contexto) : null],
      );
      const interacao = rows[0];

      // System prompt contextual para licitações
      const systemPrompt = `Você é um assistente especializado em licitações públicas brasileiras, 
formação de cestas de preços e pesquisa de mercado conforme a Lei 14.133/2021 (Nova Lei de Licitações).
Responda de forma técnica, citando artigos de lei quando relevante.
Tipo de consulta: ${b.tipo}`;

      let resposta: string | null = null;
      const modeloUsado = MODELO_GEMINI;

      try {
        const result = await model.generateContent({
          systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: b.prompt }] }],
        });

        const candidate = result.response?.candidates?.[0];
        resposta = candidate?.content?.parts?.[0]?.text ?? null;
      } catch (err) {
        console.error("[IA] Vertex AI erro:", err);
      }

      // Registrar tentativa bloqueada no audit_log se falhou
      if (!resposta) {
        await pool.query(
          `INSERT INTO audit_log (tabela, acao, registro_id, dados_novos, ip_address, user_agent)
           VALUES ('interacoes_ia', 'IA_ERRO', $1, $2, $3, $4)`,
          [
            interacao.id,
            JSON.stringify({ modelo: modeloUsado, tipo: b.tipo }),
            (req.headers["x-forwarded-for"] as string) ?? req.ip,
            req.headers["user-agent"] ?? "",
          ],
        );
      }

      // Atualizar interação com resposta
      await pool.query(
        `UPDATE interacoes_ia SET resposta = $1, status = $2, modelo = $3, respondido_em = NOW()
         WHERE id = $4`,
        [resposta, resposta ? "concluido" : "erro", modeloUsado, interacao.id],
      );

      reply.send({
        data: { ...interacao, resposta, status: resposta ? "concluido" : "erro", modelo: modeloUsado },
      });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/ia/interacoes
  app.get("/api/ia/interacoes", async (req, reply) => {
    try {
      const { servidor_id, tipo, limite = "20" } = req.query as {
        servidor_id: string; tipo?: string; limite?: string;
      };
      const params: unknown[] = [servidor_id];
      let where = `servidor_id = $1`;
      if (tipo) { params.push(tipo); where += ` AND tipo = $${params.length}`; }
      params.push(parseInt(limite));
      const { rows } = await getPool().query(
        `SELECT * FROM interacoes_ia WHERE ${where} ORDER BY criado_em DESC LIMIT $${params.length}`,
        params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  // PUT /api/ia/interacoes/:id/avaliar
    app.put("/api/ia/interacoes/:id/avaliar", { preHandler: [validarParams(idParamsSchema), validarBody(avaliarIASchema)] }, async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const { nota } = req.body as { nota: number };
      await getPool().query(
        `UPDATE interacoes_ia SET avaliacao = $1 WHERE id = $2`, [nota, id],
      );
      reply.send({ ok: true });
    } catch (e) { tratarErro(e, reply); }
  });
}
