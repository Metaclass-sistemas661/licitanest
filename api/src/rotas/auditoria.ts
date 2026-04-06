import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { tratarErro } from "../utils/erros.js";
import { parsePaginacao, respostaPaginada } from "../utils/paginacao.js";

export async function rotasAuditoria(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);

  // POST /api/auditoria
  app.post("/api/auditoria", async (req, reply) => {
    try {
      const b = req.body as {
        servidor_id: string; acao: string; tabela: string;
        registro_id?: string; dados_anteriores?: unknown; dados_novos?: unknown;
      };
      const { rows } = await getPool().query(
        `INSERT INTO audit_log (servidor_id, acao, tabela, registro_id, dados_anteriores, dados_novos, ip_address, user_agent)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [b.servidor_id, b.acao, b.tabela, b.registro_id,
         b.dados_anteriores ? JSON.stringify(b.dados_anteriores) : null,
         b.dados_novos ? JSON.stringify(b.dados_novos) : null,
         req.ip, req.headers["user-agent"]],
      );
      reply.status(201).send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/auditoria
  app.get("/api/auditoria", async (req, reply) => {
    try {
      const q = req.query as Record<string, string>;
      const pag = parsePaginacao(q);
      const params: unknown[] = [];
      let where = `1=1`;

      if (q.tabela) { params.push(q.tabela); where += ` AND al.tabela = $${params.length}`; }
      if (q.acao) { params.push(q.acao); where += ` AND al.acao = $${params.length}`; }
      if (q.servidor_id) { params.push(q.servidor_id); where += ` AND al.servidor_id = $${params.length}`; }

      const countRes = await getPool().query(
        `SELECT COUNT(*) FROM audit_log al WHERE ${where}`, params,
      );
      const total = parseInt(countRes.rows[0].count);

      params.push(pag.porPagina, pag.offset);
      const { rows } = await getPool().query(
        `SELECT al.*, srv.nome AS servidor_nome
         FROM audit_log al
         LEFT JOIN servidores srv ON al.servidor_id = srv.id
         WHERE ${where}
         ORDER BY al.criado_em DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      );
      reply.send(respostaPaginada(rows, total, pag));
    } catch (e) { tratarErro(e, reply); }
  });
}
