import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";

import { carregarSecrets } from "./config/secrets.js";
import { criarPool } from "./config/database.js";
import { inicializarFirebase } from "./config/firebase.js";

// Rotas
import { rotasServidores } from "./rotas/servidores.js";
import { rotasCestas } from "./rotas/cestas.js";
import { rotasItensCesta } from "./rotas/itens-cesta.js";
import { rotasCatalogo } from "./rotas/catalogo.js";
import { rotasCotacoes } from "./rotas/cotacoes.js";
import { rotasFornecedores } from "./rotas/fornecedores.js";
import { rotasBilling, rotasWebhookAsaas } from "./rotas/billing.js";
import { rotasDashboard } from "./rotas/dashboard.js";
import { rotasWorkflow } from "./rotas/workflow.js";
import { rotasLgpd } from "./rotas/lgpd.js";
import { rotasAuditoria } from "./rotas/auditoria.js";
import { rotasAlertas } from "./rotas/alertas.js";
import { rotasIndices } from "./rotas/indices.js";
import { rotasApiPublica } from "./rotas/api-publica.js";
import { rotasCatmat } from "./rotas/catmat.js";
import { rotasStorage } from "./rotas/storage.js";
import { rotasImportacao } from "./rotas/importacao.js";
import { rotasRelatorios, rotasHistorico } from "./rotas/relatorios.js";
import { rotasTenants } from "./rotas/tenants.js";
import { rotasNotificacoes, rotasEmail } from "./rotas/notificacoes.js";
import { rotasCidades, rotasSolicitacoesCatalogo, rotasAssinaturasEletronicas, rotasMetricasUso, rotasMapaCalor } from "./rotas/extras.js";
import { rotasIA } from "./rotas/ia.js";
import { rotasAuth } from "./rotas/auth.js";
import { rotasComparador } from "./rotas/comparador.js";
import { rotasExecucoesCrawler, rotasDadosFontePNCP, rotasDadosFontePainel, rotasDadosFonteTCE } from "./rotas/crawlers.js";
import { rotasDadosFonteBPS, rotasDadosFonteSINAPI, rotasDadosFonteCONAB, rotasDadosFonteCEASA, rotasDadosFonteCMED } from "./rotas/dados-fonte-fase6.js";
import { rotasRPC } from "./rotas/rpc.js";

async function main() {
  const app = Fastify({
    logger: true,
    trustProxy: true,
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

  // ── Inicializar ────────────────────────────
  const secrets = await carregarSecrets();
  criarPool(secrets.dbPassword ?? "");
  inicializarFirebase();

  // ── Health check ───────────────────────────
  app.get("/api/health", async () => ({ status: "ok", ts: new Date().toISOString() }));

  // ── Registrar rotas ────────────────────────
  await app.register(rotasAuth);
  await app.register(rotasWebhookAsaas);
  await app.register(rotasServidores);
  await app.register(rotasCestas);
  await app.register(rotasItensCesta);
  await app.register(rotasCatalogo);
  await app.register(rotasCotacoes);
  await app.register(rotasFornecedores);
  await app.register(rotasBilling);
  await app.register(rotasDashboard);
  await app.register(rotasWorkflow);
  await app.register(rotasLgpd);
  await app.register(rotasAuditoria);
  await app.register(rotasAlertas);
  await app.register(rotasIndices);
  await app.register(rotasApiPublica);
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
  await app.register(rotasRPC);

  // ── Iniciar servidor ───────────────────────
  const port = parseInt(process.env.PORT ?? "8080");
  await app.listen({ port, host: "0.0.0.0" });
  app.log.info(`API rodando na porta ${port}`);
}

main().catch((err) => {
  console.error("Erro fatal ao iniciar:", err);
  process.exit(1);
});
