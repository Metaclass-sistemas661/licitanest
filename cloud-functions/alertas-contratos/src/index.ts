import * as ff from "@google-cloud/functions-framework";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { Pool } from "pg";
import * as admin from "firebase-admin";

const PROJECT_ID = process.env.GCP_PROJECT || "sistema-de-gestao-16e15";
const secretClient = new SecretManagerServiceClient();

let pool: Pool | null = null;

async function getSecret(nome: string): Promise<string> {
  const [version] = await secretClient.accessSecretVersion({
    name: `projects/${PROJECT_ID}/secrets/${nome}/versions/latest`,
  });
  return version.payload?.data?.toString() ?? "";
}

async function getPool(): Promise<Pool> {
  if (pool) return pool;
  const dbPassword = await getSecret("DB_PASSWORD");
  pool = new Pool({
    host: process.env.DB_HOST || `/cloudsql/${PROJECT_ID}:southamerica-east1:licitanest-db`,
    database: process.env.DB_NAME || "licitanest",
    user: process.env.DB_USER || "postgres",
    password: dbPassword,
    max: 3,
    idleTimeoutMillis: 10000,
  });
  return pool;
}

function initFirebase() {
  if (admin.apps.length === 0) {
    admin.initializeApp({ projectId: PROJECT_ID });
  }
}

// ── Enviar push para admins de um município ─────────────────────
async function enviarPush(
  db: Pool,
  municipioId: string,
  titulo: string,
  corpo: string,
  dados: Record<string, string>,
) {
  const { rows } = await db.query(
    `SELECT d.token_fcm
     FROM dispositivos_fcm d
     JOIN usuarios u ON u.id = d.user_id
     JOIN servidores s ON s.user_id = u.id AND s.deletado_em IS NULL
     JOIN perfis p ON p.id = s.perfil_id AND p.nome = 'admin'
     WHERE d.municipio_id = $1 AND d.ativo = TRUE`,
    [municipioId],
  );

  if (rows.length === 0) return;

  const tokens = rows.map((r: { token_fcm: string }) => r.token_fcm);
  const messaging = admin.messaging();

  try {
    await messaging.sendEachForMulticast({
      tokens,
      notification: { title: titulo, body: corpo },
      data: dados,
      webpush: {
        notification: {
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-72x72.png",
        },
      },
    });
  } catch (e) {
    console.warn("Falha ao enviar push para município", municipioId, e);
  }
}

// ── Cloud Function principal ────────────────────────────────────
ff.http("alertasContratos", async (_req, res) => {
  try {
    const db = await getPool();
    initFirebase();

    let notificacoesCriadas = 0;
    let contratosEncerrados = 0;
    let faturasVencidas = 0;

    // ─────────────────────────────────────────────────────────
    // 1) Contratos vencendo em 90 dias — notificação normal
    // ─────────────────────────────────────────────────────────
    const { rows: venc90 } = await db.query(`
      SELECT c.id, c.numero_contrato, c.municipio_id, c.data_fim,
             m.nome AS municipio_nome
      FROM contratos c
      JOIN municipios m ON m.id = c.municipio_id
      WHERE c.status = 'ativo'
        AND c.deletado_em IS NULL
        AND c.data_fim BETWEEN CURRENT_DATE + INTERVAL '60 days' AND CURRENT_DATE + INTERVAL '90 days'
        AND NOT EXISTS (
          SELECT 1 FROM contratos_notificacoes cn
          WHERE cn.contrato_id = c.id AND cn.tipo = 'vencimento_90d'
          AND cn.criado_em > CURRENT_DATE - INTERVAL '30 days'
        )
    `);

    for (const c of venc90) {
      const dataFim = new Date(c.data_fim).toLocaleDateString("pt-BR");

      // Buscar admins do município
      const { rows: admins } = await db.query(
        `SELECT s.id FROM servidores s
         JOIN perfis p ON p.id = s.perfil_id AND p.nome = 'admin'
         WHERE s.municipio_id = $1 AND s.deletado_em IS NULL`,
        [c.municipio_id],
      );

      for (const admin of admins) {
        await db.query(
          `INSERT INTO contratos_notificacoes (contrato_id, municipio_id, servidor_id, tipo, titulo, mensagem)
           VALUES ($1, $2, $3, 'vencimento_90d', $4, $5)`,
          [
            c.id, c.municipio_id, admin.id,
            `Contrato ${c.numero_contrato} vence em breve`,
            `O contrato ${c.numero_contrato} vence em ${dataFim}. Considere iniciar o processo de renovação.`,
          ],
        );
        notificacoesCriadas++;
      }

      await enviarPush(db, c.municipio_id,
        `Contrato vencendo em 90 dias`,
        `${c.numero_contrato} vence em ${dataFim}`,
        { tipo: "vencimento_90d", contrato_id: c.id },
      );
    }

    // ─────────────────────────────────────────────────────────
    // 2) Contratos vencendo em 30 dias — notificação urgente
    // ─────────────────────────────────────────────────────────
    const { rows: venc30 } = await db.query(`
      SELECT c.id, c.numero_contrato, c.municipio_id, c.data_fim,
             m.nome AS municipio_nome
      FROM contratos c
      JOIN municipios m ON m.id = c.municipio_id
      WHERE c.status = 'ativo'
        AND c.deletado_em IS NULL
        AND c.data_fim BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
        AND NOT EXISTS (
          SELECT 1 FROM contratos_notificacoes cn
          WHERE cn.contrato_id = c.id AND cn.tipo = 'vencimento_30d'
          AND cn.criado_em > CURRENT_DATE - INTERVAL '7 days'
        )
    `);

    for (const c of venc30) {
      const dataFim = new Date(c.data_fim).toLocaleDateString("pt-BR");
      const diasRestantes = Math.ceil((new Date(c.data_fim).getTime() - Date.now()) / 86400000);

      const { rows: admins } = await db.query(
        `SELECT s.id FROM servidores s
         JOIN perfis p ON p.id = s.perfil_id AND p.nome = 'admin'
         WHERE s.municipio_id = $1 AND s.deletado_em IS NULL`,
        [c.municipio_id],
      );

      for (const admin of admins) {
        await db.query(
          `INSERT INTO contratos_notificacoes (contrato_id, municipio_id, servidor_id, tipo, titulo, mensagem)
           VALUES ($1, $2, $3, 'vencimento_30d', $4, $5)`,
          [
            c.id, c.municipio_id, admin.id,
            `⚠️ URGENTE: Contrato ${c.numero_contrato} vence em ${diasRestantes} dia(s)`,
            `O contrato ${c.numero_contrato} vence em ${dataFim}. Tome providências imediatas para renovação ou encerramento.`,
          ],
        );
        notificacoesCriadas++;
      }

      await enviarPush(db, c.municipio_id,
        `⚠️ Contrato vence em ${diasRestantes} dias`,
        `${c.numero_contrato} vence em ${dataFim}`,
        { tipo: "vencimento_30d", contrato_id: c.id },
      );
    }

    // ─────────────────────────────────────────────────────────
    // 3) Contratos expirados → encerrar automaticamente
    // ─────────────────────────────────────────────────────────
    const { rowCount } = await db.query(`
      UPDATE contratos
      SET status = 'encerrado', atualizado_em = NOW()
      WHERE status = 'ativo'
        AND deletado_em IS NULL
        AND data_fim < CURRENT_DATE
    `);
    contratosEncerrados = rowCount ?? 0;

    // Registrar histórico para contratos encerrados
    if (contratosEncerrados > 0) {
      await db.query(`
        INSERT INTO contratos_historico (contrato_id, acao, valor_novo, usuario_id)
        SELECT id, 'encerrado_automaticamente', 'data_fim ultrapassada', criado_por
        FROM contratos
        WHERE status = 'encerrado'
          AND deletado_em IS NULL
          AND data_fim < CURRENT_DATE
          AND atualizado_em >= CURRENT_DATE
      `);
    }

    // ─────────────────────────────────────────────────────────
    // 4) Faturas vencidas — marcar como vencidas
    // ─────────────────────────────────────────────────────────
    const { rowCount: fatVencidas } = await db.query(`
      UPDATE faturas
      SET status = 'vencida', atualizado_em = NOW()
      WHERE status = 'pendente'
        AND vencimento < CURRENT_DATE
    `);
    faturasVencidas = fatVencidas ?? 0;

    const resumo = {
      timestamp: new Date().toISOString(),
      notificacoes_criadas: notificacoesCriadas,
      contratos_encerrados: contratosEncerrados,
      faturas_marcadas_vencidas: faturasVencidas,
      contratos_vencendo_90d: venc90.length,
      contratos_vencendo_30d: venc30.length,
    };

    console.log("[alertas-contratos]", JSON.stringify(resumo));
    res.status(200).json(resumo);
  } catch (err) {
    console.error("[alertas-contratos] ERRO:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});
