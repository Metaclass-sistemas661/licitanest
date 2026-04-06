import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import {
  ArrowLeftRight,
  Loader2,
  ChevronDown,
  ChevronUp,
  Equal,
  TrendingUp,
  TrendingDown,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { compararCestas, listarCestasParaComparacao } from "@/servicos/comparadorCestas";
import type { ItemComparado } from "@/tipos";
import { cn } from "@/lib/utils";

// ── Formatadores ─────────────────────────────────────
function moeda(v: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function pct(v: number | null) {
  if (v == null) return "—";
  const sinal = v > 0 ? "+" : "";
  return `${sinal}${v.toFixed(2)}%`;
}

interface CestaOpcao {
  id: string;
  descricao_objeto: string;
  data: string;
  status: string;
  secretaria: { nome: string; sigla: string | null }[] | { nome: string; sigla: string | null } | null;
}

export function ComparadorCestasPage() {
  const [cestas, setCestas] = useState<CestaOpcao[]>([]);
  const [cestaIdA, setCestaIdA] = useState("");
  const [cestaIdB, setCestaIdB] = useState("");
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [comparando, setComparando] = useState(false);
  const [resultado, setResultado] = useState<Awaited<
    ReturnType<typeof compararCestas>
  > | null>(null);
  const [filtro, setFiltro] = useState("");
  const [ordenacao, setOrdenacao] = useState<"nome" | "diferenca">("nome");

  useEffect(() => {
    listarCestasParaComparacao()
      .then(setCestas)
      .catch(() => toast.error("Erro ao carregar cestas"))
      .finally(() => setCarregandoLista(false));
  }, []);

  const handleComparar = useCallback(async () => {
    if (!cestaIdA || !cestaIdB) {
      toast.warning("Selecione duas cestas para comparar");
      return;
    }
    if (cestaIdA === cestaIdB) {
      toast.warning("Selecione cestas diferentes");
      return;
    }
    setComparando(true);
    try {
      const res = await compararCestas(cestaIdA, cestaIdB);
      setResultado(res);
      toast.success("Comparação realizada com sucesso");
    } catch {
      toast.error("Erro ao comparar cestas");
    } finally {
      setComparando(false);
    }
  }, [cestaIdA, cestaIdB]);

  const itensFiltrados = resultado
    ? resultado.itensComparados.filter((i) =>
        i.descricao.toLowerCase().includes(filtro.toLowerCase()),
      )
    : [];

  const itensOrdenados = [...itensFiltrados].sort((a, b) => {
    if (ordenacao === "diferenca") {
      const da = Math.abs(a.diferenca_percentual ?? 0);
      const db = Math.abs(b.diferenca_percentual ?? 0);
      return db - da;
    }
    return a.descricao.localeCompare(b.descricao, "pt-BR");
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Comparador de Cestas
        </h2>
        <p className="text-muted-foreground">
          Compare duas cestas de preços lado a lado para identificar diferenças
        </p>
      </div>

      {/* Seleção de cestas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Selecione as Cestas</CardTitle>
          <CardDescription>
            Escolha duas cestas em andamento ou concluídas para comparar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Cesta A (referência)</label>
              <select
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={cestaIdA}
                onChange={(e) => setCestaIdA(e.target.value)}
                disabled={carregandoLista}
              >
                <option value="">Selecione uma cesta...</option>
                {cestas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.descricao_objeto} ({c.data}) — {(Array.isArray(c.secretaria) ? c.secretaria[0]?.sigla ?? c.secretaria[0]?.nome : c.secretaria?.sigla ?? c.secretaria?.nome) ?? ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex shrink-0 items-center justify-center">
              <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
            </div>

            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Cesta B (comparação)</label>
              <select
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={cestaIdB}
                onChange={(e) => setCestaIdB(e.target.value)}
                disabled={carregandoLista}
              >
                <option value="">Selecione uma cesta...</option>
                {cestas
                  .filter((c) => c.id !== cestaIdA)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.descricao_objeto} ({c.data}) — {(Array.isArray(c.secretaria) ? c.secretaria[0]?.sigla ?? c.secretaria[0]?.nome : c.secretaria?.sigla ?? c.secretaria?.nome) ?? ""}
                    </option>
                  ))}
              </select>
            </div>

            <Button
              onClick={handleComparar}
              disabled={comparando || !cestaIdA || !cestaIdB}
              className="shrink-0"
            >
              {comparando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowLeftRight className="mr-2 h-4 w-4" />
              )}
              Comparar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultado */}
      {resultado && (
        <>
          {/* Resumo */}
          <div className="grid gap-4 md:grid-cols-3">
            <ResumoCard
              label={resultado.cestaA.cesta.descricao_objeto}
              total={resultado.cestaA.total_media}
              cor="border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20"
              tag="A"
            />
            <Card className="flex flex-col items-center justify-center border-dashed">
              <CardContent className="py-4 text-center">
                <div className="mb-2 text-sm text-muted-foreground">Diferença</div>
                <div
                  className={cn(
                    "text-2xl font-bold",
                    resultado.resumo.diferenca_total_percentual > 0
                      ? "text-red-600"
                      : resultado.resumo.diferenca_total_percentual < 0
                        ? "text-green-600"
                        : "text-muted-foreground",
                  )}
                >
                  {pct(resultado.resumo.diferenca_total_percentual)}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {moeda(resultado.resumo.diferenca_total_media)}
                </div>
                <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    {resultado.resumo.itens_comuns} comuns
                  </span>
                  <span className="flex items-center gap-1">
                    <XCircle className="h-3 w-3 text-blue-500" />
                    {resultado.resumo.itens_exclusivos_a} só A
                  </span>
                  <span className="flex items-center gap-1">
                    <XCircle className="h-3 w-3 text-purple-500" />
                    {resultado.resumo.itens_exclusivos_b} só B
                  </span>
                </div>
              </CardContent>
            </Card>
            <ResumoCard
              label={resultado.cestaB.cesta.descricao_objeto}
              total={resultado.cestaB.total_media}
              cor="border-purple-500/50 bg-purple-50/50 dark:bg-purple-950/20"
              tag="B"
            />
          </div>

          {/* Filtro e ordenação */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filtrar itens..."
                className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-4 text-sm"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setOrdenacao((o) => (o === "nome" ? "diferenca" : "nome"))
              }
            >
              {ordenacao === "nome" ? (
                <>
                  <ChevronDown className="mr-1 h-3 w-3" />
                  A-Z
                </>
              ) : (
                <>
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  Maior Diferença
                </>
              )}
            </Button>
            <span className="text-sm text-muted-foreground">
              {itensOrdenados.length} ite{itensOrdenados.length === 1 ? "m" : "ns"}
            </span>
          </div>

          {/* Tabela comparativa */}
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Item</th>
                    <th className="px-3 py-3 text-left font-medium text-blue-600">
                      Média A
                    </th>
                    <th className="px-3 py-3 text-left font-medium text-blue-600">
                      Fontes A
                    </th>
                    <th className="px-3 py-3 text-left font-medium text-purple-600">
                      Média B
                    </th>
                    <th className="px-3 py-3 text-left font-medium text-purple-600">
                      Fontes B
                    </th>
                    <th className="px-3 py-3 text-right font-medium">
                      Δ %
                    </th>
                    <th className="w-10 px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {itensOrdenados.map((item) => (
                    <LinhaComparacao key={item.produto_id} item={item} />
                  ))}
                  {itensOrdenados.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        Nenhum item encontrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ── Componentes internos ──────────────────────────────

function ResumoCard({
  label,
  total,
  cor,
  tag,
}: {
  label: string;
  total: number;
  cor: string;
  tag: string;
}) {
  return (
    <Card className={cn("border-2", cor)}>
      <CardContent className="py-4">
        <div className="mb-1 flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {tag}
          </span>
          <span className="text-sm font-medium truncate">{label}</span>
        </div>
        <div className="mt-2 text-2xl font-bold">{moeda(total)}</div>
        <div className="text-xs text-muted-foreground">Total pela média</div>
      </CardContent>
    </Card>
  );
}

function LinhaComparacao({ item }: { item: ItemComparado }) {
  const [expandido, setExpandido] = useState(false);
  const somenteA = item.cesta_a && !item.cesta_b;
  const somenteB = !item.cesta_a && item.cesta_b;

  return (
    <>
      <tr
        className={cn(
          "border-b transition-colors hover:bg-muted/30 cursor-pointer",
          somenteA && "bg-blue-50/30 dark:bg-blue-950/10",
          somenteB && "bg-purple-50/30 dark:bg-purple-950/10",
        )}
        onClick={() => setExpandido(!expandido)}
      >
        <td className="px-4 py-3">
          <div className="font-medium">{item.descricao}</div>
          <div className="text-xs text-muted-foreground">
            {item.categoria} • {item.unidade}
          </div>
        </td>
        <td className="px-3 py-3">
          {item.cesta_a ? moeda(item.cesta_a.media) : "—"}
        </td>
        <td className="px-3 py-3 text-muted-foreground">
          {item.cesta_a?.total_fontes ?? "—"}
        </td>
        <td className="px-3 py-3">
          {item.cesta_b ? moeda(item.cesta_b.media) : "—"}
        </td>
        <td className="px-3 py-3 text-muted-foreground">
          {item.cesta_b?.total_fontes ?? "—"}
        </td>
        <td className="px-3 py-3 text-right">
          <BadgeDiferenca valor={item.diferenca_percentual} />
        </td>
        <td className="px-3 py-3">
          {expandido ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </td>
      </tr>
      {expandido && (
        <tr className="border-b bg-muted/20">
          <td colSpan={7} className="px-4 py-3">
            <div className="grid gap-4 md:grid-cols-2">
              <DetalheItemCesta label="Cesta A" dados={item.cesta_a} cor="blue" />
              <DetalheItemCesta label="Cesta B" dados={item.cesta_b} cor="purple" />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function BadgeDiferenca({ valor }: { valor: number | null }) {
  if (valor == null)
    return <span className="text-muted-foreground text-xs">—</span>;

  const abs = Math.abs(valor);
  let cor = "text-muted-foreground bg-muted";
  let Icone = Equal;

  if (valor > 5) {
    cor = "text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400";
    Icone = TrendingUp;
  } else if (valor < -5) {
    cor = "text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-400";
    Icone = TrendingDown;
  } else if (abs > 0) {
    cor = "text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400";
    Icone = ArrowRight;
  }

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", cor)}>
      <Icone className="h-3 w-3" />
      {pct(valor)}
    </span>
  );
}

function DetalheItemCesta({
  label,
  dados,
  cor,
}: {
  label: string;
  dados: ItemComparado["cesta_a"];
  cor: "blue" | "purple";
}) {
  if (!dados) {
    return (
      <div className={cn("rounded-lg border p-3", cor === "blue" ? "border-blue-200" : "border-purple-200")}>
        <div className="text-sm font-medium">{label}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Item não presente nesta cesta
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border p-3", cor === "blue" ? "border-blue-200 dark:border-blue-800" : "border-purple-200 dark:border-purple-800")}>
      <div className="text-sm font-medium">{label}</div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">Qtd:</span> {dados.quantidade}
        </div>
        <div>
          <span className="text-muted-foreground">Fontes:</span> {dados.total_fontes}
        </div>
        <div>
          <span className="text-muted-foreground">Média:</span>{" "}
          {moeda(dados.media)}
        </div>
        <div>
          <span className="text-muted-foreground">Mediana:</span>{" "}
          {moeda(dados.mediana)}
        </div>
        <div>
          <span className="text-muted-foreground">Menor:</span>{" "}
          {moeda(dados.menor_preco)}
        </div>
      </div>
    </div>
  );
}
