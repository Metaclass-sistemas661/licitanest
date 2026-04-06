// ═══════════════════════════════════════════════════════════════════════════════
// NovaCotacaoDrawer — Wizard de criação de cotação em 3 passos
// 1) Selecionar cesta e configurar cabeçalho
// 2) Selecionar itens da cesta para incluir na cotação
// 3) Adicionar fornecedores (CNPJ, e-mail)
// ═══════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerBody,
  DrawerFooter,
} from "@/componentes/ui/drawer";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Card, CardContent } from "@/componentes/ui/card";
import { Badge } from "@/componentes/ui/badge";
import { Separator } from "@/componentes/ui/separator";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Package,
  Plus,
  Search,
  Trash2,
  Users,
  AlertCircle,
  Mail,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { listarCestas } from "@/servicos/cestas";
import { listarItensCesta } from "@/servicos/itensCesta";
import type { CestaPrecos, Cotacao, ItemCesta } from "@/tipos";
import { useCotacaoDetalhe } from "@/hooks/useCotacoes";

interface Props {
  aberto: boolean;
  onClose: () => void;
  onCriada: (cotacao: Cotacao) => void;
}

export function NovaCotacaoDrawer({ aberto, onClose, onCriada }: Props) {
  const { servidor } = useAuth();
  const { criar, carregando: criando, erro } = useCotacaoDetalhe();

  const [passo, setPasso] = useState(1);

  // Passo 1: Selecionar cesta
  const [cestas, setCestas] = useState<CestaPrecos[]>([]);
  const [buscaCesta, setBuscaCesta] = useState("");
  const [cestaSelecionada, setCestaSelecionada] = useState<CestaPrecos | null>(null);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataEncerramento, setDataEncerramento] = useState("");
  const [carregandoCestas, setCarregandoCestas] = useState(false);

  // Passo 2: Itens
  const [itensCesta, setItensCesta] = useState<ItemCesta[]>([]);
  const [itensSelecionados, setItensSelecionados] = useState<Set<string>>(new Set());
  const [carregandoItens, setCarregandoItens] = useState(false);

  // Passo 3: Fornecedores
  const [fornecedores, setFornecedores] = useState<{
    razao_social: string;
    cpf_cnpj: string;
    email: string;
    telefone: string;
  }[]>([]);
  const [novoForn, setNovoForn] = useState({ razao_social: "", cpf_cnpj: "", email: "", telefone: "" });

  // Carregar cestas
  useEffect(() => {
    if (!aberto) return;
    queueMicrotask(() => setCarregandoCestas(true));
    listarCestas({ busca: buscaCesta || undefined }, 1, 50)
      .then(r => { queueMicrotask(() => setCestas(r.data)); })
      .finally(() => setCarregandoCestas(false));
  }, [aberto, buscaCesta]);

  // Ao selecionar cesta, carregar itens
  useEffect(() => {
    if (!cestaSelecionada) return;
    queueMicrotask(() => setCarregandoItens(true));
    listarItensCesta(cestaSelecionada.id)
      .then(itens => {
        queueMicrotask(() => {
          setItensCesta(itens);
          setItensSelecionados(new Set(itens.map(i => i.id)));
        });
      })
      .finally(() => setCarregandoItens(false));
  }, [cestaSelecionada]);

  // Default: data encerramento = 15 dias
  useEffect(() => {
    if (!dataEncerramento) {
      const d = new Date();
      d.setDate(d.getDate() + 15);
      const novaData = d.toISOString().split("T")[0];
      queueMicrotask(() => setDataEncerramento(novaData));
    }
  }, [dataEncerramento]);

  const toggleItem = useCallback((id: string) => {
    setItensSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const adicionarFornecedor = () => {
    if (!novoForn.razao_social.trim() || !novoForn.email.trim()) return;
    setFornecedores(prev => [...prev, { ...novoForn }]);
    setNovoForn({ razao_social: "", cpf_cnpj: "", email: "", telefone: "" });
  };

  const removerFornecedor = (idx: number) => {
    setFornecedores(prev => prev.filter((_, i) => i !== idx));
  };

  const podePasso2 = !!cestaSelecionada && !!titulo.trim() && !!dataEncerramento;
  const podePasso3 = itensSelecionados.size > 0;
  const podeCriar = fornecedores.length > 0;

  const handleCriar = async () => {
    if (!servidor || !cestaSelecionada) return;
    const itensParaCotacao = itensCesta
      .filter(i => itensSelecionados.has(i.id))
      .map((i, _idx) => ({
        item_cesta_id: i.id,
        quantidade: i.quantidade,
        unidade: i.produto?.unidade_medida?.sigla,
        exige_anvisa: i.produto?.categoria?.nome?.toLowerCase().includes("medicament") ?? false,
        descricao_complementar: undefined,
      }));

    const c = await criar({
      cesta_id: cestaSelecionada.id,
      titulo: titulo.trim(),
      descricao: descricao.trim() || undefined,
      data_encerramento: new Date(dataEncerramento + "T23:59:59").toISOString(),
      criado_por: servidor.id,
      itens: itensParaCotacao,
      fornecedores: fornecedores.map(f => ({
        razao_social: f.razao_social,
        cpf_cnpj: f.cpf_cnpj || undefined,
        email: f.email,
        telefone: f.telefone || undefined,
      })),
    });
    if (c) onCriada(c);
  };

  return (
    <Drawer open={aberto} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-w-2xl">
        <DrawerHeader>
          <DrawerTitle>Nova Cotação Eletrônica</DrawerTitle>
          {/* Indicador de passos */}
          <div className="mt-2 flex items-center gap-2 text-sm">
            {[1, 2, 3].map(p => (
              <div key={p} className="flex items-center gap-1">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    passo === p ? "bg-primary text-primary-foreground" :
                    passo > p ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {passo > p ? <Check className="h-3 w-3" /> : p}
                </div>
                <span className={passo === p ? "font-medium" : "text-muted-foreground"}>
                  {p === 1 ? "Cesta e dados" : p === 2 ? "Itens" : "Fornecedores"}
                </span>
                {p < 3 && <ArrowRight className="h-3 w-3 text-muted-foreground mx-1" />}
              </div>
            ))}
          </div>
        </DrawerHeader>

        <DrawerBody>
          {/* ── PASSO 1: Selecionar Cesta ─────────────────────────────── */}
          {passo === 1 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Cesta de Preços *</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cesta…"
                    className="pl-10"
                    value={buscaCesta}
                    onChange={e => setBuscaCesta(e.target.value)}
                  />
                </div>
              </div>

              {carregandoCestas ? (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando cestas…
                </div>
              ) : (
                <div className="max-h-[200px] space-y-2 overflow-y-auto">
                  {cestas.map(c => (
                    <Card
                      key={c.id}
                      className={`cursor-pointer transition ${cestaSelecionada?.id === c.id ? "ring-2 ring-primary" : "hover:bg-muted/50"}`}
                      onClick={() => {
                        setCestaSelecionada(c);
                        if (!titulo) setTitulo(`Cotação — ${c.descricao_objeto}`);
                      }}
                    >
                      <CardContent className="flex items-center gap-3 p-3">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{c.descricao_objeto}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(c.data).toLocaleDateString("pt-BR")} — {c.status}
                          </p>
                        </div>
                        {cestaSelecionada?.id === c.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <Separator />

              <div>
                <label className="mb-1 block text-sm font-medium">Título da Cotação *</label>
                <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Cotação de materiais de limpeza" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Descrição (opcional)</label>
                <Input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Informações adicionais…" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Data de Encerramento *</label>
                <Input type="date" value={dataEncerramento} onChange={e => setDataEncerramento(e.target.value)} />
              </div>
            </div>
          )}

          {/* ── PASSO 2: Selecionar Itens ─────────────────────────────── */}
          {passo === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Selecione os itens da cesta que serão incluídos na cotação
                </p>
                <Badge variant="outline">
                  {itensSelecionados.size}/{itensCesta.length} selecionados
                </Badge>
              </div>

              {carregandoItens ? (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando itens…
                </div>
              ) : (
                <div className="max-h-[350px] space-y-2 overflow-y-auto">
                  {/* Selecionar/deselecionar todos */}
                  <div className="flex gap-2 mb-2">
                    <Button size="sm" variant="outline" onClick={() => setItensSelecionados(new Set(itensCesta.map(i => i.id)))}>
                      Selecionar todos
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setItensSelecionados(new Set())}>
                      Limpar seleção
                    </Button>
                  </div>
                  {itensCesta.map(item => {
                    const sel = itensSelecionados.has(item.id);
                    const prod = item.produto;
                    const isMedicamento = prod?.categoria?.nome?.toLowerCase().includes("medicament");
                    return (
                      <Card
                        key={item.id}
                        className={`cursor-pointer transition ${sel ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/50"}`}
                        onClick={() => toggleItem(item.id)}
                      >
                        <CardContent className="flex items-center gap-3 p-3">
                          <input
                            type="checkbox"
                            checked={sel}
                            onChange={() => toggleItem(item.id)}
                            className="h-4 w-4 rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{prod?.descricao ?? "Item"}</p>
                            <div className="flex gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground">
                                Qtd: {item.quantidade} {prod?.unidade_medida?.sigla ?? ""}
                              </span>
                              {isMedicamento && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 bg-purple-50 text-purple-700">
                                  ANVISA
                                </Badge>
                              )}
                            </div>
                          </div>
                          {sel && <Check className="h-4 w-4 text-primary" />}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── PASSO 3: Fornecedores ─────────────────────────────────── */}
          {passo === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Adicione os fornecedores que receberão a cotação por e-mail
              </p>

              {/* Formulário adicionar fornecedor */}
              <Card>
                <CardContent className="space-y-3 p-4">
                  <div className="grid gap-3 grid-cols-2">
                    <div className="col-span-2">
                      <label className="mb-1 block text-xs font-medium">Razão Social / Nome *</label>
                      <Input
                        value={novoForn.razao_social}
                        onChange={e => setNovoForn(p => ({ ...p, razao_social: e.target.value }))}
                        placeholder="Empresa ABC Ltda"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium">CPF/CNPJ</label>
                      <Input
                        value={novoForn.cpf_cnpj}
                        onChange={e => setNovoForn(p => ({ ...p, cpf_cnpj: e.target.value }))}
                        placeholder="00.000.000/0000-00"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium">E-mail *</label>
                      <Input
                        type="email"
                        value={novoForn.email}
                        onChange={e => setNovoForn(p => ({ ...p, email: e.target.value }))}
                        placeholder="contato@empresa.com"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium">Telefone</label>
                      <Input
                        value={novoForn.telefone}
                        onChange={e => setNovoForn(p => ({ ...p, telefone: e.target.value }))}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={adicionarFornecedor}
                        disabled={!novoForn.razao_social.trim() || !novoForn.email.trim()}
                        className="w-full"
                      >
                        <Plus className="mr-1 h-4 w-4" /> Adicionar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Lista de fornecedores */}
              {fornecedores.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">
                  <Users className="mx-auto mb-2 h-8 w-8 opacity-40" />
                  Nenhum fornecedor adicionado ainda
                </div>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {fornecedores.map((f, i) => (
                    <Card key={i}>
                      <CardContent className="flex items-center gap-3 p-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{f.razao_social}</p>
                          <p className="text-xs text-muted-foreground">{f.email} {f.cpf_cnpj && `| ${f.cpf_cnpj}`}</p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removerFornecedor(i)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {erro && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  {erro}
                </div>
              )}
            </div>
          )}
        </DrawerBody>

        <DrawerFooter className="flex-row justify-between gap-2">
          {passo > 1 ? (
            <Button variant="outline" onClick={() => setPasso(p => p - 1)}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
            </Button>
          ) : (
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
          )}

          {passo < 3 ? (
            <Button
              onClick={() => setPasso(p => p + 1)}
              disabled={passo === 1 ? !podePasso2 : !podePasso3}
            >
              Próximo <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleCriar} disabled={!podeCriar || criando}>
              {criando ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
              Criar Cotação
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
