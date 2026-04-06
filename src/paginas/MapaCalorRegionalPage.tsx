import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Separator } from "@/componentes/ui/separator";
import { EmptyState } from "@/componentes/ui/empty-state";
import { SkeletonTable } from "@/componentes/ui/skeleton";
import { PageTransition } from "@/componentes/ui/page-transition";
import { Map, Search, ThermometerSun, TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { buscarDadosRegionais } from "@/servicos/mapaCalorRegional";
import type { MapaCalorDados } from "@/tipos";
import { toast } from "sonner";

interface ProdutoSimples {
  id: string;
  descricao: string;
  unidade: string;
  codigo_catmat?: string;
}

const UF_NOMES: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia",
  CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás",
  MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais",
  PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí",
  RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RS: "Rio Grande do Sul",
  RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo",
  SE: "Sergipe", TO: "Tocantins",
};

function corVariacao(v: number): string {
  if (v > 20) return "bg-red-600 text-white";
  if (v > 10) return "bg-red-400 text-white";
  if (v > 5) return "bg-orange-400 text-white";
  if (v > -5) return "bg-green-400 text-white";
  if (v > -10) return "bg-emerald-500 text-white";
  return "bg-emerald-700 text-white";
}

function IconeVariacao({ v }: { v: number }) {
  if (v > 5) return <TrendingUp className="h-4 w-4" />;
  if (v < -5) return <TrendingDown className="h-4 w-4" />;
  return <Minus className="h-4 w-4" />;
}

export function MapaCalorRegionalPage() {
  const [busca, setBusca] = useState("");
  const [produtos, setProdutos] = useState<ProdutoSimples[]>([]);
  const [produtoId, setProdutoId] = useState<string | null>(null);
  const [dados, setDados] = useState<MapaCalorDados | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [buscandoProdutos, setBuscandoProdutos] = useState(false);

  /* Busca produtos pelo texto */
  const buscarProdutos = useCallback(async () => {
    if (busca.trim().length < 2) return;
    setBuscandoProdutos(true);
    try {
      const data = await api.get<ProdutoSimples[]>(
        `/api/produtos-catalogo?descricao=${encodeURIComponent(busca.trim())}&limit=10`
      );
      setProdutos(data ?? []);
    } finally {
      setBuscandoProdutos(false);
    }
  }, [busca]);

  /* Busca dados regionais */
  const carregar = useCallback(async (id: string) => {
    setProdutoId(id);
    setCarregando(true);
    try {
      const result = await buscarDadosRegionais(id);
      setDados(result);
      if (result && result.regioes.length === 0) {
        toast.info("Nenhum dado regional encontrado para este produto.");
      }
    } catch {
      toast.error("Erro ao buscar dados regionais.");
    } finally {
      setCarregando(false);
    }
  }, []);

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Map className="h-6 w-6 text-primary" />
            Mapa de Calor Regional
          </h1>
          <p className="text-muted-foreground mt-1">
            Visualize a variação de preços por UF em relação à média nacional.
          </p>
        </div>

        {/* Buscar produto */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Selecione um Produto</CardTitle>
            <CardDescription>Busque um item do catálogo para visualizar o mapa de calor.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Buscar produto..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && buscarProdutos()}
              />
              <Button onClick={buscarProdutos} disabled={buscandoProdutos || busca.trim().length < 2}>
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
            </div>

            {produtos.length > 0 && (
              <div className="mt-3 border rounded-lg divide-y max-h-48 overflow-y-auto">
                {produtos.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setProdutos([]); carregar(p.id); }}
                    className={`w-full text-left px-3 py-2 hover:bg-accent transition-colors text-sm ${produtoId === p.id ? "bg-accent" : ""}`}
                  >
                    <span className="font-medium">{p.descricao}</span>
                    <span className="text-muted-foreground ml-2">({p.unidade})</span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resultado */}
        {carregando && <SkeletonTable rows={8} cols={4} />}

        {!carregando && dados && dados.regioes.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <ThermometerSun className="h-5 w-5 text-orange-500" />
                  {dados.produto_descricao}
                </CardTitle>
                <CardDescription>
                  Média nacional: <strong>R$ {dados.media_nacional.toFixed(2)}</strong>
                  {" · "}
                  {dados.regioes.length} UFs com dados
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => produtoId && carregar(produtoId)}>
                <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
              </Button>
            </CardHeader>
            <CardContent>
              {/* Grade visual tipo heatmap */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-2 mb-6">
                {dados.regioes.map((r) => (
                  <div
                    key={r.uf}
                    className={`rounded-lg p-3 text-center ${corVariacao(r.variacao_media_nacional)} transition-transform hover:scale-105`}
                    title={`${UF_NOMES[r.uf] ?? r.uf}: R$ ${r.valor_medio.toFixed(2)} (${r.variacao_media_nacional >= 0 ? "+" : ""}${r.variacao_media_nacional.toFixed(1)}%)`}
                  >
                    <span className="text-lg font-bold">{r.uf}</span>
                    <div className="text-xs mt-1 flex items-center justify-center gap-1">
                      <IconeVariacao v={r.variacao_media_nacional} />
                      {r.variacao_media_nacional >= 0 ? "+" : ""}{r.variacao_media_nacional.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>

              {/* Legenda */}
              <div className="flex flex-wrap gap-2 text-xs mb-4">
                <span className="px-2 py-1 rounded bg-emerald-700 text-white">&lt; -10%</span>
                <span className="px-2 py-1 rounded bg-emerald-500 text-white">-10% a -5%</span>
                <span className="px-2 py-1 rounded bg-green-400 text-white">-5% a +5%</span>
                <span className="px-2 py-1 rounded bg-orange-400 text-white">+5% a +10%</span>
                <span className="px-2 py-1 rounded bg-red-400 text-white">+10% a +20%</span>
                <span className="px-2 py-1 rounded bg-red-600 text-white">&gt; +20%</span>
              </div>

              <Separator className="my-4" />

              {/* Tabela detalhada */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b text-muted-foreground">
                      <th className="pb-2 font-medium">UF</th>
                      <th className="pb-2 font-medium">Estado</th>
                      <th className="pb-2 font-medium text-right">Média (R$)</th>
                      <th className="pb-2 font-medium text-right">Variação</th>
                      <th className="pb-2 font-medium text-right">Registros</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {dados.regioes.map((r) => (
                      <tr key={r.uf} className="hover:bg-muted/50">
                        <td className="py-2 font-mono font-bold">{r.uf}</td>
                        <td className="py-2">{UF_NOMES[r.uf] ?? r.uf}</td>
                        <td className="py-2 text-right font-mono">R$ {r.valor_medio.toFixed(2)}</td>
                        <td className={`py-2 text-right font-medium ${r.variacao_media_nacional > 0 ? "text-red-500" : r.variacao_media_nacional < 0 ? "text-emerald-500" : ""}`}>
                          <span className="inline-flex items-center gap-1">
                            <IconeVariacao v={r.variacao_media_nacional} />
                            {r.variacao_media_nacional >= 0 ? "+" : ""}{r.variacao_media_nacional.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2 text-right text-muted-foreground">{r.total_registros}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {!carregando && dados && dados.regioes.length === 0 && (
          <EmptyState
            icon={Map}
            title="Sem dados regionais"
            description="Não há cotações registradas com informação de UF para este produto."
          />
        )}

        {!carregando && !dados && !produtoId && (
          <EmptyState
            icon={ThermometerSun}
            title="Selecione um produto"
            description="Busque e selecione um produto acima para visualizar o mapa de calor de preços por região."
          />
        )}
      </div>
    </PageTransition>
  );
}
