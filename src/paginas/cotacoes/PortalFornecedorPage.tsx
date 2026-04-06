// ═══════════════════════════════════════════════════════════════════════════════
// PortalFornecedorPage — Fase 9
// Área pública (sem login) para fornecedores responderem cotações.
// Acesso via token: /portal/cotacao/:token
// ═══════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Badge } from "@/componentes/ui/badge";
import { Separator } from "@/componentes/ui/separator";
import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  FileText,
  Loader2,
  Package,
  Scale,
  Send,
  Shield,
  User,
} from "lucide-react";
import { usePortalFornecedor } from "@/hooks/useCotacoes";
import type { CotacaoItem as _CotacaoItem } from "@/tipos";

function fmtData(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

interface RespostaForm {
  cotacao_item_id: string;
  marca: string;
  valor_unitario: string;
  observacoes: string;
  registro_anvisa: string;
}

export function PortalFornecedorPage() {
  const { token } = useParams<{ token: string }>();
  const { dados, carregando, salvando, erro, sucesso, carregarPorToken, salvarRespostas } = usePortalFornecedor();

  const [respostas, setRespostas] = useState<Map<string, RespostaForm>>(new Map());
  const [dadosForn, setDadosForn] = useState({
    endereco_completo: "",
    cep: "",
    cidade: "",
    uf: "",
    prazo_validade_dias: "60",
    nome_responsavel: "",
    cpf_responsavel: "",
  });

  useEffect(() => {
    if (token) carregarPorToken(token);
  }, [token, carregarPorToken]);

  // Preencher respostas existentes
  useEffect(() => {
    if (!dados) return;
    const map = new Map<string, RespostaForm>();
    for (const item of dados.itens) {
      const existente = dados.respostas_existentes.find(r => r.cotacao_item_id === item.id);
      map.set(item.id, {
        cotacao_item_id: item.id,
        marca: existente?.marca ?? "",
        valor_unitario: existente?.valor_unitario?.toString() ?? "",
        observacoes: existente?.observacoes ?? "",
        registro_anvisa: existente?.registro_anvisa ?? "",
      });
    }
    setRespostas(map);

    // Dados fornecedor das respostas existentes
    if (dados.respostas_existentes.length > 0) {
      const r = dados.respostas_existentes[0];
      setDadosForn(prev => ({
        ...prev,
        endereco_completo: r.endereco_completo ?? "",
        cep: r.cep ?? "",
        cidade: r.cidade ?? "",
        uf: r.uf ?? "",
        prazo_validade_dias: r.prazo_validade_dias?.toString() ?? "60",
        nome_responsavel: r.nome_responsavel ?? "",
        cpf_responsavel: r.cpf_responsavel ?? "",
      }));
    }
  }, [dados]);

  const atualizarResposta = useCallback((itemId: string, campo: keyof RespostaForm, valor: string) => {
    setRespostas(prev => {
      const next = new Map(prev);
      const atual = next.get(itemId);
      if (atual) {
        next.set(itemId, { ...atual, [campo]: valor });
      }
      return next;
    });
  }, []);

  const handleEnviar = async () => {
    if (!dados) return;
    const resps = Array.from(respostas.values())
      .filter(r => r.valor_unitario)
      .map(r => ({
        cotacao_item_id: r.cotacao_item_id,
        marca: r.marca || undefined,
        valor_unitario: parseFloat(r.valor_unitario),
        valor_total: undefined,
        observacoes: r.observacoes || undefined,
        registro_anvisa: r.registro_anvisa || undefined,
      }));

    if (resps.length === 0) {
      toast.warning("Preencha o valor de pelo menos um item.");
      return;
    }

    await salvarRespostas(
      dados.fornecedor.id,
      resps,
      {
        endereco_completo: dadosForn.endereco_completo || undefined,
        cep: dadosForn.cep || undefined,
        cidade: dadosForn.cidade || undefined,
        uf: dadosForn.uf || undefined,
        prazo_validade_dias: dadosForn.prazo_validade_dias ? parseInt(dadosForn.prazo_validade_dias) : undefined,
        nome_responsavel: dadosForn.nome_responsavel || undefined,
        cpf_responsavel: dadosForn.cpf_responsavel || undefined,
      },
    );
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando cotação…</p>
        </div>
      </div>
    );
  }

  // ── Erro ───────────────────────────────────────────────────────────────────
  if (erro) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-10 text-center">
            <AlertCircle className="mb-4 h-12 w-12 text-red-400" />
            <h2 className="text-xl font-bold">Acesso Inválido</h2>
            <p className="mt-2 text-sm text-muted-foreground">{erro}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!dados) return null;

  const encerrada = new Date(dados.cotacao.data_encerramento) < new Date();
  const cotacaoAberta = dados.cotacao.status !== "encerrada" && dados.cotacao.status !== "cancelada" && !encerrada;

  // ── Sucesso ────────────────────────────────────────────────────────────────
  if (sucesso) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-10 text-center">
            <CheckCircle2 className="mb-4 h-12 w-12 text-green-500" />
            <h2 className="text-xl font-bold text-green-700">Proposta Enviada!</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Sua proposta foi registrada com sucesso. Você pode atualizar seus valores a qualquer momento antes do encerramento da cotação.
            </p>
            <Button className="mt-6" onClick={() => window.location.reload()}>
              Revisar / Atualizar Proposta
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header público ────────────────────────────────────────────── */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Scale className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">LicitaNest</h1>
            <p className="text-[10px] text-muted-foreground">Portal de Cotação Eletrônica</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        {/* ── Info da cotação ───────────────────────────────────────── */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">{dados.cotacao.titulo}</h2>
                {dados.cotacao.descricao && (
                  <p className="mt-1 text-sm text-muted-foreground">{dados.cotacao.descricao}</p>
                )}
              </div>
              {cotacaoAberta ? (
                <Badge className="bg-green-100 text-green-700">Aberta</Badge>
              ) : (
                <Badge variant="destructive">Encerrada</Badge>
              )}
            </div>

            <Separator className="my-4" />

            <div className="grid gap-4 sm:grid-cols-3 text-sm">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Entidade Solicitante</p>
                  <p className="font-medium">{dados.entidade_solicitante}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Objeto</p>
                  <p className="font-medium">{dados.cesta_descricao}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Prazo</p>
                  <p className="font-medium">{fmtData(dados.cotacao.data_abertura)} → {fmtData(dados.cotacao.data_encerramento)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Identificação do fornecedor ──────────────────────────── */}
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <User className="h-4 w-4" />
              Dados do Fornecedor
            </h3>
            <div className="flex gap-4 text-sm mb-4">
              <div>
                <span className="text-muted-foreground">Razão Social:</span>{" "}
                <strong>{dados.fornecedor.razao_social}</strong>
              </div>
              {dados.fornecedor.cpf_cnpj && (
                <div>
                  <span className="text-muted-foreground">CPF/CNPJ:</span>{" "}
                  <strong>{dados.fornecedor.cpf_cnpj}</strong>
                </div>
              )}
            </div>

            <Separator className="my-4" />

            <h4 className="mb-2 text-sm font-medium text-muted-foreground">Dados complementares (opcional)</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Endereço completo"
                value={dadosForn.endereco_completo}
                onChange={e => setDadosForn(p => ({ ...p, endereco_completo: e.target.value }))}
                disabled={!cotacaoAberta}
              />
              <div className="grid grid-cols-3 gap-2">
                <Input
                  placeholder="CEP"
                  value={dadosForn.cep}
                  onChange={e => setDadosForn(p => ({ ...p, cep: e.target.value }))}
                  disabled={!cotacaoAberta}
                />
                <Input
                  placeholder="Cidade"
                  value={dadosForn.cidade}
                  onChange={e => setDadosForn(p => ({ ...p, cidade: e.target.value }))}
                  disabled={!cotacaoAberta}
                />
                <Input
                  placeholder="UF"
                  maxLength={2}
                  value={dadosForn.uf}
                  onChange={e => setDadosForn(p => ({ ...p, uf: e.target.value.toUpperCase() }))}
                  disabled={!cotacaoAberta}
                />
              </div>
              <Input
                placeholder="Prazo de validade (dias)"
                type="number"
                value={dadosForn.prazo_validade_dias}
                onChange={e => setDadosForn(p => ({ ...p, prazo_validade_dias: e.target.value }))}
                disabled={!cotacaoAberta}
              />
              <Input
                placeholder="Nome do responsável"
                value={dadosForn.nome_responsavel}
                onChange={e => setDadosForn(p => ({ ...p, nome_responsavel: e.target.value }))}
                disabled={!cotacaoAberta}
              />
              <Input
                placeholder="CPF do responsável"
                value={dadosForn.cpf_responsavel}
                onChange={e => setDadosForn(p => ({ ...p, cpf_responsavel: e.target.value }))}
                disabled={!cotacaoAberta}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Itens para precificar ───────────────────────────────── */}
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 flex items-center gap-2 font-semibold">
              <Package className="h-4 w-4" />
              Itens da Cotação ({dados.itens.length})
            </h3>

            <div className="space-y-4">
              {dados.itens.map((item, idx) => {
                const prod = item.item_cesta?.produto;
                const resp = respostas.get(item.id);
                const exigeAnvisa = item.exige_anvisa;
                const temResposta = !!resp?.valor_unitario;
                return (
                  <div
                    key={item.id}
                    className={`rounded-lg border p-4 transition ${temResposta ? "border-green-200 bg-green-50/50" : ""}`}
                  >
                    {/* Cabeçalho do item */}
                    <div className="flex items-start gap-3 mb-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium">{prod?.descricao ?? "Item"}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                          <span>Qtd: {item.quantidade} {item.unidade ?? prod?.unidade_medida?.sigla ?? ""}</span>
                          {prod?.categoria && <span>Categoria: {prod.categoria.nome}</span>}
                          {item.descricao_complementar && <span>{item.descricao_complementar}</span>}
                        </div>
                      </div>
                      {temResposta && (
                        <Check className="h-5 w-5 text-green-600" />
                      )}
                    </div>

                    {/* Campos de resposta */}
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                      <div>
                        <label className="mb-1 block text-xs font-medium">Marca</label>
                        <Input
                          placeholder="Marca/Fabricante"
                          value={resp?.marca ?? ""}
                          onChange={e => atualizarResposta(item.id, "marca", e.target.value)}
                          disabled={!cotacaoAberta}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium">Valor Unitário (R$) *</label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0,00"
                          value={resp?.valor_unitario ?? ""}
                          onChange={e => atualizarResposta(item.id, "valor_unitario", e.target.value)}
                          disabled={!cotacaoAberta}
                          className={temResposta ? "border-green-300" : ""}
                        />
                      </div>
                      {exigeAnvisa && (
                        <div>
                          <label className="mb-1 block text-xs font-medium">
                            Registro ANVISA
                            <Badge variant="outline" className="ml-1 text-[9px] bg-purple-50 text-purple-700">Obrigatório</Badge>
                          </label>
                          <Input
                            placeholder="Nº registro"
                            value={resp?.registro_anvisa ?? ""}
                            onChange={e => atualizarResposta(item.id, "registro_anvisa", e.target.value)}
                            disabled={!cotacaoAberta}
                          />
                        </div>
                      )}
                      <div className={exigeAnvisa ? "" : "sm:col-span-2"}>
                        <label className="mb-1 block text-xs font-medium">Observações</label>
                        <Input
                          placeholder="Informações adicionais"
                          value={resp?.observacoes ?? ""}
                          onChange={e => atualizarResposta(item.id, "observacoes", e.target.value)}
                          disabled={!cotacaoAberta}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── Botão enviar ────────────────────────────────────────── */}
        {cotacaoAberta && (
          <div className="flex flex-col items-center gap-3 pb-8">
            <Button
              size="lg"
              onClick={handleEnviar}
              disabled={salvando}
              className="w-full max-w-sm"
            >
              {salvando ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Send className="mr-2 h-5 w-5" />
              )}
              Enviar Proposta
            </Button>
            <p className="text-xs text-muted-foreground text-center max-w-sm">
              <Shield className="inline mr-1 h-3 w-3" />
              Ao enviar, você confirma a veracidade das informações. Esta proposta será registrada com data/hora e poderá ser atualizada até o encerramento.
            </p>
          </div>
        )}

        {!cotacaoAberta && (
          <Card>
            <CardContent className="flex items-center gap-3 p-4 text-amber-700 bg-amber-50">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm">
                Esta cotação está encerrada. Não é mais possível enviar ou atualizar propostas.
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="border-t bg-white mt-8">
        <div className="mx-auto max-w-4xl px-4 py-4 text-center text-xs text-muted-foreground">
          Powered by <strong>LicitaNest</strong> — Sistema de Cestas de Preços para Compras Públicas
        </div>
      </footer>
    </div>
  );
}
