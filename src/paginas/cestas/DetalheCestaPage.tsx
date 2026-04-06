// Página de detalhe / gerenciamento de uma Cesta de Preços
import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Badge } from "@/componentes/ui/badge";
import {
  ArrowLeft,
  Calculator,
  Copy,
  History,
  Layers,
  Loader2,
  Package,
  Plus,
  Search,
  Trash2,
  DollarSign,
  ChevronRight,
  AlertCircle,
  Globe,
  ShieldCheck,
  FileBarChart2,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAuth } from "@/hooks/useAuth";
import { useCestaDetalhe, useFontes } from "@/hooks/useCestas";
import type { ItemCesta, LoteCesta, StatusCesta, TipoCalculo } from "@/tipos";
import {
  alterarStatusCesta,
  criarVersao,
  excluirCesta,
} from "@/servicos/cestas";
import {
  adicionarItem,
  removerItem,
  atualizarItem,
  criarLote,
  removerLote,
  moverItemParaLote,
  reordenarItens,
} from "@/servicos/itensCesta";
import { buscarProdutosParaCesta } from "@/servicos/produtosCatalogo";
import type { ProdutoCatalogo } from "@/tipos";
import { PrecosItemDialog } from "./PrecosItemDrawer";
import { DuplicarCestaDialog } from "./DuplicarCestaDrawer";
import { VersoesDialog } from "./VersoesDrawer";
import { PainelFontesDialog } from "./PainelFontesDrawer";
import { CorrecaoMonetariaDrawer } from "./CorrecaoMonetariaDrawer";
import { AnaliseCriticaDrawer } from "./AnaliseCriticaDrawer";
import { GerarRelatorioDrawer } from "./GerarRelatorioDrawer";

// ── Formatadores ──────────────────────────────────────
function moeda(valor: number | null) {
  if (valor == null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STATUS_LABEL: Record<StatusCesta, string> = {
  rascunho: "Rascunho",
  em_andamento: "Em Andamento",
  concluida: "Concluída",
  arquivada: "Arquivada",
};
const STATUS_VARIANT: Record<StatusCesta, "default" | "secondary" | "success" | "warning"> = {
  rascunho: "secondary",
  em_andamento: "default",
  concluida: "success",
  arquivada: "warning",
};
const CALCULO_LABEL: Record<TipoCalculo, string> = {
  media: "Média",
  mediana: "Mediana",
  menor_preco: "Menor Preço",
};

// Transições de status permitidas
const TRANSICOES: Record<StatusCesta, StatusCesta[]> = {
  rascunho: ["em_andamento"],
  em_andamento: ["rascunho", "concluida"],
  concluida: ["arquivada"],
  arquivada: [],
};

// ── Componente principal ──────────────────────────────
export function DetalheCestaPage() {
  const { cestaId } = useParams<{ cestaId: string }>();
  const navigate = useNavigate();
  const { servidor, temPermissao } = useAuth();
  const isAdmin = temPermissao("administrador");
  const { cesta, itens, lotes, carregando, erro, recarregar } =
    useCestaDetalhe(cestaId);
  useFontes(); // pré-carrega fontes para o PrecosItemDialog

  // View mode
  const [visao, setVisao] = useState<"itens" | "lotes">("itens");

  // Dialogs
  const [itemPrecos, setItemPrecos] = useState<ItemCesta | null>(null);
  const [showDuplicar, setShowDuplicar] = useState(false);
  const [showVersoes, setShowVersoes] = useState(false);
  const [itemFontes, setItemFontes] = useState<ItemCesta | null>(null);
  const [showCorrecao, setShowCorrecao] = useState(false);
  const [showAnalise, setShowAnalise] = useState(false);
  const [showRelatorios, setShowRelatorios] = useState(false);

  // Add item
  const [showAddItem, setShowAddItem] = useState(false);
  const [buscaProduto, setBuscaProduto] = useState("");
  const [resultadosBusca, setResultadosBusca] = useState<ProdutoCatalogo[]>([]);
  const [buscandoProduto, setBuscandoProduto] = useState(false);
  const buscaTimer = useState<ReturnType<typeof setTimeout> | null>(null);

  // Add lote
  const [descricaoNovoLote, setDescricaoNovoLote] = useState("");

  const editavel =
    cesta?.status === "rascunho" || cesta?.status === "em_andamento";

  // ── Busca de produtos ────────────────────────────
  const handleBuscaProduto = useCallback(
    (valor: string) => {
      setBuscaProduto(valor);
      if (buscaTimer[0]) clearTimeout(buscaTimer[0]);
      if (valor.length < 3) {
        setResultadosBusca([]);
        return;
      }
      const timer = setTimeout(async () => {
        setBuscandoProduto(true);
        try {
          const res = await buscarProdutosParaCesta(valor);
          setResultadosBusca(res);
        } catch {
          setResultadosBusca([]);
        } finally {
          setBuscandoProduto(false);
        }
      }, 300);
      buscaTimer[1](timer);
    },
    [buscaTimer],
  );

  const handleAddProduto = async (produto: ProdutoCatalogo) => {
    if (!cesta) return;
    try {
      await adicionarItem(cesta.id, produto.id, 1);
      setBuscaProduto("");
      setResultadosBusca([]);
      setShowAddItem(false);
      if (servidor) {
        await criarVersao(cesta.id, servidor.id, "Item adicionado");
      }
      recarregar();
    } catch {
      /* silencioso */
    }
  };

  // ── Status ──────────────────────────────────────
  const handleMudarStatus = async (novoStatus: StatusCesta) => {
    if (!cesta || !servidor) return;
    try {
      await alterarStatusCesta(cesta.id, novoStatus);
      await criarVersao(
        cesta.id,
        servidor.id,
        `Status: ${STATUS_LABEL[novoStatus]}`,
      );
      recarregar();
    } catch {
      /* silencioso */
    }
  };

  // ── Remover item ────────────────────────────────
  const handleRemoverItem = async (itemId: string) => {
    if (!confirm("Remover este item da cesta?")) return;
    try {
      await removerItem(itemId);
      if (cesta && servidor) {
        await criarVersao(cesta.id, servidor.id, "Item removido");
      }
      recarregar();
    } catch {
      /* silencioso */
    }
  };

  // ── Quantidade ──────────────────────────────────
  const handleMudarQuantidade = async (itemId: string, quantidade: number) => {
    if (quantidade < 1) return;
    try {
      await atualizarItem(itemId, { quantidade });
      recarregar();
    } catch {
      /* silencioso */
    }
  };

  // ── DnD Sensors ─────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  // ── Drag end handler ──────────────────────────
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = itens.findIndex((i) => i.id === active.id);
    const newIndex = itens.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const novaOrdem = arrayMove(itens, oldIndex, newIndex);
    try {
      await reordenarItens(
        novaOrdem.map((item, idx) => ({ id: item.id, ordem: idx + 1 })),
      );
      if (cesta && servidor) {
        await criarVersao(cesta.id, servidor.id, "Itens reordenados");
      }
      recarregar();
    } catch {
      /* silencioso */
    }
  };

  // ── Lotes ──────────────────────────────────────
  const handleCriarLote = async () => {
    if (!cesta) return;
    try {
      await criarLote(cesta.id, descricaoNovoLote || undefined);
      setDescricaoNovoLote("");
      recarregar();
    } catch {
      /* silencioso */
    }
  };

  const handleRemoverLote = async (loteId: string) => {
    if (!confirm("Remover este lote? Os itens serão desvinculados.")) return;
    try {
      await removerLote(loteId);
      recarregar();
    } catch {
      /* silencioso */
    }
  };

  const handleMoverItemLote = async (
    itemId: string,
    loteId: string | null,
  ) => {
    try {
      await moverItemParaLote(itemId, loteId);
      recarregar();
    } catch {
      /* silencioso */
    }
  };

  // ── Excluir cesta ──────────────────────────────
  const handleExcluirCesta = async () => {
    if (!cesta || !confirm("Excluir esta cesta permanentemente?")) return;
    try {
      await excluirCesta(cesta.id);
      navigate("/cestas");
    } catch {
      /* silencioso */
    }
  };

  // ── Helpers de cálculo por lote ────────────────
  function calcularTotalLote(
    itensDoLote: ItemCesta[],
    campo: "media" | "mediana" | "menor_preco",
  ): number | null {
    if (itensDoLote.some((i) => i[campo] == null)) return null;
    return itensDoLote.reduce(
      (acc, i) => acc + (i[campo] ?? 0) * i.quantidade,
      0,
    );
  }

  // ── Loading / Erro ─────────────────────────────
  if (carregando) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (erro || !cesta) {
    return (
      <div className="space-y-4 text-center py-20">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">{erro ?? "Cesta não encontrada"}</p>
        <Button variant="outline" onClick={() => navigate("/cestas")}>
          Voltar
        </Button>
      </div>
    );
  }

  const statusAtual = cesta.status as StatusCesta;
  const transicoesPossiveis = TRANSICOES[statusAtual] ?? [];

  // ── Agrupar itens por lote ────────────────────
  const itensSemLote = itens.filter((i) => !i.lote_id);
  const itensPorLote: Record<string, ItemCesta[]> = {};
  for (const lote of lotes) {
    itensPorLote[lote.id] = itens.filter((i) => i.lote_id === lote.id);
  }

  // ── Render ─────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="mt-1"
            onClick={() => navigate("/cestas")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{cesta.descricao_objeto}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant={STATUS_VARIANT[statusAtual]}>
                {STATUS_LABEL[statusAtual]}
              </Badge>
              <span>
                {new Date(cesta.data + "T00:00:00").toLocaleDateString("pt-BR")}
              </span>
              <span>•</span>
              <span>{CALCULO_LABEL[cesta.tipo_calculo]}</span>
              {cesta.criado_por_servidor && (
                <>
                  <span>•</span>
                  <span>{cesta.criado_por_servidor.nome}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {transicoesPossiveis.map((s) => (
            <Button
              key={s}
              size="sm"
              variant="outline"
              onClick={() => handleMudarStatus(s)}
            >
              <ChevronRight className="mr-1 h-4 w-4" />
              {STATUS_LABEL[s]}
            </Button>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowCorrecao(true)}
          >
            <Calculator className="mr-1 h-4 w-4" /> Correção
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAnalise(true)}
          >
            <ShieldCheck className="mr-1 h-4 w-4" /> Análise Crítica
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowRelatorios(true)}
          >
            <FileBarChart2 className="mr-1 h-4 w-4" /> Relatórios
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowDuplicar(true)}
          >
            <Copy className="mr-1 h-4 w-4" /> Duplicar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowVersoes(true)}
          >
            <History className="mr-1 h-4 w-4" /> Versões
          </Button>
          {(isAdmin || editavel) && (
            <Button
              size="sm"
              variant="destructive"
              onClick={handleExcluirCesta}
            >
              <Trash2 className="mr-1 h-4 w-4" /> Excluir
            </Button>
          )}
        </div>
      </div>

      {/* Tabs + Add */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border p-1">
          <button
            type="button"
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
              visao === "itens"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            }`}
            onClick={() => setVisao("itens")}
          >
            <Package className="mr-1 inline h-4 w-4" /> Por Item
          </button>
          <button
            type="button"
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
              visao === "lotes"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            }`}
            onClick={() => setVisao("lotes")}
          >
            <Layers className="mr-1 inline h-4 w-4" /> Por Lote
          </button>
        </div>

        {editavel && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setShowAddItem(true)}>
              <Plus className="mr-1 h-4 w-4" /> Adicionar Item
            </Button>
          </div>
        )}
      </div>

      {/* Add item panel */}
      {showAddItem && (
        <Card>
          <CardContent className="pt-4">
            <div className="relative max-w-lg">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Buscar produto no catálogo..."
                value={buscaProduto}
                onChange={(e) => handleBuscaProduto(e.target.value)}
                autoFocus
              />
              {(resultadosBusca.length > 0 || buscandoProduto) && (
                <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg max-h-60 overflow-y-auto">
                  {buscandoProduto ? (
                    <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
                    </div>
                  ) : (
                    resultadosBusca.map((produto) => {
                      const jaAdd = itens.some(
                        (i) => i.produto_id === produto.id,
                      );
                      return (
                        <button
                          key={produto.id}
                          type="button"
                          disabled={jaAdd}
                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-50"
                          onClick={() => handleAddProduto(produto)}
                        >
                          <div>
                            <p className="font-medium">{produto.descricao}</p>
                            <p className="text-xs text-muted-foreground">
                              {produto.categoria?.nome} —{" "}
                              {produto.unidade_medida?.sigla}
                            </p>
                          </div>
                          {jaAdd && (
                            <Badge variant="secondary">Já na cesta</Badge>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="mt-2"
              onClick={() => {
                setShowAddItem(false);
                setBuscaProduto("");
                setResultadosBusca([]);
              }}
            >
              Fechar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ──── VISÃO POR ITEM ──── */}
      {visao === "itens" && (
        <>
          {itens.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mb-3 opacity-40" />
                <p className="text-sm">Nenhum item na cesta</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Desktop table */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <div className="hidden md:block rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
                      <tr>
                        {editavel && <th className="px-1 py-2 w-8" />}
                        <th className="px-3 py-2 text-left w-10">#</th>
                        <th className="px-3 py-2 text-left">Produto</th>
                        <th className="px-3 py-2 text-center w-16">Un.</th>
                        <th className="px-3 py-2 text-right w-20">Qtd.</th>
                        <th className="px-3 py-2 text-right w-24">Menor</th>
                        <th className="px-3 py-2 text-right w-24">Maior</th>
                        <th className="px-3 py-2 text-right w-24">Média</th>
                        <th className="px-3 py-2 text-right w-24">Mediana</th>
                        <th className="px-3 py-2 text-center w-16">Preços</th>
                        <th className="px-3 py-2 w-28" />
                      </tr>
                    </thead>
                    <SortableContext
                      items={itens.map((i) => i.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <tbody>
                        {itens.map((item, idx) => (
                          <SortableItemRow
                            key={item.id}
                            item={item}
                            index={idx}
                            editavel={editavel}
                            onVerPrecos={() => setItemPrecos(item)}
                            onVerFontes={() => setItemFontes(item)}
                            onRemover={() => handleRemoverItem(item.id)}
                            onMudarQtd={(q) =>
                              handleMudarQuantidade(item.id, q)
                            }
                          />
                        ))}
                      </tbody>
                    </SortableContext>
                  </table>
                </div>
              </DndContext>
              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {itens.map((item, idx) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    index={idx}
                    editavel={editavel}
                    onVerPrecos={() => setItemPrecos(item)}
                    onVerFontes={() => setItemFontes(item)}
                    onRemover={() => handleRemoverItem(item.id)}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ──── VISÃO POR LOTE ──── */}
      {visao === "lotes" && (
        <div className="space-y-4">
          {/* Criar lote */}
          {editavel && (
            <div className="flex gap-2 items-end">
              <div className="flex-1 max-w-sm">
                <label className="text-xs text-muted-foreground">Novo lote</label>
                <Input
                  placeholder="Descrição do lote"
                  value={descricaoNovoLote}
                  onChange={(e) => setDescricaoNovoLote(e.target.value)}
                />
              </div>
              <Button size="sm" onClick={handleCriarLote}>
                <Plus className="mr-1 h-4 w-4" /> Criar Lote
              </Button>
            </div>
          )}

          {/* Lotes */}
          {lotes.map((lote) => {
            const itensDoLote = itensPorLote[lote.id] ?? [];
            const campo = cesta.tipo_calculo === "menor_preco"
              ? "menor_preco"
              : cesta.tipo_calculo === "mediana"
                ? "mediana"
                : "media";
            const totalLote = calcularTotalLote(itensDoLote, campo as "media" | "mediana" | "menor_preco");

            return (
              <Card key={lote.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      {lote.descricao ?? `Lote ${lote.numero}`}
                      <Badge variant="outline" className="ml-2">
                        {itensDoLote.length}{" "}
                        {itensDoLote.length === 1 ? "item" : "itens"}
                      </Badge>
                    </CardTitle>
                    <div className="flex items-center gap-3">
                      {totalLote != null ? (
                        <span className="text-sm font-semibold text-emerald-700">
                          Total ({CALCULO_LABEL[cesta.tipo_calculo]}):{" "}
                          {moeda(totalLote)}
                        </span>
                      ) : (
                        <span className="text-sm text-amber-600">
                          Total indisponível (item sem preço)
                        </span>
                      )}
                      {editavel && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => handleRemoverLote(lote.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {itensDoLote.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      Nenhum item neste lote
                    </p>
                  ) : (
                    <LoteItemTable
                      itens={itensDoLote}
                      lotes={lotes}
                      editavel={editavel}
                      onVerPrecos={setItemPrecos}
                      onVerFontes={setItemFontes}
                      onMoverLote={handleMoverItemLote}
                      onRemover={handleRemoverItem}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Itens sem lote */}
          {itensSemLote.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" /> Sem Lote
                  <Badge variant="outline" className="ml-2">
                    {itensSemLote.length}{" "}
                    {itensSemLote.length === 1 ? "item" : "itens"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LoteItemTable
                  itens={itensSemLote}
                  lotes={lotes}
                  editavel={editavel}
                  onVerPrecos={setItemPrecos}
                  onVerFontes={setItemFontes}
                  onMoverLote={handleMoverItemLote}
                  onRemover={handleRemoverItem}
                />
              </CardContent>
            </Card>
          )}

          {lotes.length === 0 && itensSemLote.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
                <Layers className="h-12 w-12 mb-3 opacity-40" />
                <p className="text-sm">Nenhum lote criado</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Dialogs */}
      {itemPrecos && (
        <PrecosItemDialog
          item={itemPrecos}
          aberto={!!itemPrecos}
          onClose={() => setItemPrecos(null)}
          onAtualizado={recarregar}
        />
      )}
      {showDuplicar && (
        <DuplicarCestaDialog
          cestaId={cesta.id}
          descricao={cesta.descricao_objeto}
          aberto={showDuplicar}
          onClose={() => setShowDuplicar(false)}
        />
      )}
      {showVersoes && (
        <VersoesDialog
          cestaId={cesta.id}
          aberto={showVersoes}
          onClose={() => setShowVersoes(false)}
        />
      )}
      {itemFontes && (
        <PainelFontesDialog
          item={itemFontes}
          aberto={!!itemFontes}
          onClose={() => setItemFontes(null)}
          onImportado={recarregar}
        />
      )}
      {showCorrecao && cesta && (
        <CorrecaoMonetariaDrawer
          cesta={cesta}
          aberto={showCorrecao}
          onClose={() => setShowCorrecao(false)}
          onAtualizado={recarregar}
        />
      )}
      {showAnalise && cesta && (
        <AnaliseCriticaDrawer
          cesta={cesta}
          itens={itens}
          aberto={showAnalise}
          onClose={() => setShowAnalise(false)}
          onAtualizado={recarregar}
        />
      )}
      {showRelatorios && cesta && (
        <GerarRelatorioDrawer
          cesta={cesta}
          itens={itens}
          aberto={showRelatorios}
          onClose={() => setShowRelatorios(false)}
        />
      )}
    </div>
  );
}

// ── Sub-componentes ──────────────────────────────────

function SortableItemRow({
  item,
  index,
  editavel,
  onVerPrecos,
  onVerFontes,
  onRemover,
  onMudarQtd,
}: {
  item: ItemCesta;
  index: number;
  editavel: boolean;
  onVerPrecos: () => void;
  onVerFontes: () => void;
  onRemover: () => void;
  onMudarQtd: (q: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const nPrecos = item.precos?.length ?? 0;
  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="border-b last:border-0 hover:bg-muted/30"
    >
      {editavel && (
        <td className="px-1 py-2">
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted text-muted-foreground"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </td>
      )}
      <td className="px-3 py-2 text-muted-foreground">{index + 1}</td>
      <td className="px-3 py-2">
        <p className="font-medium">{item.produto?.descricao ?? "—"}</p>
        <p className="text-xs text-muted-foreground">
          {item.produto?.categoria?.nome}
        </p>
      </td>
      <td className="px-3 py-2 text-center">
        {item.produto?.unidade_medida?.sigla}
      </td>
      <td className="px-3 py-2 text-right">
        {editavel ? (
          <Input
            type="number"
            min={1}
            className="w-20 ml-auto text-right"
            value={item.quantidade}
            onChange={(e) => onMudarQtd(Number(e.target.value))}
          />
        ) : (
          item.quantidade
        )}
      </td>
      <td className="px-3 py-2 text-right font-mono text-xs">
        {moeda(item.menor_preco)}
      </td>
      <td className="px-3 py-2 text-right font-mono text-xs">
        {moeda(item.maior_preco)}
      </td>
      <td className="px-3 py-2 text-right font-mono text-xs">
        {moeda(item.media)}
      </td>
      <td className="px-3 py-2 text-right font-mono text-xs">
        {moeda(item.mediana)}
      </td>
      <td className="px-3 py-2 text-center">
        <Badge variant={nPrecos > 0 ? "default" : "secondary"}>{nPrecos}</Badge>
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-1 justify-end">
          <button
            type="button"
            className="rounded p-1 text-primary hover:bg-primary/10"
            title="Gerenciar preços"
            onClick={onVerPrecos}
          >
            <DollarSign className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded p-1 text-blue-600 hover:bg-blue-600/10"
            title="Buscar fontes governamentais"
            onClick={onVerFontes}
          >
            <Globe className="h-4 w-4" />
          </button>
          {editavel && (
            <button
              type="button"
              className="rounded p-1 text-destructive hover:bg-destructive/10"
              title="Remover item"
              onClick={onRemover}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function ItemCard({
  item,
  index,
  editavel,
  onVerPrecos,
  onVerFontes,
  onRemover,
}: {
  item: ItemCesta;
  index: number;
  editavel: boolean;
  onVerPrecos: () => void;
  onVerFontes: () => void;
  onRemover: () => void;
}) {
  const nPrecos = item.precos?.length ?? 0;
  return (
    <Card>
      <CardContent className="pt-4 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium text-sm">
              {index + 1}. {item.produto?.descricao ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {item.produto?.categoria?.nome} —{" "}
              {item.produto?.unidade_medida?.sigla} — Qtd:{" "}
              {item.quantidade}
            </p>
          </div>
          <Badge variant={nPrecos > 0 ? "default" : "secondary"}>
            {nPrecos} preço{nPrecos !== 1 && "s"}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <span>
            Menor: <strong>{moeda(item.menor_preco)}</strong>
          </span>
          <span>
            Maior: <strong>{moeda(item.maior_preco)}</strong>
          </span>
          <span>
            Média: <strong>{moeda(item.media)}</strong>
          </span>
          <span>
            Mediana: <strong>{moeda(item.mediana)}</strong>
          </span>
        </div>
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={onVerPrecos}>
            <DollarSign className="mr-1 h-3 w-3" /> Preços
          </Button>
          <Button size="sm" variant="outline" onClick={onVerFontes}>
            <Globe className="mr-1 h-3 w-3" /> Fontes
          </Button>
          {editavel && (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={onRemover}
            >
              <Trash2 className="mr-1 h-3 w-3" /> Remover
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LoteItemTable({
  itens,
  lotes,
  editavel,
  onVerPrecos,
  onVerFontes,
  onMoverLote,
  onRemover,
}: {
  itens: ItemCesta[];
  lotes: LoteCesta[];
  editavel: boolean;
  onVerPrecos: (item: ItemCesta) => void;
  onVerFontes: (item: ItemCesta) => void;
  onMoverLote: (itemId: string, loteId: string | null) => void;
  onRemover: (itemId: string) => void;
}) {
  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left">Produto</th>
            <th className="px-3 py-2 text-center w-12">Un.</th>
            <th className="px-3 py-2 text-right w-16">Qtd.</th>
            <th className="px-3 py-2 text-right w-24">Média</th>
            <th className="px-3 py-2 text-right w-24">Mediana</th>
            <th className="px-3 py-2 text-right w-24">Menor</th>
            {editavel && (
              <th className="px-3 py-2 text-left w-40">Mover p/ Lote</th>
            )}
            <th className="px-3 py-2 w-20" />
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => (
            <tr key={item.id} className="border-b last:border-0">
              <td className="px-3 py-2 font-medium">
                {item.produto?.descricao ?? "—"}
              </td>
              <td className="px-3 py-2 text-center">
                {item.produto?.unidade_medida?.sigla}
              </td>
              <td className="px-3 py-2 text-right">{item.quantidade}</td>
              <td className="px-3 py-2 text-right font-mono text-xs">
                {moeda(item.media)}
              </td>
              <td className="px-3 py-2 text-right font-mono text-xs">
                {moeda(item.mediana)}
              </td>
              <td className="px-3 py-2 text-right font-mono text-xs">
                {moeda(item.menor_preco)}
              </td>
              {editavel && (
                <td className="px-3 py-2">
                  <select
                    className="w-full rounded border border-input bg-background px-2 py-1 text-xs"
                    value={item.lote_id ?? ""}
                    onChange={(e) =>
                      onMoverLote(item.id, e.target.value || null)
                    }
                  >
                    <option value="">Sem lote</option>
                    {lotes.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.descricao}
                      </option>
                    ))}
                  </select>
                </td>
              )}
              <td className="px-3 py-2">
                <div className="flex gap-1 justify-end">
                  <button
                    type="button"
                    className="rounded p-1 text-primary hover:bg-primary/10"
                    onClick={() => onVerPrecos(item)}
                  >
                    <DollarSign className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded p-1 text-blue-600 hover:bg-blue-600/10"
                    title="Buscar fontes governamentais"
                    onClick={() => onVerFontes(item)}
                  >
                    <Globe className="h-4 w-4" />
                  </button>
                  {editavel && (
                    <button
                      type="button"
                      className="rounded p-1 text-destructive hover:bg-destructive/10"
                      onClick={() => onRemover(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
