import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DOMPurify from "dompurify";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Badge } from "@/componentes/ui/badge";
import {
  ArrowLeft,
  FileSignature,
  Download,
  Eye,
  Clock,
  CheckCircle,
  AlertTriangle,

  FileText,
  Loader2,
  History,
  Banknote,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  buscarContratoPortal,
  listarFaturasContrato,
  downloadPdfContrato,
  buscarHistoricoContrato,
} from "@/servicos/contratos";
import { VerificacaoIdentidadeModal } from "@/componentes/contratos/VerificacaoIdentidadeModal";
import { AssinaturaDigitalModal } from "@/componentes/contratos/AssinaturaDigitalModal";
import type { Contrato, ContratoAditivo, ContratoHistorico, StatusContrato } from "@/tipos";

interface Fatura {
  id: string;
  parcela: number;
  valor: number;
  vencimento: string;
  status: string;
}

const STATUS_LABEL: Record<StatusContrato, string> = {
  rascunho: "Rascunho",
  pendente_assinatura: "Pendente Assinatura",
  ativo: "Ativo",
  suspenso: "Suspenso",
  encerrado: "Encerrado",
  cancelado: "Cancelado",
  renovacao: "Em Renovação",
};
const STATUS_VARIANT: Record<StatusContrato, string> = {
  rascunho: "secondary",
  pendente_assinatura: "warning",
  ativo: "success",
  suspenso: "warning",
  encerrado: "secondary",
  cancelado: "destructive",
  renovacao: "default",
};

function formatarMoeda(centavos: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(centavos / 100);
}

export function ContratoDetalhePortalPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [contrato, setContrato] = useState<(Contrato & { aditivos: ContratoAditivo[] }) | null>(null);
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [historico, setHistorico] = useState<ContratoHistorico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<"dados" | "faturas" | "aditivos" | "historico">("dados");

  // Verificação de identidade
  const [mostrarVerificacao, setMostrarVerificacao] = useState(false);
  const [tokenAcesso, setTokenAcesso] = useState<string | null>(null);
  const [verificado, setVerificado] = useState(false);

  // Assinatura digital
  const [mostrarAssinatura, setMostrarAssinatura] = useState(false);

  // PDF viewer
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [carregandoPdf, setCarregandoPdf] = useState(false);

  const carregar = useCallback(async () => {
    if (!id) return;
    setCarregando(true);
    try {
      const [contRes, fatRes] = await Promise.all([
        buscarContratoPortal(id),
        listarFaturasContrato(id),
      ]);
      setContrato(contRes.data);
      setFaturas(fatRes.data as Fatura[]);

      // Historico
      try {
        const histRes = await buscarHistoricoContrato(id);
        setHistorico(histRes.data);
      } catch { /* portal may not have access */ }
    } catch {
      toast.error("Erro ao carregar contrato");
      navigate("/contratos");
    } finally {
      setCarregando(false);
    }
  }, [id, navigate]);

  useEffect(() => { carregar(); }, [carregar]);

  // Se contrato é pendente_assinatura e não verificado, mostrar verificação
  useEffect(() => {
    if (contrato && contrato.status === "pendente_assinatura" && !verificado) {
      setMostrarVerificacao(true);
    }
  }, [contrato, verificado]);

  const handleVerificado = (token: string) => {
    setTokenAcesso(token);
    setVerificado(true);
    setMostrarVerificacao(false);
    toast.success("Identidade verificada com sucesso");
  };

  const handleBaixarPdf = async () => {
    if (!id) return;
    setCarregandoPdf(true);
    try {
      const res = await downloadPdfContrato(id);
      window.open(res.data.url, "_blank");
    } catch {
      toast.error("Erro ao baixar PDF");
    } finally {
      setCarregandoPdf(false);
    }
  };

  const handleVisualizarPdf = async () => {
    if (!id) return;
    setCarregandoPdf(true);
    try {
      const res = await downloadPdfContrato(id);
      setPdfUrl(res.data.url);
    } catch {
      toast.error("Erro ao carregar PDF");
    } finally {
      setCarregandoPdf(false);
    }
  };

  const handleAssinado = () => {
    carregar();
  };

  if (carregando) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!contrato) return null;

  const diasRestantes = contrato.data_fim
    ? Math.ceil((new Date(contrato.data_fim).getTime() - Date.now()) / 86400000)
    : null;

  const vigenciaTexto = `${contrato.data_inicio ? new Date(contrato.data_inicio).toLocaleDateString("pt-BR") : "N/A"} a ${contrato.data_fim ? new Date(contrato.data_fim).toLocaleDateString("pt-BR") : "N/A"}`;

  // Se pendente e não verificou, bloquear conteúdo
  const bloqueado = contrato.status === "pendente_assinatura" && !verificado;

  return (
    <div className="space-y-6">
      {/* Verificação de identidade */}
      {mostrarVerificacao && (
        <VerificacaoIdentidadeModal
          contratoId={contrato.id}
          onVerificado={handleVerificado}
          onClose={() => {
            setMostrarVerificacao(false);
            if (!verificado) navigate("/contratos");
          }}
        />
      )}

      {/* Assinatura digital */}
      {mostrarAssinatura && tokenAcesso && (
        <AssinaturaDigitalModal
          contratoId={contrato.id}
          contratoNumero={contrato.numero_contrato}
          contratoValor={contrato.valor_total}
          contratoVigencia={vigenciaTexto}
          tokenAcesso={tokenAcesso}
          onAssinado={handleAssinado}
          onClose={() => setMostrarAssinatura(false)}
        />
      )}

      {/* PDF Viewer Fullscreen */}
      {pdfUrl && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="flex items-center justify-between border-b p-3">
            <h3 className="font-semibold">Visualizar PDF — {contrato.numero_contrato}</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleBaixarPdf}>
                <Download className="mr-1 h-4 w-4" /> Baixar
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPdfUrl(null)}>
                Fechar
              </Button>
            </div>
          </div>
          <iframe
            src={`${pdfUrl}#toolbar=1&navpanes=1`}
            className="flex-1 w-full"
            title="PDF do Contrato"
          />
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/contratos")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">{contrato.numero_contrato}</h2>
              <Badge variant={STATUS_VARIANT[contrato.status] as "default"}>
                {STATUS_LABEL[contrato.status]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-1">{contrato.objeto}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {contrato.pdf_url && (
            <>
              <Button variant="outline" size="sm" onClick={handleVisualizarPdf} disabled={carregandoPdf || bloqueado}>
                <Eye className="mr-1 h-4 w-4" /> Ver PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleBaixarPdf} disabled={carregandoPdf || bloqueado}>
                <Download className="mr-1 h-4 w-4" /> Baixar PDF
              </Button>
            </>
          )}
          {contrato.status === "pendente_assinatura" && verificado && (
            <Button onClick={() => setMostrarAssinatura(true)}>
              <FileSignature className="mr-2 h-4 w-4" />
              Assinar Contrato
            </Button>
          )}
        </div>
      </div>

      {/* ── Bloqueio se não verificado ── */}
      {bloqueado && (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-600" />
            <div>
              <h3 className="text-lg font-bold text-amber-800 dark:text-amber-200">
                Verificação de identidade necessária
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Para acessar este contrato pendente de assinatura, você precisa verificar sua identidade.
              </p>
            </div>
            <Button onClick={() => setMostrarVerificacao(true)}>
              Verificar Identidade
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Conteúdo (só se não bloqueado) ── */}
      {!bloqueado && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* ── Abas ── */}
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {([
              { key: "dados", label: "Dados", icon: FileText },
              { key: "faturas", label: `Faturas (${faturas.length})`, icon: Banknote },
              { key: "aditivos", label: `Aditivos (${contrato.aditivos?.length ?? 0})`, icon: FileSignature },
              { key: "historico", label: "Histórico", icon: History },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setAbaAtiva(tab.key)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  abaAtiva === tab.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Tab: Dados ── */}
          {abaAtiva === "dados" && (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Dados principais */}
              <Card>
                <CardHeader><CardTitle className="text-base">Dados do Contrato</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Row label="Nº Contrato" value={contrato.numero_contrato} />
                  <Row label="Objeto" value={contrato.objeto} />
                  <Row label="Modalidade" value={contrato.modalidade ?? "—"} />
                  <Row label="Nº Processo" value={contrato.numero_processo ?? "—"} />
                  <Row label="Observações" value={contrato.observacoes ?? "—"} />
                </CardContent>
              </Card>

              {/* Valores */}
              <Card>
                <CardHeader><CardTitle className="text-base">Valores e Vigência</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Row label="Valor Total" value={formatarMoeda(contrato.valor_total)} bold />
                  <Row label="Valor Mensal" value={contrato.valor_mensal ? formatarMoeda(contrato.valor_mensal) : "—"} />
                  <Row label="Parcelas" value={String(contrato.quantidade_parcelas ?? "—")} />
                  <Row label="Vigência" value={vigenciaTexto} />
                  {diasRestantes !== null && contrato.status === "ativo" && (
                    <Row
                      label="Dias restantes"
                      value={
                        <span className={diasRestantes <= 30 ? "text-red-600 font-semibold" : diasRestantes <= 90 ? "text-amber-600 font-semibold" : ""}>
                          {diasRestantes > 0 ? `${diasRestantes} dias` : "Vencido"}
                        </span>
                      }
                    />
                  )}
                </CardContent>
              </Card>

              {/* Limites */}
              <Card>
                <CardHeader><CardTitle className="text-base">Limites Contratados</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Row label="Usuários" value={String(contrato.limite_usuarios ?? "Ilimitado")} />
                  <Row label="Cestas" value={String(contrato.limite_cestas ?? "Ilimitado")} />
                  <Row label="Cotações/mês" value={String(contrato.limite_cotacoes_mes ?? "Ilimitado")} />
                </CardContent>
              </Card>

              {/* Responsável */}
              <Card>
                <CardHeader><CardTitle className="text-base">Responsável pelo Contrato</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Row label="Nome" value={contrato.responsavel_nome ?? "—"} />
                  <Row label="Cargo" value={contrato.responsavel_cargo ?? "—"} />
                  <Row label="CPF" value={contrato.responsavel_cpf ?? "—"} />
                </CardContent>
              </Card>

              {/* Assinatura Digital */}
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="text-base">Assinatura Digital</CardTitle></CardHeader>
                <CardContent className="text-sm">
                  {contrato.assinatura_digital_status === "assinado" ? (
                    <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
                      <CheckCircle className="h-6 w-6 text-emerald-600" />
                      <div>
                        <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                          Documento assinado digitalmente
                        </p>
                        <p className="text-xs text-emerald-700 dark:text-emerald-300">
                          Assinado em {contrato.assinatura_digital_em ? new Date(contrato.assinatura_digital_em).toLocaleString("pt-BR") : "—"}
                        </p>
                        {contrato.assinatura_digital_hash && (
                          <p className="mt-1 font-mono text-xs text-muted-foreground">
                            Hash: {contrato.assinatura_digital_hash.slice(0, 32)}...
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
                      <AlertTriangle className="h-6 w-6 text-amber-600" />
                      <div>
                        <p className="font-semibold text-amber-800 dark:text-amber-200">
                          Assinatura pendente
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          Este contrato aguarda assinatura digital com certificado ICP-Brasil.
                        </p>
                      </div>
                      {contrato.status === "pendente_assinatura" && verificado && (
                        <Button size="sm" className="ml-auto" onClick={() => setMostrarAssinatura(true)}>
                          <FileSignature className="mr-1 h-4 w-4" />
                          Assinar
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Conteúdo HTML */}
              {contrato.conteudo_html && (
                <Card className="lg:col-span-2">
                  <CardHeader><CardTitle className="text-base">Conteúdo do Contrato</CardTitle></CardHeader>
                  <CardContent>
                    <div
                      className="prose prose-sm max-w-none dark:prose-invert rounded-lg border bg-white p-6 dark:bg-muted/20"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(contrato.conteudo_html, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'tr', 'td', 'th', 'tbody', 'thead', 'tfoot', 'div', 'span', 'hr', 'blockquote', 'pre', 'code', 'img', 'sub', 'sup'], ALLOWED_ATTR: ['href', 'title', 'target', 'src', 'alt', 'class', 'style', 'colspan', 'rowspan'] }) }}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ── Tab: Faturas ── */}
          {abaAtiva === "faturas" && (
            <Card>
              <CardContent className="p-0">
                {faturas.length === 0 ? (
                  <p className="p-8 text-center text-sm text-muted-foreground">
                    Nenhuma fatura gerada para este contrato.
                  </p>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                        <th className="p-4">Parcela</th>
                        <th className="p-4 text-right">Valor</th>
                        <th className="p-4">Vencimento</th>
                        <th className="p-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {faturas.map((f) => (
                        <tr key={f.id} className="border-b">
                          <td className="p-4 font-medium">{f.parcela}ª</td>
                          <td className="p-4 text-right font-mono text-sm">{formatarMoeda(f.valor)}</td>
                          <td className="p-4 text-sm">
                            {new Date(f.vencimento).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="p-4">
                            <Badge
                              variant={
                                f.status === "paga" ? "success" :
                                f.status === "vencida" ? "destructive" : "warning"
                              }
                            >
                              {f.status === "paga" ? "Paga" : f.status === "vencida" ? "Vencida" : "Pendente"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Tab: Aditivos ── */}
          {abaAtiva === "aditivos" && (
            <Card>
              <CardContent className="p-0">
                {(!contrato.aditivos || contrato.aditivos.length === 0) ? (
                  <p className="p-8 text-center text-sm text-muted-foreground">
                    Nenhum aditivo registrado.
                  </p>
                ) : (
                  <div className="divide-y">
                    {contrato.aditivos.map((a) => (
                      <div key={a.id} className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{a.numero_aditivo}</span>
                          <Badge variant="secondary">
                            {a.tipo === "valor" ? "Valor" : a.tipo === "prazo" ? "Prazo" : a.tipo === "objeto" ? "Objeto" : "Misto"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm">{a.descricao}</p>
                        <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                          {a.valor_acrescimo && (
                            <span>Acréscimo: {formatarMoeda(a.valor_acrescimo)}</span>
                          )}
                          {a.nova_data_fim && (
                            <span>Nova data fim: {new Date(a.nova_data_fim).toLocaleDateString("pt-BR")}</span>
                          )}
                          <span>Criado em: {new Date(a.criado_em).toLocaleDateString("pt-BR")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Tab: Histórico ── */}
          {abaAtiva === "historico" && (
            <Card>
              <CardContent className="p-0">
                {historico.length === 0 ? (
                  <p className="p-8 text-center text-sm text-muted-foreground">
                    Nenhum registro de histórico.
                  </p>
                ) : (
                  <div className="divide-y">
                    {historico.map((h) => (
                      <div key={h.id} className="flex items-center gap-3 p-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                          <Clock className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{h.acao}</p>
                          {h.valor_novo && (
                            <p className="text-xs text-muted-foreground">{h.valor_novo}</p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(h.criado_em).toLocaleString("pt-BR")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ── Helper Row component ──
function Row({ label, value, bold }: { label: string; value: React.ReactNode; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "font-bold" : "font-medium"}>{value}</span>
    </div>
  );
}
