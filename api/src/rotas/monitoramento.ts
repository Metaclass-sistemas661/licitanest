import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { exigirSuperAdmin } from "../middleware/superadmin.js";
import { registrarErro } from "../middleware/error-tracker.js";
import { tratarErro } from "../utils/erros.js";

export async function rotasMonitoramento(app: FastifyInstance): Promise<void> {
  // ── Erros ──────────────────────────────────────────────────

  // GET /api/superadmin/monitoramento/erros — listar erros com filtros
  app.get("/api/superadmin/monitoramento/erros", {
    preHandler: [verificarAuth, exigirSuperAdmin],
  }, async (request, reply) => {
    try {
      const query = request.query as Record<string, string>;
      const page = Math.max(1, parseInt(query.page || "1"));
      const limit = Math.min(100, Math.max(1, parseInt(query.limit || "50")));
      const offset = (page - 1) * limit;

      const conditions: string[] = [];
      const params: unknown[] = [];
      let paramIdx = 1;

      if (query.origem) {
        conditions.push(`origem = $${paramIdx++}`);
        params.push(query.origem);
      }
      if (query.severidade) {
        conditions.push(`severidade = $${paramIdx++}`);
        params.push(query.severidade);
      }
      if (query.resolvido !== undefined) {
        conditions.push(`resolvido = $${paramIdx++}`);
        params.push(query.resolvido === "true");
      }
      if (query.busca) {
        conditions.push(`(mensagem ILIKE $${paramIdx} OR arquivo ILIKE $${paramIdx})`);
        params.push(`%${query.busca}%`);
        paramIdx++;
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const [{ rows }, countResult] = await Promise.all([
        getPool().query(
          `SELECT * FROM superadmin.erros_sistema ${where}
           ORDER BY ultima_ocorrencia DESC
           LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
          [...params, limit, offset],
        ),
        getPool().query(
          `SELECT COUNT(*) as total FROM superadmin.erros_sistema ${where}`,
          params,
        ),
      ]);

      reply.send({
        data: rows,
        pagination: {
          page,
          limit,
          total: parseInt(countResult.rows[0].total),
        },
      });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // GET /api/superadmin/monitoramento/erros/resumo — contagem agrupada
  app.get("/api/superadmin/monitoramento/erros/resumo", {
    preHandler: [verificarAuth, exigirSuperAdmin],
  }, async (_request, reply) => {
    try {
      const totalResult = await getPool().query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE resolvido = false) as nao_resolvidos,
          COUNT(*) FILTER (WHERE severidade = 'critical' AND resolvido = false) as criticos,
          COUNT(*) FILTER (WHERE created_at > now() - INTERVAL '24 hours') as ultimas_24h
        FROM superadmin.erros_sistema
      `);

      const origemResult = await getPool().query(`
        SELECT origem, COUNT(*) as count
        FROM superadmin.erros_sistema
        GROUP BY origem
      `);

      const porOrigem: Record<string, number> = {};
      for (const row of origemResult.rows) {
        porOrigem[row.origem] = parseInt(row.count);
      }

      const r = totalResult.rows[0];
      reply.send({
        data: {
          total: parseInt(r.total),
          nao_resolvidos: parseInt(r.nao_resolvidos),
          criticos: parseInt(r.criticos),
          ultimas_24h: parseInt(r.ultimas_24h),
          por_origem: porOrigem,
        },
      });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // GET /api/superadmin/monitoramento/erros/:id — detalhes de um erro
  app.get("/api/superadmin/monitoramento/erros/:id", {
    preHandler: [verificarAuth, exigirSuperAdmin],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { rows } = await getPool().query(
        `SELECT * FROM superadmin.erros_sistema WHERE id = $1`,
        [id],
      );
      if (!rows[0]) {
        reply.status(404).send({ error: "Erro não encontrado" });
        return;
      }
      reply.send({ data: rows[0] });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // PATCH /api/superadmin/monitoramento/erros/:id/resolver — marcar como resolvido
  app.patch("/api/superadmin/monitoramento/erros/:id/resolver", {
    preHandler: [verificarAuth, exigirSuperAdmin],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as { notas_resolucao?: string } | undefined;
      const servidorId = request.usuario?.servidor?.id;

      const { rowCount } = await getPool().query(
        `UPDATE superadmin.erros_sistema
         SET resolvido = true, resolvido_por = $2, resolvido_em = now(),
             notas_resolucao = $3
         WHERE id = $1`,
        [id, servidorId, body?.notas_resolucao ?? null],
      );

      if (!rowCount) {
        reply.status(404).send({ error: "Erro não encontrado" });
        return;
      }
      reply.send({ data: { resolvido: true } });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // ── Health Check ───────────────────────────────────────────

  // GET /api/superadmin/monitoramento/saude — verificação em tempo real
  app.get("/api/superadmin/monitoramento/saude", {
    preHandler: [verificarAuth, exigirSuperAdmin],
  }, async (_request, reply) => {
    try {
      const servicos: Array<{ servico: string; status: string; latencia_ms: number; detalhes?: Record<string, unknown> }> = [];

      // 1. PostgreSQL
      const pg0 = Date.now();
      try {
        await getPool().query("SELECT 1");
        servicos.push({ servico: "postgresql", status: "healthy", latencia_ms: Date.now() - pg0 });
      } catch (err) {
        servicos.push({ servico: "postgresql", status: "down", latencia_ms: Date.now() - pg0, detalhes: { error: String(err) } });
      }

      // 2. Redis
      const redis0 = Date.now();
      try {
        const { getRedis } = await import("../config/cache.js");
        const redis = getRedis();
        if (redis) {
          await redis.ping();
          servicos.push({ servico: "redis", status: "healthy", latencia_ms: Date.now() - redis0 });
        } else {
          servicos.push({ servico: "redis", status: "degraded", latencia_ms: 0, detalhes: { reason: "Cliente não inicializado" } });
        }
      } catch (err) {
        servicos.push({ servico: "redis", status: "down", latencia_ms: Date.now() - redis0, detalhes: { error: String(err) } });
      }

      // 3. Firebase Auth
      const fb0 = Date.now();
      try {
        const { getAuth } = await import("../config/firebase.js");
        getAuth();
        servicos.push({ servico: "firebase_auth", status: "healthy", latencia_ms: Date.now() - fb0 });
      } catch (err) {
        servicos.push({ servico: "firebase_auth", status: "down", latencia_ms: Date.now() - fb0, detalhes: { error: String(err) } });
      }

      // 4. Pool stats
      const pool = getPool();
      servicos.push({
        servico: "db_pool",
        status: pool.totalCount > 0 ? "healthy" : "degraded",
        latencia_ms: 0,
        detalhes: {
          total: pool.totalCount,
          idle: pool.idleCount,
          waiting: pool.waitingCount,
        },
      });

      // Persistir último health check
      for (const s of servicos) {
        await getPool().query(
          `INSERT INTO superadmin.health_checks (servico, status, latencia_ms, detalhes)
           VALUES ($1, $2, $3, $4)`,
          [s.servico, s.status, s.latencia_ms, JSON.stringify(s.detalhes ?? {})],
        ).catch(() => { /* best-effort */ });
      }

      const statusGeral = servicos.some(s => s.status === "down")
        ? "down"
        : servicos.some(s => s.status === "degraded")
          ? "degraded"
          : "healthy";

      reply.send({
        data: {
          servicos,
          status_geral: statusGeral,
          ultima_verificacao: new Date().toISOString(),
        },
      });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // GET /api/superadmin/monitoramento/saude/historico — últimos health checks
  app.get("/api/superadmin/monitoramento/saude/historico", {
    preHandler: [verificarAuth, exigirSuperAdmin],
  }, async (request, reply) => {
    try {
      const query = request.query as Record<string, string>;
      const limit = Math.min(500, parseInt(query.limit || "100"));

      const { rows } = await getPool().query(
        `SELECT * FROM superadmin.health_checks
         ORDER BY verificado_em DESC LIMIT $1`,
        [limit],
      );
      reply.send({ data: rows });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // ── Métricas ───────────────────────────────────────────────

  // GET /api/superadmin/monitoramento/metricas — métricas de performance
  app.get("/api/superadmin/monitoramento/metricas", {
    preHandler: [verificarAuth, exigirSuperAdmin],
  }, async (request, reply) => {
    try {
      const query = request.query as Record<string, string>;
      const horas = Math.min(720, parseInt(query.horas || "24"));

      const { rows } = await getPool().query(
        `SELECT tipo, timestamp, valor, unidade, labels
         FROM superadmin.metricas_sistema
         WHERE timestamp > now() - ($1 || ' hours')::INTERVAL
         ORDER BY timestamp DESC`,
        [horas],
      );
      reply.send({ data: rows });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // POST /api/superadmin/monitoramento/metricas — registrar métrica
  app.post("/api/superadmin/monitoramento/metricas", {
    preHandler: [verificarAuth, exigirSuperAdmin],
  }, async (request, reply) => {
    try {
      const body = request.body as { tipo: string; valor: number; unidade?: string; labels?: Record<string, unknown> };
      await getPool().query(
        `INSERT INTO superadmin.metricas_sistema (tipo, valor, unidade, labels)
         VALUES ($1, $2, $3, $4)`,
        [body.tipo, body.valor, body.unidade ?? null, JSON.stringify(body.labels ?? {})],
      );
      reply.status(201).send({ data: { ok: true } });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // ── Testes ─────────────────────────────────────────────────

  // GET /api/superadmin/monitoramento/testes — últimos resultados
  app.get("/api/superadmin/monitoramento/testes", {
    preHandler: [verificarAuth, exigirSuperAdmin],
  }, async (request, reply) => {
    try {
      const query = request.query as Record<string, string>;
      const limit = Math.min(500, parseInt(query.limit || "100"));
      const suite = query.suite;

      const conditions: string[] = [];
      const params: unknown[] = [];
      let paramIdx = 1;

      if (suite) {
        conditions.push(`suite = $${paramIdx++}`);
        params.push(suite);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const { rows } = await getPool().query(
        `SELECT * FROM superadmin.resultados_testes ${where}
         ORDER BY executado_em DESC LIMIT $${paramIdx}`,
        [...params, limit],
      );
      reply.send({ data: rows });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // POST /api/superadmin/monitoramento/testes/executar — executar suite específica
  app.post("/api/superadmin/monitoramento/testes/executar", {
    preHandler: [verificarAuth, exigirSuperAdmin],
  }, async (request, reply) => {
    try {
      const body = request.body as { suite: string };
      const servidorId = request.usuario?.servidor?.id;

      // Executar testes de integridade conforme a suite
      const resultados = await executarSuiteTestes(body.suite);

      // Persistir resultados
      for (const r of resultados) {
        await getPool().query(
          `INSERT INTO superadmin.resultados_testes
           (suite, teste, status, duracao_ms, mensagem_erro, stack_trace, executado_por, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [body.suite, r.teste, r.status, r.duracao_ms, r.mensagem_erro, r.stack_trace, servidorId, JSON.stringify(r.metadata ?? {})],
        );
      }

      reply.send({ data: resultados });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // ── Alertas ────────────────────────────────────────────────

  // GET /api/superadmin/monitoramento/alertas — listar alertas
  app.get("/api/superadmin/monitoramento/alertas", {
    preHandler: [verificarAuth, exigirSuperAdmin],
  }, async (request, reply) => {
    try {
      const query = request.query as Record<string, string>;
      const limit = Math.min(100, parseInt(query.limit || "50"));
      const apenasNaoLidos = query.nao_lidos === "true";

      const where = apenasNaoLidos ? "WHERE lido = false" : "";
      const { rows } = await getPool().query(
        `SELECT * FROM superadmin.alertas ${where}
         ORDER BY created_at DESC LIMIT $1`,
        [limit],
      );
      reply.send({ data: rows });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // PATCH /api/superadmin/monitoramento/alertas/:id/ler — marcar como lido
  app.patch("/api/superadmin/monitoramento/alertas/:id/ler", {
    preHandler: [verificarAuth, exigirSuperAdmin],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      await getPool().query(
        `UPDATE superadmin.alertas SET lido = true, lido_em = now() WHERE id = $1`,
        [id],
      );
      reply.send({ data: { lido: true } });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // ── Ingestão de erros do frontend (público, sem SuperAdmin check) ──

  // POST /api/log-erro — endpoint leve para sendBeacon do frontend
  app.post("/api/log-erro", async (request, reply) => {
    try {
      const body = request.body as ErroPayload | undefined;
      if (!body?.mensagem) {
        reply.status(400).send({ error: "mensagem é obrigatória" });
        return;
      }
      await registrarErro(
        { ...body, origem: body.origem || "frontend" },
        request,
      );
      reply.status(201).send({ ok: true });
    } catch {
      reply.status(500).send({ error: "Falha ao registrar erro" });
    }
  });
}

// ── Suites de teste embutidas ────────────────────────────────

interface ResultadoTesteInterno {
  teste: string;
  status: "pass" | "fail" | "error";
  duracao_ms: number;
  mensagem_erro: string | null;
  stack_trace: string | null;
  metadata?: Record<string, unknown>;
}

async function executarSuiteTestes(suite: string): Promise<ResultadoTesteInterno[]> {
  const resultados: ResultadoTesteInterno[] = [];

  switch (suite) {
    case "database": {
      // Testa conexão e integridade básica do banco
      await executarTeste(resultados, "postgres_ping", async () => {
        await getPool().query("SELECT 1");
      });
      await executarTeste(resultados, "schemas_exist", async () => {
        const { rows } = await getPool().query(
          `SELECT schema_name FROM information_schema.schemata
           WHERE schema_name IN ('public', 'superadmin')`,
        );
        if (rows.length < 2) throw new Error(`Esperado 2 schemas, encontrado ${rows.length}`);
      });
      await executarTeste(resultados, "tabelas_monitoramento", async () => {
        const tabelas = ["erros_sistema", "metricas_sistema", "health_checks", "resultados_testes"];
        for (const t of tabelas) {
          const { rows } = await getPool().query(
            `SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'superadmin' AND table_name = $1`,
            [t],
          );
          if (rows.length === 0) throw new Error(`Tabela superadmin.${t} não encontrada`);
        }
      });
      break;
    }
    case "api": {
      // Testa health check e endpoints básicos
      await executarTeste(resultados, "health_endpoint", async () => {
        const { rows } = await getPool().query("SELECT 1");
        if (!rows.length) throw new Error("Pool query falhou");
      });
      await executarTeste(resultados, "rls_config", async () => {
        const { rows } = await getPool().query(
          `SELECT current_setting('app.current_municipio_id', true) as mid`,
        );
        if (rows[0].mid === null) throw new Error("RLS config não disponível");
      });
      break;
    }
    case "integridade": {
      // Verifica integridade de dados
      await executarTeste(resultados, "servidores_orphan_check", async () => {
        const { rows } = await getPool().query(
          `SELECT COUNT(*) as c FROM servidores
           WHERE perfil_id NOT IN (SELECT id FROM perfis) AND deletado_em IS NULL`,
        );
        if (parseInt(rows[0].c) > 0) throw new Error(`${rows[0].c} servidores com perfil_id órfão`);
      });
      await executarTeste(resultados, "municipios_ativos", async () => {
        const { rows } = await getPool().query(
          `SELECT COUNT(*) as c FROM municipios WHERE ativo = true AND deletado_em IS NULL`,
        );
        if (parseInt(rows[0].c) === 0) throw new Error("Nenhum município ativo encontrado");
      });
      break;
    }
    default:
      resultados.push({
        teste: "suite_desconhecida",
        status: "error",
        duracao_ms: 0,
        mensagem_erro: `Suite '${suite}' não reconhecida. Use: database, api, integridade`,
        stack_trace: null,
      });
  }

  return resultados;
}

async function executarTeste(
  resultados: ResultadoTesteInterno[],
  nomeTeste: string,
  fn: () => Promise<void>,
): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    resultados.push({
      teste: nomeTeste,
      status: "pass",
      duracao_ms: Date.now() - start,
      mensagem_erro: null,
      stack_trace: null,
    });
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err));
    resultados.push({
      teste: nomeTeste,
      status: "fail",
      duracao_ms: Date.now() - start,
      mensagem_erro: e.message,
      stack_trace: e.stack ?? null,
    });
  }
}

interface ErroPayload {
  origem?: string;
  severidade?: string;
  mensagem: string;
  stack_trace?: string;
  arquivo?: string;
  linha?: number;
  coluna?: number;
  funcao?: string;
  modulo?: string;
  url_requisicao?: string;
  metodo_http?: string;
  status_http?: number;
  user_agent?: string;
  browser?: string;
  os?: string;
  metadata?: Record<string, unknown>;
}
