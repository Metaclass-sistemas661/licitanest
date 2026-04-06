import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { EmptyState } from "@/componentes/ui/empty-state";
import { SkeletonTable } from "@/componentes/ui/skeleton";
import { PageTransition } from "@/componentes/ui/page-transition";
import {
  Bell, BellOff, BellRing, Plus, Trash2, Check, TrendingUp, TrendingDown,
  AlertTriangle, Settings2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  listarConfiguracoes, criarConfiguracao, excluirConfiguracao,
  listarAlertas, resolverAlerta, silenciarAlerta,
} from "@/servicos/alertasPreco";
import { api } from "@/lib/api";
import { useConfirm } from "@/componentes/ui/confirm-dialog";
import type { ConfigAlerta, AlertaPreco, TipoAlerta } from "@/tipos";
import { toast } from "sonner";

interface ProdutoSimples {
  id: string;
  descricao: string;
  unidade: string;
  codigo_catmat?: string;
}

export function AlertasPrecoPage() {
  const { servidor } = useAuth();
  const confirm = useConfirm();
  const [tab, setTab] = useState<"alertas" | "config">("alertas");
  const [configs, setConfigs] = useState<ConfigAlerta[]>([]);
  const [alertas, setAlertas] = useState<AlertaPreco[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Form novo alerta
  const [showForm, setShowForm] = useState(false);
  const [buscaProduto, setBuscaProduto] = useState("");
  const [produtosSugestao, setProdutosSugestao] = useState<ProdutoSimples[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoSimples | null>(null);
  const [percentual, setPercentual] = useState("15");
  const [tipo, setTipo] = useState<TipoAlerta>("variacao_preco");
  const [notificarEmail, setNotificarEmail] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    if (!servidor) return;
    setCarregando(true);
    try {
      const [c, a] = await Promise.all([
        listarConfiguracoes(servidor.id),
        listarAlertas(servidor.id),
      ]);
      setConfigs(c);
      setAlertas(a);
    } catch {
      toast.error("Erro ao carregar alertas.");
    } finally {
      setCarregando(false);
    }
  }, [servidor]);

  useEffect(() => { carregar(); }, [carregar]);

  /* Buscar produto para o formulário */
  const buscarProdutos = async () => {
    if (buscaProduto.trim().length < 2) return;
    const data = await api.get<ProdutoSimples[]>(
      `/api/produtos-catalogo?descricao=${encodeURIComponent(buscaProduto.trim())}&limit=8`
    );
    setProdutosSugestao(data ?? []);
  };

  /* Criar nova configuração */
  const handleCriar = async () => {
    if (!servidor || !produtoSelecionado) return;
    const pct = Number(percentual);
    if (isNaN(pct) || pct <= 0 || pct > 100) {
      toast.error("Percentual inválido (1 a 100).");
      return;
    }
    setSalvando(true);
    try {
      await criarConfiguracao({
        servidor_id: servidor.id,
        produto_id: produtoSelecionado.id,
        cesta_id: null,
        tipo,
        percentual_gatilho: pct,
        notificar_email: notificarEmail,
        ativo: true,
      });
      toast.success("Alerta configurado com sucesso!");
      setShowForm(false);
      setProdutoSelecionado(null);
      setBuscaProduto("");
      setPercentual("15");
      carregar();
    } catch {
      toast.error("Erro ao criar configuração.");
    } finally {
      setSalvando(false);
    }
  };

  /* Excluir config */
  const handleExcluir = async (id: string) => {
    const ok = await confirm({
      title: "Excluir configuração?",
      description: "Esta ação não pode ser desfeita.",
      confirmLabel: "Excluir",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await excluirConfiguracao(id);
      toast.success("Configuração excluída.");
      carregar();
    } catch {
      toast.error("Erro ao excluir.");
    }
  };

  /* Ações em alertas */
  const handleResolver = async (id: string) => {
    await resolverAlerta(id);
    toast.success("Alerta resolvido.");
    carregar();
  };
  const handleSilenciar = async (id: string) => {
    await silenciarAlerta(id);
    toast.info("Alerta silenciado.");
    carregar();
  };

  const alertasAtivos = alertas.filter((a) => a.status === "ativo");

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BellRing className="h-6 w-6 text-primary" />
              Alertas de Variação de Preço
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure alertas para ser notificado quando preços variam acima de um percentual.
            </p>
          </div>
          {alertasAtivos.length > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-3 py-1 text-sm font-medium dark:bg-red-900/30 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" />
              {alertasAtivos.length} ativo{alertasAtivos.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b">
          <button
            onClick={() => setTab("alertas")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "alertas" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <Bell className="h-4 w-4 inline mr-1" />
            Alertas ({alertas.length})
          </button>
          <button
            onClick={() => setTab("config")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "config" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <Settings2 className="h-4 w-4 inline mr-1" />
            Configurações ({configs.length})
          </button>
        </div>

        {carregando && <SkeletonTable rows={5} cols={5} />}

        {/* ── Tab Alertas ── */}
        {!carregando && tab === "alertas" && (
          <>
            {alertas.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="Nenhum alerta disparado"
                description="Quando um preço variar acima do percentual configurado, o alerta aparecerá aqui."
              />
            ) : (
              <div className="space-y-3">
                {alertas.map((a) => (
                  <Card key={a.id} className={a.status === "ativo" ? "border-red-300 dark:border-red-800" : "opacity-70"}>
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${a.variacao_percentual > 0 ? "bg-red-100 text-red-600 dark:bg-red-900/30" : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30"}`}>
                          {a.variacao_percentual > 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{a.produto?.descricao ?? "Produto"}</p>
                          <p className="text-xs text-muted-foreground">
                            R$ {a.valor_anterior.toFixed(2)} → R$ {a.valor_atual.toFixed(2)}
                            {" · "}
                            <span className={a.variacao_percentual > 0 ? "text-red-500 font-medium" : "text-emerald-500 font-medium"}>
                              {a.variacao_percentual > 0 ? "+" : ""}{a.variacao_percentual.toFixed(1)}%
                            </span>
                            {" · "}
                            Fonte: {a.fonte_nome}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Status: <span className="capitalize">{a.status}</span>
                            {" · "}
                            {new Date(a.criado_em).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>

                      {a.status === "ativo" && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleSilenciar(a.id)}>
                            <BellOff className="h-4 w-4 mr-1" /> Silenciar
                          </Button>
                          <Button size="sm" onClick={() => handleResolver(a.id)}>
                            <Check className="h-4 w-4 mr-1" /> Resolver
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Tab Configurações ── */}
        {!carregando && tab === "config" && (
          <>
            <div className="flex justify-end">
              <Button onClick={() => setShowForm((v) => !v)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Alerta
              </Button>
            </div>

            {showForm && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Nova Configuração de Alerta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Busca produto */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">Produto</label>
                    {produtoSelecionado ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{produtoSelecionado.descricao}</span>
                        <Button size="sm" variant="ghost" onClick={() => setProdutoSelecionado(null)}>✕</Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Buscar produto..."
                          value={buscaProduto}
                          onChange={(e) => setBuscaProduto(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && buscarProdutos()}
                        />
                        <Button variant="outline" onClick={buscarProdutos}>Buscar</Button>
                      </div>
                    )}
                    {produtosSugestao.length > 0 && !produtoSelecionado && (
                      <div className="mt-2 border rounded divide-y max-h-36 overflow-y-auto">
                        {produtosSugestao.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => { setProdutoSelecionado(p); setProdutosSugestao([]); }}
                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent"
                          >
                            {p.descricao} ({p.unidade})
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Tipo</label>
                      <select
                        value={tipo}
                        onChange={(e) => setTipo(e.target.value as TipoAlerta)}
                        className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                      >
                        <option value="variacao_preco">Variação de Preço</option>
                        <option value="novo_preco">Novo Preço Registrado</option>
                        <option value="preco_expirado">Preço Expirado</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Percentual Gatilho (%)</label>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={percentual}
                        onChange={(e) => setPercentual(e.target.value)}
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={notificarEmail}
                          onChange={(e) => setNotificarEmail(e.target.checked)}
                          className="rounded"
                        />
                        Notificar por e-mail
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                    <Button onClick={handleCriar} disabled={salvando || !produtoSelecionado}>
                      {salvando ? "Salvando..." : "Salvar Alerta"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {configs.length === 0 && !showForm ? (
              <EmptyState
                icon={Settings2}
                title="Nenhuma configuração"
                description="Crie uma configuração de alerta para monitorar variações de preço automaticamente."
                actionLabel="Novo Alerta"
                onAction={() => setShowForm(true)}
              />
            ) : (
              <div className="space-y-2">
                {configs.map((c) => (
                  <Card key={c.id}>
                    <CardContent className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium text-sm">{c.produto?.descricao ?? (c.cesta as any)?.nome ?? "Geral"}</p>
                        <p className="text-xs text-muted-foreground">
                          Tipo: <span className="capitalize">{c.tipo.replace("_", " ")}</span>
                          {" · "}Gatilho: ≥ {c.percentual_gatilho}%
                          {" · "}E-mail: {c.notificar_email ? "Sim" : "Não"}
                          {" · "}{c.ativo ? "✅ Ativo" : "⏸ Pausado"}
                        </p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => handleExcluir(c.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </PageTransition>
  );
}
