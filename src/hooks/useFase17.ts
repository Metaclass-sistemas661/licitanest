// Hooks da Fase 17 — Workflow, Checklist, CATMAT, LGPD, IA, Importação
import { useCallback, useEffect, useState } from "react";
import type {
  CestaWorkflow,
  TramitacaoCesta,
  StatusWorkflow,
  ChecklistConformidade,
  CatmatCatser,
  FiltroCatmat,
  ConsentimentoLgpd,
  SolicitacaoLgpd,
  TipoConsentimento,
  TipoSolicitacaoLgpd,
  StatusSolicitacaoLgpd,
  InteracaoIA,
  TipoInteracaoIA,
  ImportacaoLote,
  MetodologiaCalculo,
  ItemCesta,
} from "@/tipos";
import * as workflowSvc from "@/servicos/workflow";
import * as catmatSvc from "@/servicos/catmat";
import * as lgpdSvc from "@/servicos/lgpd";
import * as iaSvc from "@/servicos/iaGenerativa";
import * as importSvc from "@/servicos/importacaoLote";
import * as memorialSvc from "@/servicos/memorialCalculo";

// ══════════════════════════════════════════════════════
// WORKFLOW DE APROVAÇÃO
// ══════════════════════════════════════════════════════

export function useWorkflow(filtros?: {
  status?: StatusWorkflow;
  secretariaId?: string;
}) {
  const [cestas, setCestas] = useState<CestaWorkflow[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const data = await workflowSvc.listarCestasWorkflow(filtros);
      setCestas(data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar workflow");
    } finally {
      setCarregando(false);
    }
  }, [filtros?.status, filtros?.secretariaId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const tramitar = useCallback(
    async (
      cestaId: string,
      statusNovo: StatusWorkflow,
      servidorId: string,
      observacoes?: string,
      motivoDevolucao?: string,
    ) => {
      await workflowSvc.tramitarCesta(
        cestaId,
        statusNovo,
        servidorId,
        observacoes,
        motivoDevolucao,
      );
      await carregar();
    },
    [carregar],
  );

  return { cestas, carregando, erro, tramitar, recarregar: carregar };
}

export function useTramitacoes(cestaId: string | undefined) {
  const [tramitacoes, setTramitacoes] = useState<TramitacaoCesta[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    if (!cestaId) return;
    setCarregando(true);
    try {
      const data = await workflowSvc.listarTramitacoes(cestaId);
      setTramitacoes(data);
    } catch {
      // silencioso
    } finally {
      setCarregando(false);
    }
  }, [cestaId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return { tramitacoes, carregando, recarregar: carregar };
}

// ══════════════════════════════════════════════════════
// CHECKLIST IN 65/2021
// ══════════════════════════════════════════════════════

export function useChecklist(cestaId: string | undefined) {
  const [checklist, setChecklist] = useState<ChecklistConformidade | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    if (!cestaId) return;
    setCarregando(true);
    try {
      const data = await workflowSvc.obterChecklist(cestaId);
      setChecklist(data);
    } catch {
      // sem checklist ainda
    } finally {
      setCarregando(false);
    }
  }, [cestaId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const salvar = useCallback(
    async (dados: Partial<ChecklistConformidade>, servidorId: string) => {
      if (!cestaId) return;
      setSalvando(true);
      try {
        await workflowSvc.salvarChecklist(cestaId, dados, servidorId);
        await carregar();
      } finally {
        setSalvando(false);
      }
    },
    [cestaId, carregar],
  );

  const autoVerificar = useCallback(async (servidorId?: string) => {
    if (!cestaId) return null;
    return await workflowSvc.autoVerificarChecklist(cestaId, servidorId ?? "");
  }, [cestaId]);

  return { checklist, carregando, salvando, salvar, autoVerificar, recarregar: carregar };
}

// ══════════════════════════════════════════════════════
// CATMAT/CATSER
// ══════════════════════════════════════════════════════

export function useCatmat(filtrosIniciais: FiltroCatmat = {}) {
  const [itens, setItens] = useState<CatmatCatser[]>([]);
  const [total, setTotal] = useState(0);
  const [filtros, setFiltros] = useState<FiltroCatmat>(filtrosIniciais);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const buscar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const resultado = await catmatSvc.buscarCatmat(filtros);
      setItens(resultado.data);
      setTotal(resultado.total);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao buscar CATMAT");
    } finally {
      setCarregando(false);
    }
  }, [filtros]);

  useEffect(() => {
    if (filtros.termo || filtros.grupo || filtros.classe) {
      buscar();
    }
  }, [buscar]);

  const mudarFiltros = useCallback((novosFiltros: FiltroCatmat) => {
    setFiltros({ ...novosFiltros, offset: 0 });
  }, []);

  const proximaPagina = useCallback(() => {
    setFiltros((prev) => ({
      ...prev,
      offset: (prev.offset ?? 0) + (prev.limite ?? 50),
    }));
  }, []);

  return {
    itens,
    total,
    filtros,
    carregando,
    erro,
    buscar,
    mudarFiltros,
    proximaPagina,
  };
}

export function useEstatisticasCatmat() {
  const [stats, setStats] = useState<{
    total: number;
    materiais: number;
    servicos: number;
    sustentaveis: number;
    grupos: number;
  } | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    catmatSvc
      .estatisticasCatmat()
      .then(setStats)
      .finally(() => setCarregando(false));
  }, []);

  return { stats, carregando };
}

// ══════════════════════════════════════════════════════
// LGPD
// ══════════════════════════════════════════════════════

export function useConsentimentos(servidorId: string | undefined) {
  const [consentimentos, setConsentimentos] = useState<ConsentimentoLgpd[]>([]);
  const [pendentes, setPendentes] = useState<TipoConsentimento[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    if (!servidorId) return;
    setCarregando(true);
    try {
      const [lista, check] = await Promise.all([
        lgpdSvc.listarConsentimentos(),
        lgpdSvc.verificarConsentimentosObrigatorios(servidorId),
      ]);
      setConsentimentos(lista);
      setPendentes(check.pendentes);
    } catch {
      // silencioso
    } finally {
      setCarregando(false);
    }
  }, [servidorId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const registrar = useCallback(
    async (tipo: TipoConsentimento, aceito: boolean) => {
      if (!servidorId) return;
      await lgpdSvc.registrarConsentimento(servidorId, tipo, aceito);
      await carregar();
    },
    [servidorId, carregar],
  );

  const revogar = useCallback(
    async (tipo: TipoConsentimento) => {
      if (!servidorId) return;
      await lgpdSvc.revogarConsentimento(servidorId, tipo);
      await carregar();
    },
    [servidorId, carregar],
  );

  return { consentimentos, pendentes, carregando, registrar, revogar, recarregar: carregar };
}

export function useSolicitacoesLgpd(servidorId?: string, status?: StatusSolicitacaoLgpd) {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoLgpd[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const data = await lgpdSvc.listarSolicitacoesLgpd(servidorId, status);
      setSolicitacoes(data);
    } catch {
      // silencioso
    } finally {
      setCarregando(false);
    }
  }, [servidorId, status]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const criar = useCallback(
    async (tipo: TipoSolicitacaoLgpd, descricao?: string) => {
      if (!servidorId) return;
      await lgpdSvc.criarSolicitacaoLgpd(servidorId, tipo, descricao);
      await carregar();
    },
    [servidorId, carregar],
  );

  return { solicitacoes, carregando, criar, recarregar: carregar };
}

// ══════════════════════════════════════════════════════
// IA GENERATIVA
// ══════════════════════════════════════════════════════

export function useIA(servidorId: string | undefined) {
  const [historico, setHistorico] = useState<InteracaoIA[]>([]);
  const [processando, setProcessando] = useState(false);
  const [ultimaResposta, setUltimaResposta] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregarHistorico = useCallback(
    async (tipo?: TipoInteracaoIA) => {
      if (!servidorId) return;
      try {
        const data = await iaSvc.listarInteracoesIA(servidorId, tipo);
        setHistorico(data);
      } catch {
        // silencioso
      }
    },
    [servidorId],
  );

  useEffect(() => {
    carregarHistorico();
  }, [carregarHistorico]);

  const sugerirFontes = useCallback(
    async (descricao: string, categoria?: string) => {
      if (!servidorId) return null;
      setProcessando(true);
      setErro(null);
      try {
        const result = await iaSvc.sugerirFontes(servidorId, descricao, categoria);
        setUltimaResposta(result.texto);
        await carregarHistorico();
        return result;
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao processar IA");
        return null;
      } finally {
        setProcessando(false);
      }
    },
    [servidorId, carregarHistorico],
  );

  const analisarPrecos = useCallback(
    async (itens: Parameters<typeof iaSvc.analisarPrecos>[1]) => {
      if (!servidorId) return null;
      setProcessando(true);
      setErro(null);
      try {
        const result = await iaSvc.analisarPrecos(servidorId, itens);
        setUltimaResposta(result.texto);
        await carregarHistorico();
        return result;
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao analisar preços");
        return null;
      } finally {
        setProcessando(false);
      }
    },
    [servidorId, carregarHistorico],
  );

  const gerarJustificativa = useCallback(
    async (dados: Parameters<typeof iaSvc.gerarJustificativaIA>[1]) => {
      if (!servidorId) return null;
      setProcessando(true);
      setErro(null);
      try {
        const result = await iaSvc.gerarJustificativaIA(servidorId, dados);
        setUltimaResposta(result.texto);
        await carregarHistorico();
        return result;
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao gerar justificativa");
        return null;
      } finally {
        setProcessando(false);
      }
    },
    [servidorId, carregarHistorico],
  );

  const pesquisarNatural = useCallback(
    async (query: string) => {
      if (!servidorId) return null;
      setProcessando(true);
      setErro(null);
      try {
        const result = await iaSvc.pesquisaNatural(servidorId, query);
        setUltimaResposta(result.texto);
        await carregarHistorico();
        return result;
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro na pesquisa");
        return null;
      } finally {
        setProcessando(false);
      }
    },
    [servidorId, carregarHistorico],
  );

  const avaliar = useCallback(async (interacaoId: string, nota: number) => {
    await iaSvc.avaliarInteracaoIA(interacaoId, nota);
    await carregarHistorico();
  }, [carregarHistorico]);

  return {
    historico,
    processando,
    ultimaResposta,
    erro,
    configurada: iaSvc.isIAConfigurada(),
    sugerirFontes,
    analisarPrecos,
    gerarJustificativa,
    pesquisarNatural,
    avaliar,
    carregarHistorico,
  };
}

// ══════════════════════════════════════════════════════
// IMPORTAÇÃO EM LOTE
// ══════════════════════════════════════════════════════

export function useImportacaoLote(cestaId?: string) {
  const [importacoes, setImportacoes] = useState<ImportacaoLote[]>([]);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<ImportacaoLote | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const data = await importSvc.listarImportacoes(
        cestaId ? { cestaId } : undefined,
      );
      setImportacoes(data);
    } catch {
      // silencioso
    }
  }, [cestaId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const importarPrecos = useCallback(
    async (arquivo: File, cestaIdParam: string, servidorId: string) => {
      setImportando(true);
      setErro(null);
      setResultado(null);
      try {
        const conteudo = await importSvc.lerArquivoTexto(arquivo);
        const res = await importSvc.importarPrecosCSV(cestaIdParam, conteudo, servidorId);
        setResultado(res);
        await carregar();
        return res;
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro na importação");
        return null;
      } finally {
        setImportando(false);
      }
    },
    [carregar],
  );

  const importarFornecedores = useCallback(
    async (arquivo: File, servidorId: string) => {
      setImportando(true);
      setErro(null);
      setResultado(null);
      try {
        const conteudo = await importSvc.lerArquivoTexto(arquivo);
        const res = await importSvc.importarFornecedoresCSV(conteudo, servidorId);
        setResultado(res);
        await carregar();
        return res;
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro na importação");
        return null;
      } finally {
        setImportando(false);
      }
    },
    [carregar],
  );

  return {
    importacoes,
    importando,
    resultado,
    erro,
    importarPrecos,
    importarFornecedores,
    baixarTemplate: importSvc.baixarTemplateCSV,
    recarregar: carregar,
  };
}

// ══════════════════════════════════════════════════════
// MEMORIAL DE CÁLCULO
// ══════════════════════════════════════════════════════

export function useMemorialCalculo() {
  const [gerando, setGerando] = useState(false);

  const gerarMemorial = useCallback(
    async (
      cestaId: string,
      itens: ItemCesta[],
      metodologia: MetodologiaCalculo,
      orgao: string,
      municipio: string,
      uf: string,
      responsavel: string,
      objeto: string,
    ) => {
      return memorialSvc.montarMemorialCalculo(
        { id: cestaId, descricao_objeto: objeto, metodologia_calculo: metodologia },
        itens,
        { orgao, municipio, uf, responsavel },
      );
    },
    [],
  );

  const gerarPDFMemorial = useCallback(
    async (
      cestaId: string,
      itens: ItemCesta[],
      metodologia: MetodologiaCalculo,
      orgao: string,
      municipio: string,
      uf: string,
      responsavel: string,
      objeto: string,
    ) => {
      setGerando(true);
      try {
        const memorial = memorialSvc.montarMemorialCalculo(
          { id: cestaId, descricao_objeto: objeto, metodologia_calculo: metodologia },
          itens,
          { orgao, municipio, uf, responsavel },
        );
        await memorialSvc.gerarPDFMemorialCalculo(memorial);
      } finally {
        setGerando(false);
      }
    },
    [],
  );

  const gerarPDFJustificativa = useCallback(
    async (
      cestaId: string,
      itens: ItemCesta[],
      metodologia: MetodologiaCalculo,
      orgao: string,
      municipio: string,
      uf: string,
      responsavel: string,
      objeto: string,
    ) => {
      setGerando(true);
      try {
        const memorial = memorialSvc.montarMemorialCalculo(
          { id: cestaId, descricao_objeto: objeto, metodologia_calculo: metodologia },
          itens,
          { orgao, municipio, uf, responsavel },
        );
        await memorialSvc.gerarPDFJustificativa(memorial);
      } finally {
        setGerando(false);
      }
    },
    [],
  );

  return { gerando, gerarMemorial, gerarPDFMemorial, gerarPDFJustificativa };
}
