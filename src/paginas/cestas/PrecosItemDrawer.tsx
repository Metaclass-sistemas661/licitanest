// Drawer lateral para gerenciar preços de um item da cesta
import { useCallback, useEffect, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerBody,
} from "@/componentes/ui/drawer";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Badge } from "@/componentes/ui/badge";
import {
  Plus,
  Trash2,
  Loader2,
  XCircle,
  RotateCcw,
  Upload,
  FileText,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useFontes } from "@/hooks/useCestas";
import type { ItemCesta, PrecoItem, FontePreco } from "@/tipos";
import {
  adicionarPreco,
  excluirPrecoDoCalculo,
  reincluirPrecoNoCalculo,
  removerPreco,
  recalcularEstatisticasItem,
  calcularEstatisticas,
  uploadDocumento,
} from "@/servicos/itensCesta";
import { api } from "@/lib/api";

// ── Formatter ────────────────────────────────────────
function moeda(valor: number | null) {
  if (valor == null) return "—";
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// ── Props ────────────────────────────────────────────
interface Props {
  item: ItemCesta;
  aberto: boolean;
  onClose: () => void;
  onAtualizado: () => void;
}

export function PrecosItemDialog({ item, aberto, onClose, onAtualizado }: Props) {
  const { servidor } = useAuth();
  const fontes = useFontes();
  const [precos, setPrecos] = useState<PrecoItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Form novo preço
  const [fonteId, setFonteId] = useState("");
  const [valor, setValor] = useState("");
  const [dataRef, setDataRef] = useState(new Date().toISOString().slice(0, 10));
  const [orgao, setOrgao] = useState("");
  const [descricaoFonte, setDescricaoFonte] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);

  // Justificativa para exclusão
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [justificativa, setJustificativa] = useState("");

  // ── Carregar preços ────────────────────────────────
  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const data = await api.get<PrecoItem[]>(
        `/api/itens-cesta/${item.id}/precos`
      );
      setPrecos(data ?? []);
    } catch {
      setPrecos([]);
    } finally {
      setCarregando(false);
    }
  }, [item.id]);

  useEffect(() => {
    if (aberto) carregar();
  }, [aberto, carregar]);

  // Default fonte to cotacao_direta
  useEffect(() => {
    if (!fonteId && fontes.length > 0) {
      const cotDireta = fontes.find((f) => f.tipo === "cotacao_direta");
      if (cotDireta) setFonteId(cotDireta.id);
      else setFonteId(fontes[0].id);
    }
  }, [fontes, fonteId]);

  // ── Adicionar preço ────────────────────────────────
  const handleAdicionar = async () => {
    if (!fonteId || !valor || !dataRef) return;
    setSalvando(true);
    setErro(null);
    try {
      const novoPreco = await adicionarPreco({
        item_cesta_id: item.id,
        fonte_id: fonteId,
        valor_unitario: parseFloat(valor),
        data_referencia: dataRef,
        orgao: orgao || undefined,
        descricao_fonte: descricaoFonte || undefined,
      });

      // Upload de documento se houver
      if (arquivo) {
        try {
          await uploadDocumento(novoPreco.id, arquivo);
        } catch {
          // silencioso — storage pode não estar configurado
        }
      }

      // Recalcular estatísticas
      await recalcularEstatisticasItem(item.id);

      // Limpar form
      setValor("");
      setOrgao("");
      setDescricaoFonte("");
      setArquivo(null);
      setMostrarForm(false);
      await carregar();
      onAtualizado();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao adicionar preço");
    } finally {
      setSalvando(false);
    }
  };

  // ── Excluir do cálculo ─────────────────────────────
  const handleExcluir = async (precoId: string) => {
    if (!servidor || !justificativa.trim()) return;
    try {
      await excluirPrecoDoCalculo(precoId, servidor.id, justificativa.trim());
      await recalcularEstatisticasItem(item.id);
      setExcluindoId(null);
      setJustificativa("");
      await carregar();
      onAtualizado();
    } catch {
      /* silencioso */
    }
  };

  // ── Reincluir no cálculo ───────────────────────────
  const handleReincluir = async (precoId: string) => {
    try {
      await reincluirPrecoNoCalculo(precoId);
      await recalcularEstatisticasItem(item.id);
      await carregar();
      onAtualizado();
    } catch {
      /* silencioso */
    }
  };

  // ── Remover preço ──────────────────────────────────
  const handleRemover = async (precoId: string) => {
    if (!confirm("Remover este preço permanentemente?")) return;
    try {
      await removerPreco(precoId);
      await recalcularEstatisticasItem(item.id);
      await carregar();
      onAtualizado();
    } catch {
      /* silencioso */
    }
  };

  // Estatísticas calculadas
  const stats = calcularEstatisticas(precos);
  const excluidos = precos.filter((p) => p.excluido_calculo).length;

  return (
    <Drawer open={aberto} onOpenChange={(v) => !v && onClose()}>
      <DrawerContent side="right">
        <DrawerHeader>
          <DrawerTitle>Preços — {item.produto?.descricao ?? "Item"}</DrawerTitle>
        </DrawerHeader>

        <DrawerBody>
        {/* Estatísticas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: "Menor", valor: stats.menor_preco },
            { label: "Maior", valor: stats.maior_preco },
            { label: "Média", valor: stats.media },
            { label: "Mediana", valor: stats.mediana },
          ].map(({ label, valor: v }) => (
            <div
              key={label}
              className="rounded-md border p-3 text-center"
            >
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-semibold">{moeda(v)}</p>
            </div>
          ))}
        </div>
        {excluidos > 0 && (
          <p className="text-xs text-amber-600 mb-4">
            {excluidos} preço(s) excluído(s) do cálculo
          </p>
        )}

        {/* Lista de preços */}
        {carregando ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : precos.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum preço registrado para este item.
          </p>
        ) : (
          <div className="rounded-md border mb-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Fonte</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                  <th className="px-3 py-2 text-left">Data Ref.</th>
                  <th className="px-3 py-2 text-left">Órgão</th>
                  <th className="px-3 py-2 text-center">Status</th>
                  <th className="px-3 py-2 w-24" />
                </tr>
              </thead>
              <tbody>
                {precos.map((preco) => {
                  const excluido = preco.excluido_calculo;
                  return (
                    <tr
                      key={preco.id}
                      className={`border-b last:border-0 ${excluido ? "bg-muted/30" : ""}`}
                    >
                      <td className={`px-3 py-2 ${excluido ? "line-through opacity-60" : ""}`}>
                        {(preco.fonte as FontePreco | undefined)?.sigla ?? "—"}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-mono ${excluido ? "line-through opacity-60" : ""}`}
                      >
                        {moeda(preco.valor_unitario)}
                      </td>
                      <td
                        className={`px-3 py-2 ${excluido ? "line-through opacity-60" : ""}`}
                      >
                        {new Date(preco.data_referencia + "T00:00:00").toLocaleDateString(
                          "pt-BR",
                        )}
                      </td>
                      <td
                        className={`px-3 py-2 max-w-32 truncate ${excluido ? "line-through opacity-60" : ""}`}
                      >
                        {preco.orgao ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {excluido ? (
                          <Badge variant="warning" className="text-xs">
                            Excluído
                          </Badge>
                        ) : (
                          <Badge variant="success" className="text-xs">
                            Ativo
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1 justify-end">
                          {excluido ? (
                            <button
                              type="button"
                              className="text-emerald-600 hover:text-emerald-700"
                              title="Reincluir no cálculo"
                              onClick={() => handleReincluir(preco.id)}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="text-amber-600 hover:text-amber-700"
                              title="Excluir do cálculo"
                              onClick={() => setExcluindoId(preco.id)}
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            className="text-destructive hover:text-destructive/80"
                            title="Remover preço"
                            onClick={() => handleRemover(preco.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Painel de justificativa de exclusão */}
        {excluindoId && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-4 mb-4 space-y-2">
            <p className="text-sm font-medium text-amber-800">
              Justifique a exclusão deste preço do cálculo:
            </p>
            <Input
              placeholder="Motivo da exclusão..."
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setExcluindoId(null);
                  setJustificativa("");
                }}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={!justificativa.trim()}
                onClick={() => handleExcluir(excluindoId)}
              >
                Confirmar Exclusão
              </Button>
            </div>
          </div>
        )}

        {/* Form de novo preço */}
        {mostrarForm ? (
          <div className="rounded-md border p-4 space-y-3">
            <p className="text-sm font-medium">Adicionar Preço</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Fonte *</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={fonteId}
                  onChange={(e) => setFonteId(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {fontes.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome} ({f.sigla})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  Valor Unitário (R$) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  Data Referência *
                </label>
                <Input
                  type="date"
                  value={dataRef}
                  onChange={(e) => setDataRef(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Órgão</label>
                <Input
                  placeholder="Órgão contratante"
                  value={orgao}
                  onChange={(e) => setOrgao(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground">
                  Descrição na fonte
                </label>
                <Input
                  placeholder="Descrição original na fonte (opcional)"
                  value={descricaoFonte}
                  onChange={(e) => setDescricaoFonte(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground">
                  Documento comprobatório (PDF/imagem)
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent">
                    <Upload className="h-4 w-4" />
                    {arquivo ? arquivo.name : "Anexar arquivo"}
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) =>
                        setArquivo(e.target.files?.[0] ?? null)
                      }
                    />
                  </label>
                  {arquivo && (
                    <button
                      type="button"
                      className="text-destructive"
                      onClick={() => setArquivo(null)}
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {erro && (
              <p className="text-sm text-destructive">{erro}</p>
            )}

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMostrarForm(false)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={!fonteId || !valor || !dataRef || salvando}
                onClick={handleAdicionar}
              >
                {salvando ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-1 h-4 w-4" />
                )}
                Salvar Preço
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" onClick={() => setMostrarForm(true)}>
            <Plus className="mr-1 h-4 w-4" /> Adicionar Preço
          </Button>
        )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
