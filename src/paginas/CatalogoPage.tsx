import { useRef, useState } from "react";
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
import { SkeletonTable } from "@/componentes/ui/skeleton";
import { EmptyState } from "@/componentes/ui/empty-state";
import {
  Package,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Eye,
  AlertCircle,
  FileUp,
  ListChecks,
  X,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDadosReferencia, useProdutosPaginados } from "@/hooks/useCatalogo";
import { desativarProdutoCatalogo, reativarProdutoCatalogo } from "@/servicos/produtosCatalogo";
import type { ProdutoCatalogo } from "@/tipos";

import { DetalheProdutoDialog } from "./catalogo/DetalheProdutoDrawer";
import { FormProdutoDialog } from "./catalogo/FormProdutoDrawer";
import { SolicitarInclusaoDialog } from "./catalogo/SolicitarInclusaoDrawer";
import { ImportarCSVDialog } from "./catalogo/ImportarCSVDrawer";
import { PainelSolicitacoes } from "./catalogo/PainelSolicitacoes";

type Aba = "catalogo" | "solicitacoes" | "admin-solicitacoes";

export function CatalogoPage() {
  const { temPermissao } = useAuth();
  const isAdmin = temPermissao("administrador", "gestor");

  // Dados de referência
  const { categorias, unidades, elementos, carregando: carregandoRefs } = useDadosReferencia();

  // Listagem paginada
  const {
    dados,
    total,
    pagina,
    totalPaginas,
    filtros,
    carregando,
    erro,
    setPagina,
    atualizarFiltros,
    recarregar,
  } = useProdutosPaginados();

  // Busca local com debounce
  const [buscaInput, setBuscaInput] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const handleBuscaChange = (valor: string) => {
    setBuscaInput(valor);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      atualizarFiltros({ ...filtros, busca: valor || undefined });
    }, 300);
  };

  // Dialogs
  const [detalhe, setDetalhe] = useState<ProdutoCatalogo | null>(null);
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<ProdutoCatalogo | null>(null);
  const [solicitarAberto, setSolicitarAberto] = useState(false);
  const [importarAberto, setImportarAberto] = useState(false);

  // Aba ativa
  const [aba, setAba] = useState<Aba>("catalogo");

  // Desativar/reativar
  const handleDesativar = async (id: string) => {
    if (!window.confirm("Desativar este produto do catálogo?")) return;
    try {
      await desativarProdutoCatalogo(id);
      recarregar();
    } catch {
      /* erro silencioso, já exibido no UI */
    }
  };

  const handleReativar = async (id: string) => {
    try {
      await reativarProdutoCatalogo(id);
      recarregar();
    } catch {
      /* */
    }
  };

  const limparFiltros = () => {
    setBuscaInput("");
    atualizarFiltros({});
  };

  const temFiltroAtivo =
    !!filtros.busca || !!filtros.categoriaId || !!filtros.elementoDespesaId || !!filtros.unidadeMedidaId;

  const selectClasses =
    "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Package className="h-6 w-6" />
            Catálogo de Produtos e Serviços
          </h1>
          <p className="text-muted-foreground">
            Catálogo padronizado conforme padrões dos Tribunais de Contas
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <>
              <Button variant="outline" onClick={() => setImportarAberto(true)}>
                <FileUp className="mr-2 h-4 w-4" />
                Importar CSV
              </Button>
              <Button
                onClick={() => {
                  setEditando(null);
                  setFormAberto(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo Produto
              </Button>
            </>
          )}
          <Button variant="outline" onClick={() => setSolicitarAberto(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Solicitar Inclusão
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border bg-muted/40 p-1">
        <Button
          variant={aba === "catalogo" ? "default" : "ghost"}
          size="sm"
          className="flex-1"
          onClick={() => setAba("catalogo")}
        >
          <Package className="mr-2 h-4 w-4" />
          Catálogo
        </Button>
        <Button
          variant={aba === "solicitacoes" ? "default" : "ghost"}
          size="sm"
          className="flex-1"
          onClick={() => setAba("solicitacoes")}
        >
          <ListChecks className="mr-2 h-4 w-4" />
          Minhas Solicitações
        </Button>
        {isAdmin && (
          <Button
            variant={aba === "admin-solicitacoes" ? "default" : "ghost"}
            size="sm"
            className="flex-1"
            onClick={() => setAba("admin-solicitacoes")}
          >
            <ListChecks className="mr-2 h-4 w-4" />
            Aprovar Solicitações
          </Button>
        )}
      </div>

      {/* ── Aba Catálogo ────────────────────────────────── */}
      {aba === "catalogo" && (
        <>
          {/* Filtros combinados */}
          <div className="flex flex-wrap gap-3">
            {/* Busca textual */}
            <div className="relative min-w-[250px] flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição, CATMAT..."
                value={buscaInput}
                onChange={(e) => handleBuscaChange(e.target.value)}
                className="h-9 pl-10"
              />
            </div>

            {/* Categoria */}
            <select
              value={filtros.categoriaId || ""}
              onChange={(e) =>
                atualizarFiltros({ ...filtros, categoriaId: e.target.value || undefined })
              }
              className={`${selectClasses} w-48`}
              disabled={carregandoRefs}
            >
              <option value="">Todas categorias</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>

            {/* Elemento de despesa */}
            <select
              value={filtros.elementoDespesaId || ""}
              onChange={(e) =>
                atualizarFiltros({ ...filtros, elementoDespesaId: e.target.value || undefined })
              }
              className={`${selectClasses} w-48`}
              disabled={carregandoRefs}
            >
              <option value="">Todo elem. despesa</option>
              {elementos.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.codigo} — {e.descricao}
                </option>
              ))}
            </select>

            {/* Unidade */}
            <select
              value={filtros.unidadeMedidaId || ""}
              onChange={(e) =>
                atualizarFiltros({ ...filtros, unidadeMedidaId: e.target.value || undefined })
              }
              className={`${selectClasses} w-36`}
              disabled={carregandoRefs}
            >
              <option value="">Todas un.</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.sigla}
                </option>
              ))}
            </select>

            {temFiltroAtivo && (
              <Button variant="ghost" size="sm" onClick={limparFiltros}>
                <X className="mr-1 h-3 w-3" />
                Limpar
              </Button>
            )}
          </div>

          {/* Erro */}
          {erro && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {/* Tabela de resultados */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Itens do Catálogo</CardTitle>
              <CardDescription>
                {total} item(ns) encontrado(s)
                {totalPaginas > 1 && ` — Página ${pagina} de ${totalPaginas}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {carregando ? (
                <SkeletonTable rows={6} cols={5} />
              ) : dados.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title={temFiltroAtivo ? "Nenhum produto encontrado" : "Catálogo vazio"}
                  description={
                    temFiltroAtivo
                      ? "Tente ajustar os filtros para encontrar o que procura."
                      : "Nenhum produto cadastrado no catálogo."
                  }
                />
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                          <th className="pb-2 pr-4">Descrição</th>
                          <th className="pb-2 pr-4 w-36">Categoria</th>
                          <th className="pb-2 pr-4 w-20">Un.</th>
                          <th className="pb-2 pr-4 w-28">Elem. Desp.</th>
                          <th className="pb-2 pr-4 w-24">CATMAT</th>
                          <th className="pb-2 w-24 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {dados.map((p) => (
                          <tr key={p.id} className={!p.ativo ? "opacity-50" : ""}>
                            <td className="py-2.5 pr-4">
                              <p className="font-medium">{p.descricao}</p>
                              {p.descricao_detalhada && (
                                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                                  {p.descricao_detalhada}
                                </p>
                              )}
                            </td>
                            <td className="py-2.5 pr-4">
                              <Badge variant="secondary" className="text-[10px]">
                                {p.categoria?.nome ?? "—"}
                              </Badge>
                            </td>
                            <td className="py-2.5 pr-4 text-xs">
                              {p.unidade_medida?.sigla ?? "—"}
                            </td>
                            <td className="py-2.5 pr-4 text-xs">
                              {p.elemento_despesa?.codigo ?? "—"}
                            </td>
                            <td className="py-2.5 pr-4 text-xs font-mono">
                              {p.codigo_catmat || "—"}
                            </td>
                            <td className="py-2.5 text-right">
                              <div className="flex items-center justify-end gap-0.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  title="Ver detalhes"
                                  onClick={() => setDetalhe(p)}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                {isAdmin && p.ativo && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      title="Editar"
                                      onClick={() => {
                                        setEditando(p);
                                        setFormAberto(true);
                                      }}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive hover:text-destructive"
                                      title="Desativar"
                                      onClick={() => handleDesativar(p.id)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
                                {isAdmin && !p.ativo && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => handleReativar(p.id)}
                                  >
                                    <RotateCcw className="mr-1 h-3 w-3" />
                                    Reativar
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="space-y-2 md:hidden">
                    {dados.map((p) => (
                      <div
                        key={p.id}
                        className={`rounded-lg border p-3 ${!p.ativo ? "opacity-50" : ""}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{p.descricao}</p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              <Badge variant="secondary" className="text-[10px]">
                                {p.categoria?.nome ?? "—"}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">
                                {p.unidade_medida?.sigla ?? "—"}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={() => setDetalhe(p)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Paginação */}
                  {totalPaginas > 1 && (
                    <div className="mt-4 flex items-center justify-between border-t pt-4">
                      <p className="text-xs text-muted-foreground">
                        Mostrando {(pagina - 1) * 50 + 1}–{Math.min(pagina * 50, total)} de {total}
                      </p>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          disabled={pagina <= 1}
                          onClick={() => setPagina(pagina - 1)}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        {/* Exibir até 5 páginas ao redor da atual */}
                        {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                          .filter(
                            (p) =>
                              p === 1 ||
                              p === totalPaginas ||
                              Math.abs(p - pagina) <= 2,
                          )
                          .reduce<(number | "...")[]>((acc, p, i, arr) => {
                            if (i > 0 && p - (arr[i - 1] ?? 0) > 1) acc.push("...");
                            acc.push(p);
                            return acc;
                          }, [])
                          .map((item, i) =>
                            item === "..." ? (
                              <span
                                key={`ellipsis-${i}`}
                                className="flex h-8 w-8 items-center justify-center text-xs text-muted-foreground"
                              >
                                ...
                              </span>
                            ) : (
                              <Button
                                key={item}
                                variant={pagina === item ? "default" : "outline"}
                                size="icon"
                                className="h-8 w-8 text-xs"
                                onClick={() => setPagina(item as number)}
                              >
                                {item}
                              </Button>
                            ),
                          )}
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          disabled={pagina >= totalPaginas}
                          onClick={() => setPagina(pagina + 1)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Aba Minhas Solicitações ─────────────────────── */}
      {aba === "solicitacoes" && <PainelSolicitacoes modoAdmin={false} />}

      {/* ── Aba Admin Solicitações ──────────────────────── */}
      {aba === "admin-solicitacoes" && <PainelSolicitacoes modoAdmin />}

      {/* ── Dialogs ──────────────────────────────────────── */}
      <DetalheProdutoDialog
        produto={detalhe}
        aberto={!!detalhe}
        onFechar={() => setDetalhe(null)}
      />

      <FormProdutoDialog
        aberto={formAberto}
        onFechar={() => {
          setFormAberto(false);
          setEditando(null);
        }}
        onSalvo={recarregar}
        produto={editando}
        categorias={categorias}
        unidades={unidades}
        elementos={elementos}
      />

      <SolicitarInclusaoDialog
        aberto={solicitarAberto}
        onFechar={() => setSolicitarAberto(false)}
        onCriada={() => {}}
        categorias={categorias}
        unidades={unidades}
      />

      <ImportarCSVDialog
        aberto={importarAberto}
        onFechar={() => setImportarAberto(false)}
        onImportado={recarregar}
        categorias={categorias}
        unidades={unidades}
        elementos={elementos}
      />
    </div>
  );
}
