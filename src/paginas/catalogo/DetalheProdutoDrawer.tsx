import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerBody,
} from "@/componentes/ui/drawer";
import { Badge } from "@/componentes/ui/badge";
import { Separator } from "@/componentes/ui/separator";
import type { ProdutoCatalogo } from "@/tipos";
import { Package, Tag, Ruler, FileText, Hash, Calendar } from "lucide-react";

interface Props {
  produto: ProdutoCatalogo | null;
  aberto: boolean;
  onFechar: () => void;
}

export function DetalheProdutoDialog({ produto, aberto, onFechar }: Props) {
  if (!produto) return null;

  const cat = produto.categoria;
  const und = produto.unidade_medida;
  const elem = produto.elemento_despesa;

  return (
    <Drawer open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DrawerContent side="right">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Detalhes do Produto
          </DrawerTitle>
          <DrawerDescription>
            Informações completas do item no catálogo padronizado.
          </DrawerDescription>
        </DrawerHeader>

        <DrawerBody>
        <div className="space-y-4">
          {/* Descrição principal */}
          <div>
            <h3 className="text-base font-semibold">{produto.descricao}</h3>
            {produto.descricao_detalhada && (
              <p className="mt-1 text-sm text-muted-foreground">
                {produto.descricao_detalhada}
              </p>
            )}
          </div>

          <Separator />

          {/* Grid de informações */}
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Categoria */}
            <div className="flex items-start gap-2">
              <Tag className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Categoria</p>
                <p className="text-sm">{cat?.nome ?? "—"}</p>
              </div>
            </div>

            {/* Unidade */}
            <div className="flex items-start gap-2">
              <Ruler className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Unidade de Medida</p>
                <p className="text-sm">
                  {und ? `${und.sigla} — ${und.descricao}` : "—"}
                </p>
              </div>
            </div>

            {/* Elemento de despesa */}
            <div className="flex items-start gap-2">
              <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Elemento de Despesa</p>
                <p className="text-sm">
                  {elem ? `${elem.codigo} — ${elem.descricao}` : "—"}
                </p>
              </div>
            </div>

            {/* Código CATMAT */}
            <div className="flex items-start gap-2">
              <Hash className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Código CATMAT/CATSER</p>
                <p className="text-sm">{produto.codigo_catmat || "—"}</p>
              </div>
            </div>

            {/* Data de cadastro */}
            <div className="flex items-start gap-2">
              <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Cadastrado em</p>
                <p className="text-sm">
                  {new Date(produto.criado_em).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-start gap-2 pt-1">
              <Badge variant={produto.ativo ? "success" : "destructive"}>
                {produto.ativo ? "Ativo" : "Desativado"}
              </Badge>
            </div>
          </div>
        </div>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
