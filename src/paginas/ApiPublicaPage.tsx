// ═══════════════════════════════════════════════════════════════════════════════
// Página de API Pública REST — Fase 16
// Gerenciamento de API Keys + Documentação interativa dos endpoints
// ═══════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Badge } from "@/componentes/ui/badge";
import { Separator } from "@/componentes/ui/separator";
import {
  Key,
  Plus,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  Code2,
  BookOpen,
  Activity,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  Terminal,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import type {
  ApiKey,
  ApiKeyComChave,
  ApiEstatisticas,
} from "@/tipos";
import {
  criarApiKey,
  listarApiKeys,
  revogarApiKey,
  alternarStatusApiKey,
  obterEstatisticasApi,
  ENDPOINTS_API,
  gerarExemploCodigo,
} from "@/servicos/apiPublica";
import type { EndpointDoc } from "@/servicos/apiPublica";

// ── Cores por método HTTP ──
const METODO_COR: Record<string, string> = {
  GET: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  POST: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  PUT: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export function ApiPublicaPage() {
  const { servidor } = useAuth();
  const municipioId = servidor?.secretaria?.municipio_id;

  // ── Estado ──
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [estatisticas, setEstatisticas] = useState<ApiEstatisticas[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [novaChaveCriada, setNovaChaveCriada] = useState<ApiKeyComChave | null>(null);
  const [mostrarChave, setMostrarChave] = useState(false);
  const [criarModal, setCriarModal] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<"chaves" | "docs" | "logs">("chaves");
  const [endpointAberto, setEndpointAberto] = useState<number | null>(null);
  const [linguagemExemplo, setLinguagemExemplo] = useState<"curl" | "javascript" | "python">("curl");

  // ── Form criar ──
  const [formNome, setFormNome] = useState("");
  const [formPermissoes, setFormPermissoes] = useState<string[]>(["leitura"]);
  const [formRateLimit, setFormRateLimit] = useState(60);
  const [criando, setCriando] = useState(false);

  // ── Carregar dados ──
  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [keys, stats] = await Promise.all([
        listarApiKeys(municipioId),
        obterEstatisticasApi(municipioId),
      ]);
      setApiKeys(keys);
      setEstatisticas(stats);
    } catch {
      toast.error("Erro ao carregar API Keys");
    } finally {
      setCarregando(false);
    }
  }, [municipioId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // ── Criar API Key ──
  async function handleCriar() {
    if (!formNome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (!municipioId) {
      toast.error("Município não identificado");
      return;
    }
    setCriando(true);
    try {
      const nova = await criarApiKey(
        {
          municipio_id: municipioId,
          nome: formNome.trim(),
          permissoes: formPermissoes,
          rate_limit_rpm: formRateLimit,
        },
        servidor?.id,
      );
      setNovaChaveCriada(nova);
      setMostrarChave(true);
      setCriarModal(false);
      setFormNome("");
      setFormPermissoes(["leitura"]);
      setFormRateLimit(60);
      toast.success("API Key criada com sucesso!");
      carregar();
    } catch {
      toast.error("Erro ao criar API Key");
    } finally {
      setCriando(false);
    }
  }

  // ── Revogar ──
  async function handleRevogar(id: string, nome: string) {
    if (!confirm(`Revogar permanentemente a chave "${nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await revogarApiKey(id, servidor?.id);
      toast.success("API Key revogada");
      carregar();
    } catch {
      toast.error("Erro ao revogar");
    }
  }

  // ── Alternar status ──
  async function handleAlternarStatus(id: string, ativoAtual: boolean) {
    try {
      await alternarStatusApiKey(id, !ativoAtual);
      toast.success(ativoAtual ? "API Key desativada" : "API Key ativada");
      carregar();
    } catch {
      toast.error("Erro ao alterar status");
    }
  }

  // ── Copiar ──
  function copiar(texto: string, label: string) {
    navigator.clipboard.writeText(texto);
    toast.success(`${label} copiado!`);
  }

  const statsMap = new Map(estatisticas.map((s) => [s.api_key_id, s]));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Code2 className="h-7 w-7 text-blue-600" />
            API Pública REST
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Integre o LicitaNest com ERPs e sistemas municipais
          </p>
        </div>
        <Button onClick={() => setCriarModal(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nova API Key
        </Button>
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit">
        {([
          { id: "chaves" as const, label: "Chaves de API", icon: Key },
          { id: "docs" as const, label: "Documentação", icon: BookOpen },
          { id: "logs" as const, label: "Uso & Métricas", icon: Activity },
        ]).map((aba) => (
          <button
            key={aba.id}
            onClick={() => setAbaAtiva(aba.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              abaAtiva === aba.id
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <aba.icon className="h-4 w-4" /> {aba.label}
          </button>
        ))}
      </div>

      {/* ── Aba: Chaves de API ── */}
      {abaAtiva === "chaves" && (
        <div className="space-y-4">
          {/* Chave recém-criada */}
          {novaChaveCriada && (
            <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                      API Key "{novaChaveCriada.nome}" criada!
                    </p>
                    <p className="text-sm text-emerald-700 dark:text-emerald-400">
                      Copie a chave abaixo. Ela <strong>não será exibida novamente</strong>.
                    </p>
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg p-3 border border-emerald-200 dark:border-emerald-700">
                      <code className="flex-1 text-sm font-mono break-all">
                        {mostrarChave
                          ? novaChaveCriada.chave_texto
                          : "•".repeat(novaChaveCriada.chave_texto.length)}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setMostrarChave(!mostrarChave)}
                      >
                        {mostrarChave ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copiar(novaChaveCriada.chave_texto, "Chave")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-emerald-700"
                      onClick={() => setNovaChaveCriada(null)}
                    >
                      Entendi, pode fechar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de chaves */}
          {carregando ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin mr-2" /> Carregando...
            </div>
          ) : apiKeys.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-500 dark:text-slate-400">
                <Key className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="font-medium">Nenhuma API Key criada</p>
                <p className="text-sm mt-1">Crie uma chave para permitir integração com ERPs municipais.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((key) => {
                const stats = statsMap.get(key.id);
                return (
                  <Card key={key.id}>
                    <CardContent className="py-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${key.ativo ? "bg-blue-50 dark:bg-blue-900/30" : "bg-slate-100 dark:bg-slate-800"}`}>
                            <Key className={`h-5 w-5 ${key.ativo ? "text-blue-600" : "text-slate-400"}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {key.nome}
                              </span>
                              <Badge variant={key.ativo ? "default" : "secondary"}>
                                {key.ativo ? "Ativa" : "Inativa"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                              <code className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                {key.prefixo}...
                              </code>
                              <span className="flex items-center gap-1">
                                <Shield className="h-3.5 w-3.5" />
                                {(key.permissoes as string[]).join(", ")}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {key.rate_limit_rpm} req/min
                              </span>
                            </div>
                            {stats && (
                              <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                                <span>{stats.total_requisicoes.toLocaleString()} total</span>
                                <span>{stats.requisicoes_24h} últimas 24h</span>
                                {stats.latencia_media_24h && (
                                  <span>{Math.round(stats.latencia_media_24h)}ms média</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAlternarStatus(key.id, key.ativo)}
                          >
                            {key.ativo ? "Desativar" : "Ativar"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleRevogar(key.id, key.nome)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Aba: Documentação ── */}
      {abaAtiva === "docs" && (
        <div className="space-y-4">
          {/* Base URL */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Terminal className="h-5 w-5 text-blue-600" />
                Base URL & Autenticação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 font-mono text-sm">
                <div className="text-slate-500 text-xs mb-1">Base URL</div>
                <div className="text-slate-900 dark:text-white">https://api.licitanest.com.br</div>
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                  Todas as requisições devem incluir o header de autenticação:
                </p>
                <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm text-emerald-400">
                  Authorization: Bearer lnst_sua_chave_aqui
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  Rate limit padrão: <strong>60 requisições/minuto</strong>. 
                  Respostas com status 429 indicam excesso de requisições.
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Exemplos de código */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Exemplo de Uso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-1">
                {(["curl", "javascript", "python"] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLinguagemExemplo(lang)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      linguagemExemplo === lang
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {lang === "curl" ? "cURL" : lang === "javascript" ? "JavaScript" : "Python"}
                  </button>
                ))}
              </div>
              <div className="relative">
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto">
                  <code>{gerarExemploCodigo("", linguagemExemplo)}</code>
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 text-slate-400 hover:text-white"
                  onClick={() => copiar(gerarExemploCodigo("", linguagemExemplo), "Código")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Endpoints */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                Endpoints Disponíveis ({ENDPOINTS_API.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ENDPOINTS_API.map((ep, idx) => (
                <EndpointCard
                  key={idx}
                  endpoint={ep}
                  aberto={endpointAberto === idx}
                  onToggle={() => setEndpointAberto(endpointAberto === idx ? null : idx)}
                />
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Aba: Logs & Métricas ── */}
      {abaAtiva === "logs" && (
        <div className="space-y-4">
          {/* Resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {apiKeys.length}
                </div>
                <p className="text-sm text-slate-500">Chaves Ativas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">
                  {estatisticas.reduce((s, e) => s + e.requisicoes_24h, 0).toLocaleString()}
                </div>
                <p className="text-sm text-slate-500">Requisições (24h)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-emerald-600">
                  {estatisticas.length > 0
                    ? `${Math.round(
                        estatisticas.reduce((s, e) => s + (e.latencia_media_24h ?? 0), 0) /
                          Math.max(estatisticas.filter((e) => e.latencia_media_24h).length, 1),
                      )}ms`
                    : "—"}
                </div>
                <p className="text-sm text-slate-500">Latência Média</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabela de uso por chave */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Uso por Chave</CardTitle>
              <Button variant="ghost" size="sm" onClick={carregar}>
                <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
              </Button>
            </CardHeader>
            <CardContent>
              {estatisticas.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Nenhum dado de uso disponível</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-2 px-3 font-medium text-slate-600 dark:text-slate-400">Chave</th>
                        <th className="text-right py-2 px-3 font-medium text-slate-600 dark:text-slate-400">Total</th>
                        <th className="text-right py-2 px-3 font-medium text-slate-600 dark:text-slate-400">24h</th>
                        <th className="text-right py-2 px-3 font-medium text-slate-600 dark:text-slate-400">1h</th>
                        <th className="text-right py-2 px-3 font-medium text-slate-600 dark:text-slate-400">Latência</th>
                        <th className="text-center py-2 px-3 font-medium text-slate-600 dark:text-slate-400">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estatisticas.map((stat) => (
                        <tr key={stat.api_key_id} className="border-b border-slate-100 dark:border-slate-800">
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <code className="font-mono text-xs">{stat.prefixo}...</code>
                              <span className="text-slate-600 dark:text-slate-400">{stat.nome}</span>
                            </div>
                          </td>
                          <td className="text-right py-2 px-3 font-mono">{stat.total_requisicoes.toLocaleString()}</td>
                          <td className="text-right py-2 px-3 font-mono">{stat.requisicoes_24h}</td>
                          <td className="text-right py-2 px-3 font-mono">{stat.requisicoes_1h}</td>
                          <td className="text-right py-2 px-3 font-mono">
                            {stat.latencia_media_24h ? `${Math.round(stat.latencia_media_24h)}ms` : "—"}
                          </td>
                          <td className="text-center py-2 px-3">
                            {stat.ativo ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Modal Criar API Key ── */}
      {criarModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-blue-600" />
                Nova API Key
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                  Nome descritivo *
                </label>
                <Input
                  placeholder="Ex: ERP Prefeitura, Sistema Contábil..."
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                  Permissões
                </label>
                <div className="flex gap-2">
                  {["leitura", "escrita", "admin"].map((perm) => (
                    <button
                      key={perm}
                      onClick={() => {
                        setFormPermissoes((p) =>
                          p.includes(perm) ? p.filter((x) => x !== perm) : [...p, perm],
                        );
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                        formPermissoes.includes(perm)
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {perm}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                  Rate Limit (req/min)
                </label>
                <Input
                  type="number"
                  value={formRateLimit}
                  onChange={(e) => setFormRateLimit(Number(e.target.value))}
                  min={1}
                  max={1000}
                />
              </div>

              <Separator />

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCriarModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCriar} disabled={criando}>
                  {criando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Criar Chave
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Sub-componente: Endpoint Card ──
function EndpointCard({
  endpoint,
  aberto,
  onToggle,
}: {
  endpoint: EndpointDoc;
  aberto: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <span className={`px-2 py-0.5 text-xs font-bold rounded ${METODO_COR[endpoint.metodo] ?? ""}`}>
          {endpoint.metodo}
        </span>
        <code className="text-sm font-mono text-slate-700 dark:text-slate-300 flex-1">
          {endpoint.path}
        </code>
        <span className="text-xs text-slate-400 hidden sm:inline">{endpoint.descricao}</span>
        {aberto ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
      </button>

      {aberto && (
        <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400 pt-3">{endpoint.descricao}</p>
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="secondary">{endpoint.permissao}</Badge>
          </div>

          {endpoint.parametros && endpoint.parametros.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase">
                Parâmetros
              </h4>
              <div className="space-y-1">
                {endpoint.parametros.map((p) => (
                  <div key={p.nome} className="flex items-center gap-2 text-sm">
                    <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      {p.nome}
                    </code>
                    <span className="text-xs text-slate-400">{p.tipo}</span>
                    {p.obrigatorio && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">
                        obrigatório
                      </Badge>
                    )}
                    <span className="text-xs text-slate-500">— {p.descricao}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {endpoint.exemplo_resposta && (
            <div>
              <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase">
                Exemplo de Resposta
              </h4>
              <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg text-xs overflow-x-auto">
                <code>{endpoint.exemplo_resposta}</code>
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
