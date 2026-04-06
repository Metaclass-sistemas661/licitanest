import { useCallback, useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Badge } from "@/componentes/ui/badge";
import {
  Brain,
  Send,
  Loader2,
  Sparkles,
  Search,
  FileText,
  BarChart3,
  Wand2,
  ThumbsUp,
  ThumbsDown,
  History,
  AlertCircle,
  Copy,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useIA } from "@/hooks/useFase17";
import type { TipoInteracaoIA, InteracaoIA } from "@/tipos";

type AbaIA = "chat" | "historico" | "config";

const FUNCIONALIDADES = [
  {
    id: "sugestao_fonte" as TipoInteracaoIA,
    label: "Sugerir Fontes",
    descricao: "Sugere as melhores fontes de preço para um produto",
    icon: <Search className="h-5 w-5" />,
    placeholder: "Descreva o produto (ex: Arroz tipo 1, pacote 5kg)...",
  },
  {
    id: "analise_preco" as TipoInteracaoIA,
    label: "Analisar Preços",
    descricao: "Analisa preços coletados e identifica inconsistências",
    icon: <BarChart3 className="h-5 w-5" />,
    placeholder: "Descreva os itens e preços para análise...",
  },
  {
    id: "texto_justificativa" as TipoInteracaoIA,
    label: "Gerar Justificativa",
    descricao: "Gera texto formal de justificativa de preços",
    icon: <FileText className="h-5 w-5" />,
    placeholder: "Descreva os dados da cesta (objeto, metodologia, valores)...",
  },
  {
    id: "pesquisa_natural" as TipoInteracaoIA,
    label: "Pesquisa Natural",
    descricao: "Faça perguntas em linguagem natural sobre compras públicas",
    icon: <Wand2 className="h-5 w-5" />,
    placeholder: "Pergunte qualquer coisa (ex: qual o preço médio de notebooks no PNCP?)...",
  },
];

export function IAAssistentePage() {
  const { servidor } = useAuth();
  const respostaRef = useRef<HTMLDivElement>(null);
  const [aba, setAba] = useState<AbaIA>("chat");
  const [funcSelecionada, setFuncSelecionada] = useState(FUNCIONALIDADES[3]); // pesquisa natural
  const [input, setInput] = useState("");
  const [respostaAtual, setRespostaAtual] = useState<string | null>(null);
  const [interacaoAtual, setInteracaoAtual] = useState<InteracaoIA | null>(null);

  const {
    historico,
    processando,
    erro,
    configurada,
    sugerirFontes,
    pesquisarNatural,
    avaliar,
  } = useIA(servidor?.id);

  const handleEnviar = useCallback(async () => {
    if (!input.trim() || processando) return;

    setRespostaAtual(null);
    setInteracaoAtual(null);

    let result;
    switch (funcSelecionada.id) {
      case "sugestao_fonte":
        result = await sugerirFontes(input);
        break;
      case "pesquisa_natural":
        result = await pesquisarNatural(input);
        break;
      default:
        result = await pesquisarNatural(input);
    }

    if (result) {
      setRespostaAtual(result.texto);
      setInteracaoAtual(result.interacao);
      setInput("");
    }
  }, [input, processando, funcSelecionada, sugerirFontes, pesquisarNatural]);

  const handleAvaliar = useCallback(
    async (nota: number) => {
      if (!interacaoAtual) return;
      await avaliar(interacaoAtual.id, nota);
    },
    [interacaoAtual, avaliar],
  );

  const copiarResposta = useCallback(() => {
    if (respostaAtual) {
      navigator.clipboard.writeText(respostaAtual);
    }
  }, [respostaAtual]);

  useEffect(() => {
    if (respostaAtual && respostaRef.current) {
      respostaRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [respostaAtual]);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="h-6 w-6" />
          Assistente IA
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Inteligência artificial para auxiliar na pesquisa de preços e elaboração de documentos
        </p>
      </div>

      {/* Alerta se não configurada */}
      {!configurada && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-medium text-amber-800">
                IA em modo demonstração
              </p>
              <p className="text-sm text-amber-700">
                Configure OPENAI_API_KEY ou ANTHROPIC_API_KEY nas variáveis de ambiente do servidor (Edge Function ia-proxy) para ativar a IA
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Abas */}
      <div className="flex gap-1 border-b">
        {[
          { id: "chat" as AbaIA, label: "Chat", icon: <Sparkles className="h-4 w-4" /> },
          { id: "historico" as AbaIA, label: "Histórico", icon: <History className="h-4 w-4" /> },
        ].map((a) => (
          <Button
            key={a.id}
            variant={aba === a.id ? "default" : "ghost"}
            size="sm"
            className="rounded-b-none"
            onClick={() => setAba(a.id)}
          >
            {a.icon}
            <span className="ml-1">{a.label}</span>
          </Button>
        ))}
      </div>

      {aba === "chat" && (
        <>
          {/* Seleção de funcionalidade */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {FUNCIONALIDADES.map((func) => (
              <Card
                key={func.id}
                className={`cursor-pointer transition-all ${
                  funcSelecionada.id === func.id
                    ? "ring-2 ring-primary border-primary"
                    : "hover:bg-accent/50"
                }`}
                onClick={() => setFuncSelecionada(func)}
              >
                <CardContent className="py-3 text-center">
                  <div className="mx-auto w-fit mb-1">{func.icon}</div>
                  <p className="text-sm font-medium">{func.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {func.descricao}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Input */}
          <Card>
            <CardContent className="py-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    placeholder={funcSelecionada.placeholder}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleEnviar()}
                    disabled={processando}
                  />
                </div>
                <Button onClick={handleEnviar} disabled={!input.trim() || processando}>
                  {processando ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Resposta */}
          {processando && (
            <Card>
              <CardContent className="py-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
                <p className="text-muted-foreground">Processando sua solicitação...</p>
              </CardContent>
            </Card>
          )}

          {respostaAtual && (
            <Card ref={respostaRef}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Resposta da IA
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={copiarResposta} title="Copiar">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAvaliar(1)}
                      title="Útil"
                    >
                      <ThumbsUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAvaliar(-1)}
                      title="Não útil"
                    >
                      <ThumbsDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {interacaoAtual && (
                  <CardDescription className="flex gap-3 text-xs">
                    <span>Modelo: {interacaoAtual.modelo}</span>
                    {interacaoAtual.duracao_ms && (
                      <span>Tempo: {(interacaoAtual.duracao_ms / 1000).toFixed(1)}s</span>
                    )}
                    {interacaoAtual.tokens_input != null && (
                      <span>
                        Tokens: {interacaoAtual.tokens_input}→{interacaoAtual.tokens_output}
                      </span>
                    )}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                  {respostaAtual}
                </div>
              </CardContent>
            </Card>
          )}

          {erro && (
            <Card className="border-red-200">
              <CardContent className="py-4 text-red-600 text-sm">{erro}</CardContent>
            </Card>
          )}
        </>
      )}

      {aba === "historico" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Histórico de Interações</CardTitle>
            <CardDescription>
              Últimas {historico.length} interações com o assistente IA
            </CardDescription>
          </CardHeader>
          <CardContent>
            {historico.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma interação registrada
              </p>
            ) : (
              <div className="space-y-3">
                {historico.map((inter) => (
                  <div key={inter.id} className="p-3 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {FUNCIONALIDADES.find((f) => f.id === inter.tipo)?.label ?? inter.tipo}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {inter.modelo}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(inter.criado_em).toLocaleString("pt-BR")}
                      </span>
                      {inter.avaliacao_usuario != null && (
                        inter.avaliacao_usuario > 0 ? (
                          <ThumbsUp className="h-3 w-3 text-green-600" />
                        ) : (
                          <ThumbsDown className="h-3 w-3 text-red-600" />
                        )
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {inter.prompt.substring(0, 200)}...
                    </p>
                    {inter.resposta && (
                      <p className="text-sm mt-1 line-clamp-3">{inter.resposta}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default IAAssistentePage;
