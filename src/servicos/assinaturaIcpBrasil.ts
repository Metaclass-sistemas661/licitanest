// ═══════════════════════════════════════════════════════════════════════════════
// Serviço de Assinatura Digital ICP-Brasil — Fase 11.2
// Integração com certificados A1/A3 via Web PKI ou API REST
// Mantém assinatura eletrônica simples como fallback
// ═══════════════════════════════════════════════════════════════════════════════
import { api } from "@/lib/api";
import type {
  AssinaturaDigitalICP,
  CertificadoDigital,
  TipoAssinatura,
  VerificacaoAssinatura,
} from "@/tipos";

// ╔══════════════════════════════════════════════════════╗
// ║  1. DETECÇÃO E LISTAGEM DE CERTIFICADOS              ║
// ╚══════════════════════════════════════════════════════╝

/**
 * Verifica se o ambiente suporta assinatura ICP-Brasil.
 * Atualmente detecta se uma extensão de Web PKI está disponível
 * (ex: Lacuna Web PKI, BRy Signer, Certisign).
 */
export function isIcpBrasilDisponivel(): boolean {
  // Web PKI expõe objeto global quando extensão/plugin está ativa
  return typeof window !== "undefined" && !!(
    (window as unknown as Record<string, unknown>)["LacunaWebPKI"] ||
    (window as unknown as Record<string, unknown>)["BrySigner"] ||
    (window as unknown as Record<string, unknown>)["webPkiExtension"]
  );
}

/**
 * Listar certificados ICP-Brasil disponíveis no dispositivo (A1 e A3).
 * Requer extensão Web PKI instalada no navegador.
 */
export async function listarCertificados(): Promise<CertificadoDigital[]> {
  try {
    const { data } = await api.get<{ data: CertificadoDigital[] }>(
      "/api/assinaturas-digitais/certificados",
    );
    return data ?? [];
  } catch {
    // Fallback: sem certificados disponíveis
    return [];
  }
}

// ╔══════════════════════════════════════════════════════╗
// ║  2. ASSINATURA DIGITAL COM CERTIFICADO ICP-BRASIL    ║
// ╚══════════════════════════════════════════════════════╝

interface AssinarDocumentoParams {
  referencia_tipo: string;
  referencia_id: string;
  conteudo_documento: ArrayBuffer | Uint8Array;
  certificado_thumbprint: string;
  nome_assinante: string;
  cpf_cnpj_assinante: string;
}

/**
 * Assinar documento digitalmente com certificado ICP-Brasil.
 *
 * Fluxo:
 * 1. Gera hash SHA-256 do conteúdo no client
 * 2. Envia hash + thumbprint do certificado ao server
 * 3. Server orquestra a assinatura PKCS#7 (CAdES ou PAdES)
 * 4. Retorna assinatura digital com carimbo de tempo
 */
export async function assinarDocumentoICP(
  params: AssinarDocumentoParams,
): Promise<AssinaturaDigitalICP> {
  const hash = await gerarHashSHA256(params.conteudo_documento);

  const { data } = await api.post<{ data: AssinaturaDigitalICP }>(
    "/api/assinaturas-digitais",
    {
      referencia_tipo: params.referencia_tipo,
      referencia_id: params.referencia_id,
      hash_documento: hash,
      certificado_thumbprint: params.certificado_thumbprint,
      nome_assinante: params.nome_assinante,
      cpf_cnpj_assinante: params.cpf_cnpj_assinante,
      tipo_assinatura: "icp-brasil" as TipoAssinatura,
    },
  );

  return data;
}

// ╔══════════════════════════════════════════════════════╗
// ║  3. VERIFICAÇÃO DE ASSINATURA                        ║
// ╚══════════════════════════════════════════════════════╝

/**
 * Verificar assinatura digital de um documento.
 *
 * Valida:
 * - Integridade do hash (SHA-256 bate com original)
 * - Certificado dentro da validade
 * - Cadeia de certificação confiável (ICP-Brasil root CAs)
 * - Certificado não revogado (CRL/OCSP)
 */
export async function verificarAssinatura(
  assinatura_id: string,
  conteudo_documento?: ArrayBuffer | Uint8Array,
): Promise<VerificacaoAssinatura> {
  const payload: Record<string, string | undefined> = {
    assinatura_id,
  };

  if (conteudo_documento) {
    payload.hash_documento = await gerarHashSHA256(conteudo_documento);
  }

  const { data } = await api.post<{ data: VerificacaoAssinatura }>(
    "/api/assinaturas-digitais/verificar",
    payload,
  );

  return data;
}

/**
 * Buscar assinaturas digitais de um documento.
 */
export async function buscarAssinaturasDigitais(
  referencia_tipo: string,
  referencia_id: string,
): Promise<AssinaturaDigitalICP[]> {
  const params = new URLSearchParams({ referencia_tipo, referencia_id });
  const { data } = await api.get<{ data: AssinaturaDigitalICP[] }>(
    `/api/assinaturas-digitais?${params.toString()}`,
  );
  return data ?? [];
}

// ╔══════════════════════════════════════════════════════╗
// ║  4. DECISÃO AUTOMÁTICA: ICP-BRASIL vs SIMPLES        ║
// ╚══════════════════════════════════════════════════════╝

export type ModoAssinatura = "icp-obrigatorio" | "icp-preferencial" | "simples";

/**
 * Determinar modo de assinatura baseado na configuração do TCE/município.
 */
export async function obterModoAssinatura(): Promise<ModoAssinatura> {
  try {
    const { data } = await api.get<{ data: { modo: ModoAssinatura } }>(
      "/api/assinaturas-digitais/modo",
    );
    return data?.modo ?? "simples";
  } catch {
    return "simples";
  }
}

/**
 * Resolver tipo de assinatura a usar.
 *
 * - icp-obrigatorio: exige ICP-Brasil, erro se indisponível
 * - icp-preferencial: usa ICP se disponível, senão fallback para simples
 * - simples: sempre assinatura eletrônica simples (SHA-256 + MP 2.200-2)
 */
export function resolverTipoAssinatura(
  modo: ModoAssinatura,
  icpDisponivel: boolean,
): { tipo: TipoAssinatura; fallback: boolean } {
  if (modo === "icp-obrigatorio") {
    if (!icpDisponivel) {
      throw new Error(
        "Assinatura ICP-Brasil é obrigatória para este município/TCE, " +
          "mas nenhum certificado digital foi detectado. " +
          "Instale a extensão Web PKI e conecte seu certificado A1 ou A3.",
      );
    }
    return { tipo: "icp-brasil", fallback: false };
  }

  if (modo === "icp-preferencial" && icpDisponivel) {
    return { tipo: "icp-brasil", fallback: false };
  }

  return { tipo: "simples", fallback: modo === "icp-preferencial" };
}

// ╔══════════════════════════════════════════════════════╗
// ║  UTILITÁRIOS                                          ║
// ╚══════════════════════════════════════════════════════╝

async function gerarHashSHA256(dados: ArrayBuffer | Uint8Array): Promise<string> {
  const buffer = dados instanceof Uint8Array ? dados.buffer as ArrayBuffer : dados;
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
