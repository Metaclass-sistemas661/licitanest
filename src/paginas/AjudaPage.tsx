// ═══════════════════════════════════════════════════════════════════════════════
// AjudaPage — Fase 12 — Página de Ajuda / FAQ in-app
// ═══════════════════════════════════════════════════════════════════════════════
import { useState } from "react";
import { Card, CardContent } from "@/componentes/ui/card";
import { Input } from "@/componentes/ui/input";
import {
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Keyboard,
  LifeBuoy,
  Video,
} from "lucide-react";
import { useTour } from "@/componentes/ui/guided-tour";
import { PageTransition } from "@/componentes/ui/page-transition";

interface FaqItem {
  pergunta: string;
  resposta: string;
  categoria: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    categoria: "Geral",
    pergunta: "O que é o LicitaNest?",
    resposta:
      "O LicitaNest é um sistema para pesquisa e gestão de cestas de preços em licitações públicas. Ele permite buscar referências de preços em múltiplas fontes oficiais, gerenciar fornecedores, enviar cotações eletrônicas e gerar relatórios completos.",
  },
  {
    categoria: "Geral",
    pergunta: "Como funciona a pesquisa de preços?",
    resposta:
      "Você cria uma Cesta de Preços, adiciona itens do catálogo e o sistema busca automaticamente preços em fontes oficiais como Banco de Preços, Painel de Preços, ComprasNet, Atas de Registro de Preços e mais. O sistema calcula a média, mediana ou menor preço conforme a metodologia escolhida.",
  },
  {
    categoria: "Cestas",
    pergunta: "Quais métodos de cálculo estão disponíveis?",
    resposta:
      "O sistema oferece 3 métodos: Média Aritmética (soma ÷ quantidade), Mediana (valor central) e Menor Preço (menor valor entre as fontes válidas).",
  },
  {
    categoria: "Cestas",
    pergunta: "Posso excluir preços do cálculo?",
    resposta:
      'Sim! Na tela de detalhes da cesta, cada preço pode ser marcado como "excluído" com justificativa. Preços excluídos são destacados em cinza nos relatórios mas não entram no cálculo.',
  },
  {
    categoria: "Cotações",
    pergunta: "Como funciona a Cotação Eletrônica?",
    resposta:
      "Você cria uma cotação a partir de uma cesta, adiciona fornecedores com seus emails e envia convites. Os fornecedores acessam um portal público (sem login) por meio de um link único e preenchem seus preços. As respostas são consolidadas e podem ser importadas para a cesta.",
  },
  {
    categoria: "Cotações",
    pergunta: "O fornecedor precisa se cadastrar?",
    resposta:
      "Não. O fornecedor recebe um link único por email e pode responder a cotação sem criar conta. Basta preencher os valores e enviar.",
  },
  {
    categoria: "Relatórios",
    pergunta: "Quais relatórios posso gerar?",
    resposta:
      "O sistema gera: Mapa de Apuração (comparativo de todas as fontes por item), Relatório de Fontes (detalhamento de cada fonte utilizada) e Relatório de Correção Monetária (ajustes por IPCA/INPC/IGP-M). Todos disponíveis em PDF e Excel.",
  },
  {
    categoria: "Relatórios",
    pergunta: "Os relatórios servem para o TCE?",
    resposta:
      "Sim! Os relatórios seguem o formato exigido pelos Tribunais de Contas, incluindo cabeçalho institucional, fontes referenciadas, metodologia de cálculo e rodapé com informações do servidor responsável.",
  },
  {
    categoria: "Atalhos",
    pergunta: "Quais atalhos de teclado existem?",
    resposta:
      "Ctrl+K (ou Cmd+K no Mac) abre a busca global, permitindo navegar rapidamente entre páginas. O atalho ? abre esta página de ajuda.",
  },
];

function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [aberto, setAberto] = useState<number | null>(null);

  return (
    <div className="divide-y rounded-xl border bg-card">
      {items.map((item, idx) => (
        <div key={idx}>
          <button
            onClick={() => setAberto(aberto === idx ? null : idx)}
            className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium transition-colors hover:bg-muted/50"
          >
            <span>{item.pergunta}</span>
            {aberto === idx ? (
              <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </button>
          {aberto === idx && (
            <div className="border-t bg-muted/30 px-5 py-4 text-sm text-muted-foreground">
              {item.resposta}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function AjudaPage() {
  const [busca, setBusca] = useState("");
  const { startTour } = useTour();

  const itensFiltrados = busca.trim()
    ? FAQ_ITEMS.filter(
        (i) =>
          i.pergunta.toLowerCase().includes(busca.toLowerCase()) ||
          i.resposta.toLowerCase().includes(busca.toLowerCase()),
      )
    : FAQ_ITEMS;

  const categorias = [...new Set(itensFiltrados.map((i) => i.categoria))];

  return (
    <PageTransition>
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <HelpCircle className="h-6 w-6 text-primary" />
              Ajuda & FAQ
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Dúvidas frequentes e guias de uso do LicitaNest
            </p>
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card
            className="cursor-pointer transition-colors hover:bg-muted/50"
            onClick={startTour}
          >
            <CardContent className="flex items-center gap-3 p-4">
              <BookOpen className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Tour Guiado</p>
                <p className="text-xs text-muted-foreground">Reiniciar introdução</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardContent className="flex items-center gap-3 p-4">
              <Keyboard className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Atalhos</p>
                <p className="text-xs text-muted-foreground">Ctrl+K, ? e mais</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardContent className="flex items-center gap-3 p-4">
              <LifeBuoy className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Suporte</p>
                <p className="text-xs text-muted-foreground">suporte@metaclass.com.br</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar nas perguntas frequentes..."
            className="pl-9"
          />
        </div>

        {/* FAQ por categoria */}
        {categorias.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Nenhuma pergunta encontrada para "{busca}".
          </p>
        ) : (
          categorias.map((cat) => (
            <div key={cat} className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {cat}
              </h2>
              <FaqAccordion items={itensFiltrados.filter((i) => i.categoria === cat)} />
            </div>
          ))
        )}

        {/* Recursos adicionais */}
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <Video className="h-8 w-8 text-primary" />
            <div>
              <p className="font-medium">Central de Conhecimento</p>
              <p className="text-sm text-muted-foreground">
                Consulte a documentação completa, guias de uso e normativos (IN 65/2021, Decreto 11.462) na seção de Ajuda ou entre em contato pelo suporte.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
