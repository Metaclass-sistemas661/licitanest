// ═══════════════════════════════════════════════════════════════════════════════
// Drawer de Correção Monetária — Fase 8
// Aplicação de IPCA/IGP-M na cesta, prévia de valores, relatório por item
// ═══════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerBody,
} from "@/componentes/ui/drawer";
import { Button } from "@/componentes/ui/button";
import { Badge } from "@/componentes/ui/badge";
import { Input } from "@/componentes/ui/input";
import { Card, CardContent } from "@/componentes/ui/card";
import { Separator } from "@/componentes/ui/separator";
import {
  TrendingUp,
  Calculator,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Trash2,
  BarChart3,
  Download,
  Info,
  Calendar,
} from "lucide-react";
import type { CestaPrecos, TipoIndice, ResumoCorrecaoCesta } from "@/tipos";
import {
  useIndicesCorrecao,
  useImportacaoIndices,
  useCorrecaoCesta,
} from "@/hooks/useCorrecaoMonetaria";
import {
  NOME_INDICE,
  DESCRICAO_INDICE,
  formatarPeriodo,
  formatarPercentual,
} from "@/servicos/correcaoMonetaria";

// ── Formatadores ──────────────────────────────────────
function moeda(valor: number | null | undefined) {
  if (valor == null || valor === 0) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ╔══════════════════════════════════════════════════════╗
// ║  Export principal                                    ║
// ╚══════════════════════════════════════════════════════╝

interface CorrecaoMonetariaDrawerProps {
  cesta: CestaPrecos;
  aberto: boolean;
  onClose: () => void;
  onAtualizado: () => void;
}

export function CorrecaoMonetariaDrawer({
  cesta,
  aberto,
  onClose,
  onAtualizado,
}: CorrecaoMonetariaDrawerProps) {
  // ── Hooks ───────────────────────────────────────
  const indicesHook = useIndicesCorrecao();
  const importacao = useImportacaoIndices();
  const correcao = useCorrecaoCesta();

  // ── Estado local ───────────────────────────────
  const [tipoIndice, setTipoIndice] = useState<TipoIndice>(
    cesta.tipo_correcao !== "nenhuma" ? (cesta.tipo_correcao as TipoIndice) : "ipca",
  );
  const [dataBase, setDataBase] = useState(
    cesta.data_base_correcao ?? new Date().toISOString().slice(0, 10),
  );
  const [aba, setAba] = useState<"aplicar" | "indices" | "relatorio">(
    cesta.correcao_aplicada_em ? "relatorio" : "aplicar",
  );
  const [ultimoIpca, setUltimoIpca] = useState<string | null>(null);
  const [ultimoIgpm, setUltimoIgpm] = useState<string | null>(null);

  const jaCorrigida = !!cesta.correcao_aplicada_em;

  // ── Carregar info de últimos índices ao abrir ──
  useEffect(() => {
    if (!aberto) return;
    indicesHook.buscarUltimo("ipca").then((idx) => {
      if (idx) setUltimoIpca(formatarPeriodo(idx.ano, idx.mes));
    });
    indicesHook.buscarUltimo("igpm").then((idx) => {
      if (idx) setUltimoIgpm(formatarPeriodo(idx.ano, idx.mes));
    });
  }, [aberto]);

  // ── Aplicar correção ──────────────────────────
  const handleAplicar = useCallback(async () => {
    const res = await correcao.aplicar(cesta.id, tipoIndice, dataBase);
    if (res) {
      setAba("relatorio");
      onAtualizado();
    }
  }, [cesta.id, tipoIndice, dataBase, correcao, onAtualizado]);

  // ── Remover correção ──────────────────────────
  const handleRemover = useCallback(async () => {
    if (!confirm("Remover toda correção monetária desta cesta? Os preços voltarão aos valores originais.")) return;
    await correcao.remover(cesta.id);
    setAba("aplicar");
    onAtualizado();
  }, [cesta.id, correcao, onAtualizado]);

  // ── Importar índices ──────────────────────────
  const handleImportar = useCallback(
    async (tipo: TipoIndice) => {
      await importacao.importar(tipo);
      // Recarregar info
      const idx = await indicesHook.buscarUltimo(tipo);
      if (idx) {
        if (tipo === "ipca") setUltimoIpca(formatarPeriodo(idx.ano, idx.mes));
        else setUltimoIgpm(formatarPeriodo(idx.ano, idx.mes));
      }
    },
    [importacao, indicesHook],
  );

  return (
    <Drawer open={aberto} onOpenChange={(v) => !v && onClose()}>
      <DrawerContent side="right" className="w-full max-w-2xl">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Correção Monetária
          </DrawerTitle>
        </DrawerHeader>
        <DrawerBody>
          <div className="space-y-5">
            {/* Info da cesta */}
            <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
              <p className="font-medium">{cesta.descricao_objeto}</p>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>Data: {new Date(cesta.data + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                {jaCorrigida && (
                  <>
                    <span>•</span>
                    <Badge variant="success" className="text-[10px]">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Correção aplicada ({NOME_INDICE[cesta.tipo_correcao as TipoIndice] ?? cesta.tipo_correcao})
                    </Badge>
                    {cesta.data_base_correcao && (
                      <span>Data-base: {new Date(cesta.data_base_correcao + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Abas */}
            <div className="flex gap-1 rounded-lg border p-1">
              {(
                [
                  { value: "aplicar", label: "Aplicar Correção" },
                  { value: "indices", label: "Índices" },
                  { value: "relatorio", label: "Relatório" },
                ] as { value: typeof aba; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    aba === tab.value
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  }`}
                  onClick={() => setAba(tab.value)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ──── ABA: Aplicar Correção ──── */}
            {aba === "aplicar" && (
              <div className="space-y-5">
                {/* Tipo de índice */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Índice de Correção</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(["ipca", "igpm"] as TipoIndice[]).map((tipo) => {
                      const selecionado = tipoIndice === tipo;
                      const ultimoDisp = tipo === "ipca" ? ultimoIpca : ultimoIgpm;
                      return (
                        <button
                          key={tipo}
                          type="button"
                          className={`p-3 rounded-lg border text-left transition ${
                            selecionado
                              ? "border-primary bg-primary/5 ring-1 ring-primary"
                              : "hover:border-primary/50"
                          }`}
                          onClick={() => setTipoIndice(tipo)}
                        >
                          <div className="font-medium text-sm">{NOME_INDICE[tipo]}</div>
                          <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                            {DESCRICAO_INDICE[tipo]}
                          </p>
                          <div className="mt-2 flex items-center justify-between">
                            <Badge
                              variant={ultimoDisp ? "secondary" : "warning"}
                              className="text-[10px]"
                            >
                              {ultimoDisp
                                ? `Último: ${ultimoDisp}`
                                : "Sem dados"}
                            </Badge>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Data-base */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Data-base (valor corrigido até)
                  </label>
                  <Input
                    type="date"
                    value={dataBase}
                    onChange={(e) => setDataBase(e.target.value)}
                    className="w-48"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    O valor de cada preço será atualizado da data de contratação até esta data-base.
                  </p>
                </div>

                {/* Info */}
                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm">
                  <Info className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                  <div className="text-xs text-blue-800 dark:text-blue-300">
                    <p className="font-medium mb-1">Como funciona a correção</p>
                    <p>
                      Cada preço é multiplicado pelo fator acumulado do índice escolhido,
                      do mês seguinte à data de referência até o mês da data-base.
                      A fórmula usa encadeamento: fator = Π(1 + i/100).
                    </p>
                  </div>
                </div>

                {/* Erros */}
                {correcao.erro && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {correcao.erro}
                  </div>
                )}

                {/* Botões */}
                <div className="flex gap-2 pt-2 border-t">
                  {jaCorrigida && (
                    <Button
                      variant="outline"
                      onClick={handleRemover}
                      disabled={correcao.removendo}
                      className="text-destructive"
                    >
                      {correcao.removendo ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Remover Correção
                    </Button>
                  )}
                  <Button
                    onClick={handleAplicar}
                    disabled={correcao.aplicando || !dataBase}
                    className="flex-1"
                  >
                    {correcao.aplicando ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Calculator className="h-4 w-4 mr-2" />
                    )}
                    {jaCorrigida ? "Reaplicar Correção" : "Aplicar Correção"}
                  </Button>
                </div>
              </div>
            )}

            {/* ──── ABA: Índices ──── */}
            {aba === "indices" && (
              <AbaIndices
                indicesHook={indicesHook}
                importacao={importacao}
                onImportar={handleImportar}
                ultimoIpca={ultimoIpca}
                ultimoIgpm={ultimoIgpm}
              />
            )}

            {/* ──── ABA: Relatório ──── */}
            {aba === "relatorio" && (
              <AbaRelatorio
                resumo={correcao.resumo}
                jaCorrigida={jaCorrigida}
                cesta={cesta}
              />
            )}
          </div>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

// ╔══════════════════════════════════════════════════════╗
// ║  Sub: Aba Índices                                    ║
// ╚══════════════════════════════════════════════════════╝

function AbaIndices({
  indicesHook,
  importacao,
  onImportar,
  ultimoIpca,
  ultimoIgpm,
}: {
  indicesHook: ReturnType<typeof useIndicesCorrecao>;
  importacao: ReturnType<typeof useImportacaoIndices>;
  onImportar: (tipo: TipoIndice) => Promise<void>;
  ultimoIpca: string | null;
  ultimoIgpm: string | null;
}) {
  const [tipoVer, setTipoVer] = useState<TipoIndice>("ipca");
  const [anoVer, setAnoVer] = useState(new Date().getFullYear());

  // Carregar índices ao mudar tipo/ano
  useEffect(() => {
    indicesHook.carregar(tipoVer, anoVer, anoVer);
  }, [tipoVer, anoVer]);

  // Carregar logs
  useEffect(() => {
    importacao.carregarLogs();
  }, []);

  return (
    <div className="space-y-5">
      {/* Status + Importar */}
      <div className="grid grid-cols-2 gap-3">
        {(["ipca", "igpm"] as TipoIndice[]).map((tipo) => {
          const ultimo = tipo === "ipca" ? ultimoIpca : ultimoIgpm;
          return (
            <Card key={tipo}>
              <CardContent className="pt-4 pb-3 px-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{NOME_INDICE[tipo]}</span>
                  <Badge variant={ultimo ? "secondary" : "warning"} className="text-[10px]">
                    {ultimo ?? "Sem dados"}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs"
                  onClick={() => onImportar(tipo)}
                  disabled={importacao.importando}
                >
                  {importacao.importando && importacao.resultado?.tipo === tipo ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Download className="h-3 w-3 mr-1" />
                  )}
                  Importar desde 2015
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Resultado da importação */}
      {importacao.resultado && (
        <div
          className={`flex items-center gap-2 text-sm p-2 rounded-lg ${
            importacao.resultado.erro
              ? "bg-destructive/10 text-destructive"
              : "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400"
          }`}
        >
          {importacao.resultado.erro ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          {importacao.resultado.erro
            ? `Erro: ${importacao.resultado.erro}`
            : `${importacao.resultado.importados} registros de ${NOME_INDICE[importacao.resultado.tipo]} importados com sucesso.`}
        </div>
      )}

      <Separator />

      {/* Visualizar índices */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <select
            value={tipoVer}
            onChange={(e) => setTipoVer(e.target.value as TipoIndice)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="ipca">IPCA</option>
            <option value="igpm">IGP-M</option>
          </select>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2"
              onClick={() => setAnoVer((a) => a - 1)}
            >
              ◀
            </Button>
            <span className="text-sm font-medium py-1 px-2">{anoVer}</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2"
              onClick={() => setAnoVer((a) => a + 1)}
              disabled={anoVer >= new Date().getFullYear()}
            >
              ▶
            </Button>
          </div>
        </div>

        {indicesHook.carregando ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Carregando índices...
          </div>
        ) : indicesHook.indices.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-40" />
            Nenhum índice disponível para {anoVer}.
            <br />
            Clique em "Importar" acima para buscar dados.
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50 text-muted-foreground">
                  <th className="px-3 py-2 text-left">Mês</th>
                  <th className="px-3 py-2 text-right">Var. Mensal (%)</th>
                  <th className="px-3 py-2 text-right">Acum. 12m (%)</th>
                </tr>
              </thead>
              <tbody>
                {indicesHook.indices.map((idx) => (
                  <tr key={`${idx.ano}-${idx.mes}`} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-1.5 font-medium">
                      {formatarPeriodo(idx.ano, idx.mes)}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <span
                        className={
                          idx.valor > 0
                            ? "text-red-600 dark:text-red-400"
                            : idx.valor < 0
                              ? "text-green-600 dark:text-green-400"
                              : ""
                        }
                      >
                        {idx.valor > 0 ? "+" : ""}
                        {idx.valor.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {idx.acumulado_12m != null ? (
                        <span
                          className={
                            idx.acumulado_12m > 0
                              ? "text-red-600 dark:text-red-400"
                              : idx.acumulado_12m < 0
                                ? "text-green-600 dark:text-green-400"
                                : ""
                          }
                        >
                          {idx.acumulado_12m > 0 ? "+" : ""}
                          {idx.acumulado_12m.toFixed(2)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Logs de importação */}
      {importacao.logs.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground">Últimas importações</h4>
            <div className="space-y-1">
              {importacao.logs.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between text-[10px] px-2 py-1 bg-muted/30 rounded"
                >
                  <span>
                    {NOME_INDICE[log.tipo]} — {log.registros_importados} registros
                    {log.periodo_inicio && ` (${log.periodo_inicio} a ${log.periodo_fim})`}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(log.criado_em).toLocaleString("pt-BR")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ╔══════════════════════════════════════════════════════╗
// ║  Sub: Aba Relatório                                  ║
// ╚══════════════════════════════════════════════════════╝

function AbaRelatorio({
  resumo,
  jaCorrigida,
  cesta,
}: {
  resumo: ResumoCorrecaoCesta | null;
  jaCorrigida: boolean;
  cesta: CestaPrecos;
}) {
  if (!resumo && !jaCorrigida) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Calculator className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">Nenhuma correção aplicada ainda.</p>
        <p className="text-xs">Aplique uma correção para visualizar o relatório.</p>
      </div>
    );
  }

  if (!resumo && jaCorrigida) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <CheckCircle2 className="h-10 w-10 mb-3 text-green-600 opacity-60" />
        <p className="text-sm">Correção aplicada anteriormente.</p>
        <p className="text-xs">
          {NOME_INDICE[cesta.tipo_correcao as TipoIndice] ?? cesta.tipo_correcao} —
          Data-base: {cesta.data_base_correcao
            ? new Date(cesta.data_base_correcao + "T00:00:00").toLocaleDateString("pt-BR")
            : "—"}
        </p>
        <p className="text-[10px] mt-2 text-muted-foreground">
          Reaplicar a correção para ver o relatório detalhado.
        </p>
      </div>
    );
  }

  if (!resumo) return null;

  return (
    <div className="space-y-5">
      {/* Cards resumo */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="pt-3 pb-2 px-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              Preços corrigidos
            </div>
            <p className="text-xl font-bold text-green-700 dark:text-green-400">
              {resumo.total_precos_corrigidos}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-2 px-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <TrendingUp className="h-3 w-3 text-red-500" />
              Acumulado do período
            </div>
            <p className="text-xl font-bold">
              {formatarPercentual(resumo.acumulado_periodo)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="secondary">{NOME_INDICE[resumo.tipo_indice]}</Badge>
        <span>
          Data-base:{" "}
          {new Date(resumo.data_base + "T00:00:00").toLocaleDateString("pt-BR")}
        </span>
        {resumo.total_precos_sem_correcao > 0 && (
          <span className="text-amber-600">
            ({resumo.total_precos_sem_correcao} preço(s) sem correção possível)
          </span>
        )}
      </div>

      <Separator />

      {/* Tabela por item */}
      {resumo.itens.map((item) => (
        <div key={item.item_id} className="space-y-2">
          <h4 className="text-sm font-medium">{item.produto_descricao}</h4>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50 text-muted-foreground">
                  <th className="px-2 py-1.5 text-left">Data Orig.</th>
                  <th className="px-2 py-1.5 text-right">Valor Orig.</th>
                  <th className="px-2 py-1.5 text-right">Fator</th>
                  <th className="px-2 py-1.5 text-right">Correção</th>
                  <th className="px-2 py-1.5 text-right">Valor Corrigido</th>
                </tr>
              </thead>
              <tbody>
                {item.correcoes.map((c) => {
                  const diff = c.valor_corrigido - c.valor_original;
                  return (
                    <tr key={c.preco_id} className="border-b last:border-0">
                      <td className="px-2 py-1.5">
                        {new Date(c.data_origem + "T00:00:00").toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-2 py-1.5 text-right">{moeda(c.valor_original)}</td>
                      <td className="px-2 py-1.5 text-right font-mono">
                        {c.fator_correcao.toFixed(4)}
                      </td>
                      <td className="px-2 py-1.5 text-right text-amber-700 dark:text-amber-400">
                        +{moeda(diff)}
                        <span className="text-muted-foreground ml-1">
                          ({formatarPercentual(c.percentual_correcao)})
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-right font-medium text-green-700 dark:text-green-400">
                        {moeda(c.valor_corrigido)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {resumo.itens.length === 0 && (
        <div className="text-center py-6 text-sm text-muted-foreground">
          Nenhum item teve correção aplicada (sem dados de índices para o período).
        </div>
      )}
    </div>
  );
}
