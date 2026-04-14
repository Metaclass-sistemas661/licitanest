import Fastify from "fastify";
import crypto from "node:crypto";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

import { carregarSecrets } from "./config/secrets.js";
import { criarPool, getPool } from "./config/database.js";
import { inicializarFirebase } from "./config/firebase.js";
import { inicializarRedis } from "./config/cache.js";

// Rotas
import { rotasServidores } from "./rotas/servidores.js";
import { rotasCestas } from "./rotas/cestas.js";
import { rotasItensCesta } from "./rotas/itens-cesta.js";
import { rotasCatalogo } from "./rotas/catalogo.js";
import { rotasCotacoes, rotasPortalCotacao } from "./rotas/cotacoes.js";
import { rotasFornecedores } from "./rotas/fornecedores.js";

import { rotasDashboard } from "./rotas/dashboard.js";
import { rotasWorkflow } from "./rotas/workflow.js";
import { rotasLgpd } from "./rotas/lgpd.js";
import { rotasAuditoria } from "./rotas/auditoria.js";
import { rotasAlertas } from "./rotas/alertas.js";
import { rotasIndices } from "./rotas/indices.js";
import { rotasApiPublica, rotasDadosPublicos } from "./rotas/api-publica.js";
import { rotasCatmat } from "./rotas/catmat.js";
import { rotasStorage } from "./rotas/storage.js";
import { rotasImportacao } from "./rotas/importacao.js";
import { rotasRelatorios, rotasHistorico } from "./rotas/relatorios.js";
import { rotasTenants } from "./rotas/tenants.js";
import { rotasNotificacoes, rotasEmail } from "./rotas/notificacoes.js";
import { rotasCidades, rotasSolicitacoesCatalogo, rotasAssinaturasEletronicas, rotasMetricasUso, rotasMapaCalor } from "./rotas/extras.js";
import { rotasAssinaturasDigitais } from "./rotas/assinaturas-digitais.js";
import { rotasIA } from "./rotas/ia.js";
import { rotasAuth } from "./rotas/auth.js";
import { rotasComparador } from "./rotas/comparador.js";
import { exigirAceiteTermos } from "./middleware/termos.js";
import { rotasExecucoesCrawler, rotasDadosFontePNCP, rotasDadosFontePainel, rotasDadosFonteTCE } from "./rotas/crawlers.js";
import { rotasDadosFonteBPS, rotasDadosFonteSINAPI, rotasDadosFonteCONAB, rotasDadosFonteCEASA, rotasDadosFonteCMED } from "./rotas/dados-fonte-fase6.js";
import { rotasDadosFonteComprasNet, rotasDadosFonteCATMAT, rotasDadosFonteARP, rotasDadosFonteANP, rotasDadosFonteFNDE } from "./rotas/dados-fonte-fase7.js";
import { rotasDadosFonteBPSSaude, rotasDadosFonteSIGTAP, rotasDadosFonteCEASANacional, rotasDadosFonteFIPE, rotasDadosFonteSIASG, rotasDadosFonteTCU } from "./rotas/dados-fonte-fase7-p1.js";
import { rotasDadosFonteCUB, rotasDadosFonteBNDES, rotasDadosFonteSIASIH, rotasDadosFonteAgenciasReg, rotasDadosFonteINCRA } from "./rotas/dados-fonte-fase7-p2.js";
import { rotasContratos, rotasContratosPortal } from "./rotas/contratos.js";
import { rotasRPC } from "./rotas/rpc.js";
import { rotasMonitoramento } from "./rotas/monitoramento.js";
import { rotasDashboardSuperadmin } from "./rotas/dashboard-superadmin.js";
import { rotasFaturasSuperadmin } from "./rotas/faturas-superadmin.js";
import { rotasPrefeiturasSuperadmin } from "./rotas/prefeituras-superadmin.js";
import { rotasUsuariosSuperadmin } from "./rotas/usuarios-superadmin.js";
import { iniciarProcessamentoDLQ, obterEstatisticasDLQ } from "./utils/audit-dlq.js";
import { initSentryBackend, flushSentry, captureException } from "./config/sentry.js";
import { registrarErrorTrackerHook } from "./middleware/error-tracker.js";
import { registrarMetricsHook } from "./middleware/metrics-collector.js";
import { iniciarMotorAlertas } from "./middleware/alert-engine.js";

async function main() {
  // Sentry — inicializar ANTES de tudo
  initSentryBackend();

  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || "info",
      ...(process.env.NODE_ENV === "production"
        ? {
            // Cloud Logging (GCP) — JSON nativo com severity mapeada
            messageKey: "message",
            formatters: {
              level(label: string) {
                // Map Pino levels → GCP Cloud Logging severity
                const severityMap: Record<string, string> = {
                  trace: "DEBUG", debug: "DEBUG", info: "INFO",
                  warn: "WARNING", error: "ERROR", fatal: "CRITICAL",
                };
                return { severity: severityMap[label] || "DEFAULT" };
              },
            },
          }
        : {
            transport: { target: "pino-pretty", options: { colorize: true } },
          }),
    },
    trustProxy: true,
    // Correlation ID: usar header do cliente se presente, senão gerar
    requestIdHeader: "x-request-id",
    genReqId: (req) =>
      (req.headers["x-request-id"] as string) || crypto.randomUUID(),
  });

  // Propagar correlation ID no response header
  app.addHook("onSend", async (request, reply) => {
    reply.header("x-request-id", request.id);
  });

  // ── Segurança ──────────────────────────────
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN?.split(",") ?? ["http://localhost:5173"],
    credentials: true,
  });
  await app.register(rateLimit, {
    max: 200,
    timeWindow: "1 minute",
  });
  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  });

  // ── Swagger / OpenAPI ──────────────────────
  await app.register(swagger, {
    openapi: {
      info: {
        title: "LicitaNest API",
        description: "API REST do sistema LicitaNest — gestão de licitações, cotações, cestas de preços e pesquisa mercadológica para municípios.",
        version: "1.0.0",
        contact: { name: "Suporte LicitaNest", email: "suporte@licitanest.com.br" },
      },
      servers: [
        { url: "http://localhost:3000", description: "Desenvolvimento" },
      ],
      tags: [
        { name: "Auth", description: "Autenticação e autorização" },
        { name: "Catálogo", description: "Catálogo de materiais e serviços" },
        { name: "Cestas", description: "Cestas de preços" },
        { name: "Cotações", description: "Cotações eletrônicas" },
        { name: "Dashboard", description: "Métricas e indicadores" },
        { name: "Fontes de Preço", description: "Fontes e crawlers de preços" },
        { name: "Fornecedores", description: "Gestão de fornecedores" },
        { name: "Índices", description: "Índices econômicos (IPCA, IGPM, INPC)" },
        { name: "Relatórios", description: "Geração de relatórios" },
        { name: "Assinaturas", description: "Assinaturas eletrônicas e digitais ICP-Brasil" },
        { name: "Notificações", description: "Notificações e e-mails" },

        { name: "IA", description: "Classificações e análises por IA" },
        { name: "API Pública", description: "Endpoints públicos (API keys)" },
        { name: "Infraestrutura", description: "Health check, métricas, storage" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "Token JWT obtido via Firebase Auth",
          },
        },
      },
    },
  });

  const isDev = process.env.NODE_ENV !== "production";
  if (isDev) {
    await app.register(swaggerUi, {
      routePrefix: "/api/docs",
      uiConfig: {
        docExpansion: "list",
        deepLinking: true,
        filter: true,
      },
    });
  }

  // ── Inicializar ────────────────────────────
  const secrets = await carregarSecrets();
  await criarPool(secrets.dbPassword ?? "");
  inicializarFirebase();
  await inicializarRedis();

  // ── Health check ───────────────────────────
  app.get("/api/health", {
    schema: {
      tags: ["Infraestrutura"],
      summary: "Health check",
      description: "Verifica se a API está respondendo.",
      response: {
        200: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["ok"] },
            ts: { type: "string", format: "date-time" },
          },
        },
      },
    },
  }, async () => ({ status: "ok", ts: new Date().toISOString() }));

  // ── RLS: Resetar contexto de tenant no início de cada request ──
  // Previne vazamento de municipio_id entre requests no pool compartilhado
  app.addHook("onRequest", async () => {
    try {
      await getPool().query(`SELECT set_config('app.current_municipio_id', '', false)`);
    } catch {
      // Pool ainda não pronto ou conexão falhou — segue sem reset
    }
  });

  // ── Aceite obrigatório de termos (LGPD) ────
  app.addHook("preHandler", exigirAceiteTermos);

  // ── Registrar rotas ────────────────────────
  // Auth com rate limit especifico (5 req/min por IP)
  await app.register(async function authScope(scope) {
    await scope.register(rateLimit, {
      max: 5,
      timeWindow: "1 minute",
      keyGenerator: (req) => (req.headers["x-forwarded-for"] as string) ?? req.ip,
    });
    await scope.register(rotasAuth);
  });

  await app.register(rotasPortalCotacao);
  await app.register(rotasServidores);
  await app.register(rotasCestas);
  await app.register(rotasItensCesta);
  await app.register(rotasCatalogo);
  await app.register(rotasCotacoes);
  await app.register(rotasFornecedores);

  await app.register(rotasDashboard);
  await app.register(rotasWorkflow);
  await app.register(rotasLgpd);
  await app.register(rotasAuditoria);
  await app.register(rotasAlertas);
  await app.register(rotasIndices);
  await app.register(rotasApiPublica);
  await app.register(rotasDadosPublicos);
  await app.register(rotasCatmat);
  await app.register(rotasStorage);
  await app.register(rotasImportacao);
  await app.register(rotasRelatorios);
  await app.register(rotasHistorico);
  await app.register(rotasTenants);
  await app.register(rotasNotificacoes);
  await app.register(rotasEmail);
  await app.register(rotasCidades);
  await app.register(rotasSolicitacoesCatalogo);
  await app.register(rotasAssinaturasEletronicas);
  await app.register(rotasAssinaturasDigitais);
  await app.register(rotasMetricasUso);
  await app.register(rotasMapaCalor);
  await app.register(rotasIA);
  await app.register(rotasComparador);
  await app.register(rotasExecucoesCrawler);
  await app.register(rotasDadosFontePNCP);
  await app.register(rotasDadosFontePainel);
  await app.register(rotasDadosFonteTCE);
  await app.register(rotasDadosFonteBPS);
  await app.register(rotasDadosFonteSINAPI);
  await app.register(rotasDadosFonteCONAB);
  await app.register(rotasDadosFonteCEASA);
  await app.register(rotasDadosFonteCMED);
  await app.register(rotasDadosFonteComprasNet);
  await app.register(rotasDadosFonteCATMAT);
  await app.register(rotasDadosFonteARP);
  await app.register(rotasDadosFonteANP);
  await app.register(rotasDadosFonteFNDE);
  // Fase 7 — P1
  await app.register(rotasDadosFonteBPSSaude);
  await app.register(rotasDadosFonteSIGTAP);
  await app.register(rotasDadosFonteCEASANacional);
  await app.register(rotasDadosFonteFIPE);
  await app.register(rotasDadosFonteSIASG);
  await app.register(rotasDadosFonteTCU);
  // Fase 7 — P2+P3
  await app.register(rotasDadosFonteCUB);
  await app.register(rotasDadosFonteBNDES);
  await app.register(rotasDadosFonteSIASIH);
  await app.register(rotasDadosFonteAgenciasReg);
  await app.register(rotasDadosFonteINCRA);
  await app.register(rotasContratos);
  await app.register(rotasContratosPortal);
  await app.register(rotasMonitoramento);
  await app.register(rotasDashboardSuperadmin);
  await app.register(rotasFaturasSuperadmin);
  await app.register(rotasPrefeiturasSuperadmin);
  await app.register(rotasUsuariosSuperadmin);
  await app.register(rotasRPC);

  // ── Audit DLQ — processamento periódico (30s) ──
  iniciarProcessamentoDLQ(30_000);

  // ── Sentry error hook ──────────────────────
  app.addHook("onError", (_req, _reply, error, done) => {
    captureException(error);
    done();
  });

  // ── Error tracker — persistir erros no banco ──
  registrarErrorTrackerHook(app);

  // ── Metrics collector — latência, memória, pool ──
  registrarMetricsHook(app);

  // ── Motor de alertas — avalia regras a cada 5 min ──
  const alertTimer = iniciarMotorAlertas(300_000);
  app.addHook("onClose", async () => clearInterval(alertTimer));

  // ── DLQ Metrics (admin only) ──────────────
  app.get("/api/admin/metricas-dlq", {
    schema: {
      tags: ["Infraestrutura"],
      summary: "Estatísticas da DLQ de auditoria",
      security: [{ bearerAuth: [] }],
    },
  }, async (req, reply) => {
    // Rota apenas para admins — verificação inline
    if (!req.usuario?.servidor?.perfil_nome || req.usuario.servidor.perfil_nome !== "admin") {
      return (reply as any).status(403).send({ error: "Acesso negado" });
    }
    const stats = await obterEstatisticasDLQ();
    reply.send({ data: stats });
  });

  // ── Iniciar servidor ───────────────────────
  const port = parseInt(process.env.PORT ?? "8080");
  await app.listen({ port, host: "0.0.0.0" });
  app.log.info(`API rodando na porta ${port}`);

  // ── Graceful Shutdown ────────────────────────
  const shutdown = async (signal: string) => {
    app.log.info(`${signal} recebido — iniciando graceful shutdown`);
    // Parar de aceitar novas conexões e drenar as em-voo (30s timeout)
    const shutdownTimeout = setTimeout(() => {
      app.log.error("Graceful shutdown excedeu 30s — forçando exit");
      process.exit(1);
    }, 30_000);
    try {
      await app.close();
      await getPool().end();
      await flushSentry(2000);
      clearTimeout(shutdownTimeout);
      app.log.info("Shutdown completo");
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, "Erro durante shutdown");
      clearTimeout(shutdownTimeout);
      process.exit(1);
    }
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch(async (err) => {
  console.error("Erro fatal ao iniciar:", err);
  await flushSentry(2000);
  process.exit(1);
});
