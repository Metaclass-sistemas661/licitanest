import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { tratarErro } from "../utils/erros.js";
import { registrarAuditoria } from "../utils/audit-dlq.js";
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
      await registrarAuditoria({
        servidor_id: b.servidor_id,
        municipio_id: req.usuario?.servidor?.municipio_id ?? null,
        acao: b.acao,
        tabela: b.tabela,
        registro_id: b.registro_id,
        dados_anteriores: b.dados_anteriores,
        dados_novos: b.dados_novos,
        ip_address: req.ip,
        user_agent: req.headers["user-agent"] ?? null,
      });
      reply.status(201).send({ ok: true });
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
