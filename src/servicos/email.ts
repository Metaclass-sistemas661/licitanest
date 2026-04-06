// ═══════════════════════════════════════════════════════════════════════════════
// Serviço de Email — Fase 16
// Integração com Resend (prioritário), SendGrid (fallback), SMTP (local)
// Rastreamento completo de envios, templates HTML, fila de reenvio
// ═══════════════════════════════════════════════════════════════════════════════
import { api } from "@/lib/api";
import type {
  EmailEnviado,
  EnviarEmailDTO,
  StatusEmail,
  TipoEmail,
} from "@/tipos";

// ── Configuração ───────────────────────────────────────────────────────────────────
// API Keys de email ficam APENAS no servidor.
// O frontend chama via api.post().

// ╔══════════════════════════════════════════════════════╗
// ║  1. ENVIO DE EMAIL                                   ║
// ╚══════════════════════════════════════════════════════╝

/**
 * Enviar email via Edge Function (Resend API protegida no servidor).
 * Registra o envio no banco independente do resultado.
 */
export async function enviarEmail(dto: EnviarEmailDTO, _criado_por?: string): Promise<EmailEnviado> {
  const { data } = await api.post<{ data: EmailEnviado }>("/api/email/enviar", {
    para: dto.para,
    assunto: dto.assunto,
    html: dto.html,
    texto: dto.texto,
    tipo: dto.tipo,
    referencia_tipo: dto.referencia_tipo,
    referencia_id: dto.referencia_id,
  });

  return data as EmailEnviado;
}

// ╔══════════════════════════════════════════════════════╗
// ║  2. HELPERS INTERNOS                                 ║
// ╚══════════════════════════════════════════════════════╝

// Resend API é chamada exclusivamente pela Edge Function (enviar-email)
// Não há mais chamadas diretas à API de email no frontend

// ╔══════════════════════════════════════════════════════╗
// ║  3. TEMPLATES DE EMAIL                               ║
// ╚══════════════════════════════════════════════════════╝

export function gerarEmailConviteCotacao(params: {
  fornecedor_nome: string;
  entidade: string;
  titulo_cotacao: string;
  data_encerramento: string;
  link_portal: string;
  total_itens: number;
}): { assunto: string; html: string; texto: string } {
  const assunto = `Convite para Cotação — ${params.titulo_cotacao}`;

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:'Segoe UI',Roboto,sans-serif;background:#f8fafc;margin:0;padding:0">
<div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.06)">
  <div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:32px 24px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:24px">LicitaNest</h1>
    <p style="color:#bfdbfe;margin:8px 0 0;font-size:14px">Sistema de Cestas de Preços</p>
  </div>
  <div style="padding:32px 24px">
    <p style="margin:0 0 16px;color:#1e293b">Prezado(a) <strong>${params.fornecedor_nome}</strong>,</p>
    <p style="margin:0 0 16px;color:#475569">
      A entidade <strong>${params.entidade}</strong> convida sua empresa a participar da seguinte cotação eletrônica:
    </p>
    <div style="background:#f0f9ff;border-left:4px solid #2563eb;padding:16px;border-radius:0 8px 8px 0;margin:0 0 24px">
      <p style="margin:0 0 8px;font-weight:600;color:#1e293b">${params.titulo_cotacao}</p>
      <p style="margin:0;color:#64748b;font-size:14px">
        ${params.total_itens} item(ns) • Encerramento: ${new Date(params.data_encerramento).toLocaleDateString("pt-BR")}
      </p>
    </div>
    <p style="margin:0 0 24px;color:#475569">
      Para preencher sua proposta, acesse o portal do fornecedor clicando no botão abaixo:
    </p>
    <div style="text-align:center;margin:0 0 24px">
      <a href="${params.link_portal}" style="display:inline-block;background:#2563eb;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">
        Acessar Portal
      </a>
    </div>
    <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center">
      Se o botão não funcionar, copie e cole este link: ${params.link_portal}
    </p>
  </div>
  <div style="background:#f8fafc;padding:16px 24px;border-top:1px solid #e2e8f0;text-align:center">
    <p style="margin:0;color:#94a3b8;font-size:12px">
      Este email foi enviado automaticamente pelo LicitaNest. Não responda a este email.
    </p>
  </div>
</div>
</body>
</html>`.trim();

  const texto = `Prezado(a) ${params.fornecedor_nome},

A entidade ${params.entidade} convida sua empresa a participar da cotação: ${params.titulo_cotacao}
${params.total_itens} item(ns) — Encerramento: ${new Date(params.data_encerramento).toLocaleDateString("pt-BR")}

Acesse o portal: ${params.link_portal}

Atenciosamente,
LicitaNest`;

  return { assunto, html, texto };
}

export function gerarEmailLembreteCotacao(params: {
  fornecedor_nome: string;
  titulo_cotacao: string;
  data_encerramento: string;
  link_portal: string;
  dias_restantes: number;
}): { assunto: string; html: string; texto: string } {
  const assunto = `Lembrete: Cotação encerra em ${params.dias_restantes} dia(s) — ${params.titulo_cotacao}`;

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="font-family:'Segoe UI',Roboto,sans-serif;background:#f8fafc;margin:0;padding:0">
<div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.06)">
  <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:24px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:20px">⏰ Lembrete de Cotação</h1>
  </div>
  <div style="padding:32px 24px">
    <p style="margin:0 0 16px;color:#1e293b">Olá <strong>${params.fornecedor_nome}</strong>,</p>
    <p style="margin:0 0 16px;color:#475569">
      A cotação <strong>${params.titulo_cotacao}</strong> encerra em <strong>${params.dias_restantes} dia(s)</strong>
      (${new Date(params.data_encerramento).toLocaleDateString("pt-BR")}).
    </p>
    <div style="text-align:center;margin:24px 0">
      <a href="${params.link_portal}" style="display:inline-block;background:#f59e0b;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">
        Responder Agora
      </a>
    </div>
  </div>
</div>
</body>
</html>`.trim();

  const texto = `Olá ${params.fornecedor_nome},
A cotação "${params.titulo_cotacao}" encerra em ${params.dias_restantes} dia(s).
Acesse: ${params.link_portal}`;

  return { assunto, html, texto };
}

// ╔══════════════════════════════════════════════════════╗
// ║  4. COTAÇÃO — ENVIO PARA FORNECEDORES                ║
// ╚══════════════════════════════════════════════════════╝

/**
 * Enviar convite de cotação para todos os fornecedores pendentes.
 * Gera link do portal para cada fornecedor e dispara email.
 */
export async function enviarConvitesCotacao(
  cotacaoId: string,
  criado_por?: string,
): Promise<{ enviados: number; falhas: number; resultados: EmailEnviado[] }> {
  // 1) Buscar cotação
  const { data: cotacao } = await api.get<{ data: Record<string, unknown> }>(
    `/api/cotacoes/${encodeURIComponent(cotacaoId)}?include=cesta.secretaria.municipio`
  );
  if (!cotacao) throw new Error("Cotação não encontrada");

  // 2) Buscar fornecedores sem email enviado
  const { data: fornecedores } = await api.get<{ data: Record<string, unknown>[] }>(
    `/api/cotacao-fornecedores?cotacao_id=${encodeURIComponent(cotacaoId)}&email_enviado=false`
  );

  if (!fornecedores || fornecedores.length === 0) {
    return { enviados: 0, falhas: 0, resultados: [] };
  }

  // 3) Buscar total de itens
  const { data: itensData } = await api.get<{ data: { count: number } }>(
    `/api/cotacao-itens?cotacao_id=${encodeURIComponent(cotacaoId)}&count=true`
  );
  const totalItens = itensData?.count ?? 0;

  const cesta = cotacao.cesta as Record<string, unknown> | null;
  const secretaria = cesta?.secretaria as Record<string, unknown> | null;
  const municipio = secretaria?.municipio as Record<string, unknown> | null;
  const entidade = municipio
    ? `${secretaria?.nome ?? ""} — ${municipio.nome ?? ""}`
    : String(secretaria?.nome ?? "Entidade");

  const resultados: EmailEnviado[] = [];
  let enviados = 0;
  let falhas = 0;

  // 4) Enviar para cada fornecedor
  for (const forn of fornecedores) {
    const link = `${window.location.origin}/portal/cotacao/${String(forn.token_acesso)}`;
    const template = gerarEmailConviteCotacao({
      fornecedor_nome: String(forn.razao_social),
      entidade,
      titulo_cotacao: String(cotacao.titulo),
      data_encerramento: String(cotacao.data_encerramento),
      link_portal: link,
      total_itens: totalItens ?? 0,
    });

    const resultado = await enviarEmail(
      {
        tipo: "cotacao_convite",
        para: { email: String(forn.email), nome: String(forn.razao_social) },
        assunto: template.assunto,
        html: template.html,
        texto: template.texto,
        referencia_tipo: "cotacao",
        referencia_id: cotacaoId,
      },
      criado_por,
    );

    resultados.push(resultado);

    if (resultado.status === "enviado") {
      enviados++;
      // Marcar no fornecedor
      await api.put(`/api/cotacao-fornecedores/${forn.id}`, {
        email_enviado: true,
        email_enviado_em: new Date().toISOString(),
      });
    } else {
      falhas++;
    }
  }

  return { enviados, falhas, resultados };
}

// ╔══════════════════════════════════════════════════════╗
// ║  5. CONSULTA DE EMAILS                               ║
// ╚══════════════════════════════════════════════════════╝

export interface FiltrosEmails {
  tipo?: TipoEmail;
  status?: StatusEmail;
  destinatario?: string;
  referencia_tipo?: string;
  referencia_id?: string;
}

export async function listarEmails(
  filtros: FiltrosEmails = {},
  pagina = 1,
  porPagina = 20,
): Promise<{ data: EmailEnviado[]; total: number }> {
  const params = new URLSearchParams();
  if (filtros.tipo) params.set("tipo", filtros.tipo);
  if (filtros.status) params.set("status", filtros.status);
  if (filtros.destinatario) params.set("destinatario", filtros.destinatario);
  if (filtros.referencia_tipo) params.set("referencia_tipo", filtros.referencia_tipo);
  if (filtros.referencia_id) params.set("referencia_id", filtros.referencia_id);
  params.set("pagina", String(pagina));
  params.set("por_pagina", String(porPagina));

  const resp = await api.get<{ data: EmailEnviado[]; total: number }>(
    `/api/emails?${params}`
  );
  return { data: resp.data ?? [], total: resp.total ?? 0 };
}

export async function obterEmail(id: string): Promise<EmailEnviado> {
  const { data } = await api.get<{ data: EmailEnviado }>(`/api/emails/${encodeURIComponent(id)}`);
  return data as EmailEnviado;
}

// ╔══════════════════════════════════════════════════════╗
// ║  6. HELPERS                                          ║
// ╚══════════════════════════════════════════════════════╝

async function atualizarStatusEmail(
  id: string,
  status: StatusEmail,
  extras: Record<string, unknown> = {},
) {
  try {
    await api.put(`/api/emails/${encodeURIComponent(id)}`, { status, ...extras });
  } catch (err) {
    console.warn("[Email] Erro ao atualizar status:", err);
  }
}

/** Reenviar email que falhou */
export async function reenviarEmail(emailId: string): Promise<EmailEnviado> {
  const email = await obterEmail(emailId);
  if (email.status !== "falhou") throw new Error("Apenas emails com status 'falhou' podem ser reenviados");

  try {
    const { data: resultado } = await api.post<{ data: { id?: string } }>("/api/email/enviar", {
      para: email.destinatario_email,
      assunto: email.assunto,
      html: email.corpo_html ?? undefined,
      texto: email.corpo_texto ?? undefined,
    });

    await atualizarStatusEmail(emailId, "enviado", {
      provedor_message_id: resultado?.id,
      tentativas: email.tentativas + 1,
      enviado_em: new Date().toISOString(),
      ultimo_erro: null,
    });

    return { ...email, status: "enviado", provedor_message_id: resultado?.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    await atualizarStatusEmail(emailId, "falhou", {
      tentativas: email.tentativas + 1,
      ultimo_erro: msg,
    });
    return { ...email, status: "falhou", ultimo_erro: msg };
  }
}

/** Estatísticas de emails */
export async function obterEstatisticasEmails(): Promise<{
  total: number;
  enviados: number;
  falhas: number;
  pendentes: number;
  taxa_sucesso: number;
}> {
  const { data } = await api.get<{ data: {
    total: number;
    enviados: number;
    falhas: number;
    pendentes: number;
  } }>("/api/emails?stats=true");

  const t = data?.total ?? 0;
  const e = data?.enviados ?? 0;

  return {
    total: t,
    enviados: e,
    falhas: data?.falhas ?? 0,
    pendentes: data?.pendentes ?? 0,
    taxa_sucesso: t > 0 ? Math.round((e / t) * 10000) / 100 : 0,
  };
}
