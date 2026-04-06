import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import {
  LayoutTemplate,
  Search,
  Package,
  ChevronDown,
  ChevronUp,
  Copy,
  ListChecks,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import {
  listarTemplates,
  CATEGORIAS_TEMPLATE,
} from "@/servicos/templatesCestas";
import type { TemplateCesta, CategoriaTemplate } from "@/tipos";
import { cn } from "@/lib/utils";

export function TemplatesCestasPage() {
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaTemplate | "">("");
  const [busca, setBusca] = useState("");
  const [expandido, setExpandido] = useState<string | null>(null);

  const templates = useMemo(() => {
    let list = listarTemplates(filtroCategoria || undefined);
    if (busca.trim()) {
      const termo = busca.toLowerCase();
      list = list.filter(
        (t) =>
          t.nome.toLowerCase().includes(termo) ||
          t.descricao.toLowerCase().includes(termo) ||
          t.itens.some((i) => i.descricao.toLowerCase().includes(termo)),
      );
    }
    return list;
  }, [filtroCategoria, busca]);

  const categorias = Object.entries(CATEGORIAS_TEMPLATE).filter(
    ([key]) => key !== "personalizado",
  );

  const handleUsarTemplate = (template: TemplateCesta) => {
    // Copiar lista de itens para clipboard em formato texto
    const texto = template.itens
      .map(
        (i, idx) =>
          `${idx + 1}. ${i.descricao} — ${i.quantidade_sugerida} ${i.unidade}`,
      )
      .join("\n");
    navigator.clipboard.writeText(texto).then(
      () =>
        toast.success(
          `Lista de ${template.itens.length} itens copiada para a área de transferência`,
        ),
      () => toast.error("Erro ao copiar lista"),
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Templates de Cestas
        </h2>
        <p className="text-muted-foreground">
          Modelos prontos por categoria para criar cestas rapidamente
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar templates ou itens..."
            className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-4 text-sm"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            value={filtroCategoria}
            onChange={(e) =>
              setFiltroCategoria(e.target.value as CategoriaTemplate | "")
            }
          >
            <option value="">Todas as categorias</option>
            {categorias.map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.icone} {meta.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid de templates */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            expandido={expandido === template.id}
            onToggle={() =>
              setExpandido((prev) =>
                prev === template.id ? null : template.id,
              )
            }
            onUsar={() => handleUsarTemplate(template)}
          />
        ))}
      </div>

      {templates.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <LayoutTemplate className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">
            Nenhum template encontrado
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Tente ajustar os filtros de busca
          </p>
        </div>
      )}
    </div>
  );
}

// ── Card de Template ──────────────────────────────────

function TemplateCard({
  template,
  expandido,
  onToggle,
  onUsar,
}: {
  template: TemplateCesta;
  expandido: boolean;
  onToggle: () => void;
  onUsar: () => void;
}) {
  const catMeta = CATEGORIAS_TEMPLATE[template.categoria];

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{template.icone}</span>
            <div>
              <CardTitle className="text-base">{template.nome}</CardTitle>
              <CardDescription className="mt-1 line-clamp-2">
                {template.descricao}
              </CardDescription>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
              catMeta.cor,
            )}
          >
            {catMeta.label}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Package className="h-3 w-3" />
            {template.itens.length} itens
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-end gap-3">
        {/* Lista de itens expandível */}
        {expandido && (
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="mb-2 flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <ListChecks className="h-3 w-3" />
              Itens do template
            </div>
            <ul className="space-y-1.5 text-xs">
              {template.itens.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                    {idx + 1}
                  </span>
                  <span>
                    {item.descricao}{" "}
                    <span className="text-muted-foreground">
                      — {item.quantidade_sugerida} {item.unidade}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Ações */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onToggle}>
            {expandido ? (
              <ChevronUp className="mr-1 h-3 w-3" />
            ) : (
              <ChevronDown className="mr-1 h-3 w-3" />
            )}
            {expandido ? "Recolher" : "Ver Itens"}
          </Button>
          <Button size="sm" className="flex-1" onClick={onUsar}>
            <Copy className="mr-1 h-3 w-3" />
            Copiar Lista
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
