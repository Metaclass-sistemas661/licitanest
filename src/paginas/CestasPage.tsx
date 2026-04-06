// Página de listagem de Cestas de Preços
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
} from "@/componentes/ui/card";
import { SkeletonTable } from "@/componentes/ui/skeleton";
import { EmptyState } from "@/componentes/ui/empty-state";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Badge } from "@/componentes/ui/badge";
import {
  ShoppingBasket,
  Plus,
  Search,
  Copy,
  ChevronLeft,
  ChevronRight,
  Eye,
  Clock,
  CheckCircle,
  Archive,
  FileEdit,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCestasPaginadas } from "@/hooks/useCestas";
import type { StatusCesta, TipoCalculo } from "@/tipos";
import { DuplicarCestaDialog } from "./cestas/DuplicarCestaDrawer";

// ── Labels e variantes ───────────────────────────────
const STATUS_LABEL: Record<StatusCesta, string> = {
  rascunho: "Rascunho",
  em_andamento: "Em Andamento",
  concluida: "Concluída",
  arquivada: "Arquivada",
};
const STATUS_VARIANT: Record<
  StatusCesta,
  "default" | "secondary" | "success" | "warning"
> = {
  rascunho: "secondary",
  em_andamento: "default",
  concluida: "success",
  arquivada: "warning",
};
const STATUS_ICON: Record<StatusCesta, React.ReactNode> = {
  rascunho: <FileEdit className="h-3 w-3" />,
  em_andamento: <Clock className="h-3 w-3" />,
  concluida: <CheckCircle className="h-3 w-3" />,
  arquivada: <Archive className="h-3 w-3" />,
};
const CALCULO_LABEL: Record<TipoCalculo, string> = {
  media: "Média",
  mediana: "Mediana",
  menor_preco: "Menor Preço",
};

export function CestasPage() {
  const navigate = useNavigate();
  const { temPermissao: _temPermissao } = useAuth();

  const {
    cestas,
    total,
    pagina,
    porPagina,
    carregando,
    filtros,
    setPagina,
    mudarFiltros,
    recarregar,
  } = useCestasPaginadas();

  // Busca com debounce
  const [buscaLocal, setBuscaLocal] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBusca = (valor: string) => {
    setBuscaLocal(valor);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      mudarFiltros({ ...filtros, busca: valor || undefined });
    }, 400);
  };

  // Status filter
  const handleFiltroStatus = (status: string) => {
    mudarFiltros({
      ...filtros,
      status: status ? (status as StatusCesta) : undefined,
    });
  };

  // Duplicar dialog
  const [duplicarCestaId, setDuplicarCestaId] = useState<string | null>(null);
  const [duplicarDescricao, setDuplicarDescricao] = useState("");

  const totalPaginas = Math.ceil(total / porPagina);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Cestas de Preços</h2>
          <p className="text-muted-foreground">
            Formação e elaboração de cestas — Art. 23, Lei 14.133/2021
          </p>
        </div>
        <Button onClick={() => navigate("/cestas/nova")}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Cesta
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por descrição do objeto..."
            className="pl-10"
            value={buscaLocal}
            onChange={(e) => handleBusca(e.target.value)}
          />
        </div>
        <select
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={filtros.status ?? ""}
          onChange={(e) => handleFiltroStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          {(Object.keys(STATUS_LABEL) as StatusCesta[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        {(filtros.busca || filtros.status) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setBuscaLocal("");
              mudarFiltros({});
            }}
          >
            Limpar
          </Button>
        )}
      </div>

      {/* Conteúdo */}
      {carregando ? (
        <SkeletonTable rows={5} cols={5} />
      ) : cestas.length === 0 ? (
        <EmptyState
          icon={ShoppingBasket}
          title={filtros.busca || filtros.status ? "Nenhuma cesta encontrada" : "Nenhuma cesta cadastrada"}
          description={
            filtros.busca || filtros.status
              ? "Tente ajustar os filtros para encontrar o que procura."
              : "Clique em \"Nova Cesta\" para iniciar uma pesquisa de preços."
          }
          actionLabel={!(filtros.busca || filtros.status) ? "Nova Cesta" : undefined}
          onAction={!(filtros.busca || filtros.status) ? () => navigate("/cestas/nova") : undefined}
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-md border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Descrição do Objeto</th>
                  <th className="px-4 py-3 text-center w-36">Status</th>
                  <th className="px-4 py-3 text-center w-28">Data</th>
                  <th className="px-4 py-3 text-center w-28">Cálculo</th>
                  <th className="px-4 py-3 text-left w-40">Criado por</th>
                  <th className="px-4 py-3 w-24" />
                </tr>
              </thead>
              <tbody>
                {cestas.map((cesta) => {
                  const status = cesta.status as StatusCesta;
                  return (
                    <tr
                      key={cesta.id}
                      className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                      onClick={() => navigate(`/cestas/${cesta.id}`)}
                    >
                      <td className="px-4 py-3 font-medium max-w-sm truncate">
                        {cesta.descricao_objeto}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={STATUS_VARIANT[status]}
                          className="gap-1"
                        >
                          {STATUS_ICON[status]}
                          {STATUS_LABEL[status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {new Date(
                          cesta.data + "T00:00:00",
                        ).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {CALCULO_LABEL[cesta.tipo_calculo]}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground truncate max-w-[160px]">
                        {cesta.criado_por_servidor?.nome ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <button
                            type="button"
                            className="rounded p-1.5 hover:bg-accent"
                            title="Ver detalhes"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/cestas/${cesta.id}`);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="rounded p-1.5 hover:bg-accent"
                            title="Duplicar"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDuplicarCestaId(cesta.id);
                              setDuplicarDescricao(cesta.descricao_objeto);
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {cestas.map((cesta) => {
              const status = cesta.status as StatusCesta;
              return (
                <Card
                  key={cesta.id}
                  className="cursor-pointer hover:shadow-md transition"
                  onClick={() => navigate(`/cestas/${cesta.id}`)}
                >
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm line-clamp-2">
                        {cesta.descricao_objeto}
                      </p>
                      <Badge
                        variant={STATUS_VARIANT[status]}
                        className="shrink-0 gap-1"
                      >
                        {STATUS_ICON[status]}
                        {STATUS_LABEL[status]}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        {new Date(
                          cesta.data + "T00:00:00",
                        ).toLocaleDateString("pt-BR")}
                      </span>
                      <span>{CALCULO_LABEL[cesta.tipo_calculo]}</span>
                      <span>{cesta.criado_por_servidor?.nome}</span>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDuplicarCestaId(cesta.id);
                          setDuplicarDescricao(cesta.descricao_objeto);
                        }}
                      >
                        <Copy className="mr-1 h-3 w-3" /> Duplicar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Paginação */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {(pagina - 1) * porPagina + 1}–
                {Math.min(pagina * porPagina, total)} de {total}
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagina <= 1}
                  onClick={() => setPagina(pagina - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
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

      {/* Dialog duplicar */}
      {duplicarCestaId && (
        <DuplicarCestaDialog
          cestaId={duplicarCestaId}
          descricao={duplicarDescricao}
          aberto={!!duplicarCestaId}
          onClose={() => {
            setDuplicarCestaId(null);
            recarregar();
          }}
        />
      )}
    </div>
  );
}

