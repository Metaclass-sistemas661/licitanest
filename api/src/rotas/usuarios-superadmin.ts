import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { verificarAuth } from "../middleware/auth.js";
import { exigirSuperAdmin } from "../middleware/superadmin.js";
import { getPool } from "../config/database.js";
import { getAuth } from "../config/firebase.js";
import { tratarErro } from "../utils/erros.js";

export async function rotasUsuariosSuperadmin(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirSuperAdmin);

  const pool = () => getPool();

  // ── KPIs / Resumo ─────────────────────────────────────────────────────────

  app.get("/api/superadmin/usuarios/resumo", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { rows } = await pool().query(`
        SELECT
          COUNT(*) FILTER (WHERE s.ativo = true AND s.deletado_em IS NULL)::int AS ativos,
          COUNT(*) FILTER (WHERE s.criado_em >= NOW() - INTERVAL '30 days' AND s.deletado_em IS NULL)::int AS novos_30d,
          COUNT(*) FILTER (WHERE s.totp_ativado = true AND s.deletado_em IS NULL)::int AS com_2fa,
          COUNT(*) FILTER (WHERE s.deletado_em IS NULL)::int AS total,
          COUNT(*) FILTER (
            WHERE s.ativo = true AND s.deletado_em IS NULL
            AND (s.ultimo_acesso IS NULL OR s.ultimo_acesso < NOW() - INTERVAL '90 days')
          )::int AS inativos_90d
        FROM servidores s
      `);
      const r = rows[0];
      reply.send({
        data: {
          ativos: r.ativos,
          novos_30d: r.novos_30d,
          com_2fa: r.com_2fa,
          pct_2fa: r.total > 0 ? Math.round((r.com_2fa / r.total) * 100) : 0,
          inativos_90d: r.inativos_90d,
          total: r.total,
        },
      });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // ── Listagem paginada com filtros ─────────────────────────────────────────

  app.get("/api/superadmin/usuarios", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const q = request.query as Record<string, string | undefined>;
      const page = Math.max(1, parseInt(q.page || "1"));
      const limit = Math.min(100, Math.max(1, parseInt(q.limit || "20")));
      const offset = (page - 1) * limit;

      const conditions: string[] = ["s.deletado_em IS NULL"];
      const params: unknown[] = [];
      let idx = 1;

      // status
      if (q.status === "ativo") {
        conditions.push("s.ativo = true");
      } else if (q.status === "inativo") {
        conditions.push("s.ativo = false");
      } else if (q.status === "bloqueado") {
        conditions.push("s.ativo = false");
      }

      // prefeitura
      if (q.municipio_id) {
        conditions.push(`sec.municipio_id = $${idx++}`);
        params.push(q.municipio_id);
      }

      // perfil
      if (q.perfil) {
        conditions.push(`p.nome = $${idx++}`);
        params.push(q.perfil);
      }

      // 2FA
      if (q.com_2fa === "sim") {
        conditions.push("s.totp_ativado = true");
      } else if (q.com_2fa === "nao") {
        conditions.push("(s.totp_ativado = false OR s.totp_ativado IS NULL)");
      }

      // busca
      if (q.busca) {
        conditions.push(`(s.nome ILIKE $${idx} OR s.email ILIKE $${idx} OR s.cpf ILIKE $${idx})`);
        params.push(`%${q.busca}%`);
        idx++;
      }

      // uf
      if (q.uf) {
        conditions.push(`m.uf = $${idx++}`);
        params.push(q.uf);
      }

      const where = conditions.join(" AND ");

      // Sorting
      const sortMap: Record<string, string> = {
        nome: "s.nome",
        email: "s.email",
        prefeitura: "m.nome",
        perfil: "p.nome",
        criado_em: "s.criado_em",
        ultimo_acesso: "s.ultimo_acesso",
      };
      const sortCol = sortMap[q.ordenar_por || ""] || "s.criado_em";
      const sortDir = q.ordem === "asc" ? "ASC" : "DESC";

      const baseQuery = `
        FROM servidores s
        JOIN perfis p ON p.id = s.perfil_id
        JOIN secretarias sec ON sec.id = s.secretaria_id
        JOIN municipios m ON m.id = sec.municipio_id
        WHERE ${where}
      `;

      const [countRes, dataRes] = await Promise.all([
        pool().query(`SELECT COUNT(*)::int AS total ${baseQuery}`, params),
        pool().query(
          `SELECT
            s.id, s.nome, s.email, s.cpf, s.matricula,
            s.ativo, s.totp_ativado, s.ultimo_acesso,
            s.criado_em, s.is_superadmin,
            p.id AS perfil_id, p.nome AS perfil_nome,
            sec.id AS secretaria_id, sec.nome AS secretaria_nome,
            m.id AS municipio_id, m.nome AS municipio_nome, m.uf AS municipio_uf
          ${baseQuery}
          ORDER BY ${sortCol} ${sortDir} NULLS LAST
          LIMIT $${idx++} OFFSET $${idx++}`,
          [...params, limit, offset],
        ),
      ]);

      reply.send({
        data: dataRes.rows,
        total: countRes.rows[0].total,
        page,
        limit,
      });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // ── Detalhe de um usuário ─────────────────────────────────────────────────

  app.get("/api/superadmin/usuarios/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };

      const { rows } = await pool().query(
        `SELECT
          s.id, s.nome, s.email, s.cpf, s.matricula, s.telefone,
          s.ativo, s.totp_ativado, s.totp_ativado_em,
          s.ultimo_acesso, s.ultimo_ip, s.ultimo_user_agent,
          s.criado_em, s.atualizado_em, s.is_superadmin, s.data_nascimento,
          p.id AS perfil_id, p.nome AS perfil_nome,
          sec.id AS secretaria_id, sec.nome AS secretaria_nome,
          m.id AS municipio_id, m.nome AS municipio_nome, m.uf AS municipio_uf
        FROM servidores s
        JOIN perfis p ON p.id = s.perfil_id
        JOIN secretarias sec ON sec.id = s.secretaria_id
        JOIN municipios m ON m.id = sec.municipio_id
        WHERE s.id = $1 AND s.deletado_em IS NULL`,
        [id],
      );

      if (!rows[0]) {
        return reply.status(404).send({ error: "Usuário não encontrado" });
      }

      // Buscar atividades recentes
      const atividadesRes = await pool().query(
        `SELECT tabela, acao, criado_em, dados_novos
        FROM audit_log
        WHERE usuario_id = $1
        ORDER BY criado_em DESC
        LIMIT 10`,
        [id],
      );

      reply.send({
        data: {
          ...rows[0],
          atividades_recentes: atividadesRes.rows,
        },
      });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // ── Criar usuário ─────────────────────────────────────────────────────────

  app.post("/api/superadmin/usuarios", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = request.body as {
        nome: string;
        email: string;
        cpf?: string;
        matricula?: string;
        telefone?: string;
        perfil_id: string;
        secretaria_id: string;
      };

      if (!body.nome || body.nome.trim().length < 3) {
        return reply.status(400).send({ error: "Nome obrigatório (mín. 3 caracteres)" });
      }
      if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
        return reply.status(400).send({ error: "Email inválido" });
      }
      if (!body.perfil_id || !body.secretaria_id) {
        return reply.status(400).send({ error: "Perfil e secretaria obrigatórios" });
      }

      const emailNorm = body.email.trim().toLowerCase();

      // Verificar email duplicado no banco
      const existeRes = await pool().query(
        "SELECT id FROM servidores WHERE email = $1 AND deletado_em IS NULL",
        [emailNorm],
      );
      if (existeRes.rows.length > 0) {
        return reply.status(409).send({ error: "Já existe um usuário com este email" });
      }

      // 1) Criar ou buscar usuário no Firebase Auth
      let firebaseUid: string;
      try {
        const fbUser = await getAuth().getUserByEmail(emailNorm);
        firebaseUid = fbUser.uid;
      } catch {
        // Usuário não existe no Firebase — criar
        const fbUser = await getAuth().createUser({
          email: emailNorm,
          displayName: body.nome.trim(),
          emailVerified: false,
        });
        firebaseUid = fbUser.uid;
      }

      // 2) Criar registro na tabela `usuarios` (ou buscar existente)
      let userId: string;
      const existeUsuario = await pool().query(
        "SELECT id FROM usuarios WHERE firebase_uid = $1 AND deletado_em IS NULL",
        [firebaseUid],
      );
      if (existeUsuario.rows.length > 0) {
        userId = existeUsuario.rows[0].id;
      } else {
        const insUsuario = await pool().query(
          `INSERT INTO usuarios (firebase_uid, email, nome, email_verificado, provedor)
           VALUES ($1, $2, $3, false, 'email')
           RETURNING id`,
          [firebaseUid, emailNorm, body.nome.trim()],
        );
        userId = insUsuario.rows[0].id;
      }

      // 3) Criar registro na tabela `servidores` vinculado ao `usuarios.id`
      const { rows } = await pool().query(
        `INSERT INTO servidores (user_id, nome, email, cpf, matricula, telefone, perfil_id, secretaria_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id`,
        [
          userId,
          body.nome.trim(),
          emailNorm,
          body.cpf?.replace(/\D/g, "") || null,
          body.matricula?.trim() || null,
          body.telefone?.trim() || null,
          body.perfil_id,
          body.secretaria_id,
        ],
      );

      // 4) Gerar link de redefinição de senha para o novo usuário
      const resetLink = await getAuth().generatePasswordResetLink(emailNorm);

      reply.status(201).send({ data: { id: rows[0].id, resetLink } });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // ── Atualizar usuário ─────────────────────────────────────────────────────

  app.put("/api/superadmin/usuarios/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as Record<string, unknown>;

      const allowedFields: Record<string, string> = {
        nome: "nome",
        email: "email",
        matricula: "matricula",
        telefone: "telefone",
        perfil_id: "perfil_id",
        secretaria_id: "secretaria_id",
        ativo: "ativo",
      };

      const sets: string[] = ["atualizado_em = NOW()"];
      const vals: unknown[] = [];
      let idx = 1;

      for (const [key, col] of Object.entries(allowedFields)) {
        if (body[key] !== undefined) {
          sets.push(`${col} = $${idx++}`);
          vals.push(body[key]);
        }
      }

      if (vals.length === 0) {
        return reply.status(400).send({ error: "Nenhum campo para atualizar" });
      }

      vals.push(id);
      await pool().query(
        `UPDATE servidores SET ${sets.join(", ")} WHERE id = $${idx} AND deletado_em IS NULL`,
        vals,
      );

      reply.send({ data: { ok: true } });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // ── Ações em lote ─────────────────────────────────────────────────────────

  app.post("/api/superadmin/usuarios/lote", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { ids, acao } = request.body as { ids: string[]; acao: "ativar" | "desativar" };
      if (!ids?.length || !["ativar", "desativar"].includes(acao)) {
        return reply.status(400).send({ error: "IDs e ação válida obrigatórios" });
      }

      const ativo = acao === "ativar";
      const placeholders = ids.map((_, i) => `$${i + 2}`).join(", ");
      await pool().query(
        `UPDATE servidores SET ativo = $1, atualizado_em = NOW() WHERE id IN (${placeholders}) AND deletado_em IS NULL`,
        [ativo, ...ids],
      );

      reply.send({ data: { ok: true, afetados: ids.length } });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // ── Listar prefeituras (para filtro) ──────────────────────────────────────

  app.get("/api/superadmin/usuarios/prefeituras", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { rows } = await pool().query(
        `SELECT m.id, m.nome, m.uf,
          COUNT(s.id)::int AS total_usuarios
        FROM municipios m
        LEFT JOIN secretarias sec ON sec.municipio_id = m.id AND sec.deletado_em IS NULL
        LEFT JOIN servidores s ON s.secretaria_id = sec.id AND s.deletado_em IS NULL
        WHERE m.deletado_em IS NULL AND m.ativo = true
        GROUP BY m.id, m.nome, m.uf
        ORDER BY m.nome`,
      );
      reply.send({ data: rows });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // ── Listar perfis (para filtro) ───────────────────────────────────────────

  app.get("/api/superadmin/usuarios/perfis", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { rows } = await pool().query(
        `SELECT id, nome, descricao FROM perfis ORDER BY nome`,
      );
      reply.send({ data: rows });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // ── Listar secretarias de um município (para modal criar) ─────────────────

  app.get("/api/superadmin/usuarios/secretarias/:municipioId", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { municipioId } = request.params as { municipioId: string };
      const { rows } = await pool().query(
        `SELECT id, nome, sigla FROM secretarias WHERE municipio_id = $1 AND ativo = true AND deletado_em IS NULL ORDER BY nome`,
        [municipioId],
      );
      reply.send({ data: rows });
    } catch (e) {
      tratarErro(e, reply);
    }
  });
}
