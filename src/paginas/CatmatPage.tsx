import { useState } from "react";
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
import { Separator } from "@/componentes/ui/separator";
import {
  Database,
  Search,
  Download,
  Leaf,
  Package,
  Wrench,
  BarChart3,
  ChevronRight,
  Loader2,
  Link as LinkIcon,
} from "lucide-react";
import { useCatmat, useEstatisticasCatmat } from "@/hooks/useFase17";
import * as catmatSvc from "@/servicos/catmat";
import type { TipoCatmat, CatmatCatser } from "@/tipos";

export function CatmatPage() {
  const [termoBusca, setTermoBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<TipoCatmat | "">("");
  const [apenasVerdes, setApenasVerdes] = useState(false);
  const [importando, setImportando] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState<CatmatCatser | null>(null);

  const { stats } = useEstatisticasCatmat();

  const { itens, total, carregando, erro, mudarFiltros, proximaPagina } =
    useCatmat();

  const handleBuscar = () => {
    mudarFiltros({
      termo: termoBusca,
      tipo: tipoFiltro || undefined,
      sustentavel: apenasVerdes || undefined,
    });
  };

  const handleImportarAPI = async (tipo: TipoCatmat) => {
    setImportando(true);
    try {
      const res = await catmatSvc.importarCatmatAPI(tipo);
      alert(`Importados ${res.importados} itens de ${res.total} disponíveis`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro na importação");
    } finally {
      setImportando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Database className="h-6 w-6" />
          Catálogo CATMAT/CATSER
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Catálogo de Materiais e Serviços do Governo Federal — pesquisa e vinculação ao catálogo de produtos
        </p>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="py-3 text-center">
              <p className="text-2xl font-bold">{stats.total.toLocaleString("pt-BR")}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.materiais.toLocaleString("pt-BR")}</p>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Package className="h-3 w-3" /> Materiais
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 text-center">
              <p className="text-2xl font-bold text-purple-600">{stats.servicos.toLocaleString("pt-BR")}</p>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Wrench className="h-3 w-3" /> Serviços
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.sustentaveis.toLocaleString("pt-BR")}</p>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Leaf className="h-3 w-3" /> Sustentáveis
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 text-center">
              <p className="text-2xl font-bold text-amber-600">{stats.grupos}</p>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <BarChart3 className="h-3 w-3" /> Grupos
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Busca e importação */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pesquisar Itens</CardTitle>
          <CardDescription>
            Busque por código, descrição ou grupo no catálogo CATMAT/CATSER
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[250px]">
              <Input
                placeholder="Código ou descrição do material/serviço..."
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={tipoFiltro === "material" ? "default" : "outline"}
                size="sm"
                onClick={() => setTipoFiltro(tipoFiltro === "material" ? "" : "material")}
              >
                <Package className="h-4 w-4 mr-1" /> Material
              </Button>
              <Button
                variant={tipoFiltro === "servico" ? "default" : "outline"}
                size="sm"
                onClick={() => setTipoFiltro(tipoFiltro === "servico" ? "" : "servico")}
              >
                <Wrench className="h-4 w-4 mr-1" /> Serviço
              </Button>
              <Button
                variant={apenasVerdes ? "default" : "outline"}
                size="sm"
                onClick={() => setApenasVerdes(!apenasVerdes)}
              >
                <Leaf className="h-4 w-4 mr-1" /> Sustentável
              </Button>
            </div>
            <Button onClick={handleBuscar}>
              <Search className="h-4 w-4 mr-2" /> Buscar
            </Button>
          </div>

          <Separator />

          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={importando}
              onClick={() => handleImportarAPI("material")}
            >
              {importando ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
              Importar Materiais (API Gov)
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={importando}
              onClick={() => handleImportarAPI("servico")}
            >
              {importando ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
              Importar Serviços (API Gov)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {erro && (
        <Card className="border-red-200">
          <CardContent className="py-4 text-red-600 text-sm">{erro}</CardContent>
        </Card>
      )}

      {carregando ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            Buscando no catálogo...
          </CardContent>
        </Card>
      ) : itens.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Resultados ({total.toLocaleString("pt-BR")} itens)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {itens.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    itemSelecionado?.id === item.id
                      ? "bg-primary/5 border-primary"
                      : "hover:bg-accent/50"
                  }`}
                  onClick={() =>
                    setItemSelecionado(
                      itemSelecionado?.id === item.id ? null : item,
                    )
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="shrink-0">
                          {item.codigo}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={
                            item.tipo === "material"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-purple-100 text-purple-700"
                          }
                        >
                          {item.tipo === "material" ? "Material" : "Serviço"}
                        </Badge>
                        {item.sustentavel && (
                          <Badge className="bg-green-100 text-green-700">
                            <Leaf className="h-3 w-3 mr-1" /> Sustentável
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm">{item.descricao}</p>
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                        {item.grupo && <span>Grupo: {item.grupo}</span>}
                        {item.classe && <span>Classe: {item.classe}</span>}
                        {item.unidade_fornecimento && (
                          <span>Unid: {item.unidade_fornecimento}</span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" title="Vincular ao produto">
                      <LinkIcon className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Detalhe expandido */}
                  {itemSelecionado?.id === item.id && item.padrao_descritivo && (
                    <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
                      <p className="font-medium text-foreground mb-1">
                        Padrão Descritivo
                      </p>
                      <p>{item.padrao_descritivo}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Paginação */}
            {total > itens.length && (
              <div className="flex justify-center mt-4">
                <Button variant="outline" onClick={proximaPagina}>
                  Carregar mais
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export default CatmatPage;
