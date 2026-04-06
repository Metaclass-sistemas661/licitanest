import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { exigirServidor } from "../middleware/autorizacao.js";
import { tratarErro } from "../utils/erros.js";
import { obterSecret } from "../config/secrets.js";

export async function rotasIA(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  // POST /api/ia/completar
  app.post("/api/ia/completar", async (req, reply) => {
    try {
      const b = req.body as {
        tipo: string; prompt: string; servidor_id: string;
        dados_contexto?: unknown; modelo?: string;
      };

      const pool = getPool();

      // Registrar interação
      const { rows } = await pool.query(
        `INSERT INTO interacoes_ia (servidor_id, tipo, prompt, dados_contexto, status)
         VALUES ($1, $2, $3, $4, 'processando') RETURNING *`,
        [b.servidor_id, b.tipo, b.prompt, b.dados_contexto ? JSON.stringify(b.dados_contexto) : null],
      );
      const interacao = rows[0];

      // Montar system prompt contextual para licitações
      const systemPrompt = `Você é um assistente especializado em licitações públicas brasileiras, 
formação de cestas de preços e pesquisa de mercado conforme a Lei 14.133/2021 (Nova Lei de Licitações).
Responda de forma técnica, citando artigos de lei quando relevante.
Tipo de consulta: ${b.tipo}`;

      // Tentar Anthropic primeiro, fallback para OpenAI
      let resposta: string | null = null;
      let modeloUsado = "";

      try {
        const anthropicKey = await obterSecret("ANTHROPIC_API_KEY");
        if (anthropicKey) {
          const resp = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": anthropicKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: b.modelo || "claude-sonnet-4-20250514",
              max_tokens: 2048,
              system: systemPrompt,
              messages: [{ role: "user", content: b.prompt }],
            }),
            signal: AbortSignal.timeout(30000),
          });

          if (resp.ok) {
            const data = (await resp.json()) as { content: { text: string }[] };
            resposta = data.content?.[0]?.text ?? null;
            modeloUsado = b.modelo || "claude-sonnet-4-20250514";
          }
        }
      } catch (err) {
        console.warn("[IA] Anthropic indisponível, tentando OpenAI:", err);
      }

      // Fallback OpenAI
      if (!resposta) {
        try {
          const openaiKey = await obterSecret("OPENAI_API_KEY");
          if (openaiKey) {
            const resp = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${openaiKey}`,
              },
              body: JSON.stringify({
                model: "gpt-4o-mini",
                max_tokens: 2048,
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: b.prompt },
                ],
              }),
              signal: AbortSignal.timeout(30000),
            });

            if (resp.ok) {
              const data = (await resp.json()) as { choices: { message: { content: string } }[] };
              resposta = data.choices?.[0]?.message?.content ?? null;
              modeloUsado = "gpt-4o-mini";
            }
          }
        } catch (err) {
          console.warn("[IA] OpenAI também indisponível:", err);
        }
      }

      // Atualizar interação com resposta
      await pool.query(
        `UPDATE interacoes_ia SET resposta = $1, status = $2, modelo = $3, respondido_em = NOW()
         WHERE id = $4`,
        [resposta, resposta ? "concluido" : "erro", modeloUsado || null, interacao.id],
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
  app.put("/api/ia/interacoes/:id/avaliar", async (req, reply) => {
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
