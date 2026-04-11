import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";
import { getAuth } from "../config/firebase.js";
import { obterSecret } from "../config/secrets.js";
import { verificarAuth } from "../middleware/auth.js";
import { exigirServidor } from "../middleware/autorizacao.js";
import { tratarErro, AppError } from "../utils/erros.js";
import { validarCPF } from "../utils/validacao.js";
import { OTP } from "otplib";

// ── Gov.br endpoints ────────────────────────────────────
const GOVBR_TOKEN_URL = "https://sso.acesso.gov.br/token";
const GOVBR_USERINFO_URL = "https://sso.acesso.gov.br/userinfo";

// ── Allowlist de redirect_uris válidas para Gov.br ──────
const GOVBR_REDIRECT_URIS_PERMITIDAS = new Set([
  "https://licitanest.com.br/auth/callback",
  "https://app.licitanest.com.br/auth/callback",
  "https://staging.licitanest.com.br/auth/callback",
  "http://localhost:5173/auth/callback",
]);

// ── TOTP robusto — SHA1/6 dígitos/30s/epochTolerance 30s (±1 período) ──
const otp = new OTP({ strategy: "totp" });
const TOTP_EPOCH_TOLERANCE: [number, number] = [30, 30]; // 30s passado, 30s futuro

// Rate-limit em memória para tentativas TOTP falhadas (por servidor_id)
const totpFailures = new Map<string, { count: number; lastAttempt: number }>();
const TOTP_MAX_ATTEMPTS = 5;
const TOTP_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutos

function verificarRateLimitTOTP(servidorId: string): void {
  const entry = totpFailures.get(servidorId);
  if (!entry) return;
  if (Date.now() - entry.lastAttempt > TOTP_LOCKOUT_MS) {
    totpFailures.delete(servidorId);
    return;
  }
  if (entry.count >= TOTP_MAX_ATTEMPTS) {
    throw new AppError(
      `Muitas tentativas TOTP falhadas. Aguarde ${Math.ceil((TOTP_LOCKOUT_MS - (Date.now() - entry.lastAttempt)) / 60000)} minutos.`,
      429,
    );
  }
}

function registrarFalhaTOTP(servidorId: string): void {
  const entry = totpFailures.get(servidorId);
  if (entry) {
    entry.count++;
    entry.lastAttempt = Date.now();
  } else {
    totpFailures.set(servidorId, { count: 1, lastAttempt: Date.now() });
  }
}

function limparFalhasTOTP(servidorId: string): void {
  totpFailures.delete(servidorId);
}

function gerarRecoveryCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 8; i++) {
    const bytes = new Uint8Array(5);
    crypto.getRandomValues(bytes);
    const code = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    codes.push(`${code.slice(0, 5)}-${code.slice(5)}`);
  }
  return codes;
}

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
  app.post("/api/auth/govbr/callback", {
    schema: {
      tags: ["Auth"],
      summary: "Callback OAuth Gov.br",
      description: "Processa code do Gov.br, troca por token, cria/vincula usuário Firebase.",
      body: {
        type: "object",
        required: ["code", "code_verifier", "redirect_uri"],
        properties: {
          code: { type: "string" },
          code_verifier: { type: "string" },
          redirect_uri: { type: "string", format: "uri" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            token: { type: "string", description: "Custom token Firebase" },
            usuario: { type: "object" },
          },
        },
      },
    },
  }, async (req, reply) => {
    try {
      const { code, code_verifier, redirect_uri } = req.body as GovBrCallbackBody;

      if (!code || !code_verifier || !redirect_uri) {
        throw new AppError("code, code_verifier e redirect_uri são obrigatórios", 400);
      }

      // Validar redirect_uri contra allowlist (prevenir Open Redirect)
      if (!GOVBR_REDIRECT_URIS_PERMITIDAS.has(redirect_uri)) {
        // Registrar tentativa suspeita no audit_log
        await getPool().query(
          `INSERT INTO audit_log (tabela, acao, registro_id, dados_novos, ip_address, user_agent)
           VALUES ('auth', 'REDIRECT_URI_INVALIDA', 'govbr', $1, $2, $3)`,
          [
            JSON.stringify({ redirect_uri }),
            (req.headers["x-forwarded-for"] as string) ?? req.ip,
            req.headers["user-agent"] ?? "",
          ],
        );
        throw new AppError("redirect_uri não autorizada", 400);
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
      if (!validarCPF(cpf)) {
        throw new AppError("CPF retornado pelo Gov.br é inválido", 400);
      }
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
        `INSERT INTO audit_log (tabela, acao, registro_id, dados_novos, ip_address, user_agent)
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

      const cpfLimpo = cpf.replace(/\D/g, "");
      if (!validarCPF(cpfLimpo)) {
        throw new AppError("CPF inválido", 400);
      }

      const pool = getPool();

      // Buscar servidor por CPF
      const { rows: servidorRows } = await pool.query(
        `SELECT s.id FROM servidores s
         JOIN usuarios u ON s.usuario_id = u.id
         WHERE u.cpf = $1 AND s.deletado_em IS NULL`,
        [cpfLimpo],
      );

      if (servidorRows.length > 0) {
        reply.send({ data: { servidorId: servidorRows[0].id, novo: false } });
        return;
      }

      // Se não existe, retornar que é novo (frontend decidirá se cria)
      reply.send({ data: { servidorId: null, novo: true } });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/auth/totp/gerar — gera secret + otpauth URI para configurar no app autenticador
  app.post("/api/auth/totp/gerar", { preHandler: [verificarAuth, exigirServidor] }, async (req, reply) => {
    try {
      const servidorId = req.usuario!.servidor!.id;

      // Verificar se TOTP já está ativo
      const { rows: [srv] } = await getPool().query(
        `SELECT totp_ativado FROM servidores WHERE id = $1`, [servidorId],
      );
      if (srv?.totp_ativado) {
        throw new AppError("TOTP já está ativado. Desative primeiro para gerar um novo.", 409);
      }

      // Gerar secret via otplib (criptograficamente seguro)
      const secret = otp.generateSecret();
      const email = req.usuario!.email;
      const otpauthUri = otp.generateURI({ label: email, issuer: "LicitaNest", secret });

      reply.send({ data: { secret, otpauth_uri: otpauthUri } });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/auth/totp/ativar — ativa TOTP após validação do código
  app.post("/api/auth/totp/ativar", { preHandler: [verificarAuth, exigirServidor] }, async (req, reply) => {
    try {
      const { servidor_id, secret, totp_code } = req.body as {
        servidor_id: string; secret: string; totp_code: string;
      };

      // Validar que o servidor_id pertence ao usuário autenticado
      if (servidor_id !== req.usuario!.servidor!.id) {
        return reply.status(403).send({ error: "Sem permissão para alterar TOTP de outro servidor" });
      }

      // Rate limit por servidor
      verificarRateLimitTOTP(servidor_id);

      // Validações de input
      if (!secret || typeof secret !== "string" || secret.length < 16) {
        throw new AppError("Secret TOTP inválido", 400);
      }
      if (!totp_code || typeof totp_code !== "string") {
        throw new AppError("totp_code é obrigatório para ativar 2FA", 400);
      }
      // Sanitizar: aceitar apenas 6 dígitos
      const sanitizedCode = totp_code.replace(/\s/g, "");
      if (!/^\d{6}$/.test(sanitizedCode)) {
        throw new AppError("Código TOTP deve conter exatamente 6 dígitos", 400);
      }

      // Verificar TOTP com tolerância de ±30s (1 período de drift)
      const result = await otp.verify({
        token: sanitizedCode,
        secret,
        epochTolerance: TOTP_EPOCH_TOLERANCE,
      });
      if (!result || !result.valid) {
        registrarFalhaTOTP(servidor_id);
        // Audit log da tentativa falhada
        await getPool().query(
          `INSERT INTO audit_log (tabela, acao, registro_id, dados_novos, ip_address, user_agent)
           VALUES ('servidores', 'TOTP_ATIVACAO_FALHA', $1, $2, $3, $4)`,
          [
            servidor_id,
            JSON.stringify({ motivo: "codigo_invalido" }),
            (req.headers["x-forwarded-for"] as string) ?? req.ip,
            req.headers["user-agent"] ?? "",
          ],
        );
        throw new AppError("Código TOTP inválido. Verifique seu aplicativo autenticador e tente novamente.", 400);
      }

      limparFalhasTOTP(servidor_id);

      // Gerar recovery codes
      const recoveryCodes = gerarRecoveryCodes();

      // Ativar TOTP + salvar recovery codes (hash seria ideal, mas aqui criptografia do banco protege)
      const pool = getPool();
      await pool.query(
        `UPDATE servidores SET
           totp_secret = $1,
           totp_ativado = true,
           totp_ativado_em = NOW(),
           totp_recovery_codes = $3
         WHERE id = $2`,
        [secret, servidor_id, JSON.stringify(recoveryCodes)],
      );

      // Audit log de sucesso
      await pool.query(
        `INSERT INTO audit_log (tabela, acao, registro_id, dados_novos, ip_address, user_agent)
         VALUES ('servidores', 'TOTP_ATIVADO', $1, $2, $3, $4)`,
        [
          servidor_id,
          JSON.stringify({ metodo: "totp", digitos: 6, periodo: 30 }),
          (req.headers["x-forwarded-for"] as string) ?? req.ip,
          req.headers["user-agent"] ?? "",
        ],
      );

      reply.send({ ok: true, recovery_codes: recoveryCodes });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/auth/totp/desativar — desativa TOTP (requer código válido ou recovery code)
  app.post("/api/auth/totp/desativar", { preHandler: [verificarAuth, exigirServidor] }, async (req, reply) => {
    try {
      const { servidor_id, totp_code } = req.body as { servidor_id: string; totp_code: string };

      // Validar que o servidor_id pertence ao usuário autenticado
      if (servidor_id !== req.usuario!.servidor!.id) {
        return reply.status(403).send({ error: "Sem permissão para alterar TOTP de outro servidor" });
      }

      // Rate limit
      verificarRateLimitTOTP(servidor_id);

      if (!totp_code || typeof totp_code !== "string") {
        throw new AppError("totp_code ou recovery code é obrigatório para desativar 2FA", 400);
      }

      const pool = getPool();

      // Buscar secret e recovery codes atuais
      const { rows: [srv] } = await pool.query(
        `SELECT totp_secret, totp_ativado, totp_recovery_codes FROM servidores WHERE id = $1`,
        [servidor_id],
      );
      if (!srv?.totp_ativado || !srv.totp_secret) {
        throw new AppError("TOTP não está ativado", 400);
      }

      const sanitizedCode = totp_code.replace(/\s/g, "");
      let autenticado = false;

      // Tentar verificar como código TOTP normal (6 dígitos)
      if (/^\d{6}$/.test(sanitizedCode)) {
        const result = await otp.verify({
          token: sanitizedCode,
          secret: srv.totp_secret,
          epochTolerance: TOTP_EPOCH_TOLERANCE,
        });
        if (result?.valid) autenticado = true;
      }

      // Se não validou como TOTP, tentar como recovery code
      if (!autenticado) {
        const recoveryCodes: string[] = srv.totp_recovery_codes ? JSON.parse(srv.totp_recovery_codes) : [];
        const idx = recoveryCodes.indexOf(sanitizedCode.toLowerCase());
        if (idx >= 0) {
          autenticado = true;
          // Invalidar o recovery code usado
          recoveryCodes.splice(idx, 1);
          await pool.query(
            `UPDATE servidores SET totp_recovery_codes = $1 WHERE id = $2`,
            [JSON.stringify(recoveryCodes), servidor_id],
          );
        }
      }

      if (!autenticado) {
        registrarFalhaTOTP(servidor_id);
        await pool.query(
          `INSERT INTO audit_log (tabela, acao, registro_id, dados_novos, ip_address, user_agent)
           VALUES ('servidores', 'TOTP_DESATIVACAO_FALHA', $1, $2, $3, $4)`,
          [
            servidor_id,
            JSON.stringify({ motivo: "codigo_invalido" }),
            (req.headers["x-forwarded-for"] as string) ?? req.ip,
            req.headers["user-agent"] ?? "",
          ],
        );
        throw new AppError("Código inválido. Use o código do seu app autenticador ou um recovery code.", 400);
      }

      limparFalhasTOTP(servidor_id);

      await pool.query(
        `UPDATE servidores SET totp_secret = NULL, totp_ativado = false, totp_recovery_codes = NULL WHERE id = $1`,
        [servidor_id],
      );

      // Audit log
      await pool.query(
        `INSERT INTO audit_log (tabela, acao, registro_id, dados_novos, ip_address, user_agent)
         VALUES ('servidores', 'TOTP_DESATIVADO', $1, $2, $3, $4)`,
        [
          servidor_id,
          JSON.stringify({ metodo: "totp" }),
          (req.headers["x-forwarded-for"] as string) ?? req.ip,
          req.headers["user-agent"] ?? "",
        ],
      );

      reply.send({ ok: true });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/auth/totp/verificar — verifica código TOTP durante login
  app.post("/api/auth/totp/verificar", { preHandler: [verificarAuth, exigirServidor] }, async (req, reply) => {
    try {
      const { totp_code } = req.body as { totp_code: string };
      const servidorId = req.usuario!.servidor!.id;

      // Rate limit
      verificarRateLimitTOTP(servidorId);

      if (!totp_code || typeof totp_code !== "string") {
        throw new AppError("totp_code é obrigatório", 400);
      }

      const sanitizedCode = totp_code.replace(/\s/g, "");

      const pool = getPool();
      const { rows: [srv] } = await pool.query(
        `SELECT totp_secret, totp_ativado, totp_recovery_codes FROM servidores WHERE id = $1`,
        [servidorId],
      );
      if (!srv?.totp_ativado || !srv.totp_secret) {
        throw new AppError("TOTP não está ativado para este servidor", 400);
      }

      let autenticado = false;
      let usouRecovery = false;

      // Tentar como código TOTP
      if (/^\d{6}$/.test(sanitizedCode)) {
        const result = await otp.verify({
          token: sanitizedCode,
          secret: srv.totp_secret,
          epochTolerance: TOTP_EPOCH_TOLERANCE,
        });
        if (result?.valid) autenticado = true;
      }

      // Tentar como recovery code
      if (!autenticado) {
        const recoveryCodes: string[] = srv.totp_recovery_codes ? JSON.parse(srv.totp_recovery_codes) : [];
        const idx = recoveryCodes.indexOf(sanitizedCode.toLowerCase());
        if (idx >= 0) {
          autenticado = true;
          usouRecovery = true;
          recoveryCodes.splice(idx, 1);
          await pool.query(
            `UPDATE servidores SET totp_recovery_codes = $1 WHERE id = $2`,
            [JSON.stringify(recoveryCodes), servidorId],
          );
        }
      }

      if (!autenticado) {
        registrarFalhaTOTP(servidorId);
        await pool.query(
          `INSERT INTO audit_log (tabela, acao, registro_id, dados_novos, ip_address, user_agent)
           VALUES ('servidores', 'TOTP_VERIFICACAO_FALHA', $1, $2, $3, $4)`,
          [
            servidorId,
            JSON.stringify({ motivo: "codigo_invalido" }),
            (req.headers["x-forwarded-for"] as string) ?? req.ip,
            req.headers["user-agent"] ?? "",
          ],
        );
        throw new AppError("Código inválido", 401);
      }

      limparFalhasTOTP(servidorId);

      const remaining = srv.totp_recovery_codes
        ? JSON.parse(srv.totp_recovery_codes).length - (usouRecovery ? 1 : 0)
        : 0;

      reply.send({
        ok: true,
        used_recovery: usouRecovery,
        recovery_codes_remaining: remaining,
      });
    } catch (e) { tratarErro(e, reply); }
  });
}
