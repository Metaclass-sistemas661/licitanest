// Serviço de Login gov.br — OpenID Connect
// Integração com o sistema de autenticação do Governo Federal
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { api } from "@/lib/api";
import type { ConfigGovBr, UsuarioGovBr } from "@/tipos";

// ══════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ══════════════════════════════════════════════════════

const GOVBR_CONFIG: ConfigGovBr = {
  client_id: import.meta.env.VITE_GOVBR_CLIENT_ID ?? "",
  redirect_uri: import.meta.env.VITE_GOVBR_REDIRECT_URI ?? `${window.location.origin}/auth/govbr/callback`,
  authorization_endpoint: "https://sso.acesso.gov.br/authorize",
  token_endpoint: "https://sso.acesso.gov.br/token",
  userinfo_endpoint: "https://sso.acesso.gov.br/userinfo",
  scopes: ["openid", "email", "phone", "profile", "govbr_confiabilidades"],
};

// ── Gerar state + code_verifier (PKCE) ──────────────────

function gerarRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, length);
}

async function gerarCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ══════════════════════════════════════════════════════
// FLUXO OAuth2 / OpenID Connect
// ══════════════════════════════════════════════════════

/**
 * Inicia o fluxo de login gov.br.
 * Redireciona o usuário para o portal de autenticação do governo.
 */
export async function iniciarLoginGovBr(): Promise<void> {
  if (!GOVBR_CONFIG.client_id) {
    throw new Error(
      "VITE_GOVBR_CLIENT_ID não configurado. " +
      "Obtenha as credenciais em https://manual-roteiro-integracao-login-unico.servicos.gov.br",
    );
  }

  const state = gerarRandomString(32);
  const codeVerifier = gerarRandomString(64);
  const codeChallenge = await gerarCodeChallenge(codeVerifier);

  // Salvar state e code_verifier para validação no callback
  sessionStorage.setItem("govbr_state", state);
  sessionStorage.setItem("govbr_code_verifier", codeVerifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: GOVBR_CONFIG.client_id,
    redirect_uri: GOVBR_CONFIG.redirect_uri,
    scope: GOVBR_CONFIG.scopes.join(" "),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    nonce: gerarRandomString(16),
  });

  window.location.href = `${GOVBR_CONFIG.authorization_endpoint}?${params.toString()}`;
}

/**
 * Processa o callback do gov.br após autenticação.
 * Troca o code por token e obtém dados do usuário.
 */
export async function processarCallbackGovBr(
  code: string,
  state: string,
): Promise<UsuarioGovBr> {
  // Validar state
  const savedState = sessionStorage.getItem("govbr_state");
  if (state !== savedState) {
    throw new Error("State inválido — possível ataque CSRF");
  }

  const codeVerifier = sessionStorage.getItem("govbr_code_verifier");
  if (!codeVerifier) throw new Error("Code verifier não encontrado");

  // Limpar dados temporários
  sessionStorage.removeItem("govbr_state");
  sessionStorage.removeItem("govbr_code_verifier");

  // Trocar code por access_token VIA API backend (client_secret seguro no servidor)
  const usuario = await loginGovBrViaEdgeFunction(code, codeVerifier);
  return usuario;
}

/**
 * Vincula um usuário gov.br a um servidor existente ou cria novo.
 */
export async function vincularUsuarioGovBr(
  dadosGovBr: UsuarioGovBr,
): Promise<{ servidorId: string; novo: boolean }> {
  const res = await api.post<{ data: { servidorId: string; novo: boolean } }>(
    "/api/auth/govbr/vincular",
    dadosGovBr,
  );
  return res.data;
}

// ══════════════════════════════════════════════════════
// API CALL (para callback seguro via Cloud Run)
// ══════════════════════════════════════════════════════

/**
 * Em produção, a troca de code por token é feita via API backend (Cloud Run).
 * O backend retorna um custom_token do Firebase para autenticação.
 */
export async function loginGovBrViaEdgeFunction(
  code: string,
  codeVerifier: string,
): Promise<UsuarioGovBr> {
  const res = await api.post<UsuarioGovBr & { custom_token: string }>("/api/auth/govbr/callback", {
    code,
    code_verifier: codeVerifier,
    redirect_uri: GOVBR_CONFIG.redirect_uri,
  });

  // Autenticar no Firebase com o custom token recebido do backend
  if (res.custom_token) {
    await signInWithCustomToken(auth, res.custom_token);
  }

  return res;
}

export function isGovBrConfigurado(): boolean {
  return !!GOVBR_CONFIG.client_id;
}

export function getGovBrConfig(): ConfigGovBr {
  return { ...GOVBR_CONFIG };
}
