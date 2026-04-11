// ═══════════════════════════════════════════════════════════════════════════════
// Push Notifications — Envio server-side via Firebase Admin SDK (Fase 13.4)
// ═══════════════════════════════════════════════════════════════════════════════
import admin from "firebase-admin";
import { getPool } from "../config/database.js";
import { inicializarFirebase } from "../config/firebase.js";

// ── Tipos ────────────────────────────────────────────────────────────────────

interface NotificacaoPush {
  titulo: string;
  corpo: string;
  dados?: Record<string, string>;
  icone?: string;
  url?: string;
}

type EventoNotificacao =
  | "cotacao_respondida"
  | "cesta_aprovada"
  | "alerta_preco"
  | "cesta_rejeitada"
  | "cotacao_encerrada";

// ── Enviar para um usuário ───────────────────────────────────────────────────

export async function enviarPushParaUsuario(
  userId: string,
  notificacao: NotificacaoPush,
): Promise<{ enviados: number; falhas: number }> {
  const { rows } = await getPool().query(
    `SELECT token_fcm FROM dispositivos_fcm WHERE user_id = $1 AND ativo = TRUE`,
    [userId],
  );

  if (rows.length === 0) return { enviados: 0, falhas: 0 };

  const tokens = rows.map((r) => r.token_fcm as string);
  return enviarPushParaTokens(tokens, notificacao);
}

// ── Enviar para múltiplos usuários de um município ───────────────────────────

export async function enviarPushParaMunicipio(
  municipioId: string,
  notificacao: NotificacaoPush,
  perfilNome?: string,
): Promise<{ enviados: number; falhas: number }> {
  let query = `
    SELECT d.token_fcm
    FROM dispositivos_fcm d
    JOIN usuarios u ON u.id = d.user_id
    JOIN servidores s ON s.user_id = u.id AND s.deletado_em IS NULL
    WHERE d.municipio_id = $1 AND d.ativo = TRUE
  `;
  const params: unknown[] = [municipioId];

  if (perfilNome) {
    query += ` AND EXISTS (
      SELECT 1 FROM perfis p WHERE p.id = s.perfil_id AND p.nome = $2
    )`;
    params.push(perfilNome);
  }

  const { rows } = await getPool().query(query, params);
  if (rows.length === 0) return { enviados: 0, falhas: 0 };

  const tokens = rows.map((r) => r.token_fcm as string);
  return enviarPushParaTokens(tokens, notificacao);
}

// ── Enviar para tokens FCM (batch) ──────────────────────────────────────────

async function enviarPushParaTokens(
  tokens: string[],
  notificacao: NotificacaoPush,
): Promise<{ enviados: number; falhas: number }> {
  if (tokens.length === 0) return { enviados: 0, falhas: 0 };

  inicializarFirebase();
  const messaging = admin.messaging();

  const message: admin.messaging.MulticastMessage = {
    tokens,
    notification: {
      title: notificacao.titulo,
      body: notificacao.corpo,
    },
    data: {
      ...notificacao.dados,
      url: notificacao.url ?? "/",
      tag: `licitanest-${Date.now()}`,
    },
    webpush: {
      notification: {
        icon: notificacao.icone ?? "/icons/icon-192x192.png",
        badge: "/icons/icon-72x72.png",
      },
      fcmOptions: {
        link: notificacao.url ?? "/",
      },
    },
  };

  const response = await messaging.sendEachForMulticast(message);

  // Desativar tokens inválidos
  const tokensInvalidos: string[] = [];
  response.responses.forEach((resp, idx) => {
    if (!resp.success && resp.error) {
      const code = resp.error.code;
      if (
        code === "messaging/invalid-registration-token" ||
        code === "messaging/registration-token-not-registered"
      ) {
        tokensInvalidos.push(tokens[idx]);
      }
    }
  });

  if (tokensInvalidos.length > 0) {
    await getPool().query(
      `UPDATE dispositivos_fcm SET ativo = FALSE WHERE token_fcm = ANY($1)`,
      [tokensInvalidos],
    );
  }

  return {
    enviados: response.successCount,
    falhas: response.failureCount,
  };
}

// ── Helpers de notificação por evento ────────────────────────────────────────

export async function notificarCotacaoRespondida(
  municipioId: string,
  cotacaoTitulo: string,
  fornecedorNome: string,
  cotacaoId: string,
): Promise<void> {
  await enviarPushParaMunicipio(municipioId, {
    titulo: "Cotação respondida",
    corpo: `${fornecedorNome} respondeu à cotação "${cotacaoTitulo}"`,
    dados: { tipo: "cotacao_respondida", cotacao_id: cotacaoId },
    url: `/cotacoes/${cotacaoId}`,
  }, "gestor");
}

export async function notificarCestaAprovada(
  municipioId: string,
  cestaDescricao: string,
  cestaId: string,
): Promise<void> {
  await enviarPushParaMunicipio(municipioId, {
    titulo: "Cesta aprovada",
    corpo: `A cesta "${cestaDescricao}" foi aprovada`,
    dados: { tipo: "cesta_aprovada", cesta_id: cestaId },
    url: `/cestas/${cestaId}`,
  });
}

export async function notificarAlertaPreco(
  userId: string,
  produtoDescricao: string,
  variacao: string,
  produtoId: string,
): Promise<void> {
  await enviarPushParaUsuario(userId, {
    titulo: "Alerta de preço",
    corpo: `${produtoDescricao}: variação de ${variacao}`,
    dados: { tipo: "alerta_preco", produto_id: produtoId },
    url: `/catalogo/${produtoId}`,
  });
}
