import type { ConfigSICOM, LinhaSICOM } from "@/tipos";
import { api } from "@/lib/api";

/**
 * Gera linhas no layout exigido pelo TCE/MG (SICOM)
 * Formato: sequencial|codigo|descricao|unidade|qtd|vlr_unit|vlr_total|cnpj|razao|fonte
 */

export async function gerarDadosSICOM(
  cestaId: string,
  config: ConfigSICOM,
): Promise<{ linhas: LinhaSICOM[]; texto: string }> {
  // Busca itens da cesta com cotações via API
  const { data: itens } = await api.get<{ data: any[] }>(
    `/api/importacao/sicom/${encodeURIComponent(cestaId)}/itens`,
  );

  if (!itens || itens.length === 0) {
    return { linhas: [], texto: "" };
  }

  const linhas: LinhaSICOM[] = [];
  let seq = 1;

  for (const item of itens as any[]) {
    const produto = item.produtos_catalogo;
    // Pega o menor valor cotado como referência
    const cotacoes = (item.cotacoes_item ?? []).filter(
      (c: any) => c.valor_unitario != null,
    );
    cotacoes.sort((a: any, b: any) => a.valor_unitario - b.valor_unitario);
    const melhorCotacao = cotacoes[0] ?? null;

    const valorUnit = melhorCotacao?.valor_unitario ?? 0;
    const qtd = item.quantidade ?? 1;

    linhas.push({
      sequencial: seq++,
      codigo_item: produto?.codigo_catmat ?? "",
      descricao: (produto?.descricao ?? "").substring(0, 200),
      unidade: produto?.unidade ?? "UN",
      quantidade: qtd,
      valor_unitario: valorUnit,
      valor_total: Math.round(valorUnit * qtd * 100) / 100,
      fornecedor_cnpj: melhorCotacao?.fornecedor?.cnpj ?? null,
      fornecedor_razao: melhorCotacao?.fornecedor?.razao_social ?? null,
      fonte_referencia: melhorCotacao?.cotacao?.fonte_referencia ?? "Cotação Eletrônica",
    });
  }

  // Monta arquivo texto delimitado por pipe (padrão SICOM)
  const header = [
    `MUNICIPIO|${config.codigo_municipio_ibge}`,
    `EXERCICIO|${config.exercicio}`,
    `MES|${String(config.mes_referencia).padStart(2, "0")}`,
    `TIPO|${config.tipo_aquisicao.toUpperCase()}`,
    `PROCESSO|${config.numero_processo}`,
    `RESPONSAVEL|${config.responsavel_nome}|${config.responsavel_cpf}`,
    "---",
  ].join("\n");

  const body = linhas
    .map(
      (l) =>
        [
          l.sequencial,
          l.codigo_item,
          l.descricao,
          l.unidade,
          l.quantidade,
          l.valor_unitario.toFixed(2),
          l.valor_total.toFixed(2),
          l.fornecedor_cnpj ?? "",
          l.fornecedor_razao ?? "",
          l.fonte_referencia,
        ].join("|"),
    )
    .join("\n");

  return { linhas, texto: header + "\n" + body };
}

/**
 * Faz download do arquivo .txt SICOM
 */
export function downloadArquivoSICOM(texto: string, nomeArquivo?: string) {
  const blob = new Blob([texto], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo ?? `SICOM_EXPORT_${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
