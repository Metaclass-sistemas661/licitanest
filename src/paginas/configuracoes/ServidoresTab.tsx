import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import {
  UserCog,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  RotateCcw,
  Search,
  Shield,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SemPermissao } from "@/componentes/auth/SemPermissao";
import type { Servidor, Perfil, Secretaria } from "@/tipos";
import {
  listarServidores,
  criarServidor,
  atualizarServidor,
  desativarServidor,
  reativarServidor,
  listarPerfis,
} from "@/servicos/servidores";
import { listarSecretarias } from "@/servicos/secretarias";

const PERFIL_BADGES: Record<string, string> = {
  administrador: "bg-violet-100 text-violet-700",
  gestor: "bg-blue-100 text-blue-700",
  pesquisador: "bg-emerald-100 text-emerald-700",
};

export function ServidoresTab() {
  const { servidor: servidorLogado, temPermissao } = useAuth();
  const [servidores, setServidores] = useState<Servidor[]>([]);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [secretarias, setSecretarias] = useState<Secretaria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  // Form state
  const [formAberto, setFormAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [formNome, setFormNome] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formCpf, setFormCpf] = useState("");
  const [formMatricula, setFormMatricula] = useState("");
  const [formTelefone, setFormTelefone] = useState("");
  const [formPerfilId, setFormPerfilId] = useState("");
  const [formSecretariaId, setFormSecretariaId] = useState("");
  const [salvando, setSalvando] = useState(false);

  const municipioId = servidorLogado?.secretaria
    ? (servidorLogado.secretaria as unknown as { municipio_id: string }).municipio_id
    : null;

  const carregar = useCallback(async () => {
    if (!municipioId) return;
    setCarregando(true);
    setErro(null);
    try {
      const [srvs, prfs, secs] = await Promise.all([
        listarServidores(),
        listarPerfis(),
        listarSecretarias(municipioId),
      ]);
      setServidores(srvs);
      setPerfis(prfs as Perfil[]);
      setSecretarias(secs);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setCarregando(false);
    }
  }, [municipioId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (!temPermissao("administrador")) {
    return <SemPermissao mensagem="Apenas administradores podem gerenciar servidores." />;
  }

  const abrirFormCriacao = () => {
    setEditandoId(null);
    setFormNome("");
    setFormEmail("");
    setFormCpf("");
    setFormMatricula("");
    setFormTelefone("");
    setFormPerfilId(perfis.find((p) => p.nome === "pesquisador")?.id || "");
    setFormSecretariaId(servidorLogado?.secretaria_id || "");
    setFormAberto(true);
  };

  const abrirFormEdicao = (srv: Servidor) => {
    setEditandoId(srv.id);
    setFormNome(srv.nome);
    setFormEmail(srv.email);
    setFormCpf(srv.cpf || "");
    setFormMatricula(srv.matricula || "");
    setFormTelefone(srv.telefone || "");
    setFormPerfilId(srv.perfil_id);
    setFormSecretariaId(srv.secretaria_id);
    setFormAberto(true);
  };

  const fecharForm = () => {
    setFormAberto(false);
    setEditandoId(null);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim() || !formEmail.trim() || !formPerfilId || !formSecretariaId) return;

    setSalvando(true);
    setErro(null);
    try {
      if (editandoId) {
        await atualizarServidor(editandoId, {
          nome: formNome,
          email: formEmail,
          cpf: formCpf,
          matricula: formMatricula,
          telefone: formTelefone,
          perfil_id: formPerfilId,
          secretaria_id: formSecretariaId,
        });
      } else {
        await criarServidor({
          nome: formNome,
          email: formEmail,
          cpf: formCpf,
          matricula: formMatricula,
          telefone: formTelefone,
          perfil_id: formPerfilId,
          secretaria_id: formSecretariaId,
        });
      }
      fecharForm();
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  };

  const handleDesativar = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja desativar este servidor?")) return;
    try {
      await desativarServidor(id);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao desativar.");
    }
  };

  const handleReativar = async (id: string) => {
    try {
      await reativarServidor(id);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao reativar.");
    }
  };

  const perfilNome = (perfilId: string) =>
    perfis.find((p) => p.id === perfilId)?.nome || "—";

  const secretariaNome = (secId: string) =>
    secretarias.find((s) => s.id === secId)?.sigla ||
    secretarias.find((s) => s.id === secId)?.nome ||
    "—";

  const servidoresFiltrados = servidores.filter(
    (s) =>
      s.nome.toLowerCase().includes(busca.toLowerCase()) ||
      s.email.toLowerCase().includes(busca.toLowerCase()) ||
      (s.cpf && s.cpf.includes(busca)),
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail ou CPF..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={abrirFormCriacao}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Servidor
        </Button>
      </div>

      {/* Erro */}
      {erro && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      {/* Formulário */}
      {formAberto && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {editandoId ? "Editar Servidor" : "Novo Servidor"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSalvar} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Nome completo *</label>
                  <Input
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                    placeholder="João da Silva"
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">E-mail *</label>
                  <Input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="joao@prefeitura.mg.gov.br"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">CPF</label>
                  <Input
                    value={formCpf}
                    onChange={(e) => setFormCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Matrícula</label>
                  <Input
                    value={formMatricula}
                    onChange={(e) => setFormMatricula(e.target.value)}
                    placeholder="12345"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Telefone</label>
                  <Input
                    value={formTelefone}
                    onChange={(e) => setFormTelefone(e.target.value)}
                    placeholder="(31) 99999-9999"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Perfil de acesso *</label>
                  <select
                    value={formPerfilId}
                    onChange={(e) => setFormPerfilId(e.target.value)}
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Selecione...</option>
                    {perfis.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome.charAt(0).toUpperCase() + p.nome.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-sm font-medium">Lotação (secretaria) *</label>
                  <select
                    value={formSecretariaId}
                    onChange={(e) => setFormSecretariaId(e.target.value)}
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Selecione...</option>
                    {secretarias.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.sigla ? `${s.sigla} — ${s.nome}` : s.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={fecharForm}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={salvando}>
                  {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserCog className="h-5 w-5" />
            Servidores Cadastrados
          </CardTitle>
          <CardDescription>
            {servidoresFiltrados.length} servidor(es) — lotação por secretaria
          </CardDescription>
        </CardHeader>
        <CardContent>
          {carregando ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : servidoresFiltrados.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {busca ? "Nenhum servidor encontrado." : "Nenhum servidor cadastrado."}
            </p>
          ) : (
            <div className="divide-y">
              {servidoresFiltrados.map((srv) => {
                const pNome = srv.perfil
                  ? (srv.perfil as unknown as { nome: string }).nome
                  : perfilNome(srv.perfil_id);
                return (
                  <div
                    key={srv.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${
                          srv.ativo
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {srv.nome
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </div>
                      <div>
                        <p
                          className={`text-sm font-medium ${!srv.ativo ? "text-muted-foreground line-through" : ""}`}
                        >
                          {srv.nome}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {srv.email} · {secretariaNome(srv.secretaria_id)}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${PERFIL_BADGES[pNome] || "bg-gray-100 text-gray-700"}`}
                      >
                        <Shield className="h-3 w-3" />
                        {pNome}
                      </span>
                      {!srv.ativo && (
                        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                          Desativado
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {srv.ativo ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => abrirFormEdicao(srv)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDesativar(srv.id)}
                            title="Desativar"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReativar(srv.id)}
                        >
                          <RotateCcw className="mr-1 h-3 w-3" />
                          Reativar
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
