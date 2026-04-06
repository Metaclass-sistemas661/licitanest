// Drawer de Análise Crítica de uma Cesta de Preços
// Semáforo visual, divergência %, gráfico de dispersão, exclusão com justificativa
import { useCallback, useEffect, useState } from "react";
import { Drawer } from "vaul";
import { Card, CardContent } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Badge } from "@/componentes/ui/badge";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  RotateCcw,
  Settings2,
  ShieldAlert,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAnaliseCritica } from "@/hooks/useAnaliseCritica";
import type {
  AnaliseCriticaItem,
  AnalisePreco,
  ClassificacaoSemaforo,
  CestaPrecos,
  ItemCesta,
} from "@/tipos";
import {
  SEMAFORO_CORES,
  SEMAFORO_DOT,
} from "@/servicos/analiseCritica";

// ── Formatação ───────────────────────────────────────
function moeda(v: number | null) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function pct(v: number | null) {
  if (v == null) return "—";
  return `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
}

// Ícones do semáforo
function SemaforoIcon({ cls }: { cls: ClassificacaoSemaforo }) {
  if (cls === "verde") return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (cls === "amarelo") return <AlertTriangle className="h-4 w-4 text-amber-600" />;
  return <ShieldAlert className="h-4 w-4 text-red-600" />;
}

// ── Props ────────────────────────────────────────────
interface Props {
  cesta: CestaPrecos;
  itens: ItemCesta[];
  aberto: boolean;
  onClose: () => void;
  onAtualizado: () => void;
}

export function AnaliseCriticaDrawer({ cesta, itens, aberto, onClose, onAtualizado }: Props) {
  const { servidor } = useAuth();
  const {
    analise,
    resumo,
    calcular,
    excluir,
    reincluir,
    atualizarAlerta,
  } = useAnaliseCritica();

  const [percentualAlerta, setPercentualAlerta] = useState(cesta.percentual_alerta ?? 30);
  const [salvandoPercentual, setSalvandoPercentual] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [modoExclusao, setModoExclusao] = useState<string | null>(null); // preco_id
  const [justificativa, setJustificativa] = useState("");
  const [processando, setProcessando] = useState(false);

  // Calcular análise quando abrir / itens mudarem
  useEffect(() => {
    if (aberto && itens.length > 0) {
      calcular(itens, percentualAlerta);
    }
  }, [aberto, itens, percentualAlerta, calcular]);

  // Salvar percentual de alerta
  const handleSalvarPercentual = useCallback(async () => {
    setSalvandoPercentual(true);
    const ok = await atualizarAlerta(cesta.id, percentualAlerta);
    setSalvandoPercentual(false);
    if (ok) {
      calcular(itens, percentualAlerta);
    }
  }, [atualizarAlerta, cesta.id, percentualAlerta, calcular, itens]);

  // Excluir preço
  const handleExcluir = useCallback(async (precoId: string) => {
    if (!justificativa.trim() || !servidor) return;
    setProcessando(true);
    const ok = await excluir(precoId, servidor.id, justificativa);
    setProcessando(false);
    if (ok) {
      setModoExclusao(null);
      setJustificativa("");
      onAtualizado();
    }
  }, [excluir, justificativa, servidor, onAtualizado]);

  // Reincluir preço
  const handleReincluir = useCallback(async (precoId: string) => {
    if (!servidor) return;
    setProcessando(true);
    const ok = await reincluir(precoId, servidor.id);
    setProcessando(false);
    if (ok) {
      onAtualizado();
    }
  }, [reincluir, servidor, onAtualizado]);

  return (
    <Drawer.Root open={aberto} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Drawer.Content className="fixed right-0 top-0 bottom-0 z-50 flex w-full max-w-3xl flex-col bg-background shadow-xl outline-none">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div>
              <Drawer.Title className="text-lg font-bold">
                Análise Crítica
              </Drawer.Title>
              <p className="text-sm text-muted-foreground">
                {cesta.descricao_objeto}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {/* ── Resumo de alertas ──────────────────── */}
            {resumo && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MiniCard
                  label="Itens Analisados"
                  valor={String(resumo.total_itens)}
                  cor="text-foreground"
                />
                <MiniCard
                  label="Com Alerta"
                  valor={String(resumo.itens_com_alerta)}
                  cor={resumo.itens_com_alerta > 0 ? "text-red-600" : "text-emerald-600"}
                />
                <MiniCard
                  label="Preços Excluídos"
                  valor={String(resumo.itens_com_exclusao)}
                  cor={resumo.itens_com_exclusao > 0 ? "text-amber-600" : "text-foreground"}
                />
                <MiniCard
                  label="Semáforo"
                  valor={`${resumo.total_precos_verdes}V / ${resumo.total_precos_amarelos}A / ${resumo.total_precos_vermelhos}R`}
                  cor="text-foreground"
                />
              </div>
            )}

            {/* ── Configuração do percentual ─────────── */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <Settings2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium">Percentual de alerta:</span>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    className="w-20"
                    value={percentualAlerta}
                    onChange={(e) => setPercentualAlerta(Number(e.target.value))}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSalvarPercentual}
                    disabled={salvandoPercentual}
                  >
                    {salvandoPercentual ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "Aplicar"
                    )}
                  </Button>
                  <span className="text-xs text-muted-foreground ml-auto">
                    Preços com divergência {`>`} {percentualAlerta}% geram alerta
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* ── Lista de itens com análise ──────────── */}
            {analise.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertTriangle className="mx-auto h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">Nenhum item com preços para analisar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {analise.map((item) => (
                  <ItemAnaliseCard
                    key={item.item_id}
                    item={item}
                    percentualAlerta={percentualAlerta}
                    expandido={expandido === item.item_id}
                    onToggle={() =>
                      setExpandido(expandido === item.item_id ? null : item.item_id)
                    }
                    modoExclusao={modoExclusao}
                    justificativa={justificativa}
                    processando={processando}
                    onIniciarExclusao={(precoId) => {
                      setModoExclusao(precoId);
                      setJustificativa("");
                    }}
                    onConfirmarExclusao={handleExcluir}
                    onCancelarExclusao={() => {
                      setModoExclusao(null);
                      setJustificativa("");
                    }}
                    onJustificativaChange={setJustificativa}
                    onReincluir={handleReincluir}
                  />
                ))}
              </div>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

// ── Mini-card de resumo ──────────────────────────────
function MiniCard({ label, valor, cor }: { label: string; valor: string; cor: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${cor}`}>{valor}</p>
    </div>
  );
}

// ── Card de análise de um item ───────────────────────
function ItemAnaliseCard({
  item,
  percentualAlerta,
  expandido,
  onToggle,
  modoExclusao,
  justificativa,
  processando,
  onIniciarExclusao,
  onConfirmarExclusao,
  onCancelarExclusao,
  onJustificativaChange,
  onReincluir,
}: {
  item: AnaliseCriticaItem;
  percentualAlerta: number;
  expandido: boolean;
  onToggle: () => void;
  modoExclusao: string | null;
  justificativa: string;
  processando: boolean;
  onIniciarExclusao: (precoId: string) => void;
  onConfirmarExclusao: (precoId: string) => void;
  onCancelarExclusao: () => void;
  onJustificativaChange: (v: string) => void;
  onReincluir: (precoId: string) => void;
}) {
  return (
    <Card className={item.tem_alerta ? "border-red-300 bg-red-50/30" : ""}>
      {/* Header do item */}
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 min-w-0">
          {item.tem_alerta ? (
            <ShieldAlert className="h-5 w-5 text-red-500 shrink-0" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          )}
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{item.produto_descricao}</p>
            <p className="text-xs text-muted-foreground">
              {item.categoria} • {item.unidade} • Qtd: {item.quantidade}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {/* Stats inline */}
          <div className="hidden md:flex gap-3 text-xs">
            <span>Média: <strong>{moeda(item.media)}</strong></span>
            <span>Mediana: <strong>{moeda(item.mediana)}</strong></span>
            {item.coeficiente_variacao !== null && (
              <span title="Coeficiente de Variação">
                CV: <strong>{item.coeficiente_variacao.toFixed(1)}%</strong>
              </span>
            )}
          </div>

          {/* Badges */}
          <Badge variant="outline" className="text-xs">
            {item.total_precos} preço{item.total_precos !== 1 && "s"}
          </Badge>
          {item.total_excluidos > 0 && (
            <Badge variant="secondary" className="text-xs">
              {item.total_excluidos} excl.
            </Badge>
          )}

          {/* Semáforo dots */}
          <div className="flex gap-1">
            {item.precos
              .filter((p) => !p.excluido)
              .map((p) => (
                <div
                  key={p.preco_id}
                  className={`h-2.5 w-2.5 rounded-full ${SEMAFORO_DOT[p.classificacao]}`}
                  title={`${p.fonte_sigla}: ${pct(p.divergencia_percentual)}`}
                />
              ))}
          </div>

          {expandido ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Detalhes expandidos */}
      {expandido && (
        <CardContent className="border-t pt-4 space-y-4">
          {/* Stats mobile */}
          <div className="md:hidden grid grid-cols-2 gap-2 text-xs">
            <span>Média: <strong>{moeda(item.media)}</strong></span>
            <span>Mediana: <strong>{moeda(item.mediana)}</strong></span>
            <span>Menor: <strong>{moeda(item.menor_preco)}</strong></span>
            <span>Maior: <strong>{moeda(item.maior_preco)}</strong></span>
            {item.desvio_padrao !== null && (
              <span>DP: <strong>{moeda(item.desvio_padrao)}</strong></span>
            )}
            {item.coeficiente_variacao !== null && (
              <span>CV: <strong>{item.coeficiente_variacao.toFixed(1)}%</strong></span>
            )}
          </div>

          {/* Gráfico de dispersão (barras horizontais) */}
          <DispersaoChart
            precos={item.precos}
            media={item.media}
            percentualAlerta={percentualAlerta}
          />

          {/* Tabela de preços */}
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left w-6" />
                  <th className="px-3 py-2 text-left">Fonte</th>
                  <th className="px-3 py-2 text-left">Órgão</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                  <th className="px-3 py-2 text-right">Diverg.</th>
                  <th className="px-3 py-2 text-center">Data</th>
                  <th className="px-3 py-2 w-28" />
                </tr>
              </thead>
              <tbody>
                {item.precos.map((p) => (
                  <PrecoRow
                    key={p.preco_id}
                    preco={p}
                    modoExclusao={modoExclusao}
                    justificativa={justificativa}
                    processando={processando}
                    onIniciarExclusao={onIniciarExclusao}
                    onConfirmarExclusao={onConfirmarExclusao}
                    onCancelarExclusao={onCancelarExclusao}
                    onJustificativaChange={onJustificativaChange}
                    onReincluir={onReincluir}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ── Gráfico de dispersão (barras horizontais simples) ─
function DispersaoChart({
  precos,
  media,
  percentualAlerta,
}: {
  precos: AnalisePreco[];
  media: number | null;
  percentualAlerta: number;
}) {
  const ativos = precos.filter((p) => !p.excluido);
  if (ativos.length === 0 || !media) return null;

  const maxValor = Math.max(...ativos.map((p) => p.valor));
  const limSuperior = media * (1 + percentualAlerta / 100);
  const limInferior = media * (1 - percentualAlerta / 100);
  const escalaMax = Math.max(maxValor, limSuperior) * 1.1;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        Dispersão de preços (barra = valor, linha = média)
      </p>
      <div className="space-y-1.5">
        {ativos.map((p) => {
          const largura = escalaMax > 0 ? (p.valor / escalaMax) * 100 : 0;
          const mediaPos = escalaMax > 0 ? (media / escalaMax) * 100 : 0;

          return (
            <div key={p.preco_id} className="flex items-center gap-2">
              <span className="w-16 text-right text-xs font-mono text-muted-foreground truncate">
                {p.fonte_sigla}
              </span>
              <div className="flex-1 relative h-5 bg-muted/30 rounded overflow-hidden">
                {/* Faixa de alerta */}
                <div
                  className="absolute top-0 bottom-0 bg-amber-100/50"
                  style={{
                    left: `${Math.max(0, (limInferior / escalaMax) * 100)}%`,
                    width: `${Math.min(100, ((limSuperior - limInferior) / escalaMax) * 100)}%`,
                  }}
                />
                {/* Barra do preço */}
                <div
                  className={`absolute top-0.5 bottom-0.5 rounded-sm ${
                    p.classificacao === "verde"
                      ? "bg-emerald-500"
                      : p.classificacao === "amarelo"
                        ? "bg-amber-500"
                        : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min(100, largura)}%` }}
                />
                {/* Linha da média */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-foreground/60"
                  style={{ left: `${mediaPos}%` }}
                />
              </div>
              <span className="w-20 text-right text-xs font-mono">
                {moeda(p.valor)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 bg-foreground/60" /> Média ({moeda(media)})
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 bg-amber-100/50 border border-amber-200" /> Faixa ±{percentualAlerta}%
        </span>
        <span className="flex items-center gap-1">
          <span className={`inline-block w-2 h-2 rounded-full ${SEMAFORO_DOT.verde}`} /> {"<"}{LIMITE_VERDE_DISPLAY}%
        </span>
        <span className="flex items-center gap-1">
          <span className={`inline-block w-2 h-2 rounded-full ${SEMAFORO_DOT.amarelo}`} /> {LIMITE_VERDE_DISPLAY}-{LIMITE_AMARELO_DISPLAY}%
        </span>
        <span className="flex items-center gap-1">
          <span className={`inline-block w-2 h-2 rounded-full ${SEMAFORO_DOT.vermelho}`} /> {">"}{LIMITE_AMARELO_DISPLAY}%
        </span>
      </div>
    </div>
  );
}

const LIMITE_VERDE_DISPLAY = 20;
const LIMITE_AMARELO_DISPLAY = 50;

// ── Linha de preço na tabela ─────────────────────────
function PrecoRow({
  preco,
  modoExclusao,
  justificativa,
  processando,
  onIniciarExclusao,
  onConfirmarExclusao,
  onCancelarExclusao,
  onJustificativaChange,
  onReincluir,
}: {
  preco: AnalisePreco;
  modoExclusao: string | null;
  justificativa: string;
  processando: boolean;
  onIniciarExclusao: (precoId: string) => void;
  onConfirmarExclusao: (precoId: string) => void;
  onCancelarExclusao: () => void;
  onJustificativaChange: (v: string) => void;
  onReincluir: (precoId: string) => void;
}) {
  const isExcluindo = modoExclusao === preco.preco_id;

  return (
    <>
      <tr
        className={`border-b last:border-0 ${
          preco.excluido
            ? "bg-muted/30 opacity-70"
            : ""
        }`}
      >
        <td className="px-3 py-2">
          <SemaforoIcon cls={preco.classificacao} />
        </td>
        <td className={`px-3 py-2 ${preco.excluido ? "line-through" : ""}`}>
          <p className="font-medium text-xs">{preco.fonte_nome}</p>
          <p className="text-[10px] text-muted-foreground">{preco.fonte_sigla}</p>
        </td>
        <td className={`px-3 py-2 text-xs ${preco.excluido ? "line-through" : ""}`}>
          {preco.orgao ?? "—"}
        </td>
        <td className={`px-3 py-2 text-right font-mono text-xs ${preco.excluido ? "line-through" : ""}`}>
          {moeda(preco.valor)}
        </td>
        <td className="px-3 py-2 text-right">
          <span
            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium border ${
              SEMAFORO_CORES[preco.classificacao]
            } ${preco.excluido ? "opacity-50" : ""}`}
          >
            {pct(preco.divergencia_percentual)}
          </span>
        </td>
        <td className="px-3 py-2 text-center text-xs">
          {new Date(preco.data_referencia + "T00:00:00").toLocaleDateString("pt-BR")}
        </td>
        <td className="px-3 py-2">
          <div className="flex gap-1 justify-end">
            {preco.excluido ? (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => onReincluir(preco.preco_id)}
                disabled={processando}
                title="Reincluir no cálculo"
              >
                <RotateCcw className="h-3 w-3 mr-1" /> Reincluir
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-destructive"
                onClick={() => onIniciarExclusao(preco.preco_id)}
                disabled={processando}
                title="Excluir do cálculo"
              >
                <Ban className="h-3 w-3 mr-1" /> Excluir
              </Button>
            )}
          </div>
        </td>
      </tr>

      {/* Justificativa de exclusão (se excluído) */}
      {preco.excluido && preco.justificativa_exclusao && (
        <tr className="bg-muted/20">
          <td colSpan={7} className="px-6 py-1.5 text-xs text-muted-foreground italic">
            Motivo: {preco.justificativa_exclusao}
          </td>
        </tr>
      )}

      {/* Form de exclusão inline */}
      {isExcluindo && (
        <tr className="bg-red-50/50">
          <td colSpan={7} className="px-4 py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
              <Input
                className="flex-1"
                placeholder="Justificativa obrigatória para exclusão..."
                value={justificativa}
                onChange={(e) => onJustificativaChange(e.target.value)}
                autoFocus
              />
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onConfirmarExclusao(preco.preco_id)}
                disabled={processando || !justificativa.trim()}
              >
                {processando ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "Confirmar"
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onCancelarExclusao}
              >
                Cancelar
              </Button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
