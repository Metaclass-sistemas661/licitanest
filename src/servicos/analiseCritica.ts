// Serviço de Análise Crítica de Cestas de Preços
// Calcula divergências, semáforo e gera alertas por item
import { api } from "@/lib/api";
import type {
  AnalisePreco,
  AnaliseCriticaItem,
  ClassificacaoSemaforo,
  ItemCesta,
} from "@/tipos";

// ── Limites do semáforo ──────────────────────────────
const LIMITE_VERDE = 20;    // < 20% divergência → verde
const LIMITE_AMARELO = 50;  // 20-50% → amarelo; > 50% → vermelho

// ── Classificação do semáforo ────────────────────────
export function classificarSemaforo(divergenciaPercentual: number): ClassificacaoSemaforo {
  const abs = Math.abs(divergenciaPercentual);
  if (abs < LIMITE_VERDE) return "verde";
  if (abs < LIMITE_AMARELO) return "amarelo";
  return "vermelho";
}

// Cores Tailwind por classificação
export const SEMAFORO_CORES: Record<ClassificacaoSemaforo, string> = {
  verde: "bg-emerald-100 text-emerald-800 border-emerald-300",
  amarelo: "bg-amber-100 text-amber-800 border-amber-300",
  vermelho: "bg-red-100 text-red-800 border-red-300",
};

export const SEMAFORO_DOT: Record<ClassificacaoSemaforo, string> = {
  verde: "bg-emerald-500",
  amarelo: "bg-amber-500",
  vermelho: "bg-red-500",
};

// ── Calcular desvio padrão ───────────────────────────
function desvioPadrao(valores: number[]): number {
  if (valores.length < 2) return 0;
  const media = valores.reduce((a, b) => a + b, 0) / valores.length;
  const somaQuadrados = valores.reduce((acc, v) => acc + Math.pow(v - media, 2), 0);
  return Math.sqrt(somaQuadrados / (valores.length - 1)); // sample std dev
}

// ── Analisar preços de um item ───────────────────────
export function analisarPrecosItem(
  item: ItemCesta,
  percentualAlerta: number = 30,
): AnaliseCriticaItem {
  const precos = item.precos ?? [];

  // Preços válidos (não excluídos) para cálculo da média
  const validos = precos.filter((p) => !p.excluido_calculo);
  const valores = validos.map((p) => Number(p.valor_corrigido ?? p.valor_unitario));

  const media = valores.length > 0
    ? valores.reduce((a, b) => a + b, 0) / valores.length
    : null;

  const sorted = [...valores].sort((a, b) => a - b);
  const mediana = sorted.length > 0
    ? sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)]
    : null;

  const menor = sorted.length > 0 ? sorted[0] : null;
  const maior = sorted.length > 0 ? sorted[sorted.length - 1] : null;
  const dp = valores.length >= 2 ? desvioPadrao(valores) : null;
  const cv = dp !== null && media !== null && media > 0
    ? (dp / media) * 100
    : null;

  // Analisar cada preço individualmente
  let temAlerta = false;
  const analisePrecos: AnalisePreco[] = precos.map((p) => {
    const valor = Number(p.valor_corrigido ?? p.valor_unitario);
    const divergencia = media && media > 0
      ? ((valor - media) / media) * 100
      : 0;
    const classificacao = classificarSemaforo(divergencia);

    if (!p.excluido_calculo && Math.abs(divergencia) > percentualAlerta) {
      temAlerta = true;
    }

    return {
      preco_id: p.id,
      valor,
      media: media ?? 0,
      divergencia_percentual: Math.round(divergencia * 100) / 100,
      classificacao: p.excluido_calculo ? "vermelho" as ClassificacaoSemaforo : classificacao,
      excluido: p.excluido_calculo,
      justificativa_exclusao: p.justificativa_exclusao,
      fonte_nome: p.fonte?.nome ?? "—",
      fonte_sigla: p.fonte?.sigla ?? "—",
      orgao: p.orgao,
      data_referencia: p.data_referencia,
    };
  });

  return {
    item_id: item.id,
    produto_descricao: item.produto?.descricao ?? "—",
    categoria: item.produto?.categoria?.nome ?? "—",
    unidade: item.produto?.unidade_medida?.sigla ?? "—",
    quantidade: item.quantidade,
    precos: analisePrecos,
    total_precos: precos.length,
    total_excluidos: precos.filter((p) => p.excluido_calculo).length,
    media: media !== null ? Math.round(media * 10000) / 10000 : null,
    mediana: mediana !== null ? Math.round(mediana * 10000) / 10000 : null,
    menor_preco: menor,
    maior_preco: maior,
    desvio_padrao: dp !== null ? Math.round(dp * 10000) / 10000 : null,
    coeficiente_variacao: cv !== null ? Math.round(cv * 100) / 100 : null,
    tem_alerta: temAlerta,
  };
}

// ── Analisar todos os itens de uma cesta ─────────────
export function analisarCesta(
  itens: ItemCesta[],
  percentualAlerta: number = 30,
): AnaliseCriticaItem[] {
  return itens.map((item) => analisarPrecosItem(item, percentualAlerta));
}

// ── Resumo de alertas da cesta ───────────────────────
export interface ResumoAlertas {
  total_itens: number;
  itens_com_alerta: number;
  itens_com_exclusao: number;
  total_precos_vermelhos: number;
  total_precos_amarelos: number;
  total_precos_verdes: number;
}

export function resumoAlertas(analise: AnaliseCriticaItem[]): ResumoAlertas {
  let itensComAlerta = 0;
  let itensComExclusao = 0;
  let vermelhos = 0;
  let amarelos = 0;
  let verdes = 0;

  for (const item of analise) {
    if (item.tem_alerta) itensComAlerta++;
    if (item.total_excluidos > 0) itensComExclusao++;
    for (const p of item.precos) {
      if (p.excluido) continue;
      if (p.classificacao === "vermelho") vermelhos++;
      else if (p.classificacao === "amarelo") amarelos++;
      else verdes++;
    }
  }

  return {
    total_itens: analise.length,
    itens_com_alerta: itensComAlerta,
    itens_com_exclusao: itensComExclusao,
    total_precos_vermelhos: vermelhos,
    total_precos_amarelos: amarelos,
    total_precos_verdes: verdes,
  };
}

// ── Excluir preço do cálculo (com justificativa) ─────
export async function excluirPrecoAnalise(
  precoId: string,
  servidorId: string,
  justificativa: string,
) {
  if (!justificativa.trim()) {
    throw new Error("Justificativa de exclusão é obrigatória");
  }

  const { data } = await api.post<{ data: unknown }>("/api/rpc/excluir_preco_analise", {
    precoId,
    servidorId,
    justificativa: justificativa.trim(),
  });

  return data;
}

// ── Reincluir preço no cálculo ───────────────────────
export async function reincluirPrecoAnalise(
  precoId: string,
  servidorId: string,
) {
  const { data } = await api.post<{ data: unknown }>("/api/rpc/reincluir_preco_analise", {
    precoId,
    servidorId,
  });

  return data;
}

// ── Atualizar percentual de alerta da cesta ──────────
export async function atualizarPercentualAlerta(
  cestaId: string,
  percentual: number,
) {
  if (percentual < 1 || percentual > 100) {
    throw new Error("Percentual deve ser entre 1 e 100");
  }
  await api.put(`/api/cestas/${cestaId}`, {
    percentual_alerta: percentual,
    atualizado_em: new Date().toISOString(),
  });
}

// ── Registrar atividade ──────────────────────────────
export async function registrarAtividade(
  servidorId: string | null,
  secretariaId: string | null,
  tipo: string,
  descricao: string,
  entidadeTipo?: string,
  entidadeId?: string,
  dadosExtra?: Record<string, unknown>,
) {
  try {
    await api.post("/api/auditoria", {
      servidor_id: servidorId,
      secretaria_id: secretariaId,
      tipo,
      descricao,
      entidade_tipo: entidadeTipo ?? null,
      entidade_id: entidadeId ?? null,
      dados_extra: dadosExtra ?? null,
    });
  } catch (err) {
    // Silencioso — erro de atividade não deve bloquear fluxo
    console.warn("Erro ao registrar atividade:", (err as Error).message);
  }
}
