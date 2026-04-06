// ═══════════════════════════════════════════════════════════════════════════════
// Serviço de Documentos Comprobatórios — Fase 11
// Upload, listagem e download de documentos via API
// ═══════════════════════════════════════════════════════════════════════════════
import { api } from "@/lib/api";
import type { DocumentoComprobatorio } from "@/tipos";

// ╔══════════════════════════════════════════════════════╗
// ║  1. UPLOAD                                           ║
// ╚══════════════════════════════════════════════════════╝

/** Upload de documento comprobatório vinculado a um preço */
export async function uploadDocumentoComprobatorio(
  precoItemId: string,
  arquivo: File,
): Promise<DocumentoComprobatorio> {
  const formData = new FormData();
  formData.append("arquivo", arquivo);
  formData.append("preco_item_id", precoItemId);

  const { data } = await api.upload<{ data: DocumentoComprobatorio }>(
    "/api/documentos/upload",
    formData,
  );
  return data;
}

/** Upload de múltiplos documentos */
export async function uploadMultiplosDocumentos(
  precoItemId: string,
  arquivos: File[],
): Promise<DocumentoComprobatorio[]> {
  const resultados: DocumentoComprobatorio[] = [];
  for (const arquivo of arquivos) {
    const doc = await uploadDocumentoComprobatorio(precoItemId, arquivo);
    resultados.push(doc);
  }
  return resultados;
}

// ╔══════════════════════════════════════════════════════╗
// ║  2. LISTAGEM                                         ║
// ╚══════════════════════════════════════════════════════╝

/** Listar documentos de um preço */
export async function listarDocumentosPreco(
  precoItemId: string,
): Promise<DocumentoComprobatorio[]> {
  const { data } = await api.get<{ data: DocumentoComprobatorio[] }>(
    `/api/documentos/preco/${encodeURIComponent(precoItemId)}`,
  );
  return data ?? [];
}

/** Listar todos os documentos de uma cesta (via itens → preços) */
export async function listarDocumentosCesta(
  cestaId: string,
): Promise<(DocumentoComprobatorio & { item_descricao?: string; fonte_nome?: string })[]> {
  const { data } = await api.get<{ data: (DocumentoComprobatorio & { item_descricao?: string; fonte_nome?: string })[] }>(
    `/api/documentos/cesta/${encodeURIComponent(cestaId)}`,
  );
  return data ?? [];
}

// ╔══════════════════════════════════════════════════════╗
// ║  3. DOWNLOAD E URL                                   ║
// ╚══════════════════════════════════════════════════════╝

/** Obter URL pública temporária (60min) */
export async function obterUrlDocumentoComprobatorio(
  storagePath: string,
  expiresIn = 3600,
): Promise<string> {
  const { data } = await api.get<{ data: { signedUrl: string } }>(
    `/api/documentos/url?path=${encodeURIComponent(storagePath)}&expiresIn=${expiresIn}`,
  );
  return data.signedUrl;
}

/** Download direto do documento */
export async function baixarDocumento(storagePath: string): Promise<Blob> {
  const { data } = await api.get<{ data: { downloadUrl: string } }>(
    `/api/documentos/download?path=${encodeURIComponent(storagePath)}`,
  );
  const response = await fetch(data.downloadUrl);
  if (!response.ok) throw new Error("Erro ao baixar documento");
  return response.blob();
}

// ╔══════════════════════════════════════════════════════╗
// ║  4. REMOÇÃO                                          ║
// ╚══════════════════════════════════════════════════════╝

/** Remover documento do storage e do banco */
export async function removerDocumento(documentoId: string): Promise<void> {
  await api.delete(`/api/documentos/${encodeURIComponent(documentoId)}`);
}

// ╔══════════════════════════════════════════════════════╗
// ║  5. UTILITÁRIOS                                      ║
// ╚══════════════════════════════════════════════════════╝

/** Formatar tamanho de arquivo para exibição */
export function formatarTamanhoArquivo(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
