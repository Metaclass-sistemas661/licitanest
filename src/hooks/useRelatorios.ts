// Hook de Relatórios — Fase 11
import { useCallback, useState } from "react";
import type {
  ConfigRelatorio,
  CabecalhoRelatorio,
  ItemCesta,
  RelatorioGerado,
  DocumentoComprobatorio,
} from "@/tipos";
import {
  gerarEBaixarRelatorio,
  listarRelatoriosGerados,
} from "@/servicos/relatorios";
import {
  listarDocumentosCesta,
  uploadDocumentoComprobatorio,
  removerDocumento,
  obterUrlDocumentoComprobatorio,
  formatarTamanhoArquivo,
} from "@/servicos/documentosComprobatorios";

interface UseRelatoriosReturn {
  gerando: boolean;
  erro: string | null;
  historico: RelatorioGerado[];
  carregandoHistorico: boolean;
  gerar: (config: ConfigRelatorio, itens: ItemCesta[], cabecalho: CabecalhoRelatorio, servidorId: string) => Promise<void>;
  carregarHistorico: (cestaId: string) => Promise<void>;
}

export function useRelatorios(): UseRelatoriosReturn {
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [historico, setHistorico] = useState<RelatorioGerado[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);

  const gerar = useCallback(
    async (
      config: ConfigRelatorio,
      itens: ItemCesta[],
      cabecalho: CabecalhoRelatorio,
      servidorId: string,
    ) => {
      setGerando(true);
      setErro(null);
      try {
        await gerarEBaixarRelatorio(config, itens, cabecalho, servidorId);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Erro ao gerar relatório";
        setErro(msg);
        throw e;
      } finally {
        setGerando(false);
      }
    },
    [],
  );

  const carregarHistorico = useCallback(async (cestaId: string) => {
    setCarregandoHistorico(true);
    try {
      const data = await listarRelatoriosGerados(cestaId);
      setHistorico(data);
    } catch {
      // silently fail
    } finally {
      setCarregandoHistorico(false);
    }
  }, []);

  return { gerando, erro, historico, carregandoHistorico, gerar, carregarHistorico };
}

// ── Hook de Documentos Comprobatórios ────────────────

interface UseDocumentosReturn {
  documentos: (DocumentoComprobatorio & { item_descricao?: string; fonte_nome?: string })[];
  carregando: boolean;
  enviando: boolean;
  erro: string | null;
  carregar: (cestaId: string) => Promise<void>;
  upload: (precoItemId: string, arquivo: File) => Promise<DocumentoComprobatorio>;
  remover: (documentoId: string) => Promise<void>;
  obterUrl: (storagePath: string) => Promise<string>;
  fmtTamanho: (bytes: number | null) => string;
}

export function useDocumentos(): UseDocumentosReturn {
  const [documentos, setDocumentos] = useState<(DocumentoComprobatorio & { item_descricao?: string; fonte_nome?: string })[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async (cestaId: string) => {
    setCarregando(true);
    try {
      const data = await listarDocumentosCesta(cestaId);
      setDocumentos(data);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar documentos");
    } finally {
      setCarregando(false);
    }
  }, []);

  const upload = useCallback(async (precoItemId: string, arquivo: File) => {
    setEnviando(true);
    setErro(null);
    try {
      const doc = await uploadDocumentoComprobatorio(precoItemId, arquivo);
      setDocumentos((prev) => [doc, ...prev]);
      return doc;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao enviar documento";
      setErro(msg);
      throw e;
    } finally {
      setEnviando(false);
    }
  }, []);

  const remover = useCallback(async (documentoId: string) => {
    try {
      await removerDocumento(documentoId);
      setDocumentos((prev) => prev.filter((d) => d.id !== documentoId));
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao remover documento");
    }
  }, []);

  const obterUrl = useCallback(async (storagePath: string) => {
    return obterUrlDocumentoComprobatorio(storagePath);
  }, []);

  return {
    documentos,
    carregando,
    enviando,
    erro,
    carregar,
    upload,
    remover,
    obterUrl,
    fmtTamanho: formatarTamanhoArquivo,
  };
}
