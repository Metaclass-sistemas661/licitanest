import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { exigirServidor, exigirAdmin } from "../middleware/autorizacao.js";
import { tratarErro } from "../utils/erros.js";

export async function rotasTenants(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  // GET /api/tenants/municipios
  app.get("/api/tenants/municipios", async (req, reply) => {
    try {
      const { rows } = await getPool().query(
        `SELECT m.*, a.plano_id, p.nome AS plano_nome
         FROM municipios m
         LEFT JOIN assinaturas a ON a.municipio_id = m.id
         LEFT JOIN planos p ON a.plano_id = p.id
         ORDER BY m.nome`,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/tenants/municipios/:id
  app.get("/api/tenants/municipios/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const { rows } = await getPool().query(
        `SELECT m.*, a.plano_id, a.status AS assinatura_status, p.nome AS plano_nome,
                (SELECT COUNT(*) FROM secretarias WHERE municipio_id = m.id AND deletado_em IS NULL) AS total_secretarias,
                (SELECT COUNT(*) FROM servidores s JOIN secretarias sec ON s.secretaria_id = sec.id WHERE sec.municipio_id = m.id AND s.deletado_em IS NULL) AS total_servidores
         FROM municipios m
         LEFT JOIN assinaturas a ON a.municipio_id = m.id
         LEFT JOIN planos p ON a.plano_id = p.id
         WHERE m.id = $1`, [id],
      );
      if (!rows[0]) return reply.status(404).send({ error: "Município não encontrado" });
      reply.send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // PUT /api/tenants/municipios/:id/status
  app.put("/api/tenants/municipios/:id/status", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const { ativo } = req.body as { ativo: boolean };
      await getPool().query(`UPDATE municipios SET ativo = $1, atualizado_em = NOW() WHERE id = $2`, [ativo, id]);
      reply.send({ ok: true });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/tenants/onboarding
  app.post("/api/tenants/onboarding", async (req, reply) => {
    try {
      const b = req.body as {
        municipio_nome: string; municipio_uf: string; municipio_ibge?: string;
        secretaria_nome: string; secretaria_sigla?: string;
        servidor_nome: string; servidor_email: string; servidor_cpf?: string;
        firebase_uid: string;
      };

      const pool = getPool();

      // 1. Criar município
      const { rows: [municipio] } = await pool.query(
        `INSERT INTO municipios (nome, uf, codigo_ibge) VALUES ($1, $2, $3) RETURNING *`,
        [b.municipio_nome, b.municipio_uf, b.municipio_ibge],
      );

      // 2. Criar secretaria
      const { rows: [secretaria] } = await pool.query(
        `INSERT INTO secretarias (nome, sigla, municipio_id) VALUES ($1, $2, $3) RETURNING *`,
        [b.secretaria_nome, b.secretaria_sigla, municipio.id],
      );

      // 3. Criar usuario
      const { rows: [usuario] } = await pool.query(
        `INSERT INTO usuarios (firebase_uid, email, nome, email_verificado) VALUES ($1, $2, $3, true) RETURNING *`,
        [b.firebase_uid, b.servidor_email, b.servidor_nome],
      );

      // 4. Buscar perfil admin
      const { rows: [perfilAdmin] } = await pool.query(
        `SELECT id FROM perfis WHERE nome = 'administrador' LIMIT 1`,
      );

      // 5. Criar servidor
      const { rows: [servidor] } = await pool.query(
        `INSERT INTO servidores (nome, email, cpf, perfil_id, secretaria_id, user_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [b.servidor_nome, b.servidor_email, b.servidor_cpf, perfilAdmin.id, secretaria.id, usuario.id],
      );

      // 6. Criar assinatura gratuita
      const { rows: [planoGratuito] } = await pool.query(
        `SELECT id FROM planos WHERE slug = 'gratuito' LIMIT 1`,
      );
      if (planoGratuito) {
        await pool.query(
          `INSERT INTO assinaturas (municipio_id, plano_id, status, intervalo)
           VALUES ($1, $2, 'ativa', 'mensal')`,
          [municipio.id, planoGratuito.id],
        );
      }

      reply.status(201).send({
        data: { municipio_id: municipio.id, servidor_id: servidor.id },
      });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/tenants/estatisticas
  app.get("/api/tenants/estatisticas", { preHandler: [exigirAdmin] }, async (_req, reply) => {
    try {
      const pool = getPool();
      const [municipios, servidores, cestas, assinaturas] = await Promise.all([
        pool.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE ativo) AS ativos FROM municipios`),
        pool.query(`SELECT COUNT(*) AS total FROM servidores WHERE deletado_em IS NULL`),
        pool.query(`SELECT COUNT(*) AS total FROM cestas WHERE deletado_em IS NULL`),
        pool.query(`SELECT status, COUNT(*) AS total FROM assinaturas GROUP BY status`),
      ]);
      reply.send({
        data: {
          municipios: municipios.rows[0],
          total_servidores: parseInt(servidores.rows[0].total),
          total_cestas: parseInt(cestas.rows[0].total),
          assinaturas_por_status: assinaturas.rows,
        },
      });
    } catch (e) { tratarErro(e, reply); }
  });
}
