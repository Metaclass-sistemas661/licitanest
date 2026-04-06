import { useEffect, useState } from "react";
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
import { Badge } from "@/componentes/ui/badge";
import { AlertCircle, Loader2, AlertTriangle } from "lucide-react";
import type { ProdutoCatalogo, Categoria, UnidadeMedida, ElementoDespesa } from "@/tipos";
import {
  criarProdutoCatalogo,
  atualizarProdutoCatalogo,
  buscarProdutosSimilares,
  type CriarProdutoDTO,
} from "@/servicos/produtosCatalogo";

interface Props {
  aberto: boolean;
  onFechar: () => void;
  onSalvo: () => void;
  produto?: ProdutoCatalogo | null; // se definido, edição
  categorias: Categoria[];
  unidades: UnidadeMedida[];
  elementos: ElementoDespesa[];
}

export function FormProdutoDialog({
  aberto,
  onFechar,
  onSalvo,
  produto,
  categorias,
  unidades,
  elementos,
}: Props) {
  const editando = !!produto;

  const [descricao, setDescricao] = useState("");
  const [descricaoDetalhada, setDescricaoDetalhada] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [unidadeId, setUnidadeId] = useState("");
  const [elementoId, setElementoId] = useState("");
  const [codigoCatmat, setCodigoCatmat] = useState("");

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Duplicidades
  const [similares, setSimilares] = useState<ProdutoCatalogo[]>([]);
  const [buscandoSimilares, setBuscandoSimilares] = useState(false);
  const [duplicidadeVerificada, setDuplicidadeVerificada] = useState(false);

  // Preencher form com dados do produto (edição)
  useEffect(() => {
    if (produto) {
      setDescricao(produto.descricao);
      setDescricaoDetalhada(produto.descricao_detalhada || "");
      setCategoriaId(produto.categoria_id);
      setUnidadeId(produto.unidade_medida_id);
      setElementoId(produto.elemento_despesa_id || "");
      setCodigoCatmat(produto.codigo_catmat || "");
      setDuplicidadeVerificada(true); // pular verificação ao editar
    } else {
      setDescricao("");
      setDescricaoDetalhada("");
      setCategoriaId("");
      setUnidadeId("");
      setElementoId("");
      setCodigoCatmat("");
      setDuplicidadeVerificada(false);
    }
    setSimilares([]);
    setErro(null);
  }, [produto, aberto]);

  // Verificação de duplicidade
  const verificarDuplicidade = async () => {
    if (descricao.trim().length < 3) {
      setDuplicidadeVerificada(true);
      return;
    }

    setBuscandoSimilares(true);
    try {
      let resultados = await buscarProdutosSimilares(descricao);
      // Excluir o próprio item ao editar
      if (produto) {
        resultados = resultados.filter((r) => r.id !== produto.id);
      }
      setSimilares(resultados);
      setDuplicidadeVerificada(true);
    } catch {
      // se falhar, permite continuar
      setDuplicidadeVerificada(true);
    } finally {
      setBuscandoSimilares(false);
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim() || !categoriaId || !unidadeId) return;

    // Se ainda não verificou duplicidade, verificar primeiro
    if (!duplicidadeVerificada && !editando) {
      await verificarDuplicidade();
      return;
    }

    setSalvando(true);
    setErro(null);

    const dto: CriarProdutoDTO = {
      descricao: descricao.trim(),
      descricao_detalhada: descricaoDetalhada.trim() || undefined,
      categoria_id: categoriaId,
      unidade_medida_id: unidadeId,
      elemento_despesa_id: elementoId || null,
      codigo_catmat: codigoCatmat.trim() || undefined,
    };

    try {
      if (editando && produto) {
        await atualizarProdutoCatalogo(produto.id, dto);
      } else {
        await criarProdutoCatalogo(dto);
      }
      onSalvo();
      onFechar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar produto.");
    } finally {
      setSalvando(false);
    }
  };

  const selectClasses =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <Drawer open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DrawerContent side="right">
        <DrawerHeader>
          <DrawerTitle>
            {editando ? "Editar Produto" : "Novo Produto no Catálogo"}
          </DrawerTitle>
          <DrawerDescription>
            {editando
              ? "Altere as informações do produto."
              : "Preencha todos os campos obrigatórios. O sistema verificará duplicidades antes de salvar."}
          </DrawerDescription>
        </DrawerHeader>

        <DrawerBody>
        {/* Erro */}
        {erro && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        <form onSubmit={handleSalvar} className="space-y-4">
          {/* Descrição */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Descrição *</label>
            <Input
              value={descricao}
              onChange={(e) => {
                setDescricao(e.target.value);
                setDuplicidadeVerificada(false);
                setSimilares([]);
              }}
              placeholder="Ex: Arroz Tipo 1 - Pacote 5kg"
              required
              autoFocus
            />
          </div>

          {/* Descrição detalhada */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Descrição detalhada</label>
            <Textarea
              value={descricaoDetalhada}
              onChange={(e) => setDescricaoDetalhada(e.target.value)}
              placeholder="Especificações técnicas, marca de referência, etc."
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Categoria */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Categoria *</label>
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                required
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

            {/* Unidade */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Unidade de Medida *</label>
              <select
                value={unidadeId}
                onChange={(e) => setUnidadeId(e.target.value)}
                required
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

            {/* Elemento de despesa */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Elemento de Despesa</label>
              <select
                value={elementoId}
                onChange={(e) => setElementoId(e.target.value)}
                className={selectClasses}
              >
                <option value="">Nenhum</option>
                {elementos.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.codigo} — {e.descricao}
                  </option>
                ))}
              </select>
            </div>

            {/* CATMAT */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Código CATMAT/CATSER</label>
              <Input
                value={codigoCatmat}
                onChange={(e) => setCodigoCatmat(e.target.value)}
                placeholder="Ex: 4520001"
                maxLength={30}
              />
            </div>
          </div>

          {/* Alerta de duplicidade */}
          {similares.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                Itens similares encontrados ({similares.length})
              </div>
              <p className="mb-2 text-xs text-amber-700">
                Verifique se algum dos itens abaixo já atende à sua necessidade antes de continuar:
              </p>
              <div className="max-h-40 space-y-1.5 overflow-y-auto">
                {similares.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded bg-white/70 px-2.5 py-1.5 text-xs"
                  >
                    <span className="font-medium text-amber-900">{s.descricao}</span>
                    <Badge variant="outline" className="ml-2 shrink-0 text-[10px]">
                      {s.categoria?.nome ?? "—"}
                    </Badge>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-amber-600">
                Se deseja continuar mesmo assim, clique em &quot;Salvar&quot; novamente.
              </p>
            </div>
          )}

          <DrawerFooter>
            <Button type="button" variant="outline" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando || buscandoSimilares}>
              {salvando || buscandoSimilares ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {buscandoSimilares
                ? "Verificando duplicidades..."
                : !duplicidadeVerificada && !editando
                  ? "Verificar e Salvar"
                  : "Salvar"}
            </Button>
          </DrawerFooter>
        </form>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
