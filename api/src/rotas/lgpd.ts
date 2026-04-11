import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { exigirServidor } from "../middleware/autorizacao.js";
import { tratarErro } from "../utils/erros.js";
import { bucketDocs } from "../config/storage.js";

// Versão atual dos termos — incrementar quando atualizar documentos legais
const VERSAO_TERMOS_ATUAL = "1.1";

export async function rotasLgpd(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  // GET /api/lgpd/consentimentos
  app.get("/api/lgpd/consentimentos", async (req, reply) => {
    try {
      const servidorId = req.usuario!.servidor!.id;
      const { rows } = await getPool().query(
        `SELECT * FROM consentimentos_lgpd WHERE servidor_id = $1 ORDER BY criado_em DESC`,
        [servidorId],
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/lgpd/aceite-pendente — verifica se há aceite pendente de termos
  app.get("/api/lgpd/aceite-pendente", async (req, reply) => {
    try {
      const servidorId = req.usuario!.servidor!.id;
      const { rows } = await getPool().query(
        `SELECT tipo, versao_documento, aceito FROM consentimentos_lgpd
         WHERE servidor_id = $1 AND tipo IN ('termos_uso', 'politica_privacidade')`,
        [servidorId],
      );

      const termos = rows.find((r: { tipo: string }) => r.tipo === "termos_uso");
      const privacidade = rows.find((r: { tipo: string }) => r.tipo === "politica_privacidade");

      const pendente =
        !termos || !termos.aceito || termos.versao_documento !== VERSAO_TERMOS_ATUAL ||
        !privacidade || !privacidade.aceito || privacidade.versao_documento !== VERSAO_TERMOS_ATUAL;

      reply.send({ data: { pendente, versao_atual: VERSAO_TERMOS_ATUAL } });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/lgpd/consentimentos
  app.post("/api/lgpd/consentimentos", async (req, reply) => {
    try {
      const servidorId = req.usuario!.servidor!.id;
      const { tipo, aceito } = req.body as { tipo: string; aceito: boolean };
      const { rows } = await getPool().query(
        `INSERT INTO consentimentos_lgpd (servidor_id, tipo, aceito, ip_address, user_agent, versao_documento, aceito_em)
         VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $3 THEN NOW() ELSE NULL END)
         ON CONFLICT (servidor_id, tipo) DO UPDATE SET
           aceito = $3, ip_address = $4, user_agent = $5,
           versao_documento = $6, aceito_em = CASE WHEN $3 THEN NOW() ELSE NULL END,
           atualizado_em = NOW()
         RETURNING *`,
        [servidorId, tipo, aceito, req.ip, req.headers["user-agent"], VERSAO_TERMOS_ATUAL],
      );
      reply.status(201).send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // PUT /api/lgpd/consentimentos/:id — revogar consentimento
  app.put("/api/lgpd/consentimentos/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const servidorId = req.usuario!.servidor!.id;
      const { rows } = await getPool().query(
        `UPDATE consentimentos_lgpd SET aceito = false, revogado_em = NOW(), atualizado_em = NOW()
         WHERE id = $1 AND servidor_id = $2 RETURNING *`,
        [id, servidorId],
      );
      if (!rows[0]) return reply.status(404).send({ error: "Consentimento não encontrado" });
      reply.send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/lgpd/solicitacoes
  app.get("/api/lgpd/solicitacoes", async (req, reply) => {
    try {
      const q = req.query as { servidor_id?: string; status?: string };
      const params: unknown[] = [];
      let where = `1=1`;
      if (q.servidor_id) { params.push(q.servidor_id); where += ` AND servidor_id = $${params.length}`; }
      if (q.status) { params.push(q.status); where += ` AND status = $${params.length}`; }
      const { rows } = await getPool().query(
        `SELECT * FROM solicitacoes_lgpd WHERE ${where} ORDER BY criado_em DESC`, params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/lgpd/solicitacoes
  app.post("/api/lgpd/solicitacoes", async (req, reply) => {
    try {
      const servidorId = req.usuario!.servidor!.id;
      const { tipo, descricao } = req.body as { tipo: string; descricao?: string };
      const { rows } = await getPool().query(
        `INSERT INTO solicitacoes_lgpd (servidor_id, tipo, descricao)
         VALUES ($1, $2, $3) RETURNING *`,
        [servidorId, tipo, descricao],
      );
      reply.status(201).send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // PUT /api/lgpd/solicitacoes/:id
  app.put("/api/lgpd/solicitacoes/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const { status, resposta } = req.body as { status: string; resposta: string };
      const respondidoPor = req.usuario!.servidor!.id;
      const { rows } = await getPool().query(
        `UPDATE solicitacoes_lgpd SET status = $1, resposta = $2, respondido_por = $3, respondido_em = NOW()
         WHERE id = $4 RETURNING *`,
        [status, resposta, respondidoPor, id],
      );
      reply.send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // ── 6.3 — Exportação completa de dados do titular (LGPD Art. 18) ──────────
  app.post("/api/lgpd/exportar-dados", async (req, reply) => {
    try {
      const servidorId = req.usuario!.servidor!.id;
      const uid = req.usuario!.uid;
      const pool = getPool();

      // Coletar todos os dados do titular em paralelo
      const [usuario, servidor, cestas, cotacoes, documentos, consentimentos, auditoria] = await Promise.all([
        pool.query(`SELECT id, email, nome, cpf, nivel_govbr, provedor, criado_em, ultimo_login FROM usuarios WHERE firebase_uid = $1`, [uid]),
        pool.query(`SELECT id, nome, email, cpf, matricula, telefone, criado_em FROM servidores WHERE id = $1`, [servidorId]),
        pool.query(
          `SELECT c.id, c.nome, c.status, c.criado_em FROM cestas c
           JOIN secretarias sec ON c.secretaria_id = sec.id
           WHERE sec.municipio_id = $1`,
          [req.usuario!.servidor!.municipio_id],
        ),
        pool.query(
          `SELECT co.id, co.status, co.prazo_resposta, co.criado_em FROM cotacoes co
           JOIN cestas c ON co.cesta_id = c.id
           JOIN secretarias sec ON c.secretaria_id = sec.id
           WHERE sec.municipio_id = $1`,
          [req.usuario!.servidor!.municipio_id],
        ),
        pool.query(
          `SELECT dc.id, dc.nome_arquivo, dc.tipo_arquivo, dc.tamanho_bytes, dc.criado_em
           FROM documentos_comprobatorios dc
           JOIN precos_item pi ON dc.preco_item_id = pi.id
           JOIN itens_cesta ic ON pi.item_cesta_id = ic.id
           JOIN cestas c ON ic.cesta_id = c.id
           JOIN secretarias sec ON c.secretaria_id = sec.id
           WHERE sec.municipio_id = $1`,
          [req.usuario!.servidor!.municipio_id],
        ),
        pool.query(`SELECT * FROM consentimentos_lgpd WHERE servidor_id = $1`, [servidorId]),
        pool.query(
          `SELECT id, acao, tabela, registro_id, criado_em FROM audit_log
           WHERE servidor_id = $1 ORDER BY criado_em DESC LIMIT 1000`,
          [servidorId],
        ),
      ]);

      const exportData = {
        exportado_em: new Date().toISOString(),
        versao: "1.0",
        titular: {
          usuario: usuario.rows[0] ?? null,
          servidor: servidor.rows[0] ?? null,
        },
        cestas: cestas.rows,
        cotacoes: cotacoes.rows,
        documentos: documentos.rows,
        consentimentos: consentimentos.rows,
        registros_auditoria: auditoria.rows,
      };

      // Salvar no GCS com URL assinada de 24h
      const filename = `lgpd-export/${servidorId}/${Date.now()}_dados_titular.json`;
      const file = bucketDocs.file(filename);
      await file.save(JSON.stringify(exportData, null, 2), { contentType: "application/json" });

      const [signedUrl] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + 24 * 60 * 60 * 1000,
      });

      // Registrar no audit_log
      await pool.query(
        `INSERT INTO audit_log (servidor_id, acao, tabela, dados_novos, ip_address, user_agent)
         VALUES ($1, 'EXPORTACAO_DADOS_TITULAR', 'lgpd', $2, $3, $4)`,
        [servidorId, JSON.stringify({ filename }), req.ip, req.headers["user-agent"]],
      );

      // Registrar como solicitação LGPD concluída
      await pool.query(
        `INSERT INTO solicitacoes_lgpd (servidor_id, tipo, status, descricao, respondido_por, respondido_em)
         VALUES ($1, 'portabilidade', 'concluida', 'Exportação automática de dados do titular', $1, NOW())`,
        [servidorId],
      );

      reply.send({
        data: {
          url: signedUrl,
          expira_em: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          tamanho_registros: {
            cestas: cestas.rows.length,
            cotacoes: cotacoes.rows.length,
            documentos: documentos.rows.length,
            consentimentos: consentimentos.rows.length,
            auditoria: auditoria.rows.length,
          },
        },
      });
    } catch (e) { tratarErro(e, reply); }
  });

  // ── 6.4 — Relatório de Impacto à Proteção de Dados (RIPD) ─────────────────
  app.get("/api/lgpd/ripd", async (req, reply) => {
    try {
      const pool = getPool();
      const municipioId = req.usuario!.servidor!.municipio_id;

      // Contagens de dados pessoais armazenados
      const [usuarios, servidores, consentimentos, solicitacoes] = await Promise.all([
        pool.query(`SELECT COUNT(*)::int AS total FROM usuarios WHERE deletado_em IS NULL`),
        pool.query(
          `SELECT COUNT(*)::int AS total FROM servidores s
           JOIN secretarias sec ON s.secretaria_id = sec.id
           WHERE sec.municipio_id = $1 AND s.deletado_em IS NULL`,
          [municipioId],
        ),
        pool.query(
          `SELECT tipo, COUNT(*)::int AS total, SUM(CASE WHEN aceito THEN 1 ELSE 0 END)::int AS aceitos
           FROM consentimentos_lgpd cl
           JOIN servidores s ON cl.servidor_id = s.id
           JOIN secretarias sec ON s.secretaria_id = sec.id
           WHERE sec.municipio_id = $1
           GROUP BY tipo`,
          [municipioId],
        ),
        pool.query(
          `SELECT status, COUNT(*)::int AS total FROM solicitacoes_lgpd sl
           JOIN servidores s ON sl.servidor_id = s.id
           JOIN secretarias sec ON s.secretaria_id = sec.id
           WHERE sec.municipio_id = $1
           GROUP BY status`,
          [municipioId],
        ),
      ]);

      const ripd = {
        titulo: "Relatório de Impacto à Proteção de Dados Pessoais (RIPD)",
        base_legal: "Lei nº 13.709/2018 (LGPD) — Art. 38",
        gerado_em: new Date().toISOString(),
        controlador: {
          sistema: "LicitaNest — Plataforma de Gestão de Pesquisa de Preços",
          finalidade: "Apoiar municípios na realização de pesquisa de preços para licitações públicas conforme IN 65/2021",
        },
        dados_pessoais_tratados: [
          { tipo: "Nome completo", base_legal: "Execução de contrato (Art. 7, V)", finalidade: "Identificação do servidor público", compartilhamento: "Não" },
          { tipo: "CPF", base_legal: "Obrigação legal (Art. 7, II)", finalidade: "Validação via Gov.br e identificação única", compartilhamento: "Gov.br (autenticação)" },
          { tipo: "E-mail", base_legal: "Execução de contrato (Art. 7, V)", finalidade: "Comunicação e notificações do sistema", compartilhamento: "Resend (envio de e-mails)" },
          { tipo: "Endereço IP", base_legal: "Legítimo interesse (Art. 7, IX)", finalidade: "Auditoria e segurança", compartilhamento: "Não" },
          { tipo: "Dados de navegação (User-Agent)", base_legal: "Legítimo interesse (Art. 7, IX)", finalidade: "Auditoria de segurança", compartilhamento: "Não" },
        ],
        medidas_tecnicas: [
          "Criptografia em trânsito (TLS 1.3)",
          "Criptografia em repouso (Google Cloud Storage, Cloud SQL)",
          "Row-Level Security (RLS) para isolamento multi-tenant",
          "Auditoria imutável com hash chain (SHA-256)",
          "Autenticação via Firebase Auth + Gov.br (nível prata/ouro)",
          "TOTP (2FA) com recovery codes",
          "Rate limiting em todas as rotas",
          "Helmet (headers de segurança)",
          "Validação de CPF/CNPJ",
        ],
        medidas_organizacionais: [
          "Política de retenção de dados com purge automático",
          "Canal LGPD para exercício de direitos do titular",
          "Aceite obrigatório de termos de uso e política de privacidade",
          "Registro de consentimentos com versionamento",
        ],
        retencao: {
          audit_logs: "5 anos (mínimo legal)",
          cestas_concluidas: "5 anos",
          usuarios_inativos: "2 anos após inativação",
          interacoes_ia: "1 ano",
          tokens_expirados: "30 dias",
        },
        compartilhamento_terceiros: [
          { terceiro: "Google Cloud Platform", dados: "Todos (infraestrutura)", pais: "EUA/Brasil", garantias: "Cláusulas contratuais padrão" },
          { terceiro: "Firebase Auth", dados: "E-mail, UID", pais: "EUA", garantias: "Termos Google Cloud" },
          { terceiro: "Gov.br (SSO)", dados: "CPF, Nome", pais: "Brasil", garantias: "Governo Federal" },
          { terceiro: "Asaas", dados: "Dados de faturamento", pais: "Brasil", garantias: "PCI DSS" },
          { terceiro: "Resend", dados: "E-mail", pais: "EUA", garantias: "Termos de serviço" },
        ],
        estatisticas: {
          total_usuarios: usuarios.rows[0]?.total ?? 0,
          total_servidores_municipio: servidores.rows[0]?.total ?? 0,
          consentimentos: consentimentos.rows,
          solicitacoes: solicitacoes.rows,
        },
      };

      reply.send({ data: ripd });
    } catch (e) { tratarErro(e, reply); }
  });
}
