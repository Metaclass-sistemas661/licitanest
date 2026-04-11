import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

const client = new SecretManagerServiceClient();
const PROJECT_ID = process.env.GCP_PROJECT_ID || process.env.GCP_PROJECT || "sistema-de-gestao-16e15";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora
const cache = new Map<string, { valor: string; expiraEm: number }>();

export async function obterSecret(nome: string): Promise<string> {
  // 1. Variável de ambiente local tem prioridade (dev local, Docker, CI)
  const envVal = process.env[nome];
  if (envVal !== undefined && envVal !== "") {
    return envVal;
  }

  // 2. Cache em memória (evita chamadas repetidas ao Secret Manager)
  const entry = cache.get(nome);
  if (entry && Date.now() < entry.expiraEm) return entry.valor;

  // 3. Google Secret Manager (produção / Cloud Run)
  try {
    const [version] = await client.accessSecretVersion({
      name: `projects/${PROJECT_ID}/secrets/${nome}/versions/latest`,
    });

    const valor = version.payload?.data?.toString() ?? "";
    cache.set(nome, { valor, expiraEm: Date.now() + CACHE_TTL_MS });
    if (entry) console.info(`Secret "${nome}" recarregado do Secret Manager (TTL expirado)`);
    return valor;
  } catch (err) {
    console.error(`[CRITICAL] Secret "${nome}" falhou ao carregar do Secret Manager:`, err);
    // Em produção, NÃO silenciar falhas de secrets — pode causar operação com credenciais vazias
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Secret "${nome}" indisponível. Servidor não pode operar sem esta credencial.`, { cause: err });
    }
    console.warn(`[DEV] Secret "${nome}" não encontrado. Usando valor vazio (apenas desenvolvimento).`);
    return "";
  }
}

export async function carregarSecrets(): Promise<{
  dbPassword: string;
  jwtSecret: string;
  resendApiKey: string;
  asaasApiKey: string;
  asaasWebhookToken: string;
  govbrClientId: string;
  govbrClientSecret: string;
}> {
  const [
    dbPassword,
    jwtSecret,
    resendApiKey,
    asaasApiKey,
    asaasWebhookToken,
    govbrClientId,
    govbrClientSecret,
  ] = await Promise.all([
    obterSecret("DB_PASSWORD"),
    obterSecret("JWT_SECRET"),
    obterSecret("RESEND_API_KEY"),
    obterSecret("ASAAS_API_KEY"),
    obterSecret("ASAAS_WEBHOOK_TOKEN"),
    obterSecret("GOVBR_CLIENT_ID"),
    obterSecret("GOVBR_CLIENT_SECRET"),
  ]);

  return {
    dbPassword,
    jwtSecret,
    resendApiKey,
    asaasApiKey,
    asaasWebhookToken,
    govbrClientId,
    govbrClientSecret,
  };
}
