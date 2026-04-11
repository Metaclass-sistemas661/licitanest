import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { exigirServidor, exigirNivelGovBr } from "../middleware/autorizacao.js";
import { tratarErro } from "../utils/erros.js";

export async function rotasWorkflow(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  // GET /api/workflow/cestas
  app.get("/api/workflow/cestas", async (req, reply) => {
    try {
      const q = req.query as { status?: string; secretaria_id?: string; busca?: string };
      const params: unknown[] = [req.usuario!.servidor!.municipio_id];
      let where = `sec.municipio_id = $1 AND c.deletado_em IS NULL`;

      if (q.status) { params.push(q.status); where += ` AND c.status = $${params.length}`; }
      if (q.secretaria_id) { params.push(q.secretaria_id); where += ` AND c.secretaria_id = $${params.length}`; }
      if (q.busca) { params.push(`%${q.busca}%`); where += ` AND c.descricao_objeto ILIKE $${params.length}`; }

      const { rows } = await getPool().query(
        `SELECT c.*, sec.nome AS secretaria_nome, srv.nome AS criado_por_nome,
                (SELECT COUNT(*) FROM itens_cesta ic WHERE ic.cesta_id = c.id) AS total_itens
         FROM cestas c
         JOIN secretarias sec ON c.secretaria_id = sec.id
         LEFT JOIN servidores srv ON c.criado_por = srv.id
         WHERE ${where}
         ORDER BY c.atualizado_em DESC`,
        params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/workflow/:cestaId/transicionar — requer Gov.br nível prata+
  app.post("/api/workflow/:cestaId/transicionar", { preHandler: exigirNivelGovBr("prata") }, async (req, reply) => {
    try {
      const { cestaId } = req.params as { cestaId: string };
      const { status_novo, servidor_id, observacoes, motivo_devolucao } = req.body as {
        status_novo: string; servidor_id: string; observacoes?: string; motivo_devolucao?: string;
      };

      const pool = getPool();
      const { rows: [cesta] } = await pool.query(`SELECT status FROM cestas WHERE id = $1`, [cestaId]);
      if (!cesta) return reply.status(404).send({ error: "Cesta não encontrada" });

      // Registrar tramitação
      await pool.query(
        `INSERT INTO tramitacoes_cesta (cesta_id, status_anterior, status_novo, servidor_id, observacoes, motivo_devolucao)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [cestaId, cesta.status, status_novo, servidor_id, observacoes, motivo_devolucao],
      );

      // Atualizar status da cesta
      await pool.query(
        `UPDATE cestas SET status = $1, atualizado_em = NOW() WHERE id = $2`,
        [status_novo, cestaId],
      );

      reply.send({ ok: true });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/workflow/:cestaId/tramitacoes
  app.get("/api/workflow/:cestaId/tramitacoes", async (req, reply) => {
    try {
      const { cestaId } = req.params as { cestaId: string };
      // Validar acesso ao município da cesta
      const { rows: cesta } = await getPool().query(
        `SELECT 1 FROM cestas c JOIN secretarias sec ON c.secretaria_id = sec.id
         WHERE c.id = $1 AND sec.municipio_id = $2`,
        [cestaId, req.usuario!.servidor!.municipio_id],
      );
      if (!cesta[0]) return reply.status(404).send({ error: "Cesta não encontrada" });

      const { rows } = await getPool().query(
        `SELECT t.*, srv.nome AS servidor_nome
         FROM tramitacoes_cesta t
         LEFT JOIN servidores srv ON t.servidor_id = srv.id
         WHERE t.cesta_id = $1
         ORDER BY t.criado_em DESC`,
        [cestaId],
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  // PUT /api/workflow/:cestaId/metodologia
  app.put("/api/workflow/:cestaId/metodologia", async (req, reply) => {
    try {
      const { cestaId } = req.params as { cestaId: string };
      const b = req.body as {
        metodologia: string; fundamentacao_legal?: string;
        minimo_fontes?: number; validade_meses?: number;
      };
      await getPool().query(
        `UPDATE cestas SET tipo_calculo = $1, fundamentacao_legal = $2,
         minimo_fontes = $3, validade_meses = $4, atualizado_em = NOW()
         WHERE id = $5`,
        [b.metodologia, b.fundamentacao_legal, b.minimo_fontes, b.validade_meses, cestaId],
      );
      reply.send({ ok: true });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/workflow/:cestaId/checklist
  app.get("/api/workflow/:cestaId/checklist", async (req, reply) => {
    try {
      const { cestaId } = req.params as { cestaId: string };
      // Validar acesso ao município da cesta
      const { rows: cesta } = await getPool().query(
        `SELECT 1 FROM cestas c JOIN secretarias sec ON c.secretaria_id = sec.id
         WHERE c.id = $1 AND sec.municipio_id = $2`,
        [cestaId, req.usuario!.servidor!.municipio_id],
      );
      if (!cesta[0]) return reply.status(404).send({ error: "Cesta não encontrada" });

      const { rows } = await getPool().query(
        `SELECT * FROM checklist_conformidade WHERE cesta_id = $1 ORDER BY criado_em DESC LIMIT 1`,
        [cestaId],
      );
      reply.send({ data: rows[0] ?? null });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/workflow/:cestaId/checklist
  app.post("/api/workflow/:cestaId/checklist", async (req, reply) => {
    try {
      const { cestaId } = req.params as { cestaId: string };
      const { criterios, servidor_id, observacoes } = req.body as {
        criterios: Record<string, boolean>; servidor_id: string; observacoes?: string;
      };
      const { rows } = await getPool().query(
        `INSERT INTO checklist_conformidade (cesta_id, criterios, servidor_id, observacoes)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (cesta_id) DO UPDATE SET criterios = $2, servidor_id = $3, observacoes = $4, atualizado_em = NOW()
         RETURNING *`,
        [cestaId, JSON.stringify(criterios), servidor_id, observacoes],
      );
      reply.status(201).send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });
}
