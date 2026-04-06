// Serviço LGPD — Lei Geral de Proteção de Dados Pessoais
// Consentimentos, solicitações do titular, 2FA (TOTP)
import { api } from "@/lib/api";
import type {
  ConsentimentoLgpd,
  SolicitacaoLgpd,
  TipoConsentimento,
  TipoSolicitacaoLgpd,
  StatusSolicitacaoLgpd,
} from "@/tipos";

// ══════════════════════════════════════════════════════
// TERMOS E POLÍTICAS
// ══════════════════════════════════════════════════════

export const DOCUMENTOS_LGPD: Record<TipoConsentimento, {
  titulo: string;
  descricao: string;
  versao: string;
  obrigatorio: boolean;
}> = {
  termos_uso: {
    titulo: "Termos de Uso",
    descricao: "Termos e condições de uso da plataforma LicitaNest",
    versao: "1.0",
    obrigatorio: true,
  },
  politica_privacidade: {
    titulo: "Política de Privacidade",
    descricao: "Como coletamos, usamos e protegemos seus dados pessoais",
    versao: "1.0",
    obrigatorio: true,
  },
  cookies: {
    titulo: "Política de Cookies",
    descricao: "Informações sobre os cookies utilizados na plataforma",
    versao: "1.0",
    obrigatorio: false,
  },
  marketing: {
    titulo: "Comunicações de Marketing",
    descricao: "Receber novidades, atualizações e dicas sobre a plataforma",
    versao: "1.0",
    obrigatorio: false,
  },
};

// ══════════════════════════════════════════════════════
// CONSENTIMENTOS
// ══════════════════════════════════════════════════════

export async function listarConsentimentos(
  servidorId: string,
): Promise<ConsentimentoLgpd[]> {
  const { data } = await api.get<{ data: ConsentimentoLgpd[] }>(
    `/api/lgpd/consentimentos?servidor_id=${encodeURIComponent(servidorId)}`
  );
  return data ?? [];
}

export async function obterConsentimento(
  servidorId: string,
  tipo: TipoConsentimento,
): Promise<ConsentimentoLgpd | null> {
  const { data } = await api.get<{ data: ConsentimentoLgpd | null }>(
    `/api/lgpd/consentimentos?servidor_id=${encodeURIComponent(servidorId)}&tipo=${encodeURIComponent(tipo)}&ativo=true`
  );
  return data;
}

export async function registrarConsentimento(
  servidorId: string,
  tipo: TipoConsentimento,
  aceito: boolean,
): Promise<ConsentimentoLgpd> {
  const { data } = await api.post<{ data: ConsentimentoLgpd }>("/api/lgpd/consentimentos", {
    servidor_id: servidorId,
    tipo,
    aceito,
    versao_documento: DOCUMENTOS_LGPD[tipo].versao,
    aceito_em: aceito ? new Date().toISOString() : null,
    ip_address: null,
    user_agent: navigator.userAgent,
  });

  return data as ConsentimentoLgpd;
}

export async function revogarConsentimento(
  servidorId: string,
  tipo: TipoConsentimento,
): Promise<void> {
  const atual = await obterConsentimento(servidorId, tipo);
  if (!atual) return;

  await api.put(`/api/lgpd/consentimentos/${encodeURIComponent(atual.id)}`, {
    revogado_em: new Date().toISOString(),
  });
}

export async function verificarConsentimentosObrigatorios(
  servidorId: string,
): Promise<{ pendentes: TipoConsentimento[]; todos_aceitos: boolean }> {
  const consentimentos = await listarConsentimentos(servidorId);
  const pendentes: TipoConsentimento[] = [];

  for (const [tipo, doc] of Object.entries(DOCUMENTOS_LGPD)) {
    if (!doc.obrigatorio) continue;
    const ativo = consentimentos.find(
      (c) => c.tipo === tipo && c.aceito && !c.revogado_em,
    );
    if (!ativo) pendentes.push(tipo as TipoConsentimento);
  }

  return { pendentes, todos_aceitos: pendentes.length === 0 };
}

// ══════════════════════════════════════════════════════
// SOLICITAÇÕES DO TITULAR (LGPD Arts. 18-19)
// ══════════════════════════════════════════════════════

export const TIPOS_SOLICITACAO_LGPD: Record<TipoSolicitacaoLgpd, {
  titulo: string;
  descricao: string;
  artigo: string;
}> = {
  exclusao: {
    titulo: "Exclusão de Dados",
    descricao: "Solicitar a exclusão dos seus dados pessoais da plataforma",
    artigo: "LGPD, Art. 18, VI",
  },
  portabilidade: {
    titulo: "Portabilidade",
    descricao: "Solicitar seus dados em formato estruturado para transferência",
    artigo: "LGPD, Art. 18, V",
  },
  retificacao: {
    titulo: "Retificação",
    descricao: "Solicitar a correção de dados pessoais incompletos ou desatualizados",
    artigo: "LGPD, Art. 18, III",
  },
  anonimizacao: {
    titulo: "Anonimização",
    descricao: "Solicitar a anonimização de dados pessoais desnecessários",
    artigo: "LGPD, Art. 18, IV",
  },
  revogacao: {
    titulo: "Revogação de Consentimento",
    descricao: "Revogar o consentimento previamente concedido",
    artigo: "LGPD, Art. 18, IX",
  },
};

export async function criarSolicitacaoLgpd(
  servidorId: string,
  tipo: TipoSolicitacaoLgpd,
  descricao?: string,
): Promise<SolicitacaoLgpd> {
  const { data } = await api.post<{ data: SolicitacaoLgpd }>("/api/lgpd/solicitacoes", {
    servidor_id: servidorId,
    tipo,
    descricao: descricao ?? null,
    status: "pendente",
  });

  return data as SolicitacaoLgpd;
}

export async function listarSolicitacoesLgpd(
  servidorId?: string,
  status?: StatusSolicitacaoLgpd,
): Promise<SolicitacaoLgpd[]> {
  const params = new URLSearchParams();
  if (servidorId) params.set("servidor_id", servidorId);
  if (status) params.set("status", status);

  const { data } = await api.get<{ data: SolicitacaoLgpd[] }>(
    `/api/lgpd/solicitacoes?${params}`
  );
  return (data ?? []) as SolicitacaoLgpd[];
}

export async function responderSolicitacaoLgpd(
  solicitacaoId: string,
  status: StatusSolicitacaoLgpd,
  resposta: string,
  respondidoPor: string,
): Promise<void> {
  await api.put(`/api/lgpd/solicitacoes/${encodeURIComponent(solicitacaoId)}`, {
    status,
    resposta,
    respondido_por: respondidoPor,
    respondido_em: new Date().toISOString(),
  });
}

// ══════════════════════════════════════════════════════
// 2FA — TOTP (Time-based One-Time Password)
// ══════════════════════════════════════════════════════

/**
 * Gera um segredo TOTP base32 para o servidor.
 * Usa a Web Crypto API para gerar bytes aleatórios.
 */
export function gerarSegredoTOTP(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  // Codificar em base32
  const base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let result = "";
  let bits = 0;
  let value = 0;
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += base32Chars[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    result += base32Chars[(value << (5 - bits)) & 31];
  }
  return result;
}

/**
 * Gera a URI otpauth:// para QR code do Google Authenticator.
 */
export function gerarOtpAuthURI(
  email: string,
  segredo: string,
  issuer: string = "LicitaNest",
): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${segredo}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Ativa 2FA para um servidor.
 */
export async function ativar2FA(servidorId: string, segredo: string): Promise<void> {
  await api.put(`/api/servidores/${encodeURIComponent(servidorId)}/2fa`, {
    totp_secret: segredo,
    totp_ativado: true,
    totp_ativado_em: new Date().toISOString(),
  });
}

export async function desativar2FA(servidorId: string): Promise<void> {
  await api.put(`/api/servidores/${encodeURIComponent(servidorId)}/2fa`, {
    totp_secret: null,
    totp_ativado: false,
    totp_ativado_em: null,
  });
}

export async function verificar2FAAtivo(servidorId: string): Promise<boolean> {
  const { data } = await api.get<{ data: { totp_ativado: boolean } }>(
    `/api/servidores/${encodeURIComponent(servidorId)}/2fa`
  );
  return data?.totp_ativado === true;
}

// ══════════════════════════════════════════════════════
// GERAÇÃO DE RELATÓRIO DE DADOS PESSOAIS
// ══════════════════════════════════════════════════════

export async function gerarRelatorioDadosPessoais(servidorId: string): Promise<{
  dados_pessoais: Record<string, unknown>;
  consentimentos: ConsentimentoLgpd[];
  solicitacoes: SolicitacaoLgpd[];
}> {
  const { data: servidor } = await api.get<{ data: Record<string, unknown> }>(
    `/api/servidores/${encodeURIComponent(servidorId)}?fields=id,nome,email,cpf,matricula,telefone,criado_em,ultimo_acesso`
  );

  const consentimentos = await listarConsentimentos(servidorId);
  const solicitacoes = await listarSolicitacoesLgpd(servidorId);

  return {
    dados_pessoais: servidor ?? {},
    consentimentos,
    solicitacoes,
  };
}
