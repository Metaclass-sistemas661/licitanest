// Wizard de criação de Cesta de Preços — 4 passos
import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Badge } from "@/componentes/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
  Package,
  Layers,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { ProdutoCatalogo, TipoCalculo, TipoCorrecao } from "@/tipos";
import { buscarProdutosParaCesta } from "@/servicos/produtosCatalogo";
import { criarCesta } from "@/servicos/cestas";
import {
  adicionarItem,
  criarLote,
  moverItemParaLote,
} from "@/servicos/itensCesta";
import { criarVersao } from "@/servicos/cestas";

// ── Tipos internos ────────────────────────────────────
interface ItemWizard {
  tempId: string;
  produto: ProdutoCatalogo;
  quantidade: number;
  loteTempId: string | null;
}

interface LoteWizard {
  tempId: string;
  numero: number;
  descricao: string;
}

const LABELS_CALCULO: Record<TipoCalculo, string> = {
  media: "Média Aritmética",
  mediana: "Mediana",
  menor_preco: "Menor Preço",
};

const LABELS_CORRECAO: Record<TipoCorrecao, string> = {
  nenhuma: "Nenhuma",
  ipca: "IPCA",
  igpm: "IGP-M",
};

let _tempId = 0;
function tempId() {
  return `t-${++_tempId}`;
}

// ── Componente principal ─────────────────────────────
export function WizardNovaCesta() {
  const navigate = useNavigate();
  const { servidor } = useAuth();
  const [passo, setPasso] = useState(1);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Step 1 state
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [tipoCalculo, setTipoCalculo] = useState<TipoCalculo>("media");
  const [tipoCorrecao, setTipoCorrecao] = useState<TipoCorrecao>("nenhuma");
  const [percentualAlerta, setPercentualAlerta] = useState(30);

  // Step 2 state
  const [itens, setItens] = useState<ItemWizard[]>([]);
  const [buscaProduto, setBuscaProduto] = useState("");
  const [resultadosBusca, setResultadosBusca] = useState<ProdutoCatalogo[]>([]);
  const [buscando, setBuscando] = useState(false);
  const timerBuscaRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step 3 state
  const [lotes, setLotes] = useState<LoteWizard[]>([]);

  // ── Busca de produtos ────────────────────────────
  const handleBuscaProduto = useCallback((valor: string) => {
    setBuscaProduto(valor);
    if (timerBuscaRef.current) clearTimeout(timerBuscaRef.current);
    if (valor.length < 3) {
      setResultadosBusca([]);
      return;
    }
    timerBuscaRef.current = setTimeout(async () => {
      setBuscando(true);
      try {
        const resultados = await buscarProdutosParaCesta(valor);
        setResultadosBusca(resultados);
      } catch {
        setResultadosBusca([]);
      } finally {
        setBuscando(false);
      }
    }, 300);
  }, []);

  const adicionarProduto = useCallback(
    (produto: ProdutoCatalogo) => {
      if (itens.some((i) => i.produto.id === produto.id)) return;
      setItens((prev) => [
        ...prev,
        { tempId: tempId(), produto, quantidade: 1, loteTempId: null },
      ]);
      setBuscaProduto("");
      setResultadosBusca([]);
    },
    [itens],
  );

  const removerItemWizard = useCallback((tid: string) => {
    setItens((prev) => prev.filter((i) => i.tempId !== tid));
  }, []);

  const atualizarQuantidade = useCallback((tid: string, qtd: number) => {
    setItens((prev) =>
      prev.map((i) => (i.tempId === tid ? { ...i, quantidade: Math.max(1, qtd) } : i)),
    );
  }, []);

  // ── Lotes ────────────────────────────────────────
  const adicionarLote = useCallback(() => {
    const numero = lotes.length + 1;
    setLotes((prev) => [
      ...prev,
      { tempId: tempId(), numero, descricao: `Lote ${numero}` },
    ]);
  }, [lotes.length]);

  const removerLoteWizard = useCallback((tid: string) => {
    setLotes((prev) => prev.filter((l) => l.tempId !== tid));
    setItens((prev) =>
      prev.map((i) => (i.loteTempId === tid ? { ...i, loteTempId: null } : i)),
    );
  }, []);

  const moverParaLoteWizard = useCallback((itemTid: string, loteTid: string | null) => {
    setItens((prev) =>
      prev.map((i) => (i.tempId === itemTid ? { ...i, loteTempId: loteTid } : i)),
    );
  }, []);

  // ── Validação por passo ─────────────────────────
  const podeProsseguir = () => {
    if (passo === 1) return descricao.trim().length >= 5 && data;
    if (passo === 2) return itens.length > 0;
    return true;
  };

  // ── Salvar ──────────────────────────────────────
  const salvar = async () => {
    if (!servidor) return;
    setSalvando(true);
    setErro(null);

    try {
      // 1. Criar cesta
      const cesta = await criarCesta({
        descricao_objeto: descricao.trim(),
        data,
        tipo_calculo: tipoCalculo,
        tipo_correcao: tipoCorrecao,
        percentual_alerta: percentualAlerta,
        secretaria_id: servidor.secretaria_id,
        criado_por: servidor.id,
      });

      // 2. Criar lotes (mapear tempId → realId)
      const mapaLotes: Record<string, string> = {};
      for (const lote of lotes) {
        const criado = await criarLote(cesta.id, lote.descricao);
        mapaLotes[lote.tempId] = criado.id;
      }

      // 3. Adicionar itens
      for (const item of itens) {
        const loteRealId = item.loteTempId ? mapaLotes[item.loteTempId] : undefined;
        const novoItem = await adicionarItem(
          cesta.id,
          item.produto.id,
          item.quantidade,
          loteRealId,
        );
        // Se item tem lote, mover
        if (loteRealId) {
          await moverItemParaLote(novoItem.id, loteRealId);
        }
      }

      // 4. Criar versão inicial
      await criarVersao(cesta.id, servidor.id, "Criação da cesta");

      navigate(`/cestas/${cesta.id}`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao criar cesta");
    } finally {
      setSalvando(false);
    }
  };

  // ── Stepper ─────────────────────────────────────
  const labels = ["Configuração", "Itens", "Lotes", "Revisão"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/cestas")}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Nova Cesta de Preços</h2>
          <p className="text-sm text-muted-foreground">Passo {passo} de 4</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex gap-2">
        {labels.map((label, idx) => {
          const step = idx + 1;
          const ativo = step === passo;
          const completo = step < passo;
          return (
            <div
              key={step}
              className={`flex flex-1 items-center gap-2 rounded-lg border p-3 text-sm ${
                ativo
                  ? "border-primary bg-primary/5 font-semibold text-primary"
                  : completo
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-border text-muted-foreground"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  completo
                    ? "bg-emerald-600 text-white"
                    : ativo
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {completo ? <Check className="h-3 w-3" /> : step}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </div>
          );
        })}
      </div>

      {/* Conteúdo do passo */}
      <Card>
        <CardContent className="pt-6">
          {/* PASSO 1 — Configuração */}
          {passo === 1 && (
            <div className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Descrição do Objeto *
                </label>
                <textarea
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px]"
                  placeholder="Ex.: Aquisição de materiais de escritório para a Secretaria de Administração"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Data *</label>
                  <Input
                    type="date"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tipo de Cálculo
                  </label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={tipoCalculo}
                    onChange={(e) => setTipoCalculo(e.target.value as TipoCalculo)}
                  >
                    {Object.entries(LABELS_CALCULO).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Correção Monetária
                  </label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={tipoCorrecao}
                    onChange={(e) =>
                      setTipoCorrecao(e.target.value as TipoCorrecao)
                    }
                  >
                    {Object.entries(LABELS_CORRECAO).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Percentual de Alerta (%)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={percentualAlerta}
                    onChange={(e) => setPercentualAlerta(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* PASSO 2 — Seleção de itens */}
          {passo === 2 && (
            <div className="space-y-4">
              <div className="relative max-w-lg">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="Buscar produto no catálogo (mín. 3 caracteres)..."
                  value={buscaProduto}
                  onChange={(e) => handleBuscaProduto(e.target.value)}
                />
                {/* Dropdown de resultados */}
                {(resultadosBusca.length > 0 || buscando) && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg max-h-60 overflow-y-auto">
                    {buscando ? (
                      <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
                      </div>
                    ) : (
                      resultadosBusca.map((produto) => {
                        const jaAdicionado = itens.some(
                          (i) => i.produto.id === produto.id,
                        );
                        return (
                          <button
                            key={produto.id}
                            type="button"
                            disabled={jaAdicionado}
                            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-50"
                            onClick={() => adicionarProduto(produto)}
                          >
                            <div>
                              <p className="font-medium">{produto.descricao}</p>
                              <p className="text-xs text-muted-foreground">
                                {produto.categoria?.nome} — {produto.unidade_medida?.sigla}
                              </p>
                            </div>
                            {jaAdicionado ? (
                              <Badge variant="secondary">Adicionado</Badge>
                            ) : (
                              <Plus className="h-4 w-4 shrink-0 text-primary" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {itens.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mb-3 opacity-40" />
                  <p className="text-sm">Nenhum item adicionado à cesta</p>
                  <p className="text-xs">Busque produtos acima para adicionar</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 text-left">#</th>
                        <th className="px-4 py-2 text-left">Produto</th>
                        <th className="px-4 py-2 text-left">Un.</th>
                        <th className="px-4 py-2 text-right w-28">Quantidade</th>
                        <th className="px-4 py-2 w-12" />
                      </tr>
                    </thead>
                    <tbody>
                      {itens.map((item, idx) => (
                        <tr key={item.tempId} className="border-b last:border-0">
                          <td className="px-4 py-2">{idx + 1}</td>
                          <td className="px-4 py-2 font-medium">
                            {item.produto.descricao}
                            <span className="block text-xs text-muted-foreground">
                              {item.produto.categoria?.nome}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            {item.produto.unidade_medida?.sigla}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <Input
                              type="number"
                              min={1}
                              className="w-24 ml-auto text-right"
                              value={item.quantidade}
                              onChange={(e) =>
                                atualizarQuantidade(item.tempId, Number(e.target.value))
                              }
                            />
                          </td>
                          <td className="px-4 py-2 text-center">
                            <button
                              type="button"
                              className="text-destructive hover:text-destructive/80"
                              onClick={() => removerItemWizard(item.tempId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {itens.length} {itens.length === 1 ? "item" : "itens"} na cesta
              </p>
            </div>
          )}

          {/* PASSO 3 — Organização em Lotes */}
          {passo === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Lotes (opcional)</p>
                  <p className="text-xs text-muted-foreground">
                    Agrupe itens em lotes para organizar a cesta. Pule se não precisar.
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={adicionarLote}>
                  <Plus className="mr-1 h-4 w-4" /> Novo Lote
                </Button>
              </div>

              {lotes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {lotes.map((lote) => (
                    <Badge
                      key={lote.tempId}
                      variant="secondary"
                      className="gap-1 px-3 py-1.5"
                    >
                      <Layers className="h-3 w-3" />
                      <input
                        className="w-28 bg-transparent text-xs outline-none"
                        value={lote.descricao}
                        onChange={(e) =>
                          setLotes((prev) =>
                            prev.map((l) =>
                              l.tempId === lote.tempId
                                ? { ...l, descricao: e.target.value }
                                : l,
                            ),
                          )
                        }
                      />
                      <button
                        type="button"
                        className="ml-1 hover:text-destructive"
                        onClick={() => removerLoteWizard(lote.tempId)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left">#</th>
                      <th className="px-4 py-2 text-left">Produto</th>
                      <th className="px-4 py-2 text-left">Qtd.</th>
                      <th className="px-4 py-2 text-left w-48">Lote</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item, idx) => (
                      <tr key={item.tempId} className="border-b last:border-0">
                        <td className="px-4 py-2">{idx + 1}</td>
                        <td className="px-4 py-2 font-medium">
                          {item.produto.descricao}
                        </td>
                        <td className="px-4 py-2">{item.quantidade}</td>
                        <td className="px-4 py-2">
                          <select
                            className="w-full rounded border border-input bg-background px-2 py-1 text-sm"
                            value={item.loteTempId ?? ""}
                            onChange={(e) =>
                              moverParaLoteWizard(
                                item.tempId,
                                e.target.value || null,
                              )
                            }
                          >
                            <option value="">Sem lote</option>
                            {lotes.map((l) => (
                              <option key={l.tempId} value={l.tempId}>
                                {l.descricao}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PASSO 4 — Revisão */}
          {passo === 4 && (
            <div className="space-y-6 max-w-3xl">
              {/* Resumo geral */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Resumo da Cesta</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-muted-foreground">Descrição:</span>
                      <p className="font-medium">{descricao}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Data:</span>
                      <p className="font-medium">
                        {new Date(data + "T00:00:00").toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tipo de cálculo:</span>
                      <p className="font-medium">{LABELS_CALCULO[tipoCalculo]}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Correção:</span>
                      <p className="font-medium">{LABELS_CORRECAO[tipoCorrecao]}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Alerta (%):</span>
                      <p className="font-medium">{percentualAlerta}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Itens */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {itens.length} {itens.length === 1 ? "Item" : "Itens"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border text-sm">
                    <table className="w-full">
                      <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 text-left">#</th>
                          <th className="px-3 py-2 text-left">Produto</th>
                          <th className="px-3 py-2 text-right">Qtd.</th>
                          <th className="px-3 py-2 text-left">Lote</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itens.map((item, idx) => {
                          const lote = lotes.find(
                            (l) => l.tempId === item.loteTempId,
                          );
                          return (
                            <tr
                              key={item.tempId}
                              className="border-b last:border-0"
                            >
                              <td className="px-3 py-2">{idx + 1}</td>
                              <td className="px-3 py-2">{item.produto.descricao}</td>
                              <td className="px-3 py-2 text-right">
                                {item.quantidade}
                              </td>
                              <td className="px-3 py-2">
                                {lote ? (
                                  <Badge variant="secondary" className="text-xs">
                                    {lote.descricao}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Lotes */}
              {lotes.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      {lotes.length} {lotes.length === 1 ? "Lote" : "Lotes"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {lotes.map((lote) => {
                      const qtd = itens.filter(
                        (i) => i.loteTempId === lote.tempId,
                      ).length;
                      return (
                        <div
                          key={lote.tempId}
                          className="flex items-center justify-between rounded-md border px-4 py-2 text-sm"
                        >
                          <span className="font-medium">{lote.descricao}</span>
                          <Badge variant="outline">
                            {qtd} {qtd === 1 ? "item" : "itens"}
                          </Badge>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {erro && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {erro}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navegação */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          disabled={passo === 1}
          onClick={() => setPasso((p) => Math.max(1, p - 1))}
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Anterior
        </Button>

        {passo < 4 ? (
          <Button
            disabled={!podeProsseguir()}
            onClick={() => setPasso((p) => Math.min(4, p + 1))}
          >
            Próximo <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button disabled={salvando} onClick={salvar}>
            {salvando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando...
              </>
            ) : (
              <>
                <Check className="mr-1 h-4 w-4" /> Criar Cesta
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
