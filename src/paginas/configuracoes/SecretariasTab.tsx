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
  Building2,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  RotateCcw,
  Search,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SemPermissao } from "@/componentes/auth/SemPermissao";
import type { Secretaria } from "@/tipos";
import {
  listarSecretarias,
  criarSecretaria,
  atualizarSecretaria,
  desativarSecretaria,
  reativarSecretaria,
} from "@/servicos/secretarias";

export function SecretariasTab() {
  const { servidor, temPermissao } = useAuth();
  const [secretarias, setSecretarias] = useState<Secretaria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  // Form state
  const [formAberto, setFormAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [formNome, setFormNome] = useState("");
  const [formSigla, setFormSigla] = useState("");
  const [salvando, setSalvando] = useState(false);

  const municipioId = servidor?.secretaria
    ? (servidor.secretaria as unknown as { municipio_id: string }).municipio_id
    : null;

  const carregar = useCallback(async () => {
    if (!municipioId) return;
    setCarregando(true);
    setErro(null);
    try {
      const dados = await listarSecretarias(municipioId);
      setSecretarias(dados);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar secretarias.");
    } finally {
      setCarregando(false);
    }
  }, [municipioId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (!temPermissao("administrador")) {
    return <SemPermissao mensagem="Apenas administradores podem gerenciar secretarias." />;
  }

  const abrirFormCriacao = () => {
    setEditandoId(null);
    setFormNome("");
    setFormSigla("");
    setFormAberto(true);
  };

  const abrirFormEdicao = (sec: Secretaria) => {
    setEditandoId(sec.id);
    setFormNome(sec.nome);
    setFormSigla(sec.sigla || "");
    setFormAberto(true);
  };

  const fecharForm = () => {
    setFormAberto(false);
    setEditandoId(null);
    setFormNome("");
    setFormSigla("");
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) return;
    if (!municipioId) return;

    setSalvando(true);
    setErro(null);
    try {
      if (editandoId) {
        await atualizarSecretaria(editandoId, { nome: formNome, sigla: formSigla });
      } else {
        await criarSecretaria({ nome: formNome, sigla: formSigla, municipio_id: municipioId });
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
    if (!window.confirm("Tem certeza que deseja desativar esta secretaria?")) return;
    try {
      await desativarSecretaria(id);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao desativar.");
    }
  };

  const handleReativar = async (id: string) => {
    try {
      await reativarSecretaria(id);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao reativar.");
    }
  };

  const secretariasFiltradas = secretarias.filter(
    (s) =>
      s.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (s.sigla && s.sigla.toLowerCase().includes(busca.toLowerCase())),
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar secretaria..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={abrirFormCriacao}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Secretaria
        </Button>
      </div>

      {/* Erro */}
      {erro && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      {/* Formulário inline */}
      {formAberto && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {editandoId ? "Editar Secretaria" : "Nova Secretaria"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSalvar} className="flex items-end gap-3">
              <div className="flex-1 space-y-1.5">
                <label className="text-sm font-medium">Nome</label>
                <Input
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Ex: Secretaria Municipal de Saúde"
                  required
                  autoFocus
                />
              </div>
              <div className="w-32 space-y-1.5">
                <label className="text-sm font-medium">Sigla</label>
                <Input
                  value={formSigla}
                  onChange={(e) => setFormSigla(e.target.value)}
                  placeholder="Ex: SMS"
                  maxLength={20}
                />
              </div>
              <Button type="submit" disabled={salvando}>
                {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
              </Button>
              <Button type="button" variant="outline" onClick={fecharForm}>
                Cancelar
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" />
            Unidades Gestoras
          </CardTitle>
          <CardDescription>
            {secretariasFiltradas.length} secretaria(s) cadastrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {carregando ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : secretariasFiltradas.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {busca
                ? "Nenhuma secretaria encontrada para esta busca."
                : "Nenhuma secretaria cadastrada."}
            </p>
          ) : (
            <div className="divide-y">
              {secretariasFiltradas.map((sec) => (
                <div
                  key={sec.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold ${
                        sec.ativo
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {sec.sigla || sec.nome.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p
                        className={`text-sm font-medium ${!sec.ativo ? "text-muted-foreground line-through" : ""}`}
                      >
                        {sec.nome}
                      </p>
                      {sec.sigla && (
                        <p className="text-xs text-muted-foreground">{sec.sigla}</p>
                      )}
                    </div>
                    {!sec.ativo && (
                      <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                        Desativada
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {sec.ativo ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => abrirFormEdicao(sec)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDesativar(sec.id)}
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
                        onClick={() => handleReativar(sec.id)}
                        title="Reativar"
                      >
                        <RotateCcw className="mr-1 h-3 w-3" />
                        Reativar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
