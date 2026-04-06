import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Separator } from "@/componentes/ui/separator";
import { EmptyState } from "@/componentes/ui/empty-state";
import { PageTransition } from "@/componentes/ui/page-transition";
import { FileOutput, Download, FileText, Building2 } from "lucide-react";
import { api } from "@/lib/api";
import { gerarDadosSICOM, downloadArquivoSICOM } from "@/servicos/exportacaoSicom";
import type { ConfigSICOM, LinhaSICOM } from "@/tipos";
import { toast } from "sonner";

interface CestaSimples {
  id: string;
  nome: string;
  status: string;
  criado_em: string;
}

export function ExportacaoSicomPage() {
  const [cestas, setCestas] = useState<CestaSimples[]>([]);
  const [cestaId, setCestaId] = useState("");
  const [carregandoCestas, setCarregandoCestas] = useState(true);

  const [config, setConfig] = useState<ConfigSICOM>({
    codigo_municipio_ibge: "",
    exercicio: new Date().getFullYear(),
    mes_referencia: new Date().getMonth() + 1,
    tipo_aquisicao: "licitacao",
    numero_processo: "",
    responsavel_nome: "",
    responsavel_cpf: "",
  });

  const [linhas, setLinhas] = useState<LinhaSICOM[]>([]);
  const [textoGerado, setTextoGerado] = useState("");
  const [gerando, setGerando] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await api.get<CestaSimples[]>("/api/cestas");
      setCestas(data ?? []);
      setCarregandoCestas(false);
    })();
  }, []);

  const handleGerar = async () => {
    if (!cestaId) { toast.error("Selecione uma cesta."); return; }
    if (!config.codigo_municipio_ibge) { toast.error("Informe o código IBGE."); return; }
    if (!config.numero_processo) { toast.error("Informe o número do processo."); return; }
    if (!config.responsavel_nome || !config.responsavel_cpf) { toast.error("Informe o responsável."); return; }

    setGerando(true);
    try {
      const result = await gerarDadosSICOM(cestaId, config);
      setLinhas(result.linhas);
      setTextoGerado(result.texto);
      if (result.linhas.length === 0) {
        toast.info("Nenhum item encontrado na cesta para exportar.");
      } else {
        toast.success(`${result.linhas.length} itens gerados no formato SICOM.`);
      }
    } catch {
      toast.error("Erro ao gerar dados SICOM.");
    } finally {
      setGerando(false);
    }
  };

  const handleDownload = () => {
    if (!textoGerado) return;
    const nome = `SICOM_${config.codigo_municipio_ibge}_${config.exercicio}_${String(config.mes_referencia).padStart(2, "0")}.txt`;
    downloadArquivoSICOM(textoGerado, nome);
    toast.success("Arquivo baixado!");
  };

  const updateConfig = (campo: keyof ConfigSICOM, valor: any) =>
    setConfig((prev) => ({ ...prev, [campo]: valor }));

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileOutput className="h-6 w-6 text-primary" />
            Exportação SICOM — TCE/MG
          </h1>
          <p className="text-muted-foreground mt-1">
            Gere o arquivo de exportação no formato exigido pelo SICOM (Sistema Informatizado de Contas dos Municípios) do Tribunal de Contas de Minas Gerais.
          </p>
        </div>

        {/* Formulário */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Dados do Município e Processo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Cesta */}
            <div>
              <label className="text-sm font-medium mb-1 block">Cesta de Preços</label>
              {carregandoCestas ? (
                <div className="h-10 bg-muted animate-pulse rounded" />
              ) : (
                <select
                  value={cestaId}
                  onChange={(e) => setCestaId(e.target.value)}
                  className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                >
                  <option value="">Selecione uma cesta...</option>
                  {cestas.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome} ({c.status})</option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Cód. IBGE do Município</label>
                <Input
                  placeholder="3106200"
                  value={config.codigo_municipio_ibge}
                  onChange={(e) => updateConfig("codigo_municipio_ibge", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Exercício</label>
                <Input
                  type="number"
                  value={config.exercicio}
                  onChange={(e) => updateConfig("exercicio", Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Mês Referência</label>
                <select
                  value={config.mes_referencia}
                  onChange={(e) => updateConfig("mes_referencia", Number(e.target.value))}
                  className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2024, i).toLocaleString("pt-BR", { month: "long" })}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Tipo de Aquisição</label>
                <select
                  value={config.tipo_aquisicao}
                  onChange={(e) => updateConfig("tipo_aquisicao", e.target.value)}
                  className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                >
                  <option value="licitacao">Licitação</option>
                  <option value="dispensa">Dispensa</option>
                  <option value="inexigibilidade">Inexigibilidade</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Número do Processo</label>
                <Input
                  placeholder="001/2024"
                  value={config.numero_processo}
                  onChange={(e) => updateConfig("numero_processo", e.target.value)}
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Nome do Responsável</label>
                <Input
                  placeholder="Nome completo"
                  value={config.responsavel_nome}
                  onChange={(e) => updateConfig("responsavel_nome", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">CPF do Responsável</label>
                <Input
                  placeholder="000.000.000-00"
                  value={config.responsavel_cpf}
                  onChange={(e) => updateConfig("responsavel_cpf", e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleGerar} disabled={gerando}>
                <FileText className="h-4 w-4 mr-2" />
                {gerando ? "Gerando..." : "Gerar Arquivo SICOM"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Prévia */}
        {linhas.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Prévia da Exportação</CardTitle>
                <CardDescription>{linhas.length} itens gerados</CardDescription>
              </div>
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Baixar .TXT
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b text-muted-foreground">
                      <th className="pb-2 font-medium">#</th>
                      <th className="pb-2 font-medium">Código</th>
                      <th className="pb-2 font-medium">Descrição</th>
                      <th className="pb-2 font-medium">Un.</th>
                      <th className="pb-2 font-medium text-right">Qtd</th>
                      <th className="pb-2 font-medium text-right">Vlr Unit.</th>
                      <th className="pb-2 font-medium text-right">Vlr Total</th>
                      <th className="pb-2 font-medium">CNPJ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {linhas.map((l) => (
                      <tr key={l.sequencial} className="hover:bg-muted/50">
                        <td className="py-2 text-muted-foreground">{l.sequencial}</td>
                        <td className="py-2 font-mono text-xs">{l.codigo_item || "—"}</td>
                        <td className="py-2 max-w-[200px] truncate">{l.descricao}</td>
                        <td className="py-2">{l.unidade}</td>
                        <td className="py-2 text-right">{l.quantidade}</td>
                        <td className="py-2 text-right font-mono">R$ {l.valor_unitario.toFixed(2)}</td>
                        <td className="py-2 text-right font-mono font-medium">R$ {l.valor_total.toFixed(2)}</td>
                        <td className="py-2 font-mono text-xs">{l.fornecedor_cnpj ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t font-medium">
                      <td colSpan={6} className="py-2 text-right">Total Geral:</td>
                      <td className="py-2 text-right font-mono">
                        R$ {linhas.reduce((s, l) => s + l.valor_total, 0).toFixed(2)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>

              <Separator className="my-4" />

              {/* Prévia do texto bruto */}
              <details>
                <summary className="text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground">
                  Ver texto bruto do arquivo
                </summary>
                <pre className="mt-2 text-xs bg-muted rounded-lg p-4 overflow-x-auto max-h-60 whitespace-pre-wrap">
                  {textoGerado}
                </pre>
              </details>
            </CardContent>
          </Card>
        )}

        {!gerando && linhas.length === 0 && textoGerado === "" && (
          <EmptyState
            icon={FileOutput}
            title="Configure e gere a exportação"
            description="Preencha os dados acima e clique em Gerar para criar o arquivo no formato SICOM/TCE-MG."
          />
        )}
      </div>
    </PageTransition>
  );
}
