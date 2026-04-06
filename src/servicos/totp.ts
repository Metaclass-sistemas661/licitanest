// ═══════════════════════════════════════════════════════════════
// Serviço 2FA/TOTP — Autenticação de Dois Fatores
// Usa HMAC-based OTP (RFC 6238) via Web Crypto API
// Armazena segredo via API backend (Cloud SQL)
// ═══════════════════════════════════════════════════════════════
import { api } from "@/lib/api";

const TOTP_PERIOD = 30;
const TOTP_DIGITS = 6;
const ISSUER = "LicitaNest";

// ── Helpers de codificação ─────────────────────────────────

function base32Encode(buffer: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let result = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    result += alphabet[(value << (5 - bits)) & 31];
  }
  return result;
}

function base32Decode(encoded: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const lookup = new Map<string, number>();
  for (let i = 0; i < alphabet.length; i++) lookup.set(alphabet[i], i);

  const clean = encoded.replace(/=+$/, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const char of clean) {
    const v = lookup.get(char);
    if (v === undefined) continue;
    value = (value << 5) | v;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(output);
}

// ── Geração de TOTP via Web Crypto ─────────────────────────

async function hmacSha1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, message.buffer as ArrayBuffer);
  return new Uint8Array(sig);
}

async function generateTOTP(secret: string, timeStep = TOTP_PERIOD): Promise<string> {
  const key = base32Decode(secret);
  const counter = Math.floor(Date.now() / 1000 / timeStep);
  const counterBytes = new Uint8Array(8);
  let tmp = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = tmp & 0xff;
    tmp = Math.floor(tmp / 256);
  }
  const hmac = await hmacSha1(key, counterBytes);
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

// ── API Pública do Serviço ─────────────────────────────────

/** Gera um novo segredo TOTP (20 bytes aleatórios) */
export function gerarSegredo(): string {
  const buffer = new Uint8Array(20);
  crypto.getRandomValues(buffer);
  return base32Encode(buffer);
}

/** Gera a URI otpauth:// para QR code */
export function gerarOtpauthUri(email: string, secret: string): string {
  return `otpauth://totp/${encodeURIComponent(ISSUER)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(ISSUER)}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;
}

/** Verifica um código TOTP (aceita janela ±1 step) */
export async function verificarTOTP(secret: string, codigo: string): Promise<boolean> {
  const steps = [-1, 0, 1];
  const now = Math.floor(Date.now() / 1000 / TOTP_PERIOD);
  for (const offset of steps) {
    const counter = now + offset;
    const counterBytes = new Uint8Array(8);
    let tmp = counter;
    for (let i = 7; i >= 0; i--) {
      counterBytes[i] = tmp & 0xff;
      tmp = Math.floor(tmp / 256);
    }
    const key = base32Decode(secret);
    const hmac = await hmacSha1(key, counterBytes);
    const off = hmac[hmac.length - 1] & 0x0f;
    const code =
      ((hmac[off] & 0x7f) << 24) |
      ((hmac[off + 1] & 0xff) << 16) |
      ((hmac[off + 2] & 0xff) << 8) |
      (hmac[off + 3] & 0xff);
    const expected = String(code % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
    if (expected === codigo) return true;
  }
  return false;
}

/** Salva o segredo TOTP via API */
export async function ativar2FA(secret: string, servidorId: string): Promise<{ erro: string | null }> {
  try {
    await api.post("/api/auth/totp/ativar", { servidor_id: servidorId, secret });
    return { erro: null };
  } catch (e) {
    return { erro: (e as Error).message };
  }
}

/** Desativa 2FA via API */
export async function desativar2FA(servidorId: string): Promise<{ erro: string | null }> {
  try {
    await api.post("/api/auth/totp/desativar", { servidor_id: servidorId });
    return { erro: null };
  } catch (e) {
    return { erro: (e as Error).message };
  }
}

/** Verifica se o servidor tem 2FA ativado (via servidor carregado) */
export async function verificar2FAAtivo(): Promise<boolean> {
  try {
    const res = await api.get<{ data: { totp_ativado: boolean } }>("/api/servidores/me");
    return res.data?.totp_ativado === true;
  } catch {
    return false;
  }
}

/** Obtém o segredo TOTP armazenado (para verificação no login) */
export async function obterSegredo2FA(): Promise<string | null> {
  try {
    const res = await api.get<{ data: { totp_secret: string | null } }>("/api/servidores/me");
    return res.data?.totp_secret ?? null;
  } catch {
    return null;
  }
}

export { generateTOTP };
