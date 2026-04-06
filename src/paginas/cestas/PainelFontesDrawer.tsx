// Painel de Fontes de Preços — Drawer lateral com abas por fonte governamental
// Permite buscar preços no PNCP, Painel de Preços, TCEs Estaduais,
// BPS, SINAPI, CONAB, CEASA e CMED — e importá-los para a cesta
import { useCallback, useMemo, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerBody,
} from "@/componentes/ui/drawer";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Badge } from "@/componentes/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/componentes/ui/tabs";
import {
  Search,
  Loader2,
  Download,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Filter,
  Globe,
  MapPin,
  ChevronDown,
  ChevronUp,
  Heart,
  HardHat,
  Wheat,
  Apple,
  Pill,
} from "lucide-react";
import { useBuscaTodasFontes } from "@/hooks/useFontesPreco";
import { useFontes } from "@/hooks/useCestas";
import type {
  DadosFontePNCP,
  DadosFontePainel,
  DadosFonteTCE,
  DadosFonteBPS,
  DadosFonteSINAPI,
  DadosFonteCONAB,
  DadosFonteCEASA,
  DadosFonteCMED,
  FiltroFonte,
  ItemCesta,
} from "@/tipos";
import {
  normalizarDadosFonte,
  UFS_BRASIL,
  REGIOES_BRASIL,
  NOMES_UF,
  listarPortaisComAPI,
  type DadosFonteGenerico,
  type UF,
} from "@/servicos/crawlers";
import {
  normalizarDadosFonteFase6,
  type DadosFonteGenericoFase6,
} from "@/servicos/crawlersFase6";
import { adicionarPreco, recalcularEstatisticasItem } from "@/servicos/itensCesta";

// ── Formatadores ────────────────────────────────────
function moeda(valor: number | null) {
  if (valor == null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function dataFormatada(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

// ── Props ───────────────────────────────────────────
interface Props {
  item: ItemCesta;
  aberto: boolean;
  onClose: () => void;
  onImportado: () => void;
}

export function PainelFontesDialog({ item, aberto, onClose, onImportado }: Props) {
  const fontes = useFontes();
  const {
    pncp, painel, tce, multiTCE,
    bps, sinapi, conab, ceasa, cmed,
    buscarTodas, limparTodas, carregando, totalResultados,
  } = useBuscaTodasFontes();

  // Aba ativa
  const [aba, setAba] = useState("pncp");

  // Filtros
  const [termo, setTermo] = useState(item.produto?.descricao ?? "");
  const [uf, setUf] = useState("");
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [dataFim, setDataFim] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [showFiltros, setShowFiltros] = useState(false);

  // Seleção multi-estado TCE
  const [ufsTCE, setUfsTCE] = useState<UF[]>(["MG"]);
  const [municipioFiltro, setMunicipioFiltro] = useState("");

  // Itens selecionados para importação (Fase 1-5 + Fase 6)
  const [selecionados, setSelecionados] = useState<(DadosFonteGenerico | DadosFonteGenericoFase6)[]>([]);
  const [importando, setImportando] = useState(false);
  const [importados, setImportados] = useState(0);

  // Portais com API
  const portaisComAPI = useMemo(() => listarPortaisComAPI(), []);
  const ufsComAPI = useMemo(() => new Set(portaisComAPI.map((p) => p.uf)), [portaisComAPI]);

  // ── Buscar em todas as fontes ─────────────────────
  const handleBuscar = useCallback(async () => {
    if (!termo.trim()) return;
    setSelecionados([]);
    setImportados(0);
    const filtro: FiltroFonte = {
      termo: termo.trim(),
      uf: uf || undefined,
      ufs: ufsTCE.length > 0 ? ufsTCE : undefined,
      municipio: municipioFiltro || undefined,
      dataInicio: dataInicio || undefined,
      dataFim: dataFim || undefined,
      limite: 50,
    };
    await buscarTodas(filtro, ufsTCE.length > 0 ? ufsTCE : undefined);
  }, [termo, uf, ufsTCE, municipioFiltro, dataInicio, dataFim, buscarTodas]);

  // ── Selecionar/desselecionar item ─────────────────
  const toggleSelecionado = useCallback(
    (dado: DadosFontePNCP | DadosFontePainel | DadosFonteTCE, tipo: "pncp" | "painel_precos" | "tce") => {
      const normalizado = normalizarDadosFonte(dado, tipo);
      setSelecionados((prev) => {
        const idx = prev.findIndex(
          (s) =>
            s.fonte_tipo === normalizado.fonte_tipo &&
            s.valor_unitario === normalizado.valor_unitario &&
            s.orgao === normalizado.orgao &&
            s.data_referencia === normalizado.data_referencia
        );
        if (idx >= 0) {
          return prev.filter((_, i) => i !== idx);
        }
        return [...prev, normalizado];
      });
    },
    []
  );

  const isSelecionado = useCallback(
    (dado: DadosFontePNCP | DadosFontePainel | DadosFonteTCE, tipo: "pncp" | "painel_precos" | "tce") => {
      const n = normalizarDadosFonte(dado, tipo);
      return selecionados.some(
        (s) =>
          s.fonte_tipo === n.fonte_tipo &&
          s.valor_unitario === n.valor_unitario &&
          s.orgao === n.orgao &&
          s.data_referencia === n.data_referencia
      );
    },
    [selecionados]
  );

  // ── Selecionar/desselecionar Fase 6 ──────────────
  const toggleSelecionadoFase6 = useCallback(
    (dado: DadosFonteBPS | DadosFonteSINAPI | DadosFonteCONAB | DadosFonteCEASA | DadosFonteCMED, tipo: "bps" | "sinapi" | "conab" | "ceasa" | "cmed") => {
      const normalizado = normalizarDadosFonteFase6(dado, tipo);
      setSelecionados((prev) => {
        const idx = prev.findIndex(
          (s) =>
            s.fonte_tipo === normalizado.fonte_tipo &&
            s.valor_unitario === normalizado.valor_unitario &&
            s.orgao === normalizado.orgao &&
            s.data_referencia === normalizado.data_referencia
        );
        if (idx >= 0) return prev.filter((_, i) => i !== idx);
        return [...prev, normalizado];
      });
    },
    []
  );

  const isSelecionadoFase6 = useCallback(
    (dado: DadosFonteBPS | DadosFonteSINAPI | DadosFonteCONAB | DadosFonteCEASA | DadosFonteCMED, tipo: "bps" | "sinapi" | "conab" | "ceasa" | "cmed") => {
      const n = normalizarDadosFonteFase6(dado, tipo);
      return selecionados.some(
        (s) =>
          s.fonte_tipo === n.fonte_tipo &&
          s.valor_unitario === n.valor_unitario &&
          s.orgao === n.orgao &&
          s.data_referencia === n.data_referencia
      );
    },
    [selecionados]
  );

  // ── Toggle UF no seletor ──────────────────────────
  const toggleUF = useCallback((ufToggle: UF) => {
    setUfsTCE((prev) =>
      prev.includes(ufToggle)
        ? prev.filter((u) => u !== ufToggle)
        : [...prev, ufToggle]
    );
  }, []);

  const selecionarRegiao = useCallback((regiao: string) => {
    const ufsRegiao = REGIOES_BRASIL[regiao] ?? [];
    setUfsTCE((prev) => {
      const todasJaSelecionadas = ufsRegiao.every((u) => prev.includes(u));
      if (todasJaSelecionadas) {
        return prev.filter((u) => !ufsRegiao.includes(u));
      }
      return [...new Set([...prev, ...ufsRegiao])];
    });
  }, []);

  const selecionarTodas = useCallback(() => {
    setUfsTCE((prev) =>
      prev.length === UFS_BRASIL.length ? [] : [...UFS_BRASIL]
    );
  }, []);

  // Dados TCE combinados (retrocompatível tce + multiTCE)
  const dadosTCECombinados = useMemo(() => {
    const todos = [...tce.dados, ...multiTCE.dados];
    // Deduplicar por id
    const vistos = new Set<string>();
    return todos.filter((d) => {
      if (vistos.has(d.id)) return false;
      vistos.add(d.id);
      return true;
    });
  }, [tce.dados, multiTCE.dados]);

  // Agrupar por UF
  const dadosTCEPorUF = useMemo(() => {
    const mapa: Record<string, DadosFonteTCE[]> = {};
    for (const d of dadosTCECombinados) {
      const key = d.uf ?? "??";
      if (!mapa[key]) mapa[key] = [];
      mapa[key].push(d);
    }
    return mapa;
  }, [dadosTCECombinados]);

  // ── Importar selecionados como preços do item ─────
  const handleImportar = useCallback(async () => {
    if (selecionados.length === 0) return;
    setImportando(true);
    let count = 0;
    try {
      for (const sel of selecionados) {
        // Encontrar a fonte correspondente no cadastro de fontes
        const fonte = fontes.find((f) => f.tipo === sel.fonte_tipo || f.tipo === "tce");
        if (!fonte) continue;

        await adicionarPreco({
          item_cesta_id: item.id,
          fonte_id: fonte.id,
          valor_unitario: sel.valor_unitario,
          data_referencia:
            sel.data_referencia ?? new Date().toISOString().slice(0, 10),
          orgao: sel.orgao || undefined,
          descricao_fonte: `${sel.descricao_item} — ${sel.fonte_detalhe ?? sel.fonte_tipo.toUpperCase()}${sel.uf ? ` (${sel.uf})` : ""}`,
        });
        count++;
      }

      await recalcularEstatisticasItem(item.id);
      setImportados(count);
      setSelecionados([]);
      onImportado();
    } catch {
      // silencioso
    } finally {
      setImportando(false);
    }
  }, [selecionados, fontes, item.id, onImportado]);

  // ── Limpar ao fechar ──────────────────────────────
  const handleClose = useCallback(() => {
    limparTodas();
    setSelecionados([]);
    setImportados(0);
    onClose();
  }, [limparTodas, onClose]);

  const tceCarregando = tce.carregando || multiTCE.carregando;
  const tceErro = tce.erro || multiTCE.erro;

  return (
    <Drawer open={aberto} onOpenChange={(v) => !v && handleClose()}>
      <DrawerContent side="right">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Fontes de Preços — {item.produto?.descricao ?? "Item"}
          </DrawerTitle>
        </DrawerHeader>

        <DrawerBody>
        {/* Barra de busca */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Buscar por descrição do item..."
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFiltros(!showFiltros)}
              title="Filtros regionais"
            >
              <Filter className="h-4 w-4" />
            </Button>
            <Button onClick={handleBuscar} disabled={carregando || !termo.trim()}>
              {carregando ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Buscar
            </Button>
          </div>

          {/* Filtros expandidos */}
          {showFiltros && (
            <div className="flex flex-wrap gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">UF (PNCP)</label>
                <select
                  value={uf}
                  onChange={(e) => setUf(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Todas</option>
                  {UFS_BRASIL.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Município (TCE)</label>
                <Input
                  placeholder="Ex: Belo Horizonte"
                  value={municipioFiltro}
                  onChange={(e) => setMunicipioFiltro(e.target.value)}
                  className="w-48"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Data início</label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Data fim</label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="w-40"
                />
              </div>
            </div>
          )}
        </div>

        {/* Resumo */}
        {totalResultados > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {totalResultados} resultado(s) encontrado(s)
            </span>
            <div className="flex items-center gap-2">
              {selecionados.length > 0 && (
                <Badge variant="default">
                  {selecionados.length} selecionado(s)
                </Badge>
              )}
              {importados > 0 && (
                <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {importados} importado(s)
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Abas por fonte */}
        <Tabs value={aba} onValueChange={setAba}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="pncp" className="flex items-center gap-1.5">
              PNCP
              {pncp.dados.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {pncp.dados.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="painel" className="flex items-center gap-1.5">
              Painel de Preços
              {painel.dados.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {painel.dados.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="tce" className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              TCEs Estaduais
              {dadosTCECombinados.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {dadosTCECombinados.length}
                </Badge>
              )}
              {ufsTCE.length > 0 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {ufsTCE.length} UF(s)
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="bps" className="flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5" />
              BPS
              {bps.dados.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {bps.dados.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sinapi" className="flex items-center gap-1.5">
              <HardHat className="h-3.5 w-3.5" />
              SINAPI
              {sinapi.dados.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {sinapi.dados.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="conab" className="flex items-center gap-1.5">
              <Wheat className="h-3.5 w-3.5" />
              CONAB
              {conab.dados.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {conab.dados.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="ceasa" className="flex items-center gap-1.5">
              <Apple className="h-3.5 w-3.5" />
              CEASA
              {ceasa.dados.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {ceasa.dados.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="cmed" className="flex items-center gap-1.5">
              <Pill className="h-3.5 w-3.5" />
              CMED
              {cmed.dados.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {cmed.dados.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* PNCP */}
          <TabsContent value="pncp">
            {pncp.carregando ? (
              <LoadingState />
            ) : pncp.erro ? (
              <ErrorState msg={pncp.erro} />
            ) : pncp.dados.length === 0 ? (
              <EmptyState fonte="PNCP" buscou={totalResultados > 0 || !carregando} />
            ) : (
              <TabelaPNCP
                dados={pncp.dados}
                isSelecionado={(d) => isSelecionado(d, "pncp")}
                onToggle={(d) => toggleSelecionado(d, "pncp")}
              />
            )}
          </TabsContent>

          {/* Painel de Preços */}
          <TabsContent value="painel">
            {painel.carregando ? (
              <LoadingState />
            ) : painel.erro ? (
              <ErrorState msg={painel.erro} />
            ) : painel.dados.length === 0 ? (
              <EmptyState fonte="Painel de Preços" buscou={totalResultados > 0 || !carregando} />
            ) : (
              <TabelaPainel
                dados={painel.dados}
                isSelecionado={(d) => isSelecionado(d, "painel_precos")}
                onToggle={(d) => toggleSelecionado(d, "painel_precos")}
              />
            )}
          </TabsContent>

          {/* TCEs Estaduais — Multi-Estado */}
          <TabsContent value="tce" className="space-y-3">
            {/* Seletor de estados */}
            <SeletorEstados
              selecionados={ufsTCE}
              onToggleUF={toggleUF}
              onSelecionarRegiao={selecionarRegiao}
              onSelecionarTodas={selecionarTodas}
              ufsComAPI={ufsComAPI}
            />

            {tceCarregando ? (
              <LoadingState />
            ) : tceErro ? (
              <ErrorState msg={tceErro} />
            ) : dadosTCECombinados.length === 0 ? (
              <EmptyState fonte="TCEs Estaduais" buscou={totalResultados > 0 || !carregando} />
            ) : (
              <TabelaTCEMultiEstado
                dadosPorUF={dadosTCEPorUF}
                isSelecionado={(d) => isSelecionado(d, "tce")}
                onToggle={(d) => toggleSelecionado(d, "tce")}
              />
            )}
          </TabsContent>

          {/* BPS — Banco de Preços em Saúde */}
          <TabsContent value="bps">
            {bps.carregando ? (
              <LoadingState />
            ) : bps.erro ? (
              <ErrorState msg={bps.erro} />
            ) : bps.dados.length === 0 ? (
              <EmptyState fonte="BPS (Saúde)" buscou={totalResultados > 0 || !carregando} />
            ) : (
              <>
                {bps.mediaPonderada && (
                  <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Média Ponderada: {moeda(bps.mediaPonderada.media)}
                      <span className="ml-2 text-xs font-normal text-blue-600 dark:text-blue-400">
                        ({bps.mediaPonderada.total} registros)
                      </span>
                    </p>
                  </div>
                )}
                <TabelaBPS
                  dados={bps.dados}
                  isSelecionado={(d) => isSelecionadoFase6(d, "bps")}
                  onToggle={(d) => toggleSelecionadoFase6(d, "bps")}
                />
              </>
            )}
          </TabsContent>

          {/* SINAPI */}
          <TabsContent value="sinapi">
            {sinapi.carregando ? (
              <LoadingState />
            ) : sinapi.erro ? (
              <ErrorState msg={sinapi.erro} />
            ) : sinapi.dados.length === 0 ? (
              <EmptyState fonte="SINAPI (Construção)" buscou={totalResultados > 0 || !carregando} />
            ) : (
              <TabelaSINAPI
                dados={sinapi.dados}
                isSelecionado={(d) => isSelecionadoFase6(d, "sinapi")}
                onToggle={(d) => toggleSelecionadoFase6(d, "sinapi")}
              />
            )}
          </TabsContent>

          {/* CONAB */}
          <TabsContent value="conab">
            {conab.carregando ? (
              <LoadingState />
            ) : conab.erro ? (
              <ErrorState msg={conab.erro} />
            ) : conab.dados.length === 0 ? (
              <EmptyState fonte="CONAB (Alimentação)" buscou={totalResultados > 0 || !carregando} />
            ) : (
              <TabelaCONAB
                dados={conab.dados}
                isSelecionado={(d) => isSelecionadoFase6(d, "conab")}
                onToggle={(d) => toggleSelecionadoFase6(d, "conab")}
              />
            )}
          </TabsContent>

          {/* CEASA */}
          <TabsContent value="ceasa">
            {ceasa.carregando ? (
              <LoadingState />
            ) : ceasa.erro ? (
              <ErrorState msg={ceasa.erro} />
            ) : ceasa.dados.length === 0 ? (
              <EmptyState fonte="CEASA-MG (Hortifrúti)" buscou={totalResultados > 0 || !carregando} />
            ) : (
              <TabelaCEASA
                dados={ceasa.dados}
                isSelecionado={(d) => isSelecionadoFase6(d, "ceasa")}
                onToggle={(d) => toggleSelecionadoFase6(d, "ceasa")}
              />
            )}
          </TabsContent>

          {/* CMED/ANVISA */}
          <TabsContent value="cmed">
            {cmed.carregando ? (
              <LoadingState />
            ) : cmed.erro ? (
              <ErrorState msg={cmed.erro} />
            ) : cmed.dados.length === 0 ? (
              <EmptyState fonte="CMED/ANVISA (Medicamentos)" buscou={totalResultados > 0 || !carregando} />
            ) : (
              <TabelaCMED
                dados={cmed.dados}
                isSelecionado={(d) => isSelecionadoFase6(d, "cmed")}
                onToggle={(d) => toggleSelecionadoFase6(d, "cmed")}
              />
            )}
          </TabsContent>
        </Tabs>

        {/* Botão de importação */}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={handleClose}>
            Fechar
          </Button>
          <Button
            onClick={handleImportar}
            disabled={selecionados.length === 0 || importando}
          >
            {importando ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Importar {selecionados.length} preço(s)
          </Button>
        </div>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

// ╔══════════════════════════════════════════════════════╗
// ║  Sub-componentes de tabela por fonte                ║
// ╚══════════════════════════════════════════════════════╝

function TabelaPNCP({
  dados,
  isSelecionado,
  onToggle,
}: {
  dados: DadosFontePNCP[];
  isSelecionado: (d: DadosFontePNCP) => boolean;
  onToggle: (d: DadosFontePNCP) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="p-2 w-8"></th>
            <th className="p-2">Descrição</th>
            <th className="p-2">Órgão</th>
            <th className="p-2">UF</th>
            <th className="p-2 text-right">Valor Unit.</th>
            <th className="p-2">Data</th>
            <th className="p-2">Modalidade</th>
            <th className="p-2 w-8"></th>
          </tr>
        </thead>
        <tbody>
          {dados.map((d, i) => (
            <tr
              key={d.id ?? i}
              className={`border-b hover:bg-muted/50 cursor-pointer ${
                isSelecionado(d) ? "bg-primary/5" : ""
              }`}
              onClick={() => onToggle(d)}
            >
              <td className="p-2">
                <input
                  type="checkbox"
                  checked={isSelecionado(d)}
                  onChange={() => onToggle(d)}
                  className="rounded"
                />
              </td>
              <td className="p-2 max-w-[200px] truncate" title={d.descricao_item}>
                {d.descricao_item}
              </td>
              <td className="p-2 max-w-[150px] truncate" title={d.orgao}>
                {d.orgao || "—"}
              </td>
              <td className="p-2">{d.uf_orgao || "—"}</td>
              <td className="p-2 text-right font-medium">{moeda(d.valor_unitario)}</td>
              <td className="p-2">{dataFormatada(d.data_homologacao)}</td>
              <td className="p-2 text-xs">{d.modalidade || "—"}</td>
              <td className="p-2">
                {d.documento_url && (
                  <a
                    href={d.documento_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    title="Ver documento"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabelaPainel({
  dados,
  isSelecionado,
  onToggle,
}: {
  dados: DadosFontePainel[];
  isSelecionado: (d: DadosFontePainel) => boolean;
  onToggle: (d: DadosFontePainel) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="p-2 w-8"></th>
            <th className="p-2">Descrição</th>
            <th className="p-2">Órgão</th>
            <th className="p-2 text-right">Valor Unit.</th>
            <th className="p-2">Data Compra</th>
            <th className="p-2">Modalidade</th>
            <th className="p-2">Processo</th>
            <th className="p-2 w-8"></th>
          </tr>
        </thead>
        <tbody>
          {dados.map((d, i) => (
            <tr
              key={d.id ?? i}
              className={`border-b hover:bg-muted/50 cursor-pointer ${
                isSelecionado(d) ? "bg-primary/5" : ""
              }`}
              onClick={() => onToggle(d)}
            >
              <td className="p-2">
                <input
                  type="checkbox"
                  checked={isSelecionado(d)}
                  onChange={() => onToggle(d)}
                  className="rounded"
                />
              </td>
              <td className="p-2 max-w-[200px] truncate" title={d.descricao_item}>
                {d.descricao_item}
              </td>
              <td className="p-2 max-w-[150px] truncate" title={d.orgao}>
                {d.orgao || "—"}
              </td>
              <td className="p-2 text-right font-medium">{moeda(d.valor_unitario)}</td>
              <td className="p-2">{dataFormatada(d.data_compra)}</td>
              <td className="p-2 text-xs">{d.modalidade || "—"}</td>
              <td className="p-2 text-xs">{d.numero_processo || "—"}</td>
              <td className="p-2">
                {d.documento_url && (
                  <a
                    href={d.documento_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    title="Ver documento"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabelaTCEMultiEstado({
  dadosPorUF,
  isSelecionado,
  onToggle,
}: {
  dadosPorUF: Record<string, DadosFonteTCE[]>;
  isSelecionado: (d: DadosFonteTCE) => boolean;
  onToggle: (d: DadosFonteTCE) => void;
}) {
  const [ufsAbertas, setUfsAbertas] = useState<Set<string>>(() => new Set(Object.keys(dadosPorUF)));
  const ufsOrdenadas = Object.keys(dadosPorUF).sort();

  const toggleUFAberta = (uf: string) => {
    setUfsAbertas((prev) => {
      const next = new Set(prev);
      if (next.has(uf)) next.delete(uf);
      else next.add(uf);
      return next;
    });
  };

  return (
    <div className="space-y-2">
      {ufsOrdenadas.map((uf) => {
        const dados = dadosPorUF[uf];
        const aberta = ufsAbertas.has(uf);
        const nomeUF = NOMES_UF[uf as UF] ?? uf;
        return (
          <div key={uf} className="border rounded-lg overflow-hidden">
            {/* Header do grupo UF */}
            <button
              className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
              onClick={() => toggleUFAberta(uf)}
            >
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">
                  TCE/{uf} — {nomeUF}
                </span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {dados.length} resultado(s)
                </Badge>
              </div>
              {aberta ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {/* Tabela de resultados */}
            {aberta && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="p-2 w-8"></th>
                      <th className="p-2">Descrição</th>
                      <th className="p-2">Órgão</th>
                      <th className="p-2">Município</th>
                      <th className="p-2 text-right">Valor Unit.</th>
                      <th className="p-2">Data Contrato</th>
                      <th className="p-2">Nº Contrato</th>
                      <th className="p-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.map((d, i) => (
                      <tr
                        key={d.id ?? i}
                        className={`border-b hover:bg-muted/50 cursor-pointer ${
                          isSelecionado(d) ? "bg-primary/5" : ""
                        }`}
                        onClick={() => onToggle(d)}
                      >
                        <td className="p-2">
                          <input
                            type="checkbox"
                            checked={isSelecionado(d)}
                            onChange={() => onToggle(d)}
                            className="rounded"
                          />
                        </td>
                        <td className="p-2 max-w-[200px] truncate" title={d.descricao_item}>
                          {d.descricao_item}
                        </td>
                        <td className="p-2 max-w-[150px] truncate" title={d.orgao}>
                          {d.orgao || "—"}
                        </td>
                        <td className="p-2">{d.municipio || "—"}</td>
                        <td className="p-2 text-right font-medium">{moeda(d.valor_unitario)}</td>
                        <td className="p-2">{dataFormatada(d.data_contrato)}</td>
                        <td className="p-2 text-xs">{d.numero_contrato || "—"}</td>
                        <td className="p-2">
                          {d.documento_url && (
                            <a
                              href={d.documento_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title="Ver documento"
                            >
                              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Seletor de estados para TCE ─────────────────────
function SeletorEstados({
  selecionados,
  onToggleUF,
  onSelecionarRegiao,
  onSelecionarTodas,
  ufsComAPI,
}: {
  selecionados: UF[];
  onToggleUF: (uf: UF) => void;
  onSelecionarRegiao: (regiao: string) => void;
  onSelecionarTodas: () => void;
  ufsComAPI: Set<string>;
}) {
  const [expandido, setExpandido] = useState(false);

  return (
    <div className="border rounded-lg p-3 bg-muted/20 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            Estados selecionados: {selecionados.length}/{UFS_BRASIL.length}
          </span>
          {selecionados.length > 0 && (
            <span className="text-xs text-muted-foreground">
              ({selecionados.sort().join(", ")})
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={onSelecionarTodas}
          >
            {selecionados.length === UFS_BRASIL.length ? "Limpar" : "Todos"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7"
            onClick={() => setExpandido(!expandido)}
          >
            {expandido ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {expandido && (
        <div className="space-y-3 pt-2 border-t">
          {/* Botões de região */}
          <div className="flex flex-wrap gap-1">
            {Object.keys(REGIOES_BRASIL).map((regiao) => {
              const ufsRegiao = REGIOES_BRASIL[regiao];
              const todasSel = ufsRegiao.every((u) => selecionados.includes(u));
              return (
                <Button
                  key={regiao}
                  variant={todasSel ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => onSelecionarRegiao(regiao)}
                >
                  {regiao}
                </Button>
              );
            })}
          </div>

          {/* Grid de UFs por região */}
          {Object.entries(REGIOES_BRASIL).map(([regiao, ufs]) => (
            <div key={regiao}>
              <span className="text-xs font-medium text-muted-foreground">{regiao}</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {ufs.map((u) => {
                  const sel = selecionados.includes(u);
                  const temAPI = ufsComAPI.has(u);
                  return (
                    <button
                      key={u}
                      onClick={() => onToggleUF(u)}
                      className={`px-2 py-1 rounded text-xs border transition-colors ${
                        sel
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-input hover:bg-muted"
                      }`}
                      title={`${NOMES_UF[u]}${temAPI ? " (API disponível)" : " (dados locais)"}`}
                    >
                      {u}
                      {temAPI && (
                        <span className="ml-0.5 text-[8px] opacity-70">●</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <p className="text-[10px] text-muted-foreground">
            ● = Portal com API de dados abertos disponível
          </p>
        </div>
      )}
    </div>
  );
}

// ╔══════════════════════════════════════════════════════╗
// ║  Tabelas Fase 6 — BPS, SINAPI, CONAB, CEASA, CMED  ║
// ╚══════════════════════════════════════════════════════╝

function TabelaBPS({
  dados,
  isSelecionado,
  onToggle,
}: {
  dados: DadosFonteBPS[];
  isSelecionado: (d: DadosFonteBPS) => boolean;
  onToggle: (d: DadosFonteBPS) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="p-2 w-8"></th>
            <th className="p-2">Descrição</th>
            <th className="p-2">Cód. BR</th>
            <th className="p-2">Instituição</th>
            <th className="p-2">UF</th>
            <th className="p-2 text-right">Valor Unit.</th>
            <th className="p-2 text-right">Qtd</th>
            <th className="p-2">Data Compra</th>
            <th className="p-2">Modalidade</th>
          </tr>
        </thead>
        <tbody>
          {dados.map((d, i) => (
            <tr
              key={d.id ?? i}
              className={`border-b hover:bg-muted/50 cursor-pointer ${
                isSelecionado(d) ? "bg-primary/5" : ""
              }`}
              onClick={() => onToggle(d)}
            >
              <td className="p-2">
                <input type="checkbox" checked={isSelecionado(d)} onChange={() => onToggle(d)} className="rounded" />
              </td>
              <td className="p-2 max-w-[200px] truncate" title={d.descricao_item}>{d.descricao_item}</td>
              <td className="p-2 text-xs font-mono">{d.codigo_br || "—"}</td>
              <td className="p-2 max-w-[120px] truncate" title={d.instituicao ?? ""}>{d.instituicao || "—"}</td>
              <td className="p-2">{d.uf || "—"}</td>
              <td className="p-2 text-right font-medium">{moeda(d.valor_unitario)}</td>
              <td className="p-2 text-right">{d.quantidade ?? "—"}</td>
              <td className="p-2">{dataFormatada(d.data_compra)}</td>
              <td className="p-2 text-xs">{d.modalidade || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabelaSINAPI({
  dados,
  isSelecionado,
  onToggle,
}: {
  dados: DadosFonteSINAPI[];
  isSelecionado: (d: DadosFonteSINAPI) => boolean;
  onToggle: (d: DadosFonteSINAPI) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="p-2 w-8"></th>
            <th className="p-2">Descrição</th>
            <th className="p-2">Cód. SINAPI</th>
            <th className="p-2">UF</th>
            <th className="p-2">Tipo</th>
            <th className="p-2 text-right">Valor Unit.</th>
            <th className="p-2">Mês Ref.</th>
            <th className="p-2">Desonerado</th>
          </tr>
        </thead>
        <tbody>
          {dados.map((d, i) => (
            <tr
              key={d.id ?? i}
              className={`border-b hover:bg-muted/50 cursor-pointer ${
                isSelecionado(d) ? "bg-primary/5" : ""
              }`}
              onClick={() => onToggle(d)}
            >
              <td className="p-2">
                <input type="checkbox" checked={isSelecionado(d)} onChange={() => onToggle(d)} className="rounded" />
              </td>
              <td className="p-2 max-w-[200px] truncate" title={d.descricao_item}>{d.descricao_item}</td>
              <td className="p-2 text-xs font-mono">{d.codigo_sinapi}</td>
              <td className="p-2">{d.uf}</td>
              <td className="p-2 text-xs">{d.tipo || "—"}</td>
              <td className="p-2 text-right font-medium">{moeda(d.valor_unitario)}</td>
              <td className="p-2">{d.mes_referencia}</td>
              <td className="p-2 text-xs">{d.desonerado ? "Sim" : "Não"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabelaCONAB({
  dados,
  isSelecionado,
  onToggle,
}: {
  dados: DadosFonteCONAB[];
  isSelecionado: (d: DadosFonteCONAB) => boolean;
  onToggle: (d: DadosFonteCONAB) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="p-2 w-8"></th>
            <th className="p-2">Produto</th>
            <th className="p-2">Cidade</th>
            <th className="p-2">UF</th>
            <th className="p-2">Unidade</th>
            <th className="p-2 text-right">Valor Unit.</th>
            <th className="p-2">Data Ref.</th>
          </tr>
        </thead>
        <tbody>
          {dados.map((d, i) => (
            <tr
              key={d.id ?? i}
              className={`border-b hover:bg-muted/50 cursor-pointer ${
                isSelecionado(d) ? "bg-primary/5" : ""
              }`}
              onClick={() => onToggle(d)}
            >
              <td className="p-2">
                <input type="checkbox" checked={isSelecionado(d)} onChange={() => onToggle(d)} className="rounded" />
              </td>
              <td className="p-2 max-w-[200px] truncate" title={d.descricao_item}>{d.descricao_item}</td>
              <td className="p-2">{d.cidade || "—"}</td>
              <td className="p-2">{d.uf}</td>
              <td className="p-2 text-xs">{d.unidade || "—"}</td>
              <td className="p-2 text-right font-medium">{moeda(d.valor_unitario)}</td>
              <td className="p-2">{dataFormatada(d.data_referencia)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabelaCEASA({
  dados,
  isSelecionado,
  onToggle,
}: {
  dados: DadosFonteCEASA[];
  isSelecionado: (d: DadosFonteCEASA) => boolean;
  onToggle: (d: DadosFonteCEASA) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="p-2 w-8"></th>
            <th className="p-2">Produto</th>
            <th className="p-2">Variedade</th>
            <th className="p-2">Unidade</th>
            <th className="p-2 text-right">Mínimo</th>
            <th className="p-2 text-right">Máximo</th>
            <th className="p-2 text-right">Comum</th>
            <th className="p-2">Data Cotação</th>
          </tr>
        </thead>
        <tbody>
          {dados.map((d, i) => (
            <tr
              key={d.id ?? i}
              className={`border-b hover:bg-muted/50 cursor-pointer ${
                isSelecionado(d) ? "bg-primary/5" : ""
              }`}
              onClick={() => onToggle(d)}
            >
              <td className="p-2">
                <input type="checkbox" checked={isSelecionado(d)} onChange={() => onToggle(d)} className="rounded" />
              </td>
              <td className="p-2 max-w-[200px] truncate" title={d.descricao_item}>{d.descricao_item}</td>
              <td className="p-2">{d.variedade || "—"}</td>
              <td className="p-2 text-xs">{d.unidade || "—"}</td>
              <td className="p-2 text-right">{moeda(d.valor_minimo)}</td>
              <td className="p-2 text-right">{moeda(d.valor_maximo)}</td>
              <td className="p-2 text-right font-medium">{moeda(d.valor_comum)}</td>
              <td className="p-2">{dataFormatada(d.data_cotacao)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabelaCMED({
  dados,
  isSelecionado,
  onToggle,
}: {
  dados: DadosFonteCMED[];
  isSelecionado: (d: DadosFonteCMED) => boolean;
  onToggle: (d: DadosFonteCMED) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="p-2 w-8"></th>
            <th className="p-2">Produto</th>
            <th className="p-2">Princípio Ativo</th>
            <th className="p-2">Registro</th>
            <th className="p-2">Laboratório</th>
            <th className="p-2 text-right">PMVG s/</th>
            <th className="p-2 text-right">PMC</th>
            <th className="p-2">Data Pub.</th>
          </tr>
        </thead>
        <tbody>
          {dados.map((d, i) => (
            <tr
              key={d.id ?? i}
              className={`border-b hover:bg-muted/50 cursor-pointer ${
                isSelecionado(d) ? "bg-primary/5" : ""
              }`}
              onClick={() => onToggle(d)}
            >
              <td className="p-2">
                <input type="checkbox" checked={isSelecionado(d)} onChange={() => onToggle(d)} className="rounded" />
              </td>
              <td className="p-2 max-w-[180px] truncate" title={d.descricao_produto}>{d.descricao_produto}</td>
              <td className="p-2 max-w-[130px] truncate" title={d.principio_ativo}>{d.principio_ativo}</td>
              <td className="p-2 text-xs font-mono">{d.registro_anvisa || "—"}</td>
              <td className="p-2 max-w-[100px] truncate" title={d.laboratorio ?? ""}>{d.laboratorio || "—"}</td>
              <td className="p-2 text-right font-medium">{moeda(d.pmvg_sem_impostos)}</td>
              <td className="p-2 text-right">{moeda(d.pmc)}</td>
              <td className="p-2">{dataFormatada(d.data_publicacao)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Estados auxiliares ──────────────────────────────
function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin mr-2" />
      Consultando fonte...
    </div>
  );
}

function ErrorState({ msg }: { msg: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-destructive gap-2">
      <AlertCircle className="h-5 w-5" />
      <span className="text-sm">{msg}</span>
    </div>
  );
}

function EmptyState({ fonte, buscou }: { fonte: string; buscou: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Search className="h-8 w-8 mb-2 opacity-40" />
      <p className="text-sm">
        {buscou
          ? `Nenhum resultado encontrado no ${fonte}`
          : `Faça uma busca para consultar o ${fonte}`}
      </p>
    </div>
  );
}
