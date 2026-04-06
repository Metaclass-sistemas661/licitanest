// ═══════════════════════════════════════════════════════════════════════════════
// RelatoriosPage — Fase 11
// Página central de relatórios: listagem de cestas + geração rápida + histórico
// ═══════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Badge } from "@/componentes/ui/badge";
import { Separator } from "@/componentes/ui/separator";
import {
  FileBarChart2,
  FileSpreadsheet,
  FileText,
  Download,
  Loader2,
  Search,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Package,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRelatorios } from "@/hooks/useRelatorios";
import { listarCestas } from "@/servicos/cestas";
import { listarItensCesta } from "@/servicos/itensCesta";
import { gerarEBaixarRelatorio } from "@/servicos/relatorios";
import type {
  CestaPrecos,
  ItemCesta,
  TipoRelatorio,
  FormatoExportacao,
  ConfigRelatorio,
  CabecalhoRelatorio,
} from "@/tipos";

// Tipo enriquecido com itens já carregados
interface CestaComItens extends CestaPrecos {
  _itens?: ItemCesta[];
  _itensCarregados?: boolean;
}

export function RelatoriosPage() {
  const { servidor } = useAuth();
  const { historico, carregandoHistorico, carregarHistorico } = useRelatorios();

  const [cestas, setCestas] = useState<CestaComItens[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [gerando, setGerando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const [cestaSelecionada, setCestaSelecionada] = useState<string | null>(null);
  const [tipo, setTipo] = useState<TipoRelatorio>("mapa_apuracao");
  const [formato, setFormato] = useState<FormatoExportacao>("pdf");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await listarCestas({ busca: busca || undefined }, 1, 100);
        setCestas(data);
      } catch {
        // silently fail
      } finally {
        setCarregando(false);
      }
    })();
  }, [busca]);

  const carregarItens = useCallback(async (cestaId: string): Promise<ItemCesta[]> => {
    const cesta = cestas.find((c) => c.id === cestaId);
    if (cesta?._itensCarregados && cesta._itens) return cesta._itens;
    const itens = await listarItensCesta(cestaId);
    setCestas((prev) =>
      prev.map((c) =>
        c.id === cestaId ? { ...c, _itens: itens, _itensCarregados: true } : c,
      ),
    );
    return itens;
  }, [cestas]);

  const handleGerarRapido = useCallback(async () => {
    if (!cestaSelecionada || !servidor) return;
    setGerando(cestaSelecionada);
    setErro(null);
    setSucesso(null);

    try {
      const itens = await carregarItens(cestaSelecionada);
      const cesta = cestas.find((c) => c.id === cestaSelecionada);
      if (!cesta || itens.length === 0) {
        setErro("Cesta sem itens para gerar relatório.");
        return;
      }

      const config: ConfigRelatorio = {
        tipo,
        formato,
        cesta_id: cestaSelecionada,
        incluir_excluidos: true,
      };
      const cabecalho: CabecalhoRelatorio = {
        nome_orgao: cesta.secretaria?.nome ?? "Órgão",
        nome_municipio: "",
        uf: "",
        objeto: cesta.descricao_objeto,
        data_geracao: new Date().toISOString(),
        servidor_nome: servidor.nome,
      };

      await gerarEBaixarRelatorio(config, itens, cabecalho, servidor.id);
      setSucesso(`${formato.toUpperCase()} gerado com sucesso! Download iniciado.`);
      carregarHistorico(cestaSelecionada);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao gerar relatório");
    } finally {
      setGerando(null);
    }
  }, [cestaSelecionada, servidor, tipo, formato, cestas, carregarItens, carregarHistorico]);

  const cestasFiltradas = cestas.filter(
    (c) => c.status === "em_andamento" || c.status === "concluida",
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Relatórios</h2>
        <p className="text-muted-foreground">
          Mapa de apuração, fontes de preços e correção monetária — PDF e Excel
        </p>
      </div>

      {/* ── Cards informativos ── */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileBarChart2 className="h-5 w-5 text-blue-600" />
              Mapa de Apuração
            </CardTitle>
            <CardDescription>
              Itens, valores por fonte, média, mediana, menor preço e total.
              Preços excluídos aparecem tachados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Badge className="bg-blue-100 text-blue-700">PDF</Badge>
              <Badge className="bg-green-100 text-green-700">Excel</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-purple-600" />
              Fontes de Preços
            </CardTitle>
            <CardDescription>
              Detalhamento das fontes utilizadas, quantidade de preços e documentos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Badge className="bg-blue-100 text-blue-700">PDF</Badge>
              <Badge className="bg-green-100 text-green-700">Excel</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileSpreadsheet className="h-5 w-5 text-amber-600" />
              Correção Monetária
            </CardTitle>
            <CardDescription>
              Valor original, índice, período, percentual acumulado e valor corrigido.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Badge className="bg-blue-100 text-blue-700">PDF</Badge>
              <Badge className="bg-green-100 text-green-700">Excel</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* ── Geração Rápida ── */}
      <Card>
        <CardHeader>
          <CardTitle>Geração Rápida</CardTitle>
          <CardDescription>
            Selecione uma cesta, tipo e formato para gerar o relatório diretamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar cesta por descrição…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>

          {carregando ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : cestasFiltradas.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhuma cesta em andamento ou concluída encontrada.
            </p>
          ) : (
            <div className="max-h-60 space-y-2 overflow-y-auto">
              {cestasFiltradas.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCestaSelecionada(c.id)}
                  className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                    cestaSelecionada === c.id
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <Package className="h-4 w-4 shrink-0 text-gray-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.descricao_objeto}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.secretaria?.nome ?? "—"} · {fmtData(c.criado_em)}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={c.status === "concluida" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}
                  >
                    {c.status === "concluida" ? "Concluída" : "Em Andamento"}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
              ))}
            </div>
          )}

          {cestaSelecionada && (
            <>
              <Separator />
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex gap-2">
                  {(["mapa_apuracao", "fontes_precos", "correcao_monetaria"] as TipoRelatorio[]).map((t) => (
                    <Button
                      key={t}
                      size="sm"
                      variant={tipo === t ? "default" : "outline"}
                      onClick={() => setTipo(t)}
                    >
                      {t === "mapa_apuracao" && <FileBarChart2 className="mr-1 h-4 w-4" />}
                      {t === "fontes_precos" && <FileText className="mr-1 h-4 w-4" />}
                      {t === "correcao_monetaria" && <FileSpreadsheet className="mr-1 h-4 w-4" />}
                      {TIPO_LABELS[t]}
                    </Button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={formato === "pdf" ? "default" : "outline"}
                    onClick={() => setFormato("pdf")}
                  >
                    PDF
                  </Button>
                  <Button
                    size="sm"
                    variant={formato === "xlsx" ? "default" : "outline"}
                    onClick={() => setFormato("xlsx")}
                  >
                    Excel
                  </Button>
                </div>

                <Button onClick={handleGerarRapido} disabled={!!gerando}>
                  {gerando ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando…</>
                  ) : (
                    <><Download className="mr-2 h-4 w-4" /> Gerar Relatório</>
                  )}
                </Button>
              </div>

              {sucesso && (
                <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                  <CheckCircle2 className="h-4 w-4" /> {sucesso}
                </div>
              )}
              {erro && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" /> {erro}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* ── Histórico ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico de Relatórios
          </CardTitle>
          <CardDescription>
            Últimos relatórios gerados
            {cestaSelecionada && " para a cesta selecionada"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {carregandoHistorico ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : historico.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {cestaSelecionada
                ? "Nenhum relatório gerado para esta cesta."
                : "Selecione uma cesta para ver o histórico."}
            </p>
          ) : (
            <div className="space-y-2">
              {historico.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <Clock className="h-4 w-4 shrink-0 text-gray-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.nome_arquivo}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtDataHora(r.gerado_em)}
                      {r.gerado_por_servidor && <> · {r.gerado_por_servidor.nome}</>}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">{r.formato.toUpperCase()}</Badge>
                  <Badge variant="secondary" className="text-xs">{TIPO_LABELS[r.tipo]}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Dica ── */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="flex items-start gap-3 pt-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-blue-900">Geração Avançada</p>
            <p className="text-sm text-blue-700">
              Para personalizar o cabeçalho institucional, incluir documentos comprobatórios
              ou configurar opções avançadas, acesse a cesta desejada e clique em
              <strong> "Relatórios"</strong> na barra de ações.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Helpers ──
const TIPO_LABELS: Record<TipoRelatorio, string> = {
  mapa_apuracao: "Mapa",
  fontes_precos: "Fontes",
  correcao_monetaria: "Correção",
};

function fmtData(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtDataHora(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
