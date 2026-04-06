import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";
import { getAuth } from "../config/firebase.js";
import { obterSecret } from "../config/secrets.js";
import { tratarErro, AppError } from "../utils/erros.js";

// ── Gov.br endpoints ────────────────────────────────────
const GOVBR_TOKEN_URL = "https://sso.acesso.gov.br/token";
const GOVBR_USERINFO_URL = "https://sso.acesso.gov.br/userinfo";

interface GovBrCallbackBody {
  code: string;
  code_verifier: string;
  redirect_uri: string;
}

interface GovBrTokenResponse {
  access_token: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
}

interface GovBrUserInfo {
  sub: string; // CPF
  name: string;
  email: string;
  email_verified: boolean;
  phone_number?: string;
  picture?: string;
}

function mapearConfiabilidade(niveis: Array<{ id: string; nivel: string }>): "bronze" | "prata" | "ouro" {
  if (niveis.some((c) => c.nivel === "3")) return "ouro";
  if (niveis.some((c) => c.nivel === "2")) return "prata";
  return "bronze";
}

/**
 * Rotas de autenticação — Gov.br callback e TOTP
 * Firebase Auth gerencia login/registro diretamente no frontend.
 * Estas rotas lidam com integrações servidor-side.
 */
export async function rotasAuth(app: FastifyInstance) {
  // POST /api/auth/govbr/callback
  app.post("/api/auth/govbr/callback", async (req, reply) => {
    try {
      const { code, code_verifier, redirect_uri } = req.body as GovBrCallbackBody;

      if (!code || !code_verifier || !redirect_uri) {
        throw new AppError("code, code_verifier e redirect_uri são obrigatórios", 400);
      }

      // 1. Obter credenciais do Secret Manager
      const clientId = await obterSecret("GOVBR_CLIENT_ID");
      const clientSecret = await obterSecret("GOVBR_CLIENT_SECRET");

      // 2. Trocar code por access_token via Gov.br
      const tokenBody = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri,
        code_verifier,
      });

      const tokenRes = await fetch(GOVBR_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        },
        body: tokenBody.toString(),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error("[Gov.br] Erro ao trocar code:", tokenRes.status, errText);
        throw new AppError("Falha na autenticação Gov.br — código expirado ou inválido", 401);
      }

      const tokenData = (await tokenRes.json()) as GovBrTokenResponse;

      // 3. Obter dados do usuário via /userinfo
      const userRes = await fetch(GOVBR_USERINFO_URL, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!userRes.ok) {
        throw new AppError("Falha ao obter dados do usuário Gov.br", 502);
      }

      const userData = (await userRes.json()) as GovBrUserInfo & {
        govbr_confiabilidades?: Array<{ id: string; nivel: string }>;
      };

      const cpf = userData.sub.replace(/\D/g, "");
      const nome = userData.name;
      const email = userData.email;
      const nivel = mapearConfiabilidade(userData.govbr_confiabilidades ?? []);

      // 4. Buscar ou criar usuário na tabela usuarios
      const pool = getPool();
      const { rows: existente } = await pool.query(
        `SELECT id, firebase_uid FROM usuarios WHERE cpf = $1 AND deletado_em IS NULL`,
        [cpf],
      );

      let firebaseUid: string;

      if (existente.length > 0 && existente[0].firebase_uid) {
        // Usuário já existe — atualizar dados
        firebaseUid = existente[0].firebase_uid;
        await pool.query(
          `UPDATE usuarios SET nome = $1, email = $2, nivel_govbr = $3, provedor = 'govbr',
                               ultimo_login = NOW(), atualizado_em = NOW()
           WHERE id = $4`,
          [nome, email, nivel, existente[0].id],
        );
      } else {
        // Criar usuário no Firebase Auth
        let fbUser;
        try {
          fbUser = await getAuth().getUserByEmail(email);
        } catch {
          fbUser = await getAuth().createUser({
            email,
            displayName: nome,
            emailVerified: userData.email_verified,
          });
        }
        firebaseUid = fbUser.uid;

        if (existente.length > 0) {
          // Atualizar registro existente com firebase_uid
          await pool.query(
            `UPDATE usuarios SET firebase_uid = $1, nome = $2, nivel_govbr = $3,
                                 provedor = 'govbr', ultimo_login = NOW(), atualizado_em = NOW()
             WHERE id = $4`,
            [firebaseUid, nome, nivel, existente[0].id],
          );
        } else {
          // Criar novo registro
          await pool.query(
            `INSERT INTO usuarios (firebase_uid, email, email_verificado, nome, cpf, provedor, nivel_govbr, ultimo_login)
             VALUES ($1, $2, $3, $4, $5, 'govbr', $6, NOW())`,
            [firebaseUid, email, userData.email_verified, nome, cpf, nivel],
          );
        }
      }

      // 5. Gerar Custom Token do Firebase para o frontend
      const customToken = await getAuth().createCustomToken(firebaseUid, {
        provedor: "govbr",
        nivel_govbr: nivel,
      });

      // 6. Registrar auditoria
      await pool.query(
        `INSERT INTO audit_log (tabela, operacao, registro_id, dados_novos, ip, user_agent)
         VALUES ('usuarios', 'LOGIN_GOVBR', $1, $2, $3, $4)`,
        [
          firebaseUid,
          JSON.stringify({ cpf, nome, nivel }),
          (req.headers["x-forwarded-for"] as string) ?? req.ip,
          req.headers["user-agent"] ?? "",
        ],
      );

      reply.send({
        cpf,
        nome,
        email,
        nivel_confiabilidade: nivel,
        foto_url: userData.picture ?? null,
        custom_token: customToken,
      });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/auth/govbr/vincular
  app.post("/api/auth/govbr/vincular", async (req, reply) => {
    try {
      const { cpf, nome, email } = req.body as { cpf: string; nome: string; email: string };

      if (!cpf || !nome || !email) {
        throw new AppError("cpf, nome e email são obrigatórios", 400);
      }

      const pool = getPool();

      // Buscar servidor por CPF
      const { rows: servidorRows } = await pool.query(
        `SELECT s.id FROM servidores s
         JOIN usuarios u ON s.usuario_id = u.id
         WHERE u.cpf = $1 AND s.deletado_em IS NULL`,
        [cpf.replace(/\D/g, "")],
      );

      if (servidorRows.length > 0) {
        reply.send({ data: { servidorId: servidorRows[0].id, novo: false } });
        return;
      }

      // Se não existe, retornar que é novo (frontend decidirá se cria)
      reply.send({ data: { servidorId: null, novo: true } });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/auth/totp/gerar
  app.post("/api/auth/totp/gerar", async (req, reply) => {
    try {
      const { email } = req.body as { email: string };
      // Gerar segredo TOTP base32
      const bytes = new Uint8Array(20);
      crypto.getRandomValues(bytes);
      const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
      let secret = "";
      for (let i = 0; i < bytes.length; i++) {
        secret += base32chars[bytes[i] % 32];
      }

      const otpauthUri = `otpauth://totp/LicitaNest:${email}?secret=${secret}&issuer=LicitaNest&digits=6&period=30`;

      reply.send({ data: { secret, otpauth_uri: otpauthUri } });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/auth/totp/ativar
  app.post("/api/auth/totp/ativar", async (req, reply) => {
    try {
      const { servidor_id, secret } = req.body as { servidor_id: string; secret: string };
      await getPool().query(
        `UPDATE servidores SET totp_secret = $1, totp_ativado = true, totp_ativado_em = NOW() WHERE id = $2`,
        [secret, servidor_id],
      );
      reply.send({ ok: true });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/auth/totp/desativar
  app.post("/api/auth/totp/desativar", async (req, reply) => {
    try {
      const { servidor_id } = req.body as { servidor_id: string };
      await getPool().query(
        `UPDATE servidores SET totp_secret = NULL, totp_ativado = false WHERE id = $1`,
        [servidor_id],
      );
      reply.send({ ok: true });
    } catch (e) { tratarErro(e, reply); }
  });
}
