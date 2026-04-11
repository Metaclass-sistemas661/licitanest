import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { EmptyState } from "@/componentes/ui/empty-state";
import { PageTransition } from "@/componentes/ui/page-transition";
import {
  Sparkles, ExternalLink, Star, Lightbulb, Tag, Loader2, Brain,
} from "lucide-react";
import type { RespostaIA, SugestaoFonteIA } from "@/tipos";
import { toast } from "sonner";

/**
 * Simulação local de sugestões de fontes por IA.
 * Em produção, será conectado ao Vertex AI (Google Gemini).
 */
function simularSugestaoIA(descricaoProduto: string): RespostaIA {
  const desc = descricaoProduto.toLowerCase();

  const sugestoes: SugestaoFonteIA[] = [
    {
      fonte_sugerida: "Painel de Preços — Governo Federal",
      url: "https://paineldeprecos.planejamento.gov.br",
      justificativa: "Base oficial do governo federal com preços praticados em licitações de todos os órgãos.",
      confianca: 95,
      tipo_fonte: "painel_precos",
    },
    {
      fonte_sugerida: "Banco de Preços em Saúde (BPS)",
      url: "https://bps.saude.gov.br",
      justificativa: desc.includes("medic") || desc.includes("saúde") || desc.includes("farmac")
        ? "Base especializada em materiais de saúde e medicamentos — altamente relevante."
        : "Pode conter itens correlatos em aquisições hospitalares.",
      confianca: desc.includes("medic") ? 90 : 50,
      tipo_fonte: "bps",
    },
    {
      fonte_sugerida: "ComprasNet / ComprasGov",
      url: "https://compras.dados.gov.br",
      justificativa: "Portal oficial de compras governamentais com histórico de atas e pregões.",
      confianca: 88,
      tipo_fonte: "comprasnet",
    },
    {
      fonte_sugerida: "Pesquisa em sites de e-commerce (Americanas, Magazine Luiza, etc.)",
      url: null,
      justificativa: "Complemento para formar média de mercado em dispensas de licitação.",
      confianca: 65,
      tipo_fonte: "pesquisa_internet",
    },
    {
      fonte_sugerida: "Cotação direta com fornecedores locais",
      url: null,
      justificativa: "Para itens de perfil local (alimentos perecíveis, serviços), recomenda-se ao menos 3 cotações.",
      confianca: 80,
      tipo_fonte: "cotacao_direta",
    },
  ];

  // Gera palavras-chave baseadas na descrição
  const palavras = descricaoProduto
    .split(/\s+/)
    .filter((p) => p.length > 3)
    .slice(0, 5);

  return {
    produto_descricao: descricaoProduto,
    sugestoes: sugestoes.sort((a, b) => b.confianca - a.confianca),
    dicas_pesquisa: [
      `Use o código CATMAT/CATSER para buscas mais precisas no Painel de Preços`,
      `Considere preços dos últimos 180 dias para melhor representatividade`,
      `Combine ao menos 3 fontes diferentes para justificar o preço de referência`,
      `Em dispensas, inclua prints de tela como comprovação das pesquisas online`,
    ],
    palavras_chave: palavras.length > 0 ? palavras : [descricaoProduto.substring(0, 20)],
    gerado_em: new Date().toISOString(),
  };
}

function BarraConfianca({ valor }: { valor: number }) {
  const cor = valor >= 80 ? "bg-emerald-500" : valor >= 60 ? "bg-yellow-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${cor} transition-all`} style={{ width: `${valor}%` }} />
      </div>
      <span className="text-xs font-medium w-8 text-right">{valor}%</span>
    </div>
  );
}

export function SugestaoFontesIAPage() {
  const [descricao, setDescricao] = useState("");
  const [resposta, setResposta] = useState<RespostaIA | null>(null);
  const [carregando, setCarregando] = useState(false);

  const handleBuscar = async () => {
    if (descricao.trim().length < 3) {
      toast.error("Descreva o produto com pelo menos 3 caracteres.");
      return;
    }
    setCarregando(true);
    setResposta(null);
    // Simula latência de API
    await new Promise((r) => setTimeout(r, 1200));
    try {
      const result = simularSugestaoIA(descricao.trim());
      setResposta(result);
      toast.success("Sugestões geradas com sucesso!");
    } catch {
      toast.error("Erro ao gerar sugestões.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Sugestão de Fontes com IA
          </h1>
          <p className="text-muted-foreground mt-1">
            Descreva o produto e a IA sugere as melhores fontes de pesquisa de preço,
            palavras-chave e dicas de consulta.
          </p>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-3 py-1 text-xs font-medium dark:bg-amber-900/30 dark:text-amber-400">
            <Brain className="h-3 w-3" />
            Modo demonstração — Em produção, conectado ao Vertex AI
          </div>
        </div>

        {/* Input */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Descreva o Produto ou Serviço</CardTitle>
            <CardDescription>
              Quanto mais detalhada a descrição, melhores serão as sugestões.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Ex: Papel A4, 75g/m², resma 500 folhas"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
                className="flex-1"
              />
              <Button onClick={handleBuscar} disabled={carregando}>
                {carregando ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analisando...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> Sugerir Fontes</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resultado */}
        {resposta && (
          <>
            {/* Sugestões de fontes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Fontes Sugeridas
                </CardTitle>
                <CardDescription>
                  Ordenadas por confiança de relevância para "{resposta.produto_descricao}"
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {resposta.sugestoes.map((s, i) => (
                  <div key={i} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm flex items-center gap-2">
                          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary text-white text-xs font-bold">
                            {i + 1}
                          </span>
                          {s.fonte_sugerida}
                        </p>
                        {s.url && (
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {s.url}
                          </a>
                        )}
                      </div>
                      <span className="text-xs bg-muted px-2 py-1 rounded capitalize">
                        {s.tipo_fonte.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{s.justificativa}</p>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Confiança</p>
                      <BarraConfianca valor={s.confianca} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Dicas de pesquisa */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-yellow-500" />
                    Dicas de Pesquisa
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {resposta.dicas_pesquisa.map((dica, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        {dica}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Tag className="h-5 w-5 text-blue-500" />
                    Palavras-Chave Sugeridas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {resposta.palavras_chave.map((kw, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-3 py-1 text-sm dark:bg-blue-900/30 dark:text-blue-400"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {!resposta && !carregando && (
          <EmptyState
            icon={Sparkles}
            title="Descreva um produto para começar"
            description="A IA analisará e sugerirá as melhores fontes de pesquisa de preço, com dicas e palavras-chave."
          />
        )}
      </div>
    </PageTransition>
  );
}
