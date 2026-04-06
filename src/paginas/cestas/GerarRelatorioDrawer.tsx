// ═══════════════════════════════════════════════════════════════════════════════
// GerarRelatorioDrawer — Fase 11
// Drawer para selecionar tipo / formato e gerar relatórios a partir da cesta
// Inclui histórico de relatórios gerados e upload de documentos comprobatórios
// ═══════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Badge } from "@/componentes/ui/badge";
import { Separator } from "@/componentes/ui/separator";
import {
  Download,
  FileBarChart2,
  FileSpreadsheet,
  FileText,
  Loader2,
  Paperclip,
  Trash2,
  Upload,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Drawer } from "vaul";
import { useAuth } from "@/hooks/useAuth";
import { useRelatorios, useDocumentos } from "@/hooks/useRelatorios";
import type {
  CestaPrecos,
  ItemCesta,
  TipoRelatorio,
  FormatoExportacao,
  ConfigRelatorio,
  CabecalhoRelatorio,
} from "@/tipos";

interface Props {
  cesta: CestaPrecos;
  itens: ItemCesta[];
  aberto: boolean;
  onClose: () => void;
}

const TIPOS: { id: TipoRelatorio; label: string; desc: string; icon: typeof FileBarChart2 }[] = [
  {
    id: "mapa_apuracao",
    label: "Mapa de Apuração",
    desc: "Itens, valores por fonte, média, mediana e total",
    icon: FileBarChart2,
  },
  {
    id: "fontes_precos",
    label: "Fontes de Preços",
    desc: "Detalhamento das fontes utilizadas e documentos",
    icon: FileText,
  },
  {
    id: "correcao_monetaria",
    label: "Correção Monetária",
    desc: "Valores originais, índice, percentual e valor corrigido",
    icon: FileSpreadsheet,
  },
];

export function GerarRelatorioDrawer({ cesta, itens, aberto, onClose }: Props) {
  const { servidor } = useAuth();
  const { gerando, erro, historico, carregandoHistorico, gerar, carregarHistorico } = useRelatorios();
  const docs = useDocumentos();

  const [tipo, setTipo] = useState<TipoRelatorio>("mapa_apuracao");
  const [formato, setFormato] = useState<FormatoExportacao>("pdf");
  const [incluirExcluidos, setIncluirExcluidos] = useState(true);
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);

  // Cabecalho
  const [nomeOrgao, setNomeOrgao] = useState(cesta.secretaria?.nome ?? "");
  const [nomeMunicipio, setNomeMunicipio] = useState("");
  const [uf, setUf] = useState("MG");

  useEffect(() => {
    if (aberto) {
      carregarHistorico(cesta.id);
      docs.carregar(cesta.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, cesta.id]);

  const handleGerar = useCallback(async () => {
    if (!servidor) return;
    setSucessoMsg(null);
    const config: ConfigRelatorio = {
      tipo,
      formato,
      cesta_id: cesta.id,
      incluir_excluidos: incluirExcluidos,
      incluir_documentos: true,
    };
    const cabecalho: CabecalhoRelatorio = {
      nome_orgao: nomeOrgao || cesta.secretaria?.nome || "Órgão",
      nome_municipio: nomeMunicipio || "Município",
      uf: uf || "MG",
      objeto: cesta.descricao_objeto,
      data_geracao: new Date().toISOString(),
      servidor_nome: servidor.nome,
    };
    try {
      await gerar(config, itens, cabecalho, servidor.id);
      setSucessoMsg(`${formato.toUpperCase()} gerado com sucesso! Download iniciado.`);
      carregarHistorico(cesta.id);
    } catch {
      // erro já está no hook
    }
  }, [servidor, tipo, formato, incluirExcluidos, nomeOrgao, nomeMunicipio, uf, cesta, itens, gerar, carregarHistorico]);

  const handleUploadDoc = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    // Pegar o primeiro preço do primeiro item (simplificado — no drawer real seria selecionável)
    const primeiroPreco = itens[0]?.precos?.[0];
    if (!primeiroPreco) return;
    for (const file of Array.from(files)) {
      await docs.upload(primeiroPreco.id, file);
    }
    e.target.value = "";
  }, [itens, docs]);

  const handleOpenDoc = useCallback(async (path: string) => {
    const url = await docs.obterUrl(path);
    window.open(url, "_blank");
  }, [docs]);

  const totalPrecos = itens.reduce((s, i) => s + (i.precos?.length ?? 0), 0);
  const temCorrecao = itens.some((i) => i.precos?.some((p) => p.valor_corrigido != null && p.valor_corrigido !== p.valor_unitario));

  return (
    <Drawer.Root open={aberto} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Drawer.Content className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-3xl flex-col bg-background shadow-xl outline-none">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <FileBarChart2 className="h-5 w-5" />
            <Drawer.Title className="text-lg font-bold">
              Relatórios e Exportações
            </Drawer.Title>
          </div>
          <p className="px-4 pt-2 text-sm text-muted-foreground">
            {cesta.descricao_objeto} — {itens.length} itens, {totalPrecos} preços
          </p>

        <div className="space-y-6 overflow-y-auto px-4 pb-8" style={{ maxHeight: "75vh" }}>
          {/* ── Cabeçalho Institucional ── */}
          <Card>
            <CardContent className="pt-4">
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Cabeçalho Institucional</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Órgão / Secretaria</label>
                  <Input
                    value={nomeOrgao}
                    onChange={(e) => setNomeOrgao(e.target.value)}
                    placeholder="Nome do órgão"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Município</label>
                  <Input
                    value={nomeMunicipio}
                    onChange={(e) => setNomeMunicipio(e.target.value)}
                    placeholder="Nome do município"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">UF</label>
                  <Input
                    value={uf}
                    onChange={(e) => setUf(e.target.value.toUpperCase().slice(0, 2))}
                    placeholder="UF"
                    maxLength={2}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Tipo de Relatório ── */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Tipo de Relatório</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {TIPOS.map((t) => {
                const disabled = t.id === "correcao_monetaria" && !temCorrecao;
                return (
                  <button
                    key={t.id}
                    disabled={disabled}
                    onClick={() => setTipo(t.id)}
                    className={`rounded-lg border p-4 text-left transition-all ${
                      tipo === t.id
                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                        : disabled
                          ? "cursor-not-allowed border-gray-200 bg-gray-50 opacity-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <t.icon className={`h-5 w-5 ${tipo === t.id ? "text-blue-600" : "text-gray-500"}`} />
                      <span className="text-sm font-medium">{t.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                    {disabled && (
                      <p className="mt-1 text-xs text-amber-600">Sem correções aplicadas</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Formato e opções ── */}
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Formato</h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={formato === "pdf" ? "default" : "outline"}
                  onClick={() => setFormato("pdf")}
                >
                  <FileText className="mr-1 h-4 w-4" /> PDF
                </Button>
                <Button
                  size="sm"
                  variant={formato === "xlsx" ? "default" : "outline"}
                  onClick={() => setFormato("xlsx")}
                >
                  <FileSpreadsheet className="mr-1 h-4 w-4" /> Excel
                </Button>
              </div>
            </div>

            {tipo === "mapa_apuracao" && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={incluirExcluidos}
                  onChange={(e) => setIncluirExcluidos(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Incluir preços excluídos (tachados)
              </label>
            )}
          </div>

          {/* ── Botão gerar ── */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleGerar}
              disabled={gerando}
              className="min-w-[200px]"
            >
              {gerando ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando…</>
              ) : (
                <><Download className="mr-2 h-4 w-4" /> Gerar {formato.toUpperCase()}</>
              )}
            </Button>
            {sucessoMsg && (
              <span className="flex items-center gap-1 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4" /> {sucessoMsg}
              </span>
            )}
            {erro && (
              <span className="flex items-center gap-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" /> {erro}
              </span>
            )}
          </div>

          <Separator />

          {/* ── Documentos Comprobatórios ── */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground">
                Documentos Comprobatórios ({docs.documentos.length})
              </h3>
              <label className="cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  className="hidden"
                  onChange={handleUploadDoc}
                  disabled={docs.enviando || itens.length === 0 || totalPrecos === 0}
                />
                <Button size="sm" variant="outline" asChild disabled={docs.enviando}>
                  <span>
                    {docs.enviando ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-1 h-4 w-4" />
                    )}
                    Enviar
                  </span>
                </Button>
              </label>
            </div>

            {docs.carregando ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : docs.documentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum documento anexado. Envie PDFs, imagens ou documentos para compor o relatório final.
              </p>
            ) : (
              <div className="space-y-2">
                {docs.documentos.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <Paperclip className="h-4 w-4 shrink-0 text-gray-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{d.nome_arquivo}</p>
                      <p className="text-xs text-muted-foreground">
                        {docs.fmtTamanho(d.tamanho_bytes)}
                        {d.item_descricao && <> · {d.item_descricao}</>}
                        {d.fonte_nome && <> · {d.fonte_nome}</>}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenDoc(d.storage_path)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => docs.remover(d.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* ── Histórico ── */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
              Histórico de Relatórios Gerados
            </h3>
            {carregandoHistorico ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : historico.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum relatório gerado ainda para esta cesta.
              </p>
            ) : (
              <div className="space-y-2">
                {historico.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <Clock className="h-4 w-4 shrink-0 text-gray-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{r.nome_arquivo}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtDataHora(r.gerado_em)}
                        {r.gerado_por_servidor && <> · {r.gerado_por_servidor.nome}</>}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {r.formato.toUpperCase()}
                    </Badge>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {TIPO_LABELS[r.tipo]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

// ── Helpers ──────────────────────────────────────────

const TIPO_LABELS: Record<TipoRelatorio, string> = {
  mapa_apuracao: "Mapa",
  fontes_precos: "Fontes",
  correcao_monetaria: "Correção",
};

function fmtDataHora(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
