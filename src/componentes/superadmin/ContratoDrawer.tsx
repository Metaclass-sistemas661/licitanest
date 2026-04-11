import { useEffect, useState } from "react";
import {
  X,
  FileText,
  Building2,
  DollarSign,
  Calendar,
  Users,
  ShieldCheck,
  Pencil,
  Download,
  History,
  PlusCircle,
  Loader2,
  Send,
  Zap,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  buscarContrato,
  buscarHistoricoContrato,
  downloadPdfContrato,
  enviarContratoParaMunicipio,
  ativarContrato,
} from "@/servicos/contratos";
import { PdfViewer } from "./PdfViewer";
import { AditivoModal } from "./AditivoModal";
import type { Contrato, ContratoAditivo, ContratoHistorico, StatusContrato } from "@/tipos";

interface ContratoDrawerProps {
  contratoId: string | null;
  onClose: () => void;
  onAtualizado: () => void;
}

const STATUS_MAP: Record<StatusContrato, { label: string; class: string }> = {
  rascunho: { label: "Rascunho", class: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  pendente_assinatura: { label: "Pend. Assinatura", class: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  ativo: { label: "Ativo", class: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  suspenso: { label: "Suspenso", class: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  encerrado: { label: "Encerrado", class: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  cancelado: { label: "Cancelado", class: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  renovacao: { label: "Renovação", class: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
};

function formatarCentavos(v: number | null): string {
  if (v == null) return "—";
  return (v / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

function tempoRelativo(d: string | null): string {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Agora";
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d atrás`;
  return formatarData(d);
}

type Tab = "dados" | "aditivos" | "historico";

export function ContratoDrawer({ contratoId, onClose, onAtualizado }: ContratoDrawerProps) {
  const nav = useNavigate();
  const [contrato, setContrato] = useState<(Contrato & { aditivos: ContratoAditivo[] }) | null>(null);
  const [historico, setHistorico] = useState<ContratoHistorico[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("dados");
  const [pdfAberto, setPdfAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [ativando, setAtivando] = useState(false);
  const [aditivoAberto, setAditivoAberto] = useState(false);

  function reload() {
    if (!contratoId) return;
    Promise.all([
      buscarContrato(contratoId),
      buscarHistoricoContrato(contratoId),
    ]).then(([cRes, hRes]) => {
      setContrato(cRes.data);
      setHistorico(hRes.data);
    });
  }

  useEffect(() => {
    if (!contratoId) { setContrato(null); return; }
    setLoading(true);
    setTab("dados");
    Promise.all([
      buscarContrato(contratoId),
      buscarHistoricoContrato(contratoId),
    ])
      .then(([cRes, hRes]) => {
        setContrato(cRes.data);
        setHistorico(hRes.data);
      })
      .catch(() => toast.error("Erro ao carregar contrato"))
      .finally(() => setLoading(false));
  }, [contratoId]);

  if (!contratoId) return null;

  const valorMensal = contrato && contrato.quantidade_parcelas > 0
    ? Math.round(contrato.valor_total / contrato.quantidade_parcelas)
    : 0;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-background border-l shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-superadmin-accent/10">
              <FileText className="h-5 w-5 text-superadmin-accent" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold truncate">
                {loading ? "Carregando..." : contrato?.numero_contrato || "—"}
              </h2>
              {contrato && (
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_MAP[contrato.status].class}`}>
                  {STATUS_MAP[contrato.status].label}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-6">
          {(
            [
              { key: "dados", label: "Dados", icon: FileText },
              { key: "aditivos", label: `Aditivos${contrato?.aditivos?.length ? ` (${contrato.aditivos.length})` : ""}`, icon: PlusCircle },
              { key: "historico", label: "Histórico", icon: History },
            ] as { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[]
          ).map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors
                  ${active ? "border-superadmin-accent text-superadmin-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-superadmin-accent" />
            </div>
          ) : !contrato ? (
            <div className="text-center py-20 text-muted-foreground text-sm">Contrato não encontrado</div>
          ) : tab === "dados" ? (
            <div className="space-y-6">
              {/* Prefeitura */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" /> Prefeitura
                </h3>
                <div className="rounded-lg border p-3 space-y-1">
                  <div className="font-medium">{contrato.municipio_nome || "—"}</div>
                  <div className="text-xs text-muted-foreground">{contrato.municipio_uf || ""}</div>
                </div>
              </section>

              {/* Objeto */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Objeto</h3>
                <p className="text-sm">{contrato.objeto}</p>
              </section>

              {/* Processo + Modalidade */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-muted-foreground">Nº Processo</span>
                  <div className="text-sm font-medium">{contrato.numero_processo || "—"}</div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Modalidade</span>
                  <div className="text-sm font-medium">{contrato.modalidade || "—"}</div>
                </div>
              </div>

              {/* Valores */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" /> Valores
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border p-3 text-center">
                    <div className="text-xs text-muted-foreground">Total</div>
                    <div className="text-sm font-bold">{formatarCentavos(contrato.valor_total)}</div>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <div className="text-xs text-muted-foreground">Mensal</div>
                    <div className="text-sm font-bold">{formatarCentavos(valorMensal)}</div>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <div className="text-xs text-muted-foreground">Parcelas</div>
                    <div className="text-sm font-bold">{contrato.quantidade_parcelas}</div>
                  </div>
                </div>
              </section>

              {/* Vigência */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Vigência
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <span className="text-xs text-muted-foreground">Início</span>
                    <div className="text-sm font-medium">{formatarData(contrato.data_inicio)}</div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Término</span>
                    <div className="text-sm font-medium">{formatarData(contrato.data_fim)}</div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Assinatura</span>
                    <div className="text-sm font-medium">{formatarData(contrato.data_assinatura)}</div>
                  </div>
                </div>
              </section>

              {/* Limites */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Limites
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border p-3 text-center">
                    <div className="text-xs text-muted-foreground">Usuários</div>
                    <div className="text-sm font-bold">{contrato.limite_usuarios}</div>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <div className="text-xs text-muted-foreground">Cestas</div>
                    <div className="text-sm font-bold">{contrato.limite_cestas}</div>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <div className="text-xs text-muted-foreground">Cotações/mês</div>
                    <div className="text-sm font-bold">{contrato.limite_cotacoes_mes}</div>
                  </div>
                </div>
              </section>

              {/* Responsável */}
              {contrato.responsavel_nome && (
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" /> Responsável
                  </h3>
                  <div className="rounded-lg border p-3 space-y-1">
                    <div className="font-medium">{contrato.responsavel_nome}</div>
                    <div className="text-xs text-muted-foreground">{contrato.responsavel_cargo || ""}</div>
                    {contrato.responsavel_cpf && (
                      <div className="text-xs text-muted-foreground">CPF: {contrato.responsavel_cpf}</div>
                    )}
                  </div>
                </section>
              )}

              {/* Assinatura digital */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" /> Assinatura Digital
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-muted-foreground">Status</span>
                    <div className="text-sm font-medium capitalize">{contrato.assinatura_digital_status}</div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Assinado em</span>
                    <div className="text-sm font-medium">{formatarData(contrato.assinatura_digital_em)}</div>
                  </div>
                </div>
              </section>

              {/* Datas */}
              <section className="space-y-1 text-xs text-muted-foreground">
                <div>Criado em: {formatarData(contrato.criado_em)}</div>
                <div>Atualizado: {tempoRelativo(contrato.atualizado_em)}</div>
              </section>
            </div>
          ) : tab === "aditivos" ? (
            <div className="space-y-3">
              {contrato.status !== "cancelado" && contrato.status !== "encerrado" && (
                <button
                  type="button"
                  onClick={() => setAditivoAberto(true)}
                  className="flex items-center gap-1.5 w-full justify-center rounded-lg border-2 border-dashed py-2.5 text-sm font-medium text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                >
                  <PlusCircle className="h-4 w-4" /> Novo Aditivo
                </button>
              )}
              {!contrato.aditivos?.length ? (
                <div className="text-center py-12 text-muted-foreground text-sm">Nenhum aditivo registrado</div>
              ) : (
                contrato.aditivos.map((a) => (
                  <div key={a.id} className="rounded-lg border p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{a.numero_aditivo}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium capitalize">{a.tipo}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{a.descricao}</p>
                    <div className="flex items-center gap-4 text-xs">
                      {a.valor_acrescimo > 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          +{formatarCentavos(a.valor_acrescimo)}
                        </span>
                      )}
                      {a.nova_data_fim && (
                        <span>Nova vigência: {formatarData(a.nova_data_fim)}</span>
                      )}
                      <span className="text-muted-foreground">{formatarData(a.criado_em)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* historico */
            <div className="space-y-2">
              {historico.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">Nenhum registro no histórico</div>
              ) : (
                historico.map((h) => (
                  <div key={h.id} className="flex gap-3 border-l-2 border-muted pl-3 py-2">
                    <div className="flex-1">
                      <div className="text-xs font-medium">{h.acao}</div>
                      {h.campo_alterado && (
                        <div className="text-[11px] text-muted-foreground">
                          {h.campo_alterado}: <span className="line-through">{h.valor_anterior || "—"}</span> → {h.valor_novo || "—"}
                        </div>
                      )}
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {h.usuario_nome || "Sistema"} • {tempoRelativo(h.criado_em)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {contrato && (
          <div className="border-t px-6 py-3 flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => { nav(`/superadmin/contratos/${contrato.id}/editar`); onClose(); }}
              className="flex items-center gap-1.5 rounded-lg bg-superadmin-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
            >
              <Pencil className="h-3.5 w-3.5" /> Editar
            </button>

            {/* Enviar para município */}
            {(contrato.status === "rascunho" || contrato.status === "pendente_assinatura") && (
              <button
                type="button"
                disabled={enviando}
                onClick={async () => {
                  setEnviando(true);
                  try {
                    await enviarContratoParaMunicipio(contrato.id);
                    toast.success("Contrato enviado para o município");
                    reload();
                    onAtualizado();
                  } catch { toast.error("Erro ao enviar contrato"); }
                  finally { setEnviando(false); }
                }}
                className="flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 dark:bg-blue-950/30 px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors disabled:opacity-50"
              >
                {enviando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Enviar p/ Município
              </button>
            )}

            {/* Ativar contrato */}
            {contrato.status !== "ativo" && contrato.status !== "cancelado" && contrato.status !== "encerrado" && (
              <button
                type="button"
                disabled={ativando}
                onClick={async () => {
                  setAtivando(true);
                  try {
                    const { data } = await ativarContrato(contrato.id);
                    toast.success(`Contrato ativado — ${data.faturas_geradas} fatura(s) gerada(s)`);
                    reload();
                    onAtualizado();
                  } catch { toast.error("Erro ao ativar contrato"); }
                  finally { setAtivando(false); }
                }}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors disabled:opacity-50"
              >
                {ativando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                Ativar
              </button>
            )}

            {/* PDF */}
            {contrato.pdf_url && (
              <>
                <button
                  type="button"
                  onClick={() => setPdfAberto(true)}
                  className="flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" /> PDF
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const { data } = await downloadPdfContrato(contrato.id);
                      window.open(data.url, "_blank");
                    } catch { toast.error("Erro ao baixar PDF"); }
                  }}
                  className="flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                >
                  <Download className="h-3.5 w-3.5" /> Baixar
                </button>
              </>
            )}
          </div>
        )}

        {/* PDF Viewer modal */}
        {pdfAberto && contrato?.pdf_url && (
          <PdfViewer
            contratoId={contrato.id}
            nomeArquivo={contrato.pdf_nome_arquivo}
            onClose={() => setPdfAberto(false)}
          />
        )}

        {/* Aditivo modal */}
        {aditivoAberto && contrato && (
          <AditivoModal
            contrato={contrato}
            onClose={() => setAditivoAberto(false)}
            onCriado={() => { reload(); onAtualizado(); }}
          />
        )}
      </div>
    </>
  );
}
