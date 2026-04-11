import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { exigirServidor } from "../middleware/autorizacao.js";
import { tratarErro } from "../utils/erros.js";
import { cacheGet, cacheSet, cacheInvalidar, CACHE_TTL, CACHE_KEY } from "../config/cache.js";

export async function rotasServidores(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  // GET /api/servidores/me — retorna servidor do usuário logado
  app.get("/api/servidores/me", async (req, reply) => {
    try {
      const servidor = req.usuario!.servidor;
      if (!servidor) return reply.status(404).send({ error: "Servidor não encontrado" });
      // Buscar com joins completos
      const { rows } = await getPool().query(
        `SELECT s.id, s.nome, s.email, s.cpf, s.telefone, s.cargo,
                s.perfil_id, s.secretaria_id, s.user_id, s.data_nascimento,
                s.criado_em, s.atualizado_em, s.is_superadmin,
                json_build_object('id', p.id, 'nome', p.nome, 'descricao', p.descricao, 'permissoes', p.permissoes) AS perfil,
                json_build_object('id', sec.id, 'nome', sec.nome, 'sigla', sec.sigla, 'municipio_id', sec.municipio_id, 'ativo', sec.ativo) AS secretaria
         FROM servidores s
         JOIN perfis p ON s.perfil_id = p.id
         JOIN secretarias sec ON s.secretaria_id = sec.id
         WHERE s.id = $1`,
        [servidor.id],
      );
      const data = rows[0];
      // Não retornar is_superadmin para não-superadmins
      if (data && !data.is_superadmin) {
        delete data.is_superadmin;
      }
      reply.send({ data });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/servidores
  app.get("/api/servidores", async (req, reply) => {
    try {
      const { secretaria_id } = req.query as { secretaria_id?: string };
      const params: unknown[] = [];
      let sql = `
        SELECT s.*, p.nome AS perfil_nome, p.descricao AS perfil_descricao,
               sec.nome AS secretaria_nome, sec.sigla AS secretaria_sigla
        FROM servidores s
        JOIN perfis p ON s.perfil_id = p.id
        JOIN secretarias sec ON s.secretaria_id = sec.id
        WHERE s.deletado_em IS NULL`;

      if (secretaria_id) {
        params.push(secretaria_id);
        sql += ` AND s.secretaria_id = $${params.length}`;
      }

      // Filtro por município (ex-RLS)
      params.push(req.usuario!.servidor!.municipio_id);
      sql += ` AND sec.municipio_id = $${params.length}`;
      sql += ` ORDER BY s.nome`;

      const { rows } = await getPool().query(sql, params);
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/servidores/:id
  app.get("/api/servidores/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const { rows } = await getPool().query(
        `SELECT s.*, p.nome AS perfil_nome, p.descricao AS perfil_descricao,
                sec.nome AS secretaria_nome, sec.sigla AS secretaria_sigla
         FROM servidores s
         JOIN perfis p ON s.perfil_id = p.id
         JOIN secretarias sec ON s.secretaria_id = sec.id
         WHERE s.id = $1 AND s.deletado_em IS NULL AND sec.municipio_id = $2`,
        [id, req.usuario!.servidor!.municipio_id],
      );
      if (!rows[0]) return reply.status(404).send({ error: "Servidor não encontrado" });
      reply.send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/servidores
  app.post("/api/servidores", async (req, reply) => {
    try {
      const body = req.body as {
        nome: string; email: string; cpf?: string; matricula?: string;
        perfil_id: string; secretaria_id: string; telefone?: string;
      };
      const { rows } = await getPool().query(
        `INSERT INTO servidores (nome, email, cpf, matricula, perfil_id, secretaria_id, telefone)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [body.nome, body.email, body.cpf, body.matricula, body.perfil_id, body.secretaria_id, body.telefone],
      );
      reply.status(201).send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // PUT /api/servidores/:id
  app.put("/api/servidores/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const body = req.body as Record<string, unknown>;
      const campos = ["nome", "email", "cpf", "matricula", "perfil_id", "secretaria_id", "telefone"];
      const sets: string[] = [];
      const params: unknown[] = [];
      for (const c of campos) {
        if (body[c] !== undefined) {
          params.push(body[c]);
          sets.push(`${c} = $${params.length}`);
        }
      }
      if (sets.length === 0) return reply.status(400).send({ error: "Nenhum campo para atualizar" });
      params.push(new Date().toISOString());
      sets.push(`atualizado_em = $${params.length}`);
      params.push(id);
      const { rows } = await getPool().query(
        `UPDATE servidores SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING *`,
        params,
      );
      if (!rows[0]) return reply.status(404).send({ error: "Servidor não encontrado" });
      reply.send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // DELETE /api/servidores/:id (soft delete)
  app.delete("/api/servidores/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      await getPool().query(
        `UPDATE servidores SET deletado_em = NOW(), atualizado_em = NOW() WHERE id = $1`,
        [id],
      );
      reply.status(204).send();
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/perfis
  app.get("/api/perfis", async (_req, reply) => {
    try {
      const cached = await cacheGet(CACHE_KEY.PERFIS);
      if (cached) return reply.send({ data: cached });
      const { rows } = await getPool().query(`SELECT * FROM perfis ORDER BY nome`);
      await cacheSet(CACHE_KEY.PERFIS, rows, CACHE_TTL.PERFIS);
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/secretarias
  app.get("/api/secretarias", async (req, reply) => {
    try {
      const municipioId = req.usuario!.servidor!.municipio_id;
      const { rows } = await getPool().query(
        `SELECT * FROM secretarias WHERE municipio_id = $1 AND deletado_em IS NULL ORDER BY nome`,
        [municipioId],
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/secretarias
  app.post("/api/secretarias", async (req, reply) => {
    try {
      const body = req.body as { nome: string; sigla?: string; municipio_id: string };
      const { rows } = await getPool().query(
        `INSERT INTO secretarias (nome, sigla, municipio_id) VALUES ($1, $2, $3) RETURNING *`,
        [body.nome, body.sigla, body.municipio_id],
      );
      reply.status(201).send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // PUT /api/secretarias/:id
  app.put("/api/secretarias/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const body = req.body as { nome?: string; sigla?: string };
      const sets: string[] = [];
      const params: unknown[] = [];
      if (body.nome) { params.push(body.nome); sets.push(`nome = $${params.length}`); }
      if (body.sigla !== undefined) { params.push(body.sigla); sets.push(`sigla = $${params.length}`); }
      params.push(new Date().toISOString()); sets.push(`atualizado_em = $${params.length}`);
      params.push(id);
      const { rows } = await getPool().query(
        `UPDATE secretarias SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING *`, params,
      );
      reply.send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });
}
