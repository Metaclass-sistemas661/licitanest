// Hook para Análise Crítica de Cestas
import { useCallback, useState } from "react";
import type { AnaliseCriticaItem, ItemCesta } from "@/tipos";
import {
  analisarCesta,
  resumoAlertas,
  excluirPrecoAnalise,
  reincluirPrecoAnalise,
  atualizarPercentualAlerta,
  type ResumoAlertas,
} from "@/servicos/analiseCritica";

export function useAnaliseCritica() {
  const [analise, setAnalise] = useState<AnaliseCriticaItem[]>([]);
  const [resumo, setResumo] = useState<ResumoAlertas | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  /** Executa análise nos itens (cálculo client-side) */
  const calcular = useCallback(
    (itens: ItemCesta[], percentualAlerta: number = 30) => {
      setCarregando(true);
      try {
        const resultado = analisarCesta(itens, percentualAlerta);
        setAnalise(resultado);
        setResumo(resumoAlertas(resultado));
        setErro(null);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro na análise");
      } finally {
        setCarregando(false);
      }
    },
    [],
  );

  /** Exclui um preço do cálculo (requer justificativa) */
  const excluir = useCallback(
    async (precoId: string, servidorId: string, justificativa: string) => {
      try {
        await excluirPrecoAnalise(precoId, servidorId, justificativa);
        return true;
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao excluir preço");
        return false;
      }
    },
    [],
  );

  /** Reincluir um preço no cálculo */
  const reincluir = useCallback(
    async (precoId: string, servidorId: string) => {
      try {
        await reincluirPrecoAnalise(precoId, servidorId);
        return true;
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao reincluir preço");
        return false;
      }
    },
    [],
  );

  /** Atualizar o percentual de alerta */
  const atualizarAlerta = useCallback(
    async (cestaId: string, percentual: number) => {
      try {
        await atualizarPercentualAlerta(cestaId, percentual);
        return true;
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao salvar percentual");
        return false;
      }
    },
    [],
  );

  return {
    analise,
    resumo,
    carregando,
    erro,
    calcular,
    excluir,
    reincluir,
    atualizarAlerta,
  };
}
