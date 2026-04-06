import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerBody,
  DrawerFooter,
} from "@/componentes/ui/drawer";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import { AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { Categoria, UnidadeMedida } from "@/tipos";
import { criarSolicitacao } from "@/servicos/solicitacoesCatalogo";

interface Props {
  aberto: boolean;
  onFechar: () => void;
  onCriada: () => void;
  categorias: Categoria[];
  unidades: UnidadeMedida[];
}

export function SolicitarInclusaoDialog({
  aberto,
  onFechar,
  onCriada,
  categorias,
  unidades,
}: Props) {
  const { servidor } = useAuth();
  const [descricao, setDescricao] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [unidadeId, setUnidadeId] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const limpar = () => {
    setDescricao("");
    setJustificativa("");
    setCategoriaId("");
    setUnidadeId("");
    setErro(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim() || !servidor) return;

    setSalvando(true);
    setErro(null);
    try {
      await criarSolicitacao({
        descricao: descricao.trim(),
        justificativa: justificativa.trim() || undefined,
        categoria_id: categoriaId || undefined,
        unidade_medida_id: unidadeId || undefined,
        solicitante_id: servidor.id,
      });
      limpar();
      onCriada();
      onFechar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao enviar solicitação.");
    } finally {
      setSalvando(false);
    }
  };

  const selectClasses =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <Drawer
      open={aberto}
      onOpenChange={(v) => {
        if (!v) {
          limpar();
          onFechar();
        }
      }}
    >
      <DrawerContent side="right">
        <DrawerHeader>
          <DrawerTitle>Solicitar Inclusão de Item</DrawerTitle>
          <DrawerDescription>
            Descreva o item desejado. Um administrador analisará sua solicitação.
          </DrawerDescription>
        </DrawerHeader>

        <DrawerBody>
        {erro && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Descrição do item *</label>
            <Input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Detergente neutro 500ml"
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Justificativa</label>
            <Textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Por que este item deve ser incluído no catálogo?"
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Categoria sugerida</label>
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className={selectClasses}
              >
                <option value="">Selecione...</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Unidade sugerida</label>
              <select
                value={unidadeId}
                onChange={(e) => setUnidadeId(e.target.value)}
                className={selectClasses}
              >
                <option value="">Selecione...</option>
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.sigla} — {u.descricao}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DrawerFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                limpar();
                onFechar();
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar Solicitação
            </Button>
          </DrawerFooter>
        </form>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
