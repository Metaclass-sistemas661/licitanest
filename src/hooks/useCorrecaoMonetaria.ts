// Hook de Correção Monetária — Fase 8
// Gerencia estado de índices, importação e aplicação de correção
import { useCallback, useState } from "react";
import type {
  IndiceCorrecao,
  TipoIndice,
  ResumoCorrecaoCesta,
  LogImportacaoIndices,
} from "@/tipos";
import {
  listarIndices,
  ultimoIndiceDisponivel,
  aplicarCorrecaoCesta,
  removerCorrecaoCesta,
  importarEPersistirIndices,
  listarLogsImportacao,
} from "@/servicos/correcaoMonetaria";

// ── Hook para índices ──────────────────────────────
export function useIndicesCorrecao() {
  const [indices, setIndices] = useState<IndiceCorrecao[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(
    async (tipo: TipoIndice, anoInicio?: number, anoFim?: number) => {
      setCarregando(true);
      setErro(null);
      try {
        const data = await listarIndices(tipo, anoInicio, anoFim);
        setIndices(data);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao carregar índices");
        setIndices([]);
      } finally {
        setCarregando(false);
      }
    },
    [],
  );

  const buscarUltimo = useCallback(async (tipo: TipoIndice) => {
    try {
      return await ultimoIndiceDisponivel(tipo);
    } catch {
      return null;
    }
  }, []);

  return { indices, carregando, erro, carregar, buscarUltimo };
}

// ── Hook para importação de índices ─────────────────
export function useImportacaoIndices() {
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<{
    tipo: TipoIndice;
    importados: number;
    erro?: string;
  } | null>(null);
  const [logs, setLogs] = useState<LogImportacaoIndices[]>([]);

  const importar = useCallback(async (tipo: TipoIndice, anoInicio = 2015) => {
    setImportando(true);
    setResultado(null);
    try {
      const res = await importarEPersistirIndices(tipo, anoInicio);
      setResultado({ tipo, ...res });
      return res;
    } catch (e) {
      const erro = e instanceof Error ? e.message : "Erro desconhecido";
      setResultado({ tipo, importados: 0, erro });
      return { importados: 0, erro };
    } finally {
      setImportando(false);
    }
  }, []);

  const carregarLogs = useCallback(async () => {
    try {
      const data = await listarLogsImportacao(20);
      setLogs(data);
    } catch {
      setLogs([]);
    }
  }, []);

  return { importando, resultado, logs, importar, carregarLogs };
}

// ── Hook para correção de cesta ─────────────────────
export function useCorrecaoCesta() {
  const [aplicando, setAplicando] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const [resumo, setResumo] = useState<ResumoCorrecaoCesta | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const aplicar = useCallback(
    async (cestaId: string, tipoIndice: TipoIndice, dataBase: string) => {
      setAplicando(true);
      setErro(null);
      setResumo(null);
      try {
        const res = await aplicarCorrecaoCesta(cestaId, tipoIndice, dataBase);
        setResumo(res);
        return res;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro ao aplicar correção";
        setErro(msg);
        return null;
      } finally {
        setAplicando(false);
      }
    },
    [],
  );

  const remover = useCallback(async (cestaId: string) => {
    setRemovendo(true);
    setErro(null);
    try {
      await removerCorrecaoCesta(cestaId);
      setResumo(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao remover correção");
    } finally {
      setRemovendo(false);
    }
  }, []);

  const limpar = useCallback(() => {
    setResumo(null);
    setErro(null);
  }, []);

  return { aplicando, removendo, resumo, erro, aplicar, remover, limpar };
}
