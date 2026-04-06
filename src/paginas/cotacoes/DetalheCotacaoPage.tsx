// ═══════════════════════════════════════════════════════════════════════════════
// DetalheCotacaoPage — Fase 9
// Visualização completa da cotação: cabeçalho, itens, fornecedores, respostas,
// lançamentos manuais e transferência para cesta
// ═══════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useConfirm } from "@/componentes/ui/confirm-dialog";
import { Card, CardContent } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Badge } from "@/componentes/ui/badge";
import { Separator } from "@/componentes/ui/separator";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock,
  Link2,
  Loader2,
  Mail,
  MailCheck,
  Package,
  Pencil,
  Plus,
  SendHorizonal,
  Trash2,
  Users,
  XCircle,
  AlertCircle,
  FileText,
  Phone,
  MessageSquare,
  User,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCotacaoDetalhe } from "@/hooks/useCotacoes";
import {
  STATUS_COTACAO_LABELS,
  STATUS_COTACAO_CORES,
  MEIO_LABELS,
  gerarLinkPortal,
  adicionarFornecedorCotacao,
  removerFornecedorCotacao,
} from "@/servicos/cotacoes";
import type {
  StatusCotacao,
  RespostaCotacao,
  MeioRecebimento,
} from "@/tipos";

// ── Formatadores ─────────────────────────────────────────────────────────────
function fmtData(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtDataHora(d: string) {
  return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STATUS_ICONS: Record<StatusCotacao, React.ComponentType<{ className?: string }>> = {
  rascunho: FileText,
  enviada: Mail,
  em_resposta: MailCheck,
  encerrada: CheckCircle2,
  cancelada: XCircle,
};

const MEIO_ICONS: Record<MeioRecebimento, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  whatsapp: MessageSquare,
  telefone: Phone,
  presencial: User,
  manual: Pencil,
};

type Aba = "resumo" | "fornecedores" | "respostas" | "lancamentos";

export function DetalheCotacaoPage() {
  const { cotacaoId } = useParams<{ cotacaoId: string }>();
  const navigate = useNavigate();
  const { servidor } = useAuth();
  const confirmar = useConfirm();
  const {
    cotacao,
    respostas,
    lancamentos,
    carregando,
    erro,
    carregar,
    enviar,
    alterarStatus,
    excluir,
    transferirResposta,
    lancarManual,
    transferirLancamento,
  } = useCotacaoDetalhe();

  const [aba, setAba] = useState<Aba>("resumo");
  const [copiado, setCopiado] = useState<string | null>(null);

  // Lançamento manual state
  const [showLancamento, setShowLancamento] = useState(false);
  const [lancForm, setLancForm] = useState({
    item_cesta_id: "",
    razao_social: "",
    cpf_cnpj: "",
    email: "",
    telefone: "",
    marca: "",
    valor_unitario: "",
    observacoes: "",
    registro_anvisa: "",
    meio_recebimento: "manual" as MeioRecebimento,
  });

  // Adicionar fornecedor avulso
  const [showAddForn, setShowAddForn] = useState(false);
  const [novoForn, setNovoForn] = useState({ razao_social: "", cpf_cnpj: "", email: "", telefone: "" });

  const recarregar = useCallback(() => {
    if (cotacaoId) carregar(cotacaoId);
  }, [cotacaoId, carregar]);

  useEffect(() => { recarregar(); }, [recarregar]);

  if (carregando && !cotacao) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        Carregando cotação…
      </div>
    );
  }

  if (erro && !cotacao) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="mb-4 h-10 w-10 text-red-400" />
        <p className="text-lg font-medium">Erro ao carregar cotação</p>
        <p className="text-sm text-muted-foreground">{erro}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/cotacoes")}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
        </Button>
      </div>
    );
  }

  if (!cotacao) return null;

  const StatusIcon = STATUS_ICONS[cotacao.status];
  const encerrada = new Date(cotacao.data_encerramento) < new Date();
  const isRascunho = cotacao.status === "rascunho";
  const isEnviada = cotacao.status === "enviada" || cotacao.status === "em_resposta";
  const fornecedores = cotacao.fornecedores ?? [];
  const itens = cotacao.itens ?? [];

  // Agrupar respostas por fornecedor
  const respostasPorFornecedor = new Map<string, RespostaCotacao[]>();
  for (const r of respostas) {
    const key = r.cotacao_fornecedor_id;
    if (!respostasPorFornecedor.has(key)) respostasPorFornecedor.set(key, []);
    respostasPorFornecedor.get(key)!.push(r);
  }

  const copiarLink = async (token: string) => {
    const link = gerarLinkPortal(token);
    await navigator.clipboard.writeText(link);
    setCopiado(token);
    setTimeout(() => setCopiado(null), 2000);
  };

  const handleEnviar = async () => {
    if (!confirm("Enviar cotação para todos os fornecedores?")) return;
    await enviar(cotacao.id);
    recarregar();
  };

  const handleEncerrar = async () => {
    if (!confirm("Encerrar esta cotação?")) return;
    await alterarStatus(cotacao.id, "encerrada");
    recarregar();
  };

  const handleCancelar = async () => {
    if (!confirm("Cancelar esta cotação?")) return;
    await alterarStatus(cotacao.id, "cancelada");
    recarregar();
  };

  const handleExcluir = async () => {
    if (!confirm("Excluir esta cotação?")) return;
    await excluir(cotacao.id);
    navigate("/cotacoes");
  };

  const handleTransferir = async (respostaId: string) => {
    if (!servidor) return;
    if (!confirm("Transferir este preço para a cesta?")) return;
    await transferirResposta(respostaId, servidor.id);
    recarregar();
  };

  const handleLancarManual = async () => {
    if (!servidor || !lancForm.item_cesta_id || !lancForm.razao_social || !lancForm.valor_unitario) return;
    await lancarManual(cotacao.id, {
      item_cesta_id: lancForm.item_cesta_id,
      razao_social: lancForm.razao_social,
      cpf_cnpj: lancForm.cpf_cnpj || undefined,
      email: lancForm.email || undefined,
      telefone: lancForm.telefone || undefined,
      marca: lancForm.marca || undefined,
      valor_unitario: parseFloat(lancForm.valor_unitario),
      observacoes: lancForm.observacoes || undefined,
      registro_anvisa: lancForm.registro_anvisa || undefined,
      meio_recebimento: lancForm.meio_recebimento,
      lancado_por: servidor.id,
    });
    setLancForm({
      item_cesta_id: "",
      razao_social: "",
      cpf_cnpj: "",
      email: "",
      telefone: "",
      marca: "",
      valor_unitario: "",
      observacoes: "",
      registro_anvisa: "",
      meio_recebimento: "manual",
    });
    setShowLancamento(false);
    recarregar();
  };

  const handleTransferirLancamento = async (lancamentoId: string) => {
    if (!servidor) return;
    if (!confirm("Transferir este lançamento para a cesta?")) return;
    await transferirLancamento(lancamentoId, servidor.id);
    recarregar();
  };

  const handleAddFornecedor = async () => {
    if (!novoForn.razao_social || !novoForn.email) return;
    try {
      await adicionarFornecedorCotacao(cotacao.id, {
        razao_social: novoForn.razao_social,
        cpf_cnpj: novoForn.cpf_cnpj || undefined,
        email: novoForn.email,
        telefone: novoForn.telefone || undefined,
      }, cotacao.data_encerramento);
      setNovoForn({ razao_social: "", cpf_cnpj: "", email: "", telefone: "" });
      setShowAddForn(false);
      toast.success("Fornecedor adicionado com sucesso");
      recarregar();
    } catch {
      toast.error("Erro ao adicionar fornecedor");
    }
  };

  const handleRemoverFornecedor = async (fornId: string) => {
    const ok = await confirmar({
      title: "Remover fornecedor",
      description: "Tem certeza que deseja remover este fornecedor da cotação?",
      confirmLabel: "Remover",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await removerFornecedorCotacao(fornId);
      toast.success("Fornecedor removido");
      recarregar();
    } catch {
      toast.error("Erro ao remover fornecedor");
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/cotacoes")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">{cotacao.titulo}</h2>
              <Badge className={STATUS_COTACAO_CORES[cotacao.status]}>
                <StatusIcon className="mr-1 h-3 w-3" />
                {STATUS_COTACAO_LABELS[cotacao.status]}
              </Badge>
              {encerrada && isEnviada && (
                <Badge variant="destructive">Prazo vencido</Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Cotação #{cotacao.numero} — {fmtData(cotacao.data_abertura)} → {fmtData(cotacao.data_encerramento)}
              {cotacao.descricao && ` — ${cotacao.descricao}`}
            </p>
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-2">
          {isRascunho && (
            <>
              <Button size="sm" onClick={handleEnviar}>
                <SendHorizonal className="mr-1 h-4 w-4" /> Enviar
              </Button>
              <Button size="sm" variant="destructive" onClick={handleExcluir}>
                <Trash2 className="mr-1 h-4 w-4" /> Excluir
              </Button>
            </>
          )}
          {isEnviada && (
            <Button size="sm" variant="outline" onClick={handleEncerrar}>
              <CheckCircle2 className="mr-1 h-4 w-4" /> Encerrar
            </Button>
          )}
          {(isRascunho || isEnviada) && (
            <Button size="sm" variant="ghost" onClick={handleCancelar}>
              <XCircle className="mr-1 h-4 w-4" /> Cancelar
            </Button>
          )}
        </div>
      </div>

      {/* ── Abas ──────────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b">
        {(["resumo", "fornecedores", "respostas", "lancamentos"] as Aba[]).map((a) => (
          <button
            key={a}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              aba === a ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setAba(a)}
          >
            {a === "resumo" ? "Resumo" : a === "fornecedores" ? `Fornecedores (${fornecedores.length})` : a === "respostas" ? `Respostas (${respostas.length})` : `Lançamentos (${lancamentos.length})`}
          </button>
        ))}
      </div>

      {/* ── ABA: Resumo ───────────────────────────────────────────────── */}
      {aba === "resumo" && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Itens da cotação */}
          <Card>
            <CardContent className="p-4">
              <h3 className="mb-3 flex items-center gap-2 font-semibold">
                <Package className="h-4 w-4" />
                Itens ({itens.length})
              </h3>
              {itens.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum item na cotação</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {itens.map((it, idx) => {
                    const prod = it.item_cesta?.produto;
                    return (
                      <div key={it.id} className="flex items-center gap-2 rounded border p-2 text-sm">
                        <span className="text-xs font-medium text-muted-foreground w-6">{idx + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium">{prod?.descricao ?? "Item"}</p>
                          <p className="text-xs text-muted-foreground">
                            Qtd: {it.quantidade} {it.unidade ?? prod?.unidade_medida?.sigla ?? ""}
                          </p>
                        </div>
                        {it.exige_anvisa && (
                          <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700">ANVISA</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Métricas */}
          <div className="space-y-4">
            <Card>
              <CardContent className="grid grid-cols-2 gap-4 p-4">
                <div>
                  <p className="text-xs text-muted-foreground">Fornecedores</p>
                  <p className="text-2xl font-bold">{fornecedores.length}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Responderam</p>
                  <p className="text-2xl font-bold">
                    {respostasPorFornecedor.size}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Respostas</p>
                  <p className="text-2xl font-bold">{respostas.length}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Lanç. Manuais</p>
                  <p className="text-2xl font-bold">{lancamentos.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cesta vinculada</span>
                  <span className="font-medium truncate max-w-[200px]">
                    {(cotacao as any).cesta?.descricao_objeto ?? "—"}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Criado por</span>
                  <span className="font-medium">
                    {(cotacao as any).criado_por_servidor?.nome ?? "—"}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Criado em</span>
                  <span>{fmtDataHora(cotacao.criado_em)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── ABA: Fornecedores ─────────────────────────────────────────── */}
      {aba === "fornecedores" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Fornecedores convidados para esta cotação
            </p>
            {isRascunho && (
              <Button size="sm" variant="outline" onClick={() => setShowAddForn(true)}>
                <Plus className="mr-1 h-4 w-4" /> Adicionar Fornecedor
              </Button>
            )}
          </div>

          {/* Formulário novo fornecedor */}
          {showAddForn && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <h4 className="text-sm font-medium">Novo Fornecedor</h4>
                <div className="grid gap-3 grid-cols-2">
                  <Input placeholder="Razão Social *" value={novoForn.razao_social} onChange={e => setNovoForn(p => ({ ...p, razao_social: e.target.value }))} />
                  <Input placeholder="E-mail *" type="email" value={novoForn.email} onChange={e => setNovoForn(p => ({ ...p, email: e.target.value }))} />
                  <Input placeholder="CPF/CNPJ" value={novoForn.cpf_cnpj} onChange={e => setNovoForn(p => ({ ...p, cpf_cnpj: e.target.value }))} />
                  <Input placeholder="Telefone" value={novoForn.telefone} onChange={e => setNovoForn(p => ({ ...p, telefone: e.target.value }))} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setShowAddForn(false)}>Cancelar</Button>
                  <Button size="sm" onClick={handleAddFornecedor} disabled={!novoForn.razao_social || !novoForn.email}>
                    <Plus className="mr-1 h-4 w-4" /> Adicionar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {fornecedores.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-8 text-center">
                <Users className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Nenhum fornecedor convidado</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {fornecedores.map((f) => {
                const resps = respostasPorFornecedor.get(f.id) ?? [];
                const temRespostas = resps.length > 0;
                return (
                  <Card key={f.id}>
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className={`rounded-full p-2 ${temRespostas ? "bg-green-100" : f.acessou_portal ? "bg-amber-100" : f.email_enviado ? "bg-blue-100" : "bg-gray-100"}`}>
                        {temRespostas ? <CheckCircle2 className="h-4 w-4 text-green-700" /> :
                         f.acessou_portal ? <ExternalLink className="h-4 w-4 text-amber-700" /> :
                         f.email_enviado ? <Mail className="h-4 w-4 text-blue-700" /> :
                         <Clock className="h-4 w-4 text-gray-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{f.razao_social}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                          <span>{f.email}</span>
                          {f.cpf_cnpj && <span>{f.cpf_cnpj}</span>}
                        </div>
                        <div className="flex gap-2 mt-1">
                          {f.email_enviado && (
                            <Badge variant="outline" className="text-[10px] bg-blue-50">
                              E-mail enviado {f.email_enviado_em ? fmtDataHora(f.email_enviado_em) : ""}
                            </Badge>
                          )}
                          {f.acessou_portal && (
                            <Badge variant="outline" className="text-[10px] bg-amber-50">
                              Acessou portal {f.acessou_em ? fmtDataHora(f.acessou_em) : ""}
                            </Badge>
                          )}
                          {temRespostas && (
                            <Badge variant="outline" className="text-[10px] bg-green-50">
                              {resps.length} resposta(s)
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copiarLink(f.token_acesso)}
                          title="Copiar link do portal"
                        >
                          {copiado === f.token_acesso ? <Check className="h-4 w-4 text-green-600" /> : <Link2 className="h-4 w-4" />}
                        </Button>
                        {isRascunho && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleRemoverFornecedor(f.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ABA: Respostas ────────────────────────────────────────────── */}
      {aba === "respostas" && (
        <div className="space-y-4">
          {respostas.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-8 text-center">
                <MailCheck className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma resposta recebida ainda
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Tabela de respostas */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="p-2">Fornecedor</th>
                      <th className="p-2">Item</th>
                      <th className="p-2">Marca</th>
                      <th className="p-2 text-right">Valor Unit.</th>
                      <th className="p-2">ANVISA</th>
                      <th className="p-2">Data</th>
                      <th className="p-2">Status</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {respostas.map((r) => {
                      const forn = fornecedores.find(f => f.id === r.cotacao_fornecedor_id);
                      const item = itens.find(i => i.id === r.cotacao_item_id);
                      const prod = item?.item_cesta?.produto;
                      return (
                        <tr key={r.id} className="border-b hover:bg-muted/50">
                          <td className="p-2 font-medium max-w-[150px] truncate">
                            {(r as any).cotacao_fornecedor?.razao_social ?? forn?.razao_social ?? "—"}
                          </td>
                          <td className="p-2 max-w-[200px] truncate">
                            {prod?.descricao ?? (r as any).cotacao_item?.item_cesta?.produto?.descricao ?? "—"}
                          </td>
                          <td className="p-2">{r.marca ?? "—"}</td>
                          <td className="p-2 text-right font-mono">{fmtMoeda(r.valor_unitario)}</td>
                          <td className="p-2">
                            {r.registro_anvisa ? (
                              <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700">
                                {r.registro_anvisa}
                              </Badge>
                            ) : "—"}
                          </td>
                          <td className="p-2 text-xs">{fmtDataHora(r.respondido_em)}</td>
                          <td className="p-2">
                            {r.transferido_cesta ? (
                              <Badge className="bg-green-100 text-green-700 text-[10px]">
                                <Check className="mr-0.5 h-3 w-3" /> Transferido
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px]">Pendente</Badge>
                            )}
                          </td>
                          <td className="p-2">
                            {!r.transferido_cesta && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleTransferir(r.id)}
                              >
                                <ArrowUpRight className="mr-1 h-3 w-3" /> Transferir
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── ABA: Lançamentos Manuais ──────────────────────────────────── */}
      {aba === "lancamentos" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Cotações recebidas fora do sistema (e-mail, WhatsApp, telefone, presencial)
            </p>
            <Button size="sm" onClick={() => setShowLancamento(true)}>
              <Plus className="mr-1 h-4 w-4" /> Lançamento Manual
            </Button>
          </div>

          {/* Form lançamento manual */}
          {showLancamento && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <h4 className="text-sm font-medium">Novo Lançamento Manual</h4>
                <div className="grid gap-3 grid-cols-2">
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-medium">Item da Cesta *</label>
                    <select
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={lancForm.item_cesta_id}
                      onChange={e => setLancForm(p => ({ ...p, item_cesta_id: e.target.value }))}
                    >
                      <option value="">Selecione o item…</option>
                      {itens.map(it => {
                        const prod = it.item_cesta?.produto;
                        return (
                          <option key={it.id} value={it.item_cesta_id}>
                            {prod?.descricao ?? "Item"}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <Input
                    placeholder="Razão Social do Fornecedor *"
                    value={lancForm.razao_social}
                    onChange={e => setLancForm(p => ({ ...p, razao_social: e.target.value }))}
                  />
                  <Input
                    placeholder="CPF/CNPJ"
                    value={lancForm.cpf_cnpj}
                    onChange={e => setLancForm(p => ({ ...p, cpf_cnpj: e.target.value }))}
                  />
                  <Input
                    placeholder="Valor Unitário *"
                    type="number"
                    step="0.01"
                    value={lancForm.valor_unitario}
                    onChange={e => setLancForm(p => ({ ...p, valor_unitario: e.target.value }))}
                  />
                  <Input
                    placeholder="Marca"
                    value={lancForm.marca}
                    onChange={e => setLancForm(p => ({ ...p, marca: e.target.value }))}
                  />
                  <Input
                    placeholder="Registro ANVISA"
                    value={lancForm.registro_anvisa}
                    onChange={e => setLancForm(p => ({ ...p, registro_anvisa: e.target.value }))}
                  />
                  <div>
                    <label className="mb-1 block text-xs font-medium">Meio de recebimento</label>
                    <select
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={lancForm.meio_recebimento}
                      onChange={e => setLancForm(p => ({ ...p, meio_recebimento: e.target.value as MeioRecebimento }))}
                    >
                      {(Object.entries(MEIO_LABELS) as [MeioRecebimento, string][]).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <Input
                      placeholder="Observações"
                      value={lancForm.observacoes}
                      onChange={e => setLancForm(p => ({ ...p, observacoes: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setShowLancamento(false)}>Cancelar</Button>
                  <Button
                    size="sm"
                    onClick={handleLancarManual}
                    disabled={!lancForm.item_cesta_id || !lancForm.razao_social || !lancForm.valor_unitario}
                  >
                    <Plus className="mr-1 h-4 w-4" /> Lançar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {lancamentos.length === 0 && !showLancamento ? (
            <Card>
              <CardContent className="flex flex-col items-center py-8 text-center">
                <Pencil className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Nenhum lançamento manual. Use este recurso para registrar cotações recebidas por e-mail, WhatsApp ou telefone.
                </p>
              </CardContent>
            </Card>
          ) : lancamentos.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="p-2">Fornecedor</th>
                    <th className="p-2">Meio</th>
                    <th className="p-2">Marca</th>
                    <th className="p-2 text-right">Valor Unit.</th>
                    <th className="p-2">ANVISA</th>
                    <th className="p-2">Data</th>
                    <th className="p-2">Status</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {lancamentos.map((l) => {
                    const MeioIcon = MEIO_ICONS[l.meio_recebimento] ?? Pencil;
                    return (
                      <tr key={l.id} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{l.razao_social}</td>
                        <td className="p-2">
                          <div className="flex items-center gap-1">
                            <MeioIcon className="h-3 w-3" />
                            <span className="text-xs">{MEIO_LABELS[l.meio_recebimento]}</span>
                          </div>
                        </td>
                        <td className="p-2">{l.marca ?? "—"}</td>
                        <td className="p-2 text-right font-mono">{fmtMoeda(l.valor_unitario)}</td>
                        <td className="p-2">
                          {l.registro_anvisa ? (
                            <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700">{l.registro_anvisa}</Badge>
                          ) : "—"}
                        </td>
                        <td className="p-2 text-xs">{fmtDataHora(l.lancado_em)}</td>
                        <td className="p-2">
                          {l.transferido_cesta ? (
                            <Badge className="bg-green-100 text-green-700 text-[10px]">
                              <Check className="mr-0.5 h-3 w-3" /> Transferido
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">Pendente</Badge>
                          )}
                        </td>
                        <td className="p-2">
                          {!l.transferido_cesta && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTransferirLancamento(l.id)}
                            >
                              <ArrowUpRight className="mr-1 h-3 w-3" /> Transferir
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
