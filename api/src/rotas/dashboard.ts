import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { exigirServidor } from "../middleware/autorizacao.js";
import { tratarErro } from "../utils/erros.js";

export async function rotasDashboard(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  // GET /api/dashboard/metricas
  app.get("/api/dashboard/metricas", {
    schema: {
      tags: ["Dashboard"],
      summary: "Métricas gerais do município",
      description: "Retorna contagem de cestas, produtos, fornecedores e cotações do município autenticado.",
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: "object",
          properties: {
            data: {
              type: "object",
              properties: {
                total_cestas: { type: "integer" },
                cestas_concluidas: { type: "integer" },
                total_produtos: { type: "integer" },
                total_fornecedores: { type: "integer" },
                total_cotacoes: { type: "integer" },
              },
            },
          },
        },
      },
    },
  }, async (req, reply) => {
    try {
      const municipioId = req.usuario!.servidor!.municipio_id;

      const [cestas, produtos, fornecedores, cotacoes] = await Promise.all([
        getPool().query(
          `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'concluida') AS concluidas
           FROM cestas c JOIN secretarias sec ON c.secretaria_id = sec.id
           WHERE c.deletado_em IS NULL AND sec.municipio_id = $1`, [municipioId],
        ),
        getPool().query(`SELECT COUNT(*) AS total FROM produtos_catalogo WHERE ativo = true`),
        getPool().query(
          `SELECT COUNT(*) AS total FROM fornecedores WHERE municipio_id = $1 AND ativo = true`, [municipioId],
        ),
        getPool().query(
          `SELECT COUNT(*) AS total FROM cotacoes cot
           JOIN cestas c ON cot.cesta_id = c.id
           JOIN secretarias sec ON c.secretaria_id = sec.id
           WHERE cot.deletado_em IS NULL AND sec.municipio_id = $1`, [municipioId],
        ),
      ]);

      reply.send({
        data: {
          total_cestas: parseInt(cestas.rows[0].total),
          cestas_concluidas: parseInt(cestas.rows[0].concluidas),
          total_produtos: parseInt(produtos.rows[0].total),
          total_fornecedores: parseInt(fornecedores.rows[0].total),
          total_cotacoes: parseInt(cotacoes.rows[0].total),
        },
      });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/dashboard/atividades
  app.get("/api/dashboard/atividades", async (req, reply) => {
    try {
      const { limite = "20", secretaria_id } = req.query as { limite?: string; secretaria_id?: string };
      const params: unknown[] = [req.usuario!.servidor!.municipio_id, parseInt(limite)];
      let where = `sec.municipio_id = $1`;
      if (secretaria_id) {
        params.push(secretaria_id);
        where += ` AND a.secretaria_id = $${params.length}`;
      }
      const { rows } = await getPool().query(
        `SELECT a.*, srv.nome AS servidor_nome
         FROM atividades a
         LEFT JOIN servidores srv ON a.servidor_id = srv.id
         LEFT JOIN secretarias sec ON a.secretaria_id = sec.id
         WHERE ${where}
         ORDER BY a.criado_em DESC
         LIMIT $2`,
        params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/dashboard/fontes-utilizacao
  app.get("/api/dashboard/fontes-utilizacao", async (_req, reply) => {
    try {
      const { rows } = await getPool().query(
        `SELECT f.nome, f.tipo, COUNT(pi.id) AS total_usos
         FROM fontes f
         LEFT JOIN precos_item pi ON pi.fonte_id = f.id
         WHERE f.ativo = true
         GROUP BY f.id, f.nome, f.tipo
         ORDER BY total_usos DESC`,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/dashboard/cestas-por-secretaria
  app.get("/api/dashboard/cestas-por-secretaria", async (req, reply) => {
    try {
      const municipioId = req.usuario!.servidor!.municipio_id;
      const { rows } = await getPool().query(
        `SELECT sec.nome, sec.sigla, COUNT(c.id) AS total
         FROM secretarias sec
         LEFT JOIN cestas c ON c.secretaria_id = sec.id AND c.deletado_em IS NULL
         WHERE sec.municipio_id = $1 AND sec.deletado_em IS NULL
         GROUP BY sec.id, sec.nome, sec.sigla
         ORDER BY total DESC`,
        [municipioId],
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });
}
