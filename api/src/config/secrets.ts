import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

const client = new SecretManagerServiceClient();
const PROJECT_ID = process.env.GCP_PROJECT || "sistema-de-gestao-16e15";

const cache = new Map<string, string>();

export async function obterSecret(nome: string): Promise<string> {
  if (cache.has(nome)) return cache.get(nome)!;

  const [version] = await client.accessSecretVersion({
    name: `projects/${PROJECT_ID}/secrets/${nome}/versions/latest`,
  });

  const valor = version.payload?.data?.toString() ?? "";
  cache.set(nome, valor);
  return valor;
}

export async function carregarSecrets(): Promise<{
  dbPassword: string;
  jwtSecret: string;
  resendApiKey: string;
  openaiApiKey: string;
  anthropicApiKey: string;
  asaasApiKey: string;
  asaasWebhookToken: string;
  govbrClientId: string;
  govbrClientSecret: string;
}> {
  const [
    dbPassword,
    jwtSecret,
    resendApiKey,
    openaiApiKey,
    anthropicApiKey,
    asaasApiKey,
    asaasWebhookToken,
    govbrClientId,
    govbrClientSecret,
  ] = await Promise.all([
    obterSecret("DB_PASSWORD"),
    obterSecret("JWT_SECRET"),
    obterSecret("RESEND_API_KEY"),
    obterSecret("OPENAI_API_KEY"),
    obterSecret("ANTHROPIC_API_KEY"),
    obterSecret("ASAAS_API_KEY"),
    obterSecret("ASAAS_WEBHOOK_TOKEN"),
    obterSecret("GOVBR_CLIENT_ID"),
    obterSecret("GOVBR_CLIENT_SECRET"),
  ]);

  return {
    dbPassword,
    jwtSecret,
    resendApiKey,
    openaiApiKey,
    anthropicApiKey,
    asaasApiKey,
    asaasWebhookToken,
    govbrClientId,
    govbrClientSecret,
  };
}
