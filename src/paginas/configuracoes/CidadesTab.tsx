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
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  Search,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SemPermissao } from "@/componentes/auth/SemPermissao";
import type { CidadeRegiao } from "@/tipos";
import {
  listarCidadesRegiao,
  criarCidadeRegiao,
  atualizarCidadeRegiao,
  desativarCidadeRegiao,
} from "@/servicos/cidades";

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export function CidadesTab() {
  const { servidor, temPermissao } = useAuth();
  const [cidades, setCidades] = useState<CidadeRegiao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  // Form
  const [formAberto, setFormAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [formNome, setFormNome] = useState("");
  const [formUf, setFormUf] = useState("MG");
  const [formCodigoIbge, setFormCodigoIbge] = useState("");
  const [formDistancia, setFormDistancia] = useState("");
  const [salvando, setSalvando] = useState(false);

  const municipioId = servidor?.secretaria
    ? (servidor.secretaria as unknown as { municipio_id: string }).municipio_id
    : null;

  const carregar = useCallback(async () => {
    if (!municipioId) return;
    setCarregando(true);
    setErro(null);
    try {
      const dados = await listarCidadesRegiao(municipioId);
      setCidades(dados);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setCarregando(false);
    }
  }, [municipioId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (!temPermissao("administrador", "gestor")) {
    return <SemPermissao mensagem="Apenas administradores e gestores podem gerenciar cidades." />;
  }

  const abrirFormCriacao = () => {
    setEditandoId(null);
    setFormNome("");
    setFormUf("MG");
    setFormCodigoIbge("");
    setFormDistancia("");
    setFormAberto(true);
  };

  const abrirFormEdicao = (c: CidadeRegiao) => {
    setEditandoId(c.id);
    setFormNome(c.nome);
    setFormUf(c.uf);
    setFormCodigoIbge(c.codigo_ibge || "");
    setFormDistancia(c.distancia_km?.toString() || "");
    setFormAberto(true);
  };

  const fecharForm = () => {
    setFormAberto(false);
    setEditandoId(null);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim() || !municipioId) return;

    setSalvando(true);
    setErro(null);
    try {
      if (editandoId) {
        await atualizarCidadeRegiao(editandoId, {
          nome: formNome,
          uf: formUf,
          codigo_ibge: formCodigoIbge,
          distancia_km: formDistancia ? Number(formDistancia) : undefined,
        });
      } else {
        await criarCidadeRegiao({
          nome: formNome,
          uf: formUf,
          codigo_ibge: formCodigoIbge,
          municipio_id: municipioId,
          distancia_km: formDistancia ? Number(formDistancia) : undefined,
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
    if (!window.confirm("Tem certeza que deseja remover esta cidade?")) return;
    try {
      await desativarCidadeRegiao(id);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao remover.");
    }
  };

  const cidadesFiltradas = cidades.filter(
    (c) =>
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.uf.toLowerCase().includes(busca.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cidade..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={abrirFormCriacao}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Cidade
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
              {editandoId ? "Editar Cidade" : "Nova Cidade da Região"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSalvar} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-sm font-medium">Nome da cidade *</label>
                  <Input
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                    placeholder="Ex: Uberlândia"
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">UF *</label>
                  <select
                    value={formUf}
                    onChange={(e) => setFormUf(e.target.value)}
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {UFS.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Distância (km)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formDistancia}
                    onChange={(e) => setFormDistancia(e.target.value)}
                    placeholder="0.0"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-sm font-medium">Código IBGE</label>
                  <Input
                    value={formCodigoIbge}
                    onChange={(e) => setFormCodigoIbge(e.target.value)}
                    placeholder="3100104"
                    maxLength={7}
                  />
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
            <MapPin className="h-5 w-5" />
            Cidades da Região
          </CardTitle>
          <CardDescription>
            {cidadesFiltradas.length} cidade(s) cadastrada(s) para pesquisas regionais
          </CardDescription>
        </CardHeader>
        <CardContent>
          {carregando ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : cidadesFiltradas.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {busca ? "Nenhuma cidade encontrada." : "Nenhuma cidade cadastrada."}
            </p>
          ) : (
            <div className="divide-y">
              {cidadesFiltradas.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      {c.uf}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{c.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.distancia_km ? `${c.distancia_km} km` : "—"}
                        {c.codigo_ibge ? ` · IBGE: ${c.codigo_ibge}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => abrirFormEdicao(c)}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDesativar(c.id)}
                      title="Remover"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
