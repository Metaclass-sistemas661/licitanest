import { useState, useCallback, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Users, Plus, Search, Pencil, Trash2, Eye, Loader2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { PageTransition } from "@/componentes/ui/page-transition";
import { EmptyState } from "@/componentes/ui/empty-state";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { validarCNPJ } from "@/lib/validacao";

// ── Constantes ──
const UFS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
] as const;

interface FornecedorAPI {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj_cpf: string;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  ativo: boolean;
  criado_em: string;
}

interface FornecedorForm {
  razao_social: string;
  nome_fantasia: string;
  cnpj_cpf: string;
  email: string;
  telefone: string;
  endereco: string;
  cidade: string;
  uf: string;
  cep: string;
}

const FORM_VAZIO: FornecedorForm = {
  razao_social: "", nome_fantasia: "", cnpj_cpf: "", email: "",
  telefone: "", endereco: "", cidade: "", uf: "", cep: "",
};

// ── Debounce hook ──
function useDebouncedValue(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    timerRef.current = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timerRef.current);
  }, [value, delay]);

  return debounced;
}

// ── Formatação de CNPJ ──
function formatarCNPJ(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function FornecedoresPage() {
  const { servidor } = useAuth();
  const queryClient = useQueryClient();

  // ── State ──
  const [busca, setBusca] = useState("");
  const [ufFiltro, setUfFiltro] = useState("");
  const [pagina, setPagina] = useState(1);
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [visualizarId, setVisualizarId] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [form, setForm] = useState<FornecedorForm>(FORM_VAZIO);
  const [errosForm, setErrosForm] = useState<Partial<Record<keyof FornecedorForm, string>>>({});

  const buscaDebounced = useDebouncedValue(busca, 300);

  // ── Query ──
  const { data, isLoading, isError } = useQuery({
    queryKey: ["fornecedores", buscaDebounced, ufFiltro, pagina],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (buscaDebounced) params.set("busca", buscaDebounced);
      if (ufFiltro) params.set("uf", ufFiltro);
      params.set("pagina", String(pagina));
      params.set("por_pagina", "15");
      const res = await api.get<{
        data: FornecedorAPI[];
        paginacao: { total: number; pagina: number; por_pagina: number; total_paginas: number };
      }>(`/api/fornecedores?${params}`);
      return res;
    },
    enabled: !!servidor,
  });

  const fornecedores = data?.data ?? [];
  const paginacao = data?.paginacao;

  // ── Mutations ──
  const criarMut = useMutation({
    mutationFn: (body: FornecedorForm) =>
      api.post("/api/fornecedores", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
      toast.success("Fornecedor cadastrado com sucesso!");
      fecharDrawer();
    },
    onError: () => toast.error("Erro ao cadastrar fornecedor"),
  });

  const editarMut = useMutation({
    mutationFn: ({ id, ...body }: FornecedorForm & { id: string }) =>
      api.put(`/api/fornecedores/${encodeURIComponent(id)}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
      toast.success("Fornecedor atualizado!");
      fecharDrawer();
    },
    onError: () => toast.error("Erro ao atualizar fornecedor"),
  });

  const excluirMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/fornecedores/${encodeURIComponent(id)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
      toast.success("Fornecedor excluído.");
      setExcluindoId(null);
    },
    onError: () => toast.error("Erro ao excluir fornecedor"),
  });

  // ── Handlers ──
  const fecharDrawer = useCallback(() => {
    setDrawerAberto(false);
    setEditandoId(null);
    setVisualizarId(null);
    setForm(FORM_VAZIO);
    setErrosForm({});
  }, []);

  const abrirCriar = () => {
    setForm(FORM_VAZIO);
    setEditandoId(null);
    setVisualizarId(null);
    setErrosForm({});
    setDrawerAberto(true);
  };

  const abrirEditar = (f: FornecedorAPI) => {
    setForm({
      razao_social: f.razao_social, nome_fantasia: f.nome_fantasia ?? "",
      cnpj_cpf: f.cnpj_cpf, email: f.email ?? "", telefone: f.telefone ?? "",
      endereco: f.endereco ?? "", cidade: f.cidade ?? "", uf: f.uf ?? "", cep: f.cep ?? "",
    });
    setEditandoId(f.id);
    setVisualizarId(null);
    setErrosForm({});
    setDrawerAberto(true);
  };

  const abrirVisualizar = (f: FornecedorAPI) => {
    setForm({
      razao_social: f.razao_social, nome_fantasia: f.nome_fantasia ?? "",
      cnpj_cpf: f.cnpj_cpf, email: f.email ?? "", telefone: f.telefone ?? "",
      endereco: f.endereco ?? "", cidade: f.cidade ?? "", uf: f.uf ?? "", cep: f.cep ?? "",
    });
    setVisualizarId(f.id);
    setEditandoId(null);
    setDrawerAberto(true);
  };

  const validarFormulario = (): boolean => {
    const erros: Partial<Record<keyof FornecedorForm, string>> = {};
    if (!form.razao_social.trim()) erros.razao_social = "Razão social é obrigatória";
    if (!form.cnpj_cpf.trim()) {
      erros.cnpj_cpf = "CNPJ é obrigatório";
    } else if (!validarCNPJ(form.cnpj_cpf)) {
      erros.cnpj_cpf = "CNPJ inválido (dígito verificador)";
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      erros.email = "Email inválido";
    }
    setErrosForm(erros);
    return Object.keys(erros).length === 0;
  };

  const salvar = () => {
    if (!validarFormulario()) return;
    if (editandoId) {
      editarMut.mutate({ ...form, id: editandoId });
    } else {
      criarMut.mutate({ ...form });
    }
  };

  const somenteVisualizando = !!visualizarId;
  const salvando = criarMut.isPending || editarMut.isPending;

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Fornecedores</h2>
            <p className="text-muted-foreground">
              Cadastro e pesquisa de fornecedores com itens homologados/contratados
            </p>
          </div>
          <Button onClick={abrirCriar}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Fornecedor
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por CNPJ, razão social, produto..."
              className="pl-10"
              value={busca}
              onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
            />
          </div>
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm"
            value={ufFiltro}
            onChange={(e) => { setUfFiltro(e.target.value); setPagina(1); }}
          >
            <option value="">Todos os Estados</option>
            {UFS.map((uf) => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
        </div>

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Base de Fornecedores
            </CardTitle>
            <CardDescription>
              {paginacao ? `${paginacao.total} fornecedor(es) encontrado(s)` : "Alimentada continuamente com dados de contratações públicas"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Carregando fornecedores...</span>
              </div>
            ) : isError ? (
              <div className="py-12 text-center text-sm text-destructive">
                Erro ao carregar fornecedores. Tente novamente.
              </div>
            ) : fornecedores.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Nenhum fornecedor encontrado"
                description={busca || ufFiltro ? "Ajuste os filtros de busca." : "Clique em 'Novo Fornecedor' para cadastrar o primeiro."}
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-3 pr-4 font-medium">Razão Social</th>
                        <th className="pb-3 pr-4 font-medium">CNPJ</th>
                        <th className="pb-3 pr-4 font-medium hidden md:table-cell">Cidade/UF</th>
                        <th className="pb-3 pr-4 font-medium hidden lg:table-cell">Email</th>
                        <th className="pb-3 font-medium text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {fornecedores.map((f) => (
                        <tr key={f.id} className="hover:bg-muted/50 transition-colors">
                          <td className="py-3 pr-4">
                            <div>
                              <p className="font-medium">{f.razao_social}</p>
                              {f.nome_fantasia && (
                                <p className="text-xs text-muted-foreground">{f.nome_fantasia}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-3 pr-4 font-mono text-xs">{formatarCNPJ(f.cnpj_cpf)}</td>
                          <td className="py-3 pr-4 hidden md:table-cell text-muted-foreground">
                            {[f.cidade, f.uf].filter(Boolean).join("/") || "—"}
                          </td>
                          <td className="py-3 pr-4 hidden lg:table-cell text-muted-foreground">{f.email ?? "—"}</td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => abrirVisualizar(f)} title="Visualizar">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => abrirEditar(f)} title="Editar">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => setExcluindoId(f.id)} title="Excluir" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Paginação */}
                {paginacao && paginacao.total_paginas > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t mt-4">
                    <p className="text-sm text-muted-foreground">
                      Página {paginacao.pagina} de {paginacao.total_paginas}
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
                        <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                      </Button>
                      <Button variant="outline" size="sm" disabled={pagina >= paginacao.total_paginas} onClick={() => setPagina((p) => p + 1)}>
                        Próxima <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Dialog de confirmação de exclusão ── */}
        {excluindoId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setExcluindoId(null)}>
            <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold">Confirmar Exclusão</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Tem certeza que deseja excluir este fornecedor? Esta ação pode ser revertida pelo administrador.
              </p>
              <div className="mt-4 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setExcluindoId(null)}>Cancelar</Button>
                <Button variant="destructive" disabled={excluirMut.isPending} onClick={() => excluirMut.mutate(excluindoId)}>
                  {excluirMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Excluir
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Drawer lateral — Criar / Editar / Visualizar ── */}
        {drawerAberto && (
          <div className="fixed inset-0 z-50 flex justify-end" onClick={fecharDrawer}>
            <div className="absolute inset-0 bg-black/50" />
            <div
              className="relative w-full max-w-lg animate-in slide-in-from-right bg-card border-l shadow-xl overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 flex items-center justify-between border-b bg-card px-6 py-4 z-10">
                <h3 className="text-lg font-semibold">
                  {somenteVisualizando ? "Detalhes do Fornecedor" : editandoId ? "Editar Fornecedor" : "Novo Fornecedor"}
                </h3>
                <Button variant="ghost" size="icon" onClick={fecharDrawer}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4 p-6">
                {/* Razão Social */}
                <div>
                  <label className="text-sm font-medium">Razão Social *</label>
                  <Input
                    value={form.razao_social}
                    onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
                    disabled={somenteVisualizando}
                    placeholder="Razão social do fornecedor"
                  />
                  {errosForm.razao_social && <p className="text-xs text-destructive mt-1">{errosForm.razao_social}</p>}
                </div>

                {/* Nome Fantasia */}
                <div>
                  <label className="text-sm font-medium">Nome Fantasia</label>
                  <Input
                    value={form.nome_fantasia}
                    onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })}
                    disabled={somenteVisualizando}
                    placeholder="Nome fantasia (opcional)"
                  />
                </div>

                {/* CNPJ */}
                <div>
                  <label className="text-sm font-medium">CNPJ *</label>
                  <Input
                    value={form.cnpj_cpf}
                    onChange={(e) => setForm({ ...form, cnpj_cpf: formatarCNPJ(e.target.value) })}
                    disabled={somenteVisualizando}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                  />
                  {errosForm.cnpj_cpf && <p className="text-xs text-destructive mt-1">{errosForm.cnpj_cpf}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    disabled={somenteVisualizando}
                    placeholder="contato@empresa.com.br"
                  />
                  {errosForm.email && <p className="text-xs text-destructive mt-1">{errosForm.email}</p>}
                </div>

                {/* Telefone */}
                <div>
                  <label className="text-sm font-medium">Telefone</label>
                  <Input
                    value={form.telefone}
                    onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                    disabled={somenteVisualizando}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                {/* Endereço */}
                <div>
                  <label className="text-sm font-medium">Endereço</label>
                  <Input
                    value={form.endereco}
                    onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                    disabled={somenteVisualizando}
                    placeholder="Rua, número, complemento"
                  />
                </div>

                {/* Cidade / UF */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Cidade</label>
                    <Input
                      value={form.cidade}
                      onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                      disabled={somenteVisualizando}
                      placeholder="Cidade"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">UF</label>
                    <select
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={form.uf}
                      onChange={(e) => setForm({ ...form, uf: e.target.value })}
                      disabled={somenteVisualizando}
                    >
                      <option value="">Selecione</option>
                      {UFS.map((uf) => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* CEP */}
                <div>
                  <label className="text-sm font-medium">CEP</label>
                  <Input
                    value={form.cep}
                    onChange={(e) => setForm({ ...form, cep: e.target.value })}
                    disabled={somenteVisualizando}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                </div>

                {/* Ações */}
                {!somenteVisualizando && (
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={fecharDrawer}>Cancelar</Button>
                    <Button onClick={salvar} disabled={salvando}>
                      {salvando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      {editandoId ? "Salvar Alterações" : "Cadastrar Fornecedor"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}

export default FornecedoresPage;
