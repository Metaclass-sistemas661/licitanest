import { useCallback, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Badge } from "@/componentes/ui/badge";
import { Separator } from "@/componentes/ui/separator";
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  BarChart3,
  Users,
  FileArchive,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useImportacaoLote } from "@/hooks/useFase17";
import { TEMPLATES_CSV, baixarTemplateCSV } from "@/servicos/importacaoLote";

type TipoSelecionado = "precos" | "fornecedores";

const TIPOS_IMPORTACAO: Array<{
  id: TipoSelecionado;
  label: string;
  descricao: string;
  icon: React.ReactNode;
}> = [
  {
    id: "precos",
    label: "Preços",
    descricao: "Importar preços coletados via CSV para uma cesta",
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    id: "fornecedores",
    label: "Fornecedores",
    descricao: "Importar fornecedores em lote via CSV",
    icon: <Users className="h-5 w-5" />,
  },
];

export function ImportacaoLotePage() {
  const { servidor } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoSelecionado>("precos");
  const [cestaId, setCestaId] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);

  const { importacoes, importando, resultado, erro, importarPrecos, importarFornecedores } =
    useImportacaoLote();

  const handleArquivo = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setArquivo(file);
  }, []);

  const handleImportar = useCallback(async () => {
    if (!arquivo || !servidor) return;

    if (tipoSelecionado === "precos") {
      if (!cestaId.trim()) {
        alert("Informe o ID da cesta de preços");
        return;
      }
      await importarPrecos(arquivo, cestaId, servidor.id);
    } else {
      await importarFornecedores(arquivo, servidor.id);
    }
  }, [arquivo, servidor, cestaId, tipoSelecionado, importarPrecos, importarFornecedores]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "concluida":
        return <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" /> Concluída</Badge>;
      case "parcial":
        return <Badge className="bg-amber-100 text-amber-700"><AlertCircle className="h-3 w-3 mr-1" /> Parcial</Badge>;
      case "falhou":
        return <Badge className="bg-red-100 text-red-700"><XCircle className="h-3 w-3 mr-1" /> Falhou</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-700"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Processando</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Upload className="h-6 w-6" />
          Importação em Lote
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Importe preços, fornecedores e produtos via arquivos CSV para agilizar a elaboração de cestas
        </p>
      </div>

      {/* Seleção de tipo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TIPOS_IMPORTACAO.map((tipo) => (
          <Card
            key={tipo.id}
            className={`cursor-pointer transition-all ${
              tipoSelecionado === tipo.id
                ? "ring-2 ring-primary border-primary"
                : "hover:bg-accent/50"
            }`}
            onClick={() => setTipoSelecionado(tipo.id)}
          >
            <CardContent className="py-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">{tipo.icon}</div>
              <div>
                <p className="font-medium">{tipo.label}</p>
                <p className="text-sm text-muted-foreground">{tipo.descricao}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Formulário de importação */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Importar {tipoSelecionado === "precos" ? "Preços" : "Fornecedores"}
          </CardTitle>
          <CardDescription>
            Selecione um arquivo CSV e clique em importar. Baixe o template de exemplo abaixo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Cesta ID (apenas para preços) */}
          {tipoSelecionado === "precos" && (
            <div>
              <label className="text-sm font-medium">ID da Cesta de Preços</label>
              <Input
                placeholder="ex: 550e8400-e29b-41d4-a716-446655440000"
                value={cestaId}
                onChange={(e) => setCestaId(e.target.value)}
                className="mt-1"
              />
            </div>
          )}

          {/* Upload */}
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleArquivo}
            />
            {arquivo ? (
              <div className="flex items-center justify-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-green-600" />
                <div className="text-left">
                  <p className="font-medium">{arquivo.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(arquivo.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Clique para selecionar ou arraste um arquivo CSV
                </p>
              </>
            )}
          </div>

          {/* Ações */}
          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={handleImportar}
              disabled={!arquivo || importando}
            >
              {importando ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {importando ? "Importando..." : "Importar"}
            </Button>
            <Button
              variant="outline"
              onClick={() => baixarTemplateCSV(tipoSelecionado)}
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar Template CSV
            </Button>
          </div>

          {/* Template preview */}
          <div className="bg-muted/50 rounded-lg p-4 text-xs font-mono">
            <p className="text-muted-foreground mb-1">Formato esperado:</p>
            <p>{TEMPLATES_CSV[tipoSelecionado].cabecalho}</p>
            <p className="text-muted-foreground">{TEMPLATES_CSV[tipoSelecionado].exemplo}</p>
          </div>
        </CardContent>
      </Card>

      {/* Resultado */}
      {resultado && (
        <Card className={resultado.status === "concluida" ? "border-green-200" : resultado.status === "falhou" ? "border-red-200" : "border-amber-200"}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {resultado.status === "concluida" ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : resultado.status === "falhou" ? (
                <XCircle className="h-5 w-5 text-red-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-600" />
              )}
              Resultado da Importação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{resultado.total_linhas}</p>
                <p className="text-xs text-muted-foreground">Linhas lidas</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{resultado.linhas_importadas}</p>
                <p className="text-xs text-muted-foreground">Importadas</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{resultado.linhas_erro}</p>
                <p className="text-xs text-muted-foreground">Erros</p>
              </div>
            </div>

            {resultado.erros.length > 0 && (
              <>
                <Separator />
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {resultado.erros.map((err, i) => (
                    <div key={i} className="text-xs text-red-600 flex gap-2">
                      <span className="font-mono shrink-0">L{err.linha}:</span>
                      <span>{err.campo && `[${err.campo}]`} {err.mensagem}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Erro geral */}
      {erro && (
        <Card className="border-red-200">
          <CardContent className="py-4 text-red-600 text-sm">{erro}</CardContent>
        </Card>
      )}

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Importações</CardTitle>
        </CardHeader>
        <CardContent>
          {importacoes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma importação realizada
            </p>
          ) : (
            <div className="space-y-2">
              {importacoes.map((imp) => (
                <div key={imp.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <FileArchive className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{imp.nome_arquivo}</p>
                    <p className="text-xs text-muted-foreground">
                      {imp.tipo} • {imp.linhas_importadas}/{imp.total_linhas} linhas •{" "}
                      {new Date(imp.criado_em).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  {getStatusBadge(imp.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ImportacaoLotePage;
