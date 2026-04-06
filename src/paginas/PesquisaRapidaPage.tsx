// ═══════════════════════════════════════════════════════════════════════════════
// Pesquisa Rápida de Preços — Fase 7
// Consulta direta sem criar cesta, com autocomplete, todas as fontes, filtros,
// estatísticas e envio para cesta
// ═══════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Badge } from "@/componentes/ui/badge";
import { Separator } from "@/componentes/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/componentes/ui/tabs";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerBody,
} from "@/componentes/ui/drawer";
import {
  Search,
  Loader2,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  BarChart3,
  ArrowRightCircle,
  CheckCircle2,
  Filter,
  Globe,
  Heart,
  HardHat,
  Wheat,
  Apple,
  Pill,
  MapPin,
  X,
  Package,
  Send,
} from "lucide-react";
import { useAutocompleteProdutos } from "@/hooks/useCatalogo";
import { useBuscaTodasFontes } from "@/hooks/useFontesPreco";
import { useFontes } from "@/hooks/useCestas";
import type { ProdutoCatalogo, FiltroFonte } from "@/tipos";
import { UFS_BRASIL, REGIOES_BRASIL, type UF } from "@/servicos/crawlers";
import {
  normalizarParaUnificado,
  deduplicarResultados,
  calcularEstatisticasPesquisa,
  calcularDataInicioPeriodo,
  nomeFonteLegivel,
  enviarParaCesta,
  listarCestasAtivas,
  type ResultadoPesquisaUnificado,
  type EstatisticasGlobais,
  type PeriodoPesquisa,
} from "@/servicos/pesquisaRapida";

// ── Formatadores ────────────────────────────────────
function moeda(valor: number | null | undefined) {
  if (valor == null || valor === 0) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function dataFormatada(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

// ── Ícones das fontes ───────────────────────────────
const ICONE_FONTE: Record<string, React.ReactNode> = {
  pncp: <Globe className="h-3.5 w-3.5" />,
  painel_precos: <Globe className="h-3.5 w-3.5" />,
  tce: <MapPin className="h-3.5 w-3.5" />,
  bps: <Heart className="h-3.5 w-3.5" />,
  sinapi: <HardHat className="h-3.5 w-3.5" />,
  conab: <Wheat className="h-3.5 w-3.5" />,
  ceasa: <Apple className="h-3.5 w-3.5" />,
  cmed: <Pill className="h-3.5 w-3.5" />,
};

// ╔══════════════════════════════════════════════════════╗
// ║  Componente Principal                                ║
// ╚══════════════════════════════════════════════════════╝

export function PesquisaRapidaPage() {
  // ── Autocomplete ──────────────────────────────────
  const autocomplete = useAutocompleteProdutos(300);
  const [produtoSelecionado, setProdutoSelecionado] = useState<
    Pick<ProdutoCatalogo, "id" | "descricao" | "codigo_catmat"> | null
  >(null);
  const [showSugestoes, setShowSugestoes] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Busca em todas as fontes ──────────────────────
  const {
    pncp, painel, tce, multiTCE,
    bps, sinapi, conab, ceasa, cmed,
    buscarTodas, limparTodas, carregando,
  } = useBuscaTodasFontes();

  // ── Filtros ───────────────────────────────────────
  const [periodo, setPeriodo] = useState<PeriodoPesquisa>("12m");
  const [dataInicio, setDataInicio] = useState(() => calcularDataInicioPeriodo("12m"));
  const [dataFim, setDataFim] = useState(new Date().toISOString().slice(0, 10));
  const [uf, setUf] = useState("");
  const [regiao, setRegiao] = useState("");
  const [showFiltros, setShowFiltros] = useState(false);

  // ── Resultados unificados ─────────────────────────
  const [abaResultado, setAbaResultado] = useState("todos");
  const [buscaRealizada, setBuscaRealizada] = useState(false);

  // Atualizar dataInicio quando mudar periodo
  useEffect(() => {
    if (periodo !== "custom") {
      setDataInicio(calcularDataInicioPeriodo(periodo));
    }
  }, [periodo]);

  // ── Resultados unificados e deduplicados ──────────
  const resultadosUnificados = useMemo(() => {
    const todos: ResultadoPesquisaUnificado[] = [
      ...normalizarParaUnificado(pncp.dados, "pncp"),
      ...normalizarParaUnificado(painel.dados, "painel_precos"),
      ...normalizarParaUnificado([...tce.dados, ...multiTCE.dados], "tce"),
      ...normalizarParaUnificado(bps.dados, "bps"),
      ...normalizarParaUnificado(sinapi.dados, "sinapi"),
      ...normalizarParaUnificado(conab.dados, "conab"),
      ...normalizarParaUnificado(ceasa.dados, "ceasa"),
      ...normalizarParaUnificado(cmed.dados, "cmed"),
    ];
    return deduplicarResultados(todos);
  }, [pncp.dados, painel.dados, tce.dados, multiTCE.dados, bps.dados, sinapi.dados, conab.dados, ceasa.dados, cmed.dados]);

  // ── Filtrar por UF/região se selecionado ──────────
  const resultadosFiltrados = useMemo(() => {
    let filtered = resultadosUnificados;
    if (uf) {
      filtered = filtered.filter((r) => r.uf === uf || !r.uf);
    }
    if (regiao && REGIOES_BRASIL[regiao]) {
      const ufsRegiao = new Set(REGIOES_BRASIL[regiao]);
      filtered = filtered.filter((r) => !r.uf || ufsRegiao.has(r.uf as UF));
    }
    return filtered;
  }, [resultadosUnificados, uf, regiao]);

  // ── Estatísticas ──────────────────────────────────
  const estatisticas = useMemo<EstatisticasGlobais>(
    () => calcularEstatisticasPesquisa(resultadosFiltrados),
    [resultadosFiltrados]
  );

  // ── Fontes disponíveis (para abas) ────────────────
  const fontesComDados = useMemo(() => {
    const tipos = new Set(resultadosFiltrados.map((r) => r.fonte_tipo));
    return Array.from(tipos);
  }, [resultadosFiltrados]);

  // ── Resultados por aba ────────────────────────────
  const resultadosDaAba = useMemo(() => {
    if (abaResultado === "todos") return resultadosFiltrados;
    return resultadosFiltrados.filter((r) => r.fonte_tipo === abaResultado);
  }, [resultadosFiltrados, abaResultado]);

  // ── Seleção para envio à cesta ────────────────────
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [drawerEnvio, setDrawerEnvio] = useState(false);

  const toggleSelecionado = useCallback((id: string) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selecionarTodos = useCallback(() => {
    setSelecionados(new Set(resultadosDaAba.map((r) => r.id)));
  }, [resultadosDaAba]);

  const limparSelecao = useCallback(() => {
    setSelecionados(new Set());
  }, []);

  const itensSelecionados = useMemo(
    () => resultadosFiltrados.filter((r) => selecionados.has(r.id)),
    [resultadosFiltrados, selecionados]
  );

  // ── Buscar ────────────────────────────────────────
  const handleBuscar = useCallback(async () => {
    const termoFinal = produtoSelecionado?.descricao ?? autocomplete.termo;
    if (!termoFinal.trim()) return;

    setSelecionados(new Set());
    setBuscaRealizada(true);

    const filtro: FiltroFonte = {
      termo: termoFinal.trim(),
      uf: uf || undefined,
      dataInicio: dataInicio || undefined,
      dataFim: dataFim || undefined,
      limite: 50,
    };
    await buscarTodas(filtro);
  }, [produtoSelecionado, autocomplete.termo, uf, dataInicio, dataFim, buscarTodas]);

  // ── Selecionar produto do autocomplete ────────────
  const handleSelecionarProduto = useCallback(
    (produto: Pick<ProdutoCatalogo, "id" | "descricao" | "codigo_catmat">) => {
      setProdutoSelecionado(produto);
      autocomplete.setTermo(produto.descricao);
      setShowSugestoes(false);
      // Auto-buscar ao selecionar
      setTimeout(() => {
        setBuscaRealizada(true);
        const filtro: FiltroFonte = {
          termo: produto.descricao,
          uf: uf || undefined,
          dataInicio: dataInicio || undefined,
          dataFim: dataFim || undefined,
          limite: 50,
        };
        buscarTodas(filtro);
      }, 100);
    },
    [uf, dataInicio, dataFim, buscarTodas, autocomplete]
  );

  // ── Limpar tudo ───────────────────────────────────
  const handleLimpar = useCallback(() => {
    autocomplete.limpar();
    setProdutoSelecionado(null);
    limparTodas();
    setSelecionados(new Set());
    setBuscaRealizada(false);
    setAbaResultado("todos");
  }, [autocomplete, limparTodas]);

  return (
    <div className="space-y-6">
      {/* ── Cabeçalho ───────────────────────────────── */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Pesquisa Rápida de Preços</h2>
        <p className="text-muted-foreground">
          Consulta direta de preços sem necessidade de cadastrar cesta — resultados de todas as 8 fontes integradas
        </p>
      </div>

      {/* ── Barra de busca + autocomplete ───────────── */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-2 relative">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder="Digite o produto para consulta rápida (ex: Arroz Tipo 1 5kg)..."
                value={autocomplete.termo}
                onChange={(e) => {
                  autocomplete.setTermo(e.target.value);
                  setProdutoSelecionado(null);
                  setShowSugestoes(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setShowSugestoes(false);
                    handleBuscar();
                  }
                  if (e.key === "Escape") setShowSugestoes(false);
                }}
                onFocus={() => {
                  if (autocomplete.sugestoes.length > 0) setShowSugestoes(true);
                }}
                className="pl-10 h-12 text-base"
              />
              {/* Dropdown autocomplete */}
              {showSugestoes && autocomplete.sugestoes.length > 0 && (
                <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-background border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {autocomplete.sugestoes.map((s) => (
                    <button
                      key={s.id}
                      className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors flex items-center gap-3"
                      onClick={() => handleSelecionarProduto(s)}
                    >
                      <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <div className="text-sm">{s.descricao}</div>
                        {s.codigo_catmat && (
                          <span className="text-xs text-muted-foreground">
                            CATMAT: {s.codigo_catmat}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {autocomplete.buscando && (
                <Loader2 className="absolute right-3 top-3.5 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12"
              onClick={() => setShowFiltros(!showFiltros)}
              title="Filtros avançados"
            >
              <Filter className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleBuscar}
              disabled={carregando || !autocomplete.termo.trim()}
              className="h-12 px-6"
            >
              {carregando ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Pesquisar
            </Button>
            {buscaRealizada && (
              <Button variant="ghost" size="icon" className="h-12 w-12" onClick={handleLimpar}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Produto selecionado */}
          {produtoSelecionado && (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                {produtoSelecionado.descricao}
                {produtoSelecionado.codigo_catmat && (
                  <span className="text-muted-foreground ml-1">
                    ({produtoSelecionado.codigo_catmat})
                  </span>
                )}
              </Badge>
              <button
                onClick={() => {
                  setProdutoSelecionado(null);
                  autocomplete.setTermo("");
                  inputRef.current?.focus();
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* ── Filtros avançados ─────────────────────── */}
          {showFiltros && (
            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
              {/* Período */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Período</label>
                <div className="flex gap-2">
                  {(
                    [
                      { value: "3m", label: "3 meses" },
                      { value: "6m", label: "6 meses" },
                      { value: "12m", label: "12 meses" },
                      { value: "custom", label: "Personalizado" },
                    ] as { value: PeriodoPesquisa; label: string }[]
                  ).map((p) => (
                    <Button
                      key={p.value}
                      variant={periodo === p.value ? "default" : "outline"}
                      size="sm"
                      className="text-xs h-8"
                      onClick={() => setPeriodo(p.value)}
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
                {periodo === "custom" && (
                  <div className="flex gap-3 mt-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-muted-foreground">Data início</label>
                      <Input
                        type="date"
                        value={dataInicio}
                        onChange={(e) => setDataInicio(e.target.value)}
                        className="w-40 h-8 text-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-muted-foreground">Data fim</label>
                      <Input
                        type="date"
                        value={dataFim}
                        onChange={(e) => setDataFim(e.target.value)}
                        className="w-40 h-8 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Região / UF */}
              <div className="flex flex-wrap gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">Região</label>
                  <select
                    value={regiao}
                    onChange={(e) => setRegiao(e.target.value)}
                    className="h-8 rounded-md border border-input bg-background px-3 text-xs"
                  >
                    <option value="">Todas as regiões</option>
                    {Object.keys(REGIOES_BRASIL).map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">UF</label>
                  <select
                    value={uf}
                    onChange={(e) => setUf(e.target.value)}
                    className="h-8 rounded-md border border-input bg-background px-3 text-xs"
                  >
                    <option value="">Todas</option>
                    {(regiao && REGIOES_BRASIL[regiao]
                      ? REGIOES_BRASIL[regiao]
                      : [...UFS_BRASIL]
                    ).map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Estatísticas Globais ─────────────────────── */}
      {buscaRealizada && !carregando && resultadosFiltrados.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard
            label="Total"
            valor={String(estatisticas.total)}
            icone={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
          />
          <StatCard
            label="Menor preço"
            valor={moeda(estatisticas.menor_preco)}
            icone={<TrendingDown className="h-4 w-4 text-green-600" />}
            destaque="green"
          />
          <StatCard
            label="Maior preço"
            valor={moeda(estatisticas.maior_preco)}
            icone={<TrendingUp className="h-4 w-4 text-red-500" />}
          />
          <StatCard
            label="Média"
            valor={moeda(estatisticas.media)}
            icone={<BarChart3 className="h-4 w-4 text-blue-600" />}
          />
          <StatCard
            label="Mediana"
            valor={moeda(estatisticas.mediana)}
            icone={<BarChart3 className="h-4 w-4 text-purple-600" />}
            destaque="purple"
          />
        </div>
      )}

      {/* ── Estatísticas por Fonte ───────────────────── */}
      {buscaRealizada && !carregando && estatisticas.por_fonte.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Comparativo por Fonte</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="p-2">Fonte</th>
                    <th className="p-2 text-right">Qtd</th>
                    <th className="p-2 text-right">Menor</th>
                    <th className="p-2 text-right">Maior</th>
                    <th className="p-2 text-right">Média</th>
                    <th className="p-2 text-right">Mediana</th>
                  </tr>
                </thead>
                <tbody>
                  {estatisticas.por_fonte.map((ef) => (
                    <tr key={ef.fonte_tipo} className="border-b hover:bg-muted/30">
                      <td className="p-2 flex items-center gap-2">
                        {ICONE_FONTE[ef.fonte_tipo]}
                        <span className="font-medium">{ef.fonte_nome}</span>
                      </td>
                      <td className="p-2 text-right">
                        <Badge variant="secondary" className="text-[10px]">
                          {ef.quantidade}
                        </Badge>
                      </td>
                      <td className="p-2 text-right text-green-700 dark:text-green-400 font-medium">
                        {moeda(ef.menor_preco)}
                      </td>
                      <td className="p-2 text-right text-red-600 dark:text-red-400">
                        {moeda(ef.maior_preco)}
                      </td>
                      <td className="p-2 text-right font-medium">{moeda(ef.media)}</td>
                      <td className="p-2 text-right">{moeda(ef.mediana)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Resultados detalhados ────────────────────── */}
      {buscaRealizada && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                Resultados
                {resultadosFiltrados.length > 0 && (
                  <Badge variant="secondary">{resultadosFiltrados.length}</Badge>
                )}
              </CardTitle>
              {selecionados.size > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="default">
                    {selecionados.size} selecionado(s)
                  </Badge>
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={() => setDrawerEnvio(true)}
                  >
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    Enviar para Cesta
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {carregando ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Consultando todas as fontes...
              </div>
            ) : resultadosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Search className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">
                  {buscaRealizada
                    ? "Nenhum resultado encontrado. Tente ampliar os filtros."
                    : "Selecione um produto do catálogo para pesquisar automaticamente."}
                </p>
              </div>
            ) : (
              <>
                <Tabs value={abaResultado} onValueChange={setAbaResultado}>
                  <div className="flex items-center justify-between mb-3">
                    <TabsList className="flex-wrap justify-start h-auto gap-1">
                      <TabsTrigger value="todos" className="text-xs">
                        Todos
                        <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                          {resultadosFiltrados.length}
                        </Badge>
                      </TabsTrigger>
                      {fontesComDados.map((tipo) => {
                        const count = resultadosFiltrados.filter((r) => r.fonte_tipo === tipo).length;
                        return (
                          <TabsTrigger key={tipo} value={tipo} className="flex items-center gap-1 text-xs">
                            {ICONE_FONTE[tipo]}
                            {nomeFonteLegivel(tipo)}
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {count}
                            </Badge>
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>

                    <div className="flex gap-1 ml-2 shrink-0">
                      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={selecionarTodos}>
                        Sel. todos
                      </Button>
                      {selecionados.size > 0 && (
                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={limparSelecao}>
                          Limpar
                        </Button>
                      )}
                    </div>
                  </div>
                </Tabs>

                {/* Tabela unificada */}
                <TabelaResultadosUnificada
                  dados={resultadosDaAba}
                  selecionados={selecionados}
                  onToggle={toggleSelecionado}
                />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Drawer: Enviar para Cesta ────────────────── */}
      <DrawerEnviarParaCesta
        aberto={drawerEnvio}
        onClose={() => setDrawerEnvio(false)}
        itens={itensSelecionados}
        produtoId={produtoSelecionado?.id ?? null}
        produtoDescricao={produtoSelecionado?.descricao ?? autocomplete.termo}
        onEnviado={() => {
          setSelecionados(new Set());
          setDrawerEnvio(false);
        }}
      />
    </div>
  );
}

// ╔══════════════════════════════════════════════════════╗
// ║  Sub-componentes                                    ║
// ╚══════════════════════════════════════════════════════╝

function StatCard({
  label,
  valor,
  icone,
  destaque,
}: {
  label: string;
  valor: string;
  icone: React.ReactNode;
  destaque?: "green" | "purple";
}) {
  return (
    <Card className={destaque === "green" ? "border-green-200 dark:border-green-800" : ""}>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center gap-2 mb-1">
          {icone}
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p
          className={`text-lg font-bold ${
            destaque === "green"
              ? "text-green-700 dark:text-green-400"
              : destaque === "purple"
                ? "text-purple-700 dark:text-purple-400"
                : ""
          }`}
        >
          {valor}
        </p>
      </CardContent>
    </Card>
  );
}

// ── Tabela unificada ────────────────────────────────

function TabelaResultadosUnificada({
  dados,
  selecionados,
  onToggle,
}: {
  dados: ResultadoPesquisaUnificado[];
  selecionados: Set<string>;
  onToggle: (id: string) => void;
}) {
  // Ordenar por valor unitário crescente
  const ordenados = useMemo(
    () => [...dados].sort((a, b) => a.valor_unitario - b.valor_unitario),
    [dados]
  );

  if (ordenados.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
        Nenhum resultado nesta fonte.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="p-2 w-8"></th>
            <th className="p-2">Fonte</th>
            <th className="p-2">Descrição</th>
            <th className="p-2">Órgão</th>
            <th className="p-2">UF</th>
            <th className="p-2 text-right">Valor Unit.</th>
            <th className="p-2">Data</th>
          </tr>
        </thead>
        <tbody>
          {ordenados.map((d, i) => {
            const sel = selecionados.has(d.id);
            const isMenor = i === 0;
            return (
              <tr
                key={d.id}
                className={`border-b hover:bg-muted/50 cursor-pointer transition-colors ${
                  sel ? "bg-primary/5" : ""
                } ${isMenor ? "bg-green-50/50 dark:bg-green-950/20" : ""}`}
                onClick={() => onToggle(d.id)}
              >
                <td className="p-2">
                  <input
                    type="checkbox"
                    checked={sel}
                    onChange={() => onToggle(d.id)}
                    className="rounded"
                  />
                </td>
                <td className="p-2">
                  <Badge variant="outline" className="text-[10px] flex items-center gap-1 w-fit">
                    {ICONE_FONTE[d.fonte_tipo]}
                    {d.fonte_detalhe}
                  </Badge>
                </td>
                <td className="p-2 max-w-[220px] truncate" title={d.descricao_item}>
                  {d.descricao_item}
                </td>
                <td className="p-2 max-w-[150px] truncate" title={d.orgao}>
                  {d.orgao || "—"}
                </td>
                <td className="p-2">{d.uf || "—"}</td>
                <td className="p-2 text-right font-medium">
                  {isMenor && (
                    <TrendingDown className="inline h-3.5 w-3.5 text-green-600 mr-1" />
                  )}
                  {moeda(d.valor_unitario)}
                </td>
                <td className="p-2">{dataFormatada(d.data_referencia)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ╔══════════════════════════════════════════════════════╗
// ║  Drawer: Enviar para Cesta                          ║
// ╚══════════════════════════════════════════════════════╝

function DrawerEnviarParaCesta({
  aberto,
  onClose,
  itens,
  produtoId,
  produtoDescricao,
  onEnviado,
}: {
  aberto: boolean;
  onClose: () => void;
  itens: ResultadoPesquisaUnificado[];
  produtoId: string | null;
  produtoDescricao: string;
  onEnviado: () => void;
}) {
  const fontes = useFontes();
  const [cestas, setCestas] = useState<
    Pick<import("@/tipos").CestaPrecos, "id" | "descricao_objeto" | "status" | "criado_em">[]
  >([]);
  const [cestaId, setCestaId] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [carregandoCestas, setCarregandoCestas] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");

  // Carregar cestas ativas quando abre
  useEffect(() => {
    if (!aberto) return;
    setCarregandoCestas(true);
    setEnviado(false);
    setErro("");
    listarCestasAtivas()
      .then((data) => {
        setCestas(data);
        if (data.length > 0 && !cestaId) setCestaId(data[0].id);
      })
      .catch(() => setCestas([]))
      .finally(() => setCarregandoCestas(false));
  }, [aberto]);

  const handleEnviar = useCallback(async () => {
    if (!cestaId || !produtoId || itens.length === 0) {
      setErro(
        !produtoId
          ? "Selecione um produto do catálogo antes de enviar."
          : !cestaId
            ? "Selecione uma cesta de destino."
            : "Nenhum preço selecionado."
      );
      return;
    }

    setEnviando(true);
    setErro("");
    try {
      await enviarParaCesta({
        cestaId,
        produtoId,
        quantidade: parseInt(quantidade) || 1,
        resultados: itens,
        fontes,
      });
      setEnviado(true);
      setTimeout(() => onEnviado(), 1500);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao enviar para cesta.");
    } finally {
      setEnviando(false);
    }
  }, [cestaId, produtoId, itens, fontes, quantidade, onEnviado]);

  const estatsSel = useMemo(() => calcularEstatisticasPesquisa(itens), [itens]);

  return (
    <Drawer open={aberto} onOpenChange={(v) => !v && onClose()}>
      <DrawerContent side="right">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Enviar para Cesta
          </DrawerTitle>
        </DrawerHeader>
        <DrawerBody>
          <div className="space-y-5">
            {/* Resumo */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <p className="text-sm font-medium">
                {produtoDescricao}
              </p>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{itens.length} preço(s) selecionado(s)</span>
                <span>•</span>
                <span>Menor: {moeda(estatsSel.menor_preco)}</span>
                <span>•</span>
                <span>Média: {moeda(estatsSel.media)}</span>
                <span>•</span>
                <span>Mediana: {moeda(estatsSel.mediana)}</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {estatsSel.por_fonte.map((ef) => (
                  <Badge key={ef.fonte_tipo} variant="outline" className="text-[10px]">
                    {ef.fonte_nome}: {ef.quantidade}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Cesta destino */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Cesta de destino</label>
              {carregandoCestas ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando cestas...
                </div>
              ) : cestas.length === 0 ? (
                <div className="text-sm text-muted-foreground py-2">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  Nenhuma cesta ativa encontrada. Crie uma cesta antes de enviar.
                </div>
              ) : (
                <select
                  value={cestaId}
                  onChange={(e) => setCestaId(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {cestas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.descricao_objeto} ({c.status === "rascunho" ? "Rascunho" : "Em andamento"})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Quantidade */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantidade</label>
              <Input
                type="number"
                min="1"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                className="w-32"
              />
            </div>

            {/* Lista de preços que serão enviados */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Preços a transferir</label>
              <div className="max-h-48 overflow-y-auto border rounded-lg">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="p-2 text-left">Fonte</th>
                      <th className="p-2 text-left">Órgão</th>
                      <th className="p-2 text-right">Valor</th>
                      <th className="p-2">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((it) => (
                      <tr key={it.id} className="border-b">
                        <td className="p-2">
                          <Badge variant="outline" className="text-[9px]">
                            {it.fonte_detalhe}
                          </Badge>
                        </td>
                        <td className="p-2 max-w-[120px] truncate">{it.orgao}</td>
                        <td className="p-2 text-right font-medium">{moeda(it.valor_unitario)}</td>
                        <td className="p-2">{dataFormatada(it.data_referencia)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Erros e sucesso */}
            {erro && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {erro}
              </div>
            )}
            {enviado && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                Preços enviados com sucesso para a cesta!
              </div>
            )}

            {/* Botões */}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleEnviar}
                disabled={enviando || !cestaId || !produtoId || itens.length === 0 || enviado}
              >
                {enviando ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ArrowRightCircle className="h-4 w-4 mr-2" />
                )}
                Enviar {itens.length} preço(s)
              </Button>
            </div>
          </div>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
