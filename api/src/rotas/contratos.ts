import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { exigirServidor } from "../middleware/autorizacao.js";
import { exigirSuperAdmin } from "../middleware/superadmin.js";
import { tratarErro } from "../utils/erros.js";
import { enviarPushParaMunicipio } from "../utils/push.js";
import { storage } from "../config/storage.js";

// ═══════════════════════════════════════════════════════════════
// Rotas de Contratos — SuperAdmin
// ═══════════════════════════════════════════════════════════════
export async function rotasContratos(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);
  app.addHook("preHandler", exigirSuperAdmin);

  const pool = () => getPool();

  // GET /api/contratos — listar todos
  app.get("/api/contratos", async (req, reply) => {
    try {
      const { status, municipio_id, page = "1", limit = "20" } = req.query as Record<string, string>;
      const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

      const conditions: string[] = ["c.deletado_em IS NULL"];
      const params: unknown[] = [];

      if (status) {
        params.push(status);
        conditions.push(`c.status = $${params.length}`);
      }
      if (municipio_id) {
        params.push(municipio_id);
        conditions.push(`c.municipio_id = $${params.length}`);
      }

      const where = conditions.join(" AND ");

      const [dataResult, countResult] = await Promise.all([
        pool().query(
          `SELECT c.*, m.nome AS municipio_nome, m.uf AS municipio_uf,
                  m.codigo_ibge AS municipio_codigo_ibge
           FROM contratos c
           JOIN municipios m ON c.municipio_id = m.id
           WHERE ${where}
           ORDER BY c.criado_em DESC
           LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
          [...params, Number(limit), offset],
        ),
        pool().query(
          `SELECT COUNT(*) FROM contratos c WHERE ${where}`,
          params,
        ),
      ]);

      reply.send({
        data: dataResult.rows,
        total: Number(countResult.rows[0].count),
        page: Number(page),
        limit: Number(limit),
      });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/contratos/:id — detalhes
  app.get("/api/contratos/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const { rows } = await pool().query(
        `SELECT c.*, m.nome AS municipio_nome, m.uf AS municipio_uf,
                m.codigo_ibge AS municipio_codigo_ibge,
                s.nome AS criado_por_nome
         FROM contratos c
         JOIN municipios m ON c.municipio_id = m.id
         LEFT JOIN servidores s ON c.criado_por = s.id
         WHERE c.id = $1 AND c.deletado_em IS NULL`,
        [id],
      );
      if (!rows[0]) return reply.status(404).send({ error: "Contrato não encontrado" });

      // Buscar aditivos
      const { rows: aditivos } = await pool().query(
        `SELECT * FROM contratos_aditivos WHERE contrato_id = $1 ORDER BY criado_em DESC`,
        [id],
      );

      reply.send({ data: { ...rows[0], aditivos } });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/contratos — criar contrato
  app.post("/api/contratos", async (req, reply) => {
    try {
      const body = req.body as Record<string, unknown>;
      const servidorId = req.usuario!.servidor!.id;

      const { rows } = await pool().query(
        `INSERT INTO contratos (
            municipio_id, numero_contrato, objeto, valor_total, valor_mensal,
            quantidade_parcelas, data_inicio, data_fim, data_assinatura,
            limite_usuarios, limite_cestas, limite_cotacoes_mes,
            status, conteudo_html, conteudo_json,
            responsavel_nome, responsavel_cargo, responsavel_cpf,
            numero_processo, modalidade, observacoes,
            criado_por, atualizado_por
         ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9,
            $10, $11, $12,
            $13, $14, $15,
            $16, $17, $18,
            $19, $20, $21,
            $22, $22
         ) RETURNING *`,
        [
          body.municipio_id, body.numero_contrato, body.objeto, body.valor_total, body.valor_mensal,
          body.quantidade_parcelas ?? 1, body.data_inicio, body.data_fim, body.data_assinatura ?? null,
          body.limite_usuarios ?? 999, body.limite_cestas ?? 999, body.limite_cotacoes_mes ?? 999,
          body.status ?? "rascunho", body.conteudo_html ?? null, body.conteudo_json ? JSON.stringify(body.conteudo_json) : null,
          body.responsavel_nome ?? null, body.responsavel_cargo ?? null, body.responsavel_cpf ?? null,
          body.numero_processo ?? null, body.modalidade ?? null, body.observacoes ?? null,
          servidorId,
        ],
      );

      // Histórico
      await pool().query(
        `INSERT INTO contratos_historico (contrato_id, acao, usuario_id, ip_address)
         VALUES ($1, 'criado', $2, $3)`,
        [rows[0].id, servidorId, req.ip],
      );

      reply.status(201).send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // PUT /api/contratos/:id — atualizar contrato
  app.put("/api/contratos/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const body = req.body as Record<string, unknown>;
      const servidorId = req.usuario!.servidor!.id;

      // Campos atualizáveis
      const allowed = [
        "numero_contrato", "objeto", "valor_total", "valor_mensal",
        "quantidade_parcelas", "data_inicio", "data_fim", "data_assinatura",
        "limite_usuarios", "limite_cestas", "limite_cotacoes_mes",
        "status", "conteudo_html", "conteudo_json",
        "responsavel_nome", "responsavel_cargo", "responsavel_cpf",
        "numero_processo", "modalidade", "observacoes",
        "pdf_url", "pdf_nome_arquivo", "pdf_tamanho_bytes", "pdf_hash_sha256",
      ];

      const sets: string[] = [];
      const params: unknown[] = [];

      for (const key of allowed) {
        if (body[key] !== undefined) {
          const value = key === "conteudo_json" ? JSON.stringify(body[key]) : body[key];
          params.push(value);
          sets.push(`${key} = $${params.length}`);
        }
      }

      if (sets.length === 0) return reply.status(400).send({ error: "Nenhum campo para atualizar" });

      params.push(servidorId);
      sets.push(`atualizado_por = $${params.length}`);
      params.push(id);

      const { rows } = await pool().query(
        `UPDATE contratos SET ${sets.join(", ")}
         WHERE id = $${params.length} AND deletado_em IS NULL
         RETURNING *`,
        params,
      );

      if (!rows[0]) return reply.status(404).send({ error: "Contrato não encontrado" });

      // Histórico por campo alterado
      for (const key of Object.keys(body)) {
        if (allowed.includes(key)) {
          await pool().query(
            `INSERT INTO contratos_historico (contrato_id, acao, campo_alterado, valor_novo, usuario_id, ip_address)
             VALUES ($1, 'atualizado', $2, $3, $4, $5)`,
            [id, key, String(body[key] ?? ""), servidorId, req.ip],
          );
        }
      }

      reply.send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // DELETE /api/contratos/:id — soft delete
  app.delete("/api/contratos/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const servidorId = req.usuario!.servidor!.id;

      const { rows } = await pool().query(
        `UPDATE contratos SET deletado_em = NOW(), atualizado_por = $2
         WHERE id = $1 AND deletado_em IS NULL
         RETURNING id`,
        [id, servidorId],
      );

      if (!rows[0]) return reply.status(404).send({ error: "Contrato não encontrado" });

      await pool().query(
        `INSERT INTO contratos_historico (contrato_id, acao, usuario_id, ip_address)
         VALUES ($1, 'deletado', $2, $3)`,
        [id, servidorId, req.ip],
      );

      reply.status(204).send();
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/contratos/:id/aditivo — adicionar aditivo
  app.post("/api/contratos/:id/aditivo", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const body = req.body as Record<string, unknown>;
      const servidorId = req.usuario!.servidor!.id;

      // Verificar se contrato existe
      const { rows: contrato } = await pool().query(
        `SELECT id FROM contratos WHERE id = $1 AND deletado_em IS NULL`, [id],
      );
      if (!contrato[0]) return reply.status(404).send({ error: "Contrato não encontrado" });

      const { rows } = await pool().query(
        `INSERT INTO contratos_aditivos (
            contrato_id, numero_aditivo, tipo, descricao,
            valor_acrescimo, nova_data_fim, novos_limites,
            pdf_url, pdf_nome_arquivo, data_assinatura, criado_por
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          id, body.numero_aditivo, body.tipo, body.descricao,
          body.valor_acrescimo ?? 0, body.nova_data_fim ?? null,
          body.novos_limites ? JSON.stringify(body.novos_limites) : null,
          body.pdf_url ?? null, body.pdf_nome_arquivo ?? null,
          body.data_assinatura ?? null, servidorId,
        ],
      );

      // Aplicar alterações do aditivo ao contrato
      const updates: string[] = [];
      const updateParams: unknown[] = [];
      if (body.valor_acrescimo && Number(body.valor_acrescimo) !== 0) {
        updateParams.push(body.valor_acrescimo);
        updates.push(`valor_total = valor_total + $${updateParams.length}`);
      }
      if (body.nova_data_fim) {
        updateParams.push(body.nova_data_fim);
        updates.push(`data_fim = $${updateParams.length}`);
      }
      if (updates.length > 0) {
        updateParams.push(servidorId);
        updates.push(`atualizado_por = $${updateParams.length}`);
        updateParams.push(id);
        await pool().query(
          `UPDATE contratos SET ${updates.join(", ")} WHERE id = $${updateParams.length}`,
          updateParams,
        );
      }

      await pool().query(
        `INSERT INTO contratos_historico (contrato_id, acao, valor_novo, usuario_id, ip_address)
         VALUES ($1, 'aditivo_criado', $2, $3, $4)`,
        [id, rows[0].id, servidorId, req.ip],
      );

      reply.status(201).send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/contratos/:id/historico — histórico de alterações
  app.get("/api/contratos/:id/historico", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const { rows } = await pool().query(
        `SELECT h.*, s.nome AS usuario_nome
         FROM contratos_historico h
         LEFT JOIN servidores s ON h.usuario_id = s.id
         WHERE h.contrato_id = $1
         ORDER BY h.criado_em DESC`,
        [id],
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/contratos/dashboard/resumo — métricas para dashboard financeiro
  app.get("/api/contratos/dashboard/resumo", async (_req, reply) => {
    try {
      const { rows } = await pool().query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'ativo' AND deletado_em IS NULL) AS contratos_ativos,
          COUNT(*) FILTER (WHERE status = 'pendente_assinatura' AND deletado_em IS NULL) AS pendentes_assinatura,
          COUNT(*) FILTER (WHERE status = 'encerrado' AND deletado_em IS NULL) AS encerrados,
          COUNT(*) FILTER (WHERE status = 'renovacao' AND deletado_em IS NULL) AS em_renovacao,
          COALESCE(SUM(valor_total) FILTER (WHERE status = 'ativo' AND deletado_em IS NULL), 0) AS valor_total_ativos,
          COALESCE(SUM(valor_mensal) FILTER (WHERE status = 'ativo' AND deletado_em IS NULL), 0) AS mrr,
          COUNT(DISTINCT municipio_id) FILTER (WHERE status = 'ativo' AND deletado_em IS NULL) AS municipios_ativos,
          COUNT(*) FILTER (
            WHERE status = 'ativo' AND deletado_em IS NULL
            AND data_fim <= CURRENT_DATE + INTERVAL '30 days'
          ) AS vencendo_30_dias
        FROM contratos
      `);
      reply.send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // ── 7.4  POST /api/contratos/:id/pdf — upload de PDF ──────────────────────
  app.post("/api/contratos/:id/pdf", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const servidorId = req.usuario!.servidor!.id;

      const fileData = await req.file();
      if (!fileData) return reply.status(400).send({ error: "Arquivo não enviado" });

      const buffer = await fileData.toBuffer();

      // Validar magic bytes %PDF
      if (buffer.length < 4 || buffer.subarray(0, 4).toString("ascii") !== "%PDF") {
        return reply.status(400).send({ error: "Arquivo não é um PDF válido" });
      }
      // 20 MB max
      if (buffer.length > 20 * 1024 * 1024) {
        return reply.status(413).send({ error: "Arquivo excede 20 MB" });
      }

      // Verificar contrato
      const { rows: ctr } = await pool().query(
        `SELECT id, municipio_id FROM contratos WHERE id = $1 AND deletado_em IS NULL`, [id],
      );
      if (!ctr[0]) return reply.status(404).send({ error: "Contrato não encontrado" });

      // SHA-256
      const hash = crypto.createHash("sha256").update(buffer).digest("hex");

      const safeFilename = fileData.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `contratos/${ctr[0].municipio_id}/${id}/${Date.now()}_${safeFilename}`;
      const bucket = storage.bucket("licitanest-contratos");
      const file = bucket.file(storagePath);
      await file.save(buffer, { contentType: "application/pdf" });

      // Atualizar contrato
      await pool().query(
        `UPDATE contratos
         SET pdf_url = $1, pdf_nome_arquivo = $2, pdf_tamanho_bytes = $3, pdf_hash_sha256 = $4, atualizado_por = $5
         WHERE id = $6`,
        [storagePath, fileData.filename, buffer.length, hash, servidorId, id],
      );

      // Histórico
      await pool().query(
        `INSERT INTO contratos_historico (contrato_id, acao, campo_alterado, valor_novo, usuario_id, ip_address)
         VALUES ($1, 'atualizado', 'pdf_url', $2, $3, $4)`,
        [id, storagePath, servidorId, req.ip],
      );

      reply.send({ data: { storagePath, hash, tamanho: buffer.length } });
    } catch (e) { tratarErro(e, reply); }
  });

  // ── 7.4  GET /api/contratos/:id/pdf/download — download com signed URL ────
  app.get("/api/contratos/:id/pdf/download", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const { rows } = await pool().query(
        `SELECT pdf_url, pdf_nome_arquivo FROM contratos WHERE id = $1 AND deletado_em IS NULL`, [id],
      );
      if (!rows[0] || !rows[0].pdf_url) return reply.status(404).send({ error: "PDF não encontrado" });

      const bucket = storage.bucket("licitanest-contratos");
      const [signedUrl] = await bucket.file(rows[0].pdf_url).getSignedUrl({
        action: "read",
        expires: Date.now() + 15 * 60 * 1000, // 15min
        responseDisposition: `attachment; filename="${rows[0].pdf_nome_arquivo || "contrato.pdf"}"`,
      });

      reply.send({ data: { url: signedUrl, nome: rows[0].pdf_nome_arquivo } });
    } catch (e) { tratarErro(e, reply); }
  });

  // ── 7.5  POST /api/contratos/:id/enviar — enviar contrato para município ──
  app.post("/api/contratos/:id/enviar", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const servidorId = req.usuario!.servidor!.id;

      const { rows: ctr } = await pool().query(
        `SELECT id, municipio_id, numero_contrato, status FROM contratos WHERE id = $1 AND deletado_em IS NULL`, [id],
      );
      if (!ctr[0]) return reply.status(404).send({ error: "Contrato não encontrado" });

      if (!["rascunho", "pendente_assinatura"].includes(ctr[0].status)) {
        return reply.status(400).send({ error: `Contrato com status "${ctr[0].status}" não pode ser enviado` });
      }

      // Atualizar status
      await pool().query(
        `UPDATE contratos SET status = 'pendente_assinatura', atualizado_por = $1 WHERE id = $2`,
        [servidorId, id],
      );

      // Criar notificação para admins do município
      const { rows: admins } = await pool().query(
        `SELECT s.id, s.user_id FROM servidores s
         JOIN perfis p ON p.id = s.perfil_id
         WHERE s.municipio_id = $1 AND s.deletado_em IS NULL AND p.nome = 'admin'`,
        [ctr[0].municipio_id],
      );

      for (const admin of admins) {
        await pool().query(
          `INSERT INTO contratos_notificacoes (contrato_id, municipio_id, servidor_id, tipo, titulo, mensagem)
           VALUES ($1, $2, $3, 'contrato_enviado', $4, $5)`,
          [
            id, ctr[0].municipio_id, admin.id,
            `Novo contrato para assinatura: ${ctr[0].numero_contrato}`,
            `O contrato ${ctr[0].numero_contrato} foi enviado para análise e assinatura.`,
          ],
        );
      }

      // Push notification
      await enviarPushParaMunicipio(ctr[0].municipio_id, {
        titulo: "Novo contrato disponível",
        corpo: `O contrato ${ctr[0].numero_contrato} está disponível para assinatura.`,
        dados: { tipo: "contrato_enviado", contrato_id: id },
        url: `/contratos/${id}`,
      }, "admin").catch(() => {});

      // Histórico
      await pool().query(
        `INSERT INTO contratos_historico (contrato_id, acao, campo_alterado, valor_anterior, valor_novo, usuario_id, ip_address)
         VALUES ($1, 'enviado_municipio', 'status', $2, 'pendente_assinatura', $3, $4)`,
        [id, ctr[0].status, servidorId, req.ip],
      );

      reply.send({ data: { status: "pendente_assinatura" } });
    } catch (e) { tratarErro(e, reply); }
  });

  // ── 7.7  POST /api/contratos/:id/ativar — ativar contrato + gerar faturas ─
  app.post("/api/contratos/:id/ativar", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const servidorId = req.usuario!.servidor!.id;

      const { rows: ctr } = await pool().query(
        `SELECT * FROM contratos WHERE id = $1 AND deletado_em IS NULL`, [id],
      );
      if (!ctr[0]) return reply.status(404).send({ error: "Contrato não encontrado" });

      if (ctr[0].status === "ativo") return reply.status(400).send({ error: "Contrato já está ativo" });

      const contrato = ctr[0];

      // Atualizar status
      await pool().query(
        `UPDATE contratos SET status = 'ativo', atualizado_por = $1 WHERE id = $2`,
        [servidorId, id],
      );

      // Gerar faturas com base em quantidade_parcelas e valor_mensal
      const parcelas = contrato.quantidade_parcelas ?? 1;
      const valorMensal = contrato.valor_mensal ?? contrato.valor_total;
      const dataInicio = new Date(contrato.data_inicio);

      const faturasCriadas = [];
      for (let i = 0; i < parcelas; i++) {
        const vencimento = new Date(dataInicio);
        vencimento.setMonth(vencimento.getMonth() + i);

        const numero = `FAT-${contrato.numero_contrato}-${String(i + 1).padStart(3, "0")}`;

        const { rows: fatura } = await pool().query(
          `INSERT INTO faturas (municipio_id, contrato_id, parcela, numero, valor, vencimento, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'pendente')
           RETURNING *`,
          [contrato.municipio_id, id, i + 1, numero, valorMensal, vencimento.toISOString().split("T")[0]],
        );
        faturasCriadas.push(fatura[0]);
      }

      // Histórico
      await pool().query(
        `INSERT INTO contratos_historico (contrato_id, acao, valor_novo, usuario_id, ip_address)
         VALUES ($1, 'ativado', $2, $3, $4)`,
        [id, `${faturasCriadas.length} faturas geradas`, servidorId, req.ip],
      );

      reply.send({ data: { status: "ativo", faturas_geradas: faturasCriadas.length } });
    } catch (e) { tratarErro(e, reply); }
  });
}

// ═══════════════════════════════════════════════════════════════
// Rotas de Contratos — Portal do Município (acesso autenticado)
// ═══════════════════════════════════════════════════════════════
export async function rotasContratosPortal(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  // GET /api/portal/contratos — listar contratos do município logado
  app.get("/api/portal/contratos", async (req, reply) => {
    try {
      const municipioId = req.usuario!.servidor!.municipio_id;
      const { rows } = await pool().query(
        `SELECT id, numero_contrato, objeto, valor_total, valor_mensal,
                data_inicio, data_fim, status, data_assinatura,
                assinatura_digital_status, criado_em
         FROM contratos
         WHERE municipio_id = $1 AND deletado_em IS NULL
         ORDER BY criado_em DESC`,
        [municipioId],
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/portal/contratos/:id — detalhes de um contrato
  app.get("/api/portal/contratos/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const municipioId = req.usuario!.servidor!.municipio_id;

      const { rows } = await pool().query(
        `SELECT * FROM contratos
         WHERE id = $1 AND municipio_id = $2 AND deletado_em IS NULL`,
        [id, municipioId],
      );
      if (!rows[0]) return reply.status(404).send({ error: "Contrato não encontrado" });

      const { rows: aditivos } = await pool().query(
        `SELECT * FROM contratos_aditivos WHERE contrato_id = $1 ORDER BY criado_em DESC`,
        [id],
      );

      reply.send({ data: { ...rows[0], aditivos } });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/portal/contratos/:id/faturas — faturas do contrato
  app.get("/api/portal/contratos/:id/faturas", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const municipioId = req.usuario!.servidor!.municipio_id;

      const { rows } = await pool().query(
        `SELECT f.* FROM faturas f
         WHERE f.contrato_id = $1 AND f.municipio_id = $2
         ORDER BY f.parcela ASC, f.criado_em DESC`,
        [id, municipioId],
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/portal/notificacoes — notificações de contratos do município
  app.get("/api/portal/notificacoes", async (req, reply) => {
    try {
      const municipioId = req.usuario!.servidor!.municipio_id;
      const servidorId = req.usuario!.servidor!.id;
      const { rows } = await pool().query(
        `SELECT * FROM contratos_notificacoes
         WHERE municipio_id = $1 AND servidor_id = $2
         ORDER BY criado_em DESC
         LIMIT 50`,
        [municipioId, servidorId],
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  // PUT /api/portal/notificacoes/:id/lido — marcar como lida
  app.put("/api/portal/notificacoes/:id/lido", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const municipioId = req.usuario!.servidor!.municipio_id;

      const { rows } = await pool().query(
        `UPDATE contratos_notificacoes
         SET lido = TRUE, lido_em = NOW()
         WHERE id = $1 AND municipio_id = $2
         RETURNING id`,
        [id, municipioId],
      );
      if (!rows[0]) return reply.status(404).send({ error: "Notificação não encontrada" });
      reply.send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

         SET lido = TRUE, lido_em = NOW()
         WHERE id = $1 AND municipio_id = $2
         RETURNING id`,
        [id, municipioId],
      );
      if (!rows[0]) return reply.status(404).send({ error: "Notificação não encontrada" });
      reply.send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/portal/contratos/pendentes/count — badge sidebar
  app.get("/api/portal/contratos/pendentes/count", async (req, reply) => {
    try {
      const municipioId = req.usuario!.servidor!.municipio_id;
      const { rows } = await pool().query(
        `SELECT COUNT(*)::int AS pendentes FROM contratos
         WHERE municipio_id = $1 AND status = 'pendente_assinatura' AND deletado_em IS NULL`,
        [municipioId],
      );
      reply.send({ data: { pendentes: rows[0].pendentes } });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/portal/contratos/:id/verificar-acesso — verificação de identidade
  app.post("/api/portal/contratos/:id/verificar-acesso", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const { cpf, data_nascimento } = req.body as { cpf: string; data_nascimento: string };
      const servidor = req.usuario!.servidor!;
      const municipioId = servidor.municipio_id;

      // Verificar que o contrato existe e pertence ao município
      const { rows: contRows } = await pool().query(
        `SELECT id FROM contratos
         WHERE id = $1 AND municipio_id = $2 AND deletado_em IS NULL`,
        [id, municipioId],
      );
      if (!contRows[0]) return reply.status(404).send({ error: "Contrato não encontrado" });

      // Rate limit: máximo 5 tentativas em 15 minutos
      const { rows: tentativas } = await pool().query(
        `SELECT COUNT(*)::int AS total FROM audit_log
         WHERE tabela = 'contratos' AND registro_id = $1
           AND acao = 'verificar_acesso'
           AND usuario_id = $2
           AND criado_em > NOW() - INTERVAL '15 minutes'`,
        [id, servidor.id],
      );
      if (tentativas[0].total >= 5) {
        return reply.status(429).send({
          error: "Muitas tentativas. Acesso bloqueado por 15 minutos.",
        });
      }

      // Registrar tentativa no audit_log
      await pool().query(
        `INSERT INTO audit_log (tabela, registro_id, acao, usuario_id, dados_novos)
         VALUES ('contratos', $1, 'verificar_acesso', $2, $3)`,
        [id, servidor.id, JSON.stringify({ cpf: cpf.slice(0, 3) + "***", resultado: "tentativa" })],
      );

      // Comparar CPF e data de nascimento
      const cpfLimpo = cpf.replace(/\D/g, "");
      const servidorCpf = (servidor.cpf || "").replace(/\D/g, "");

      if (!servidorCpf || !servidor.data_nascimento) {
        return reply.status(400).send({
          error: "Dados cadastrais incompletos. Contate o administrador para atualizar CPF e data de nascimento.",
        });
      }

      const dataNascServidor = new Date(servidor.data_nascimento).toISOString().split("T")[0];
      const dataNascInformada = data_nascimento; // já no formato AAAA-MM-DD

      if (cpfLimpo !== servidorCpf || dataNascInformada !== dataNascServidor) {
        // Registrar falha
        await pool().query(
          `UPDATE audit_log SET dados_novos = $1
           WHERE tabela = 'contratos' AND registro_id = $2
             AND acao = 'verificar_acesso' AND usuario_id = $3
           ORDER BY criado_em DESC LIMIT 1`,
          [JSON.stringify({ resultado: "falha" }), id, servidor.id],
        );
        return reply.status(403).send({
          error: "Dados não conferem com o cadastro. Tente novamente.",
        });
      }

      // Sucesso — gerar token JWT temporário (15 min)
      const jwt = await import("jsonwebtoken");
      const secret = process.env.JWT_SECRET || "licitanest-contract-access-secret";
      const token = jwt.default.sign(
        { contrato_id: id, servidor_id: servidor.id, tipo: "acesso_contrato" },
        secret,
        { expiresIn: "15m" },
      );

      // Registrar sucesso
      await pool().query(
        `UPDATE audit_log SET dados_novos = $1
         WHERE tabela = 'contratos' AND registro_id = $2
           AND acao = 'verificar_acesso' AND usuario_id = $3
           AND criado_em > NOW() - INTERVAL '1 minute'`,
        [JSON.stringify({ resultado: "sucesso" }), id, servidor.id],
      );

      reply.send({ data: { token } });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/portal/contratos/:id/assinar — assinatura digital
  app.post("/api/portal/contratos/:id/assinar", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const {
        certificado_base64,
        senha_certificado,
        token_acesso,
        etapa,
      } = req.body as {
        certificado_base64: string;
        senha_certificado: string;
        token_acesso: string;
        etapa: "validar" | "assinar";
      };

      const servidor = req.usuario!.servidor!;
      const municipioId = servidor.municipio_id;

      // Rate limit: máximo 3 tentativas de assinatura em 15 minutos
      const { rows: tentativasAssinar } = await pool().query(
        `SELECT COUNT(*)::int AS total FROM audit_log
         WHERE tabela = 'contratos' AND acao = 'tentativa_assinatura'
         AND usuario_id = $1 AND criado_em > NOW() - INTERVAL '15 minutes'`,
        [servidor.id],
      );
      if (tentativasAssinar[0].total >= 3) {
        return reply.status(429).send({
          error: "Muitas tentativas de assinatura. Tente novamente em 15 minutos.",
        });
      }

      // Registrar tentativa de assinatura no audit_log
      await pool().query(
        `INSERT INTO audit_log (tabela, registro_id, acao, usuario_id, dados_novos)
         VALUES ('contratos', $1, 'tentativa_assinatura', $2, $3)`,
        [id, servidor.id, JSON.stringify({ etapa, contrato_id: id })],
      );

      // Validar token de acesso
      const jwt = await import("jsonwebtoken");
      const secret = process.env.JWT_SECRET || "licitanest-contract-access-secret";
      try {
        const payload = jwt.default.verify(token_acesso, secret) as {
          contrato_id: string;
          servidor_id: string;
          tipo: string;
        };
        if (payload.contrato_id !== id || payload.servidor_id !== servidor.id || payload.tipo !== "acesso_contrato") {
          return reply.status(403).send({ error: "Token de acesso inválido" });
        }
      } catch {
        return reply.status(403).send({ error: "Token de acesso expirado. Refaça a verificação de identidade." });
      }

      // Verificar que o contrato pertence ao município e está pendente
      const { rows: contRows } = await pool().query(
        `SELECT * FROM contratos
         WHERE id = $1 AND municipio_id = $2 AND deletado_em IS NULL`,
        [id, municipioId],
      );
      if (!contRows[0]) return reply.status(404).send({ error: "Contrato não encontrado" });
      const contrato = contRows[0];

      if (contrato.status !== "pendente_assinatura") {
        return reply.status(400).send({ error: "Contrato não está pendente de assinatura" });
      }

      // Parse PFX certificate using node-forge
      const forge = await import("node-forge");
      let certData;
      try {
        const derBuffer = Buffer.from(certificado_base64, "base64");
        const asn1 = forge.asn1.fromDer(derBuffer.toString("binary"));
        const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, senha_certificado);

        // Extrair certificado
        const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
        const certBag = certBags[forge.pki.oids.certBag]?.[0];
        if (!certBag?.cert) throw new Error("Certificado não encontrado no arquivo");

        const cert = certBag.cert;
        const subject = cert.subject.getField("CN")?.value || "";
        const issuer = cert.issuer.getField("CN")?.value || "";
        const serial = cert.serialNumber;

        // Extrair CPF do subject (padrão ICP-Brasil: CN contém CPF)
        const cpfMatch = subject.match(/\d{11}/);
        const cpfCert = cpfMatch ? cpfMatch[0] : "";

        // Extrair chave privada (para assinatura)
        const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
        const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];

        certData = {
          cert,
          privateKey: keyBag?.key || null,
          titular: subject,
          cpf: cpfCert,
          emissor: issuer,
          validade_inicio: cert.validity.notBefore.toISOString(),
          validade_fim: cert.validity.notAfter.toISOString(),
          serial,
        };
      } catch (e: unknown) {
        const msg = (e as Error).message || "";
        if (msg.includes("Invalid password") || msg.includes("PKCS#12")) {
          return reply.status(400).send({ error: "Senha do certificado incorreta" });
        }
        return reply.status(400).send({ error: "Certificado inválido ou corrompido" });
      }

      // Validações
      const now = new Date();
      if (now < new Date(certData.validade_inicio) || now > new Date(certData.validade_fim)) {
        return reply.status(400).send({ error: "Certificado expirado ou ainda não válido" });
      }

      const servidorCpf = (servidor.cpf || "").replace(/\D/g, "");
      if (certData.cpf && servidorCpf && certData.cpf !== servidorCpf) {
        return reply.status(400).send({
          error: "CPF do certificado não confere com o do servidor logado",
        });
      }

      // Etapa: validar — retorna dados do certificado
      if (etapa === "validar") {
        return reply.send({
          data: {
            certificado: {
              titular: certData.titular,
              cpf: certData.cpf ? certData.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : "N/A",
              emissor: certData.emissor,
              validade_inicio: certData.validade_inicio,
              validade_fim: certData.validade_fim,
              serial: certData.serial,
            },
          },
        });
      }

      // Etapa: assinar — gerar hash + assinatura + atualizar contrato
      // Gerar hash do conteúdo do contrato
      const conteudo = contrato.conteudo_html || contrato.objeto || "";
      const hashConteudo = crypto.createHash("sha256").update(conteudo).digest("hex");

      // Assinar hash com a chave privada
      let assinaturaHex = "";
      if (certData.privateKey) {
        const md = forge.md.sha256.create();
        md.update(hashConteudo, "utf8");
        const signature = (certData.privateKey as forge.pki.rsa.PrivateKey).sign(md);
        assinaturaHex = forge.util.bytesToHex(signature);
      }

      // Certificado público em PEM
      const certPem = forge.pki.certificateToPem(certData.cert);

      // Atualizar contrato
      await pool().query(
        `UPDATE contratos SET
          status = 'ativo',
          assinatura_digital_status = 'assinado',
          assinatura_digital_certificado = $1,
          assinatura_digital_hash = $2,
          assinatura_digital_em = NOW(),
          assinatura_digital_por = $3,
          data_assinatura = CURRENT_DATE,
          atualizado_em = NOW()
         WHERE id = $4`,
        [certPem, hashConteudo + ":" + assinaturaHex, servidor.id, id],
      );

      // Registrar no histórico
      await pool().query(
        `INSERT INTO contratos_historico (contrato_id, acao, valor_novo, usuario_id)
         VALUES ($1, 'assinado_digitalmente', $2, $3)`,
        [id, `Certificado: ${certData.emissor} | CPF: ${certData.cpf}`, servidor.id],
      );

      // Gerar faturas automaticamente ao ativar
      if (contrato.quantidade_parcelas && contrato.valor_mensal) {
        const dataInicio = new Date(contrato.data_inicio);
        for (let i = 0; i < contrato.quantidade_parcelas; i++) {
          const vencimento = new Date(dataInicio);
          vencimento.setMonth(vencimento.getMonth() + i);
          await pool().query(
            `INSERT INTO faturas (municipio_id, contrato_id, valor, vencimento, status, parcela, descricao)
             VALUES ($1, $2, $3, $4, 'pendente', $5, $6)`,
            [
              municipioId, id, contrato.valor_mensal,
              vencimento.toISOString().split("T")[0],
              i + 1,
              `Parcela ${i + 1}/${contrato.quantidade_parcelas} — ${contrato.numero_contrato}`,
            ],
          );
        }
      }

      // Notificar superadmin via audit_log
      await pool().query(
        `INSERT INTO audit_log (tabela, registro_id, acao, usuario_id, dados_novos)
         VALUES ('contratos', $1, 'assinatura_digital', $2, $3)`,
        [id, servidor.id, JSON.stringify({
          titular: certData.titular,
          emissor: certData.emissor,
          hash: hashConteudo.slice(0, 16),
        })],
      );

      reply.send({ data: { status: "assinado" } });
    } catch (e) { tratarErro(e, reply); }
  });

  function pool() { return getPool(); }
}
