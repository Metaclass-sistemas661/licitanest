// Serviço de IA Generativa — Integração real com OpenAI/Anthropic
// Sugestão de fontes, análise de preços, geração de justificativas, pesquisa natural
import { api } from "@/lib/api";
import type { InteracaoIA, TipoInteracaoIA, ItemCesta, MetodologiaCalculo } from "@/tipos";
import { LABELS_METODOLOGIA } from "./workflow";

// ══════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ══════════════════════════════════════════════════════
// API Keys de IA ficam APENAS no servidor.
// O frontend chama a API, sem expor chaves.

export function isIAConfigurada(): boolean {
  // Sempre retorna true — a Edge Function decide se há chave configurada
  return true;
}

// ══════════════════════════════════════════════════════
// CHAMADA À API
// ══════════════════════════════════════════════════════

interface RespostaIA {
  texto: string;
  tokens_input: number;
  tokens_output: number;
  modelo: string;
  duracao_ms: number;
}

async function chamarIA(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 2000,
): Promise<RespostaIA> {
  const inicio = Date.now();

  const { data } = await api.post<{ data: Record<string, unknown> }>("/api/ia/completar", {
    systemPrompt,
    userMessage,
    maxTokens,
  });

  if (data?.error) {
    throw new Error(data.error as string);
  }

  return {
    texto: (data?.texto as string) ?? "",
    tokens_input: (data?.tokens_input as number) ?? 0,
    tokens_output: (data?.tokens_output as number) ?? 0,
    modelo: (data?.modelo as string) ?? "unknown",
    duracao_ms: (data?.duracao_ms as number) ?? (Date.now() - inicio),
  };
}

// ── Salvar interação no banco ────────────────────────────
async function salvarInteracao(
  servidorId: string,
  tipo: TipoInteracaoIA,
  prompt: string,
  resposta: RespostaIA,
): Promise<InteracaoIA> {
  const { data } = await api.post<{ data: InteracaoIA }>("/api/ia/interacoes", {
    servidor_id: servidorId,
    tipo,
    prompt,
    resposta: resposta.texto,
    modelo: resposta.modelo,
    tokens_input: resposta.tokens_input,
    tokens_output: resposta.tokens_output,
    custo_estimado: estimarCusto(resposta),
    duracao_ms: resposta.duracao_ms,
  });

  return data as InteracaoIA;
}

function estimarCusto(resp: RespostaIA): number {
  // Estimativa de custo por token (USD)
  if (resp.modelo.includes("claude")) {
    return (resp.tokens_input * 0.003 + resp.tokens_output * 0.015) / 1000;
  }
  // gpt-4o-mini
  return (resp.tokens_input * 0.00015 + resp.tokens_output * 0.0006) / 1000;
}

// ══════════════════════════════════════════════════════
// FUNCIONALIDADES DE IA
// ══════════════════════════════════════════════════════

const SYSTEM_PROMPT_BASE = `Você é um especialista em compras públicas brasileiras, com profundo conhecimento da Lei 14.133/2021 (Nova Lei de Licitações), Instrução Normativa SEGES/ME nº 65/2021 (pesquisa de preços), e normas dos Tribunais de Contas Estaduais.

Contexto: Você auxilia servidores públicos municipais na formação de cestas de preços para processos licitatórios. Suas respostas devem ser formais, objetivas e fundamentadas na legislação vigente.

Idioma: Sempre responda em português brasileiro.`;

/**
 * Sugere fontes de preço para um produto específico.
 */
export async function sugerirFontes(
  servidorId: string,
  descricaoProduto: string,
  categoria?: string,
): Promise<{ texto: string; interacao: InteracaoIA }> {
  const prompt = `Produto: "${descricaoProduto}"${categoria ? `\nCategoria: ${categoria}` : ""}

Sugira as melhores fontes de preço para pesquisar esse produto, considerando:
1. Fontes obrigatórias conforme IN 65/2021
2. Bases de dados governamentais disponíveis (PNCP, Painel de Preços, BPS, SINAPI, CONAB, CEASA, CMED)
3. TCEs estaduais mais relevantes
4. Dicas para obter preços mais recentes e confiáveis
5. Cuidados específicos para esse tipo de produto

Formato: lista numerada com breve justificativa para cada fonte.`;

  const resposta = await chamarIA(SYSTEM_PROMPT_BASE, prompt);
  const interacao = await salvarInteracao(servidorId, "sugestao_fonte", prompt, resposta);
  return { texto: resposta.texto, interacao };
}

/**
 * Analisa preços coletados e identifica inconsistências.
 */
export async function analisarPrecos(
  servidorId: string,
  itens: Array<{
    descricao: string;
    precos: Array<{ fonte: string; valor: number; data: string }>;
  }>,
): Promise<{ texto: string; interacao: InteracaoIA }> {
  const dadosItens = itens
    .map((item) => {
      const precosTxt = item.precos
        .map((p) => `  - ${p.fonte}: R$ ${p.valor.toFixed(2)} (${p.data})`)
        .join("\n");
      return `• ${item.descricao}:\n${precosTxt}`;
    })
    .join("\n\n");

  const prompt = `Analise os seguintes preços coletados para uma pesquisa de preços licitatória:

${dadosItens}

Para cada item, verifique:
1. Se existem preços discrepantes (outliers) que devem ser excluídos
2. Se a quantidade de fontes é adequada (mínimo 3 conforme IN 65)
3. Se os preços estão coerentes com o mercado
4. Sugestões de tratamento estatístico
5. Alertas de conformidade

Formato: análise por item com recomendações claras.`;

  const resposta = await chamarIA(SYSTEM_PROMPT_BASE, prompt, 3000);
  const interacao = await salvarInteracao(servidorId, "analise_preco", prompt, resposta);
  return { texto: resposta.texto, interacao };
}

/**
 * Gera texto de justificativa de preços formal.
 */
export async function gerarJustificativaIA(
  servidorId: string,
  dadosCesta: {
    objeto: string;
    metodologia: MetodologiaCalculo;
    totalItens: number;
    totalFontes: number;
    valorTotal: number;
    itensResumo: Array<{
      descricao: string;
      precoRef: number;
      metodologia: string;
      fontes: number;
      cv?: number;
    }>;
  },
): Promise<{ texto: string; interacao: InteracaoIA }> {
  const resumoItens = dadosCesta.itensResumo
    .map(
      (i) =>
        `- ${i.descricao}: R$ ${i.precoRef.toFixed(2)} (${i.metodologia}, ${i.fontes} fontes, CV: ${(i.cv ?? 0).toFixed(1)}%)`,
    )
    .join("\n");

  const prompt = `Gere uma JUSTIFICATIVA FORMAL DE PREÇOS para processo licitatório com os seguintes dados:

Objeto: ${dadosCesta.objeto}
Metodologia: ${LABELS_METODOLOGIA[dadosCesta.metodologia]}
Total de itens: ${dadosCesta.totalItens}
Total de fontes consultadas: ${dadosCesta.totalFontes}
Valor total estimado: R$ ${dadosCesta.valorTotal.toFixed(2)}

Itens:
${resumoItens}

Requisitos:
1. Fundamentação na Lei 14.133/2021, Art. 23 e IN SEGES/ME nº 65/2021
2. Descrição da metodologia empregada
3. Justificativa para o preço de referência adotado
4. Declaração de conformidade com os critérios legais
5. Tom formal e objetivo, próprio de documento público
6. Estrutura: Introdução, Metodologia, Análise, Conclusão

NÃO invente dados — use apenas os fornecidos acima.`;

  const resposta = await chamarIA(SYSTEM_PROMPT_BASE, prompt, 3000);
  const interacao = await salvarInteracao(servidorId, "texto_justificativa", prompt, resposta);
  return { texto: resposta.texto, interacao };
}

/**
 * Pesquisa natural — interpreta query em linguagem natural.
 */
export async function pesquisaNatural(
  servidorId: string,
  query: string,
): Promise<{ texto: string; interacao: InteracaoIA; filtros?: Record<string, string> }> {
  const prompt = `O usuário fez a seguinte pesquisa em linguagem natural:

"${query}"

Interprete a intenção e retorne:
1. Uma explicação de como a pesquisa será conduzida
2. Filtros sugeridos no formato JSON: { "termo": "...", "uf": "...", "periodo": "...", "fonte": "..." }
3. Fontes recomendadas para essa busca
4. Dicas para refinar a pesquisa

Se for uma pergunta sobre legislação ou procedimentos, responda diretamente.`;

  const resposta = await chamarIA(SYSTEM_PROMPT_BASE, prompt);
  const interacao = await salvarInteracao(servidorId, "pesquisa_natural", prompt, resposta);

  // Tentar extrair filtros JSON da resposta
  let filtros: Record<string, string> | undefined;
  const jsonMatch = resposta.texto.match(/\{[^}]+\}/);
  if (jsonMatch) {
    try {
      filtros = JSON.parse(jsonMatch[0]);
    } catch {
      // ignorar — filtros são opcionais
    }
  }

  return { texto: resposta.texto, interacao, filtros };
}

/**
 * Gera texto de memorial de cálculo com análise IA.
 */
export async function complementarMemorialIA(
  servidorId: string,
  itens: ItemCesta[],
  metodologia: MetodologiaCalculo,
  objeto: string,
): Promise<{ texto: string; interacao: InteracaoIA }> {
  const resumo = itens.map((item) => {
    const precos = (item.precos ?? []).filter((p) => !p.excluido_calculo);
    const valores = precos.map((p) => Number(p.valor_corrigido ?? p.valor_unitario));
    return {
      desc: item.produto?.descricao ?? "—",
      qtd: item.quantidade,
      precos: valores,
      fontes: precos.map((p) => p.fonte?.sigla ?? ""),
    };
  });

  const prompt = `Complemente a análise do memorial de cálculo da pesquisa de preços:

Objeto: ${objeto}
Metodologia: ${LABELS_METODOLOGIA[metodologia]}

Itens analisados:
${resumo.map((r) => `- ${r.desc} (qtd: ${r.qtd}): preços [${r.precos.map((v) => `R$${v.toFixed(2)}`).join(", ")}] de fontes [${r.fontes.join(", ")}]`).join("\n")}

Forneça:
1. Análise geral da consistência dos preços
2. Coeficiente de variação de cada item e se está aceitável (<25% ideal)
3. Recomendações de ajuste se necessário
4. Parecer técnico resumido (2-3 parágrafos)`;

  const resposta = await chamarIA(SYSTEM_PROMPT_BASE, prompt, 2000);
  const interacao = await salvarInteracao(servidorId, "memorial_calculo", prompt, resposta);
  return { texto: resposta.texto, interacao };
}

// ── Listar histórico de interações ───────────────────────
export async function listarInteracoesIA(
  servidorId: string,
  tipo?: TipoInteracaoIA,
  limite: number = 20,
): Promise<InteracaoIA[]> {
  const params = new URLSearchParams();
  params.set("servidor_id", servidorId);
  params.set("limite", String(limite));
  if (tipo) params.set("tipo", tipo);

  const { data } = await api.get<{ data: InteracaoIA[] }>(`/api/ia/interacoes?${params}`);
  return data ?? [];
}

// ── Avaliar interação ────────────────────────────────────
export async function avaliarInteracaoIA(
  interacaoId: string,
  nota: number,
): Promise<void> {
  await api.put(`/api/ia/interacoes/${encodeURIComponent(interacaoId)}/avaliar`, {
    avaliacao_usuario: nota,
  });
}
