import { useRef, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerBody,
  DrawerFooter,
} from "@/componentes/ui/drawer";
import { Button } from "@/componentes/ui/button";
import { Badge } from "@/componentes/ui/badge";
import { AlertCircle, FileUp, Loader2, CheckCircle2 } from "lucide-react";
import type { Categoria, UnidadeMedida, ElementoDespesa } from "@/tipos";
import {
  importarProdutosCSV,
  type LinhaImportacao,
  type ResultadoImportacao,
} from "@/servicos/produtosCatalogo";

interface Props {
  aberto: boolean;
  onFechar: () => void;
  onImportado: () => void;
  categorias: Categoria[];
  unidades: UnidadeMedida[];
  elementos: ElementoDespesa[];
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ";" && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function ImportarCSVDialog({
  aberto,
  onFechar,
  onImportado,
  categorias,
  unidades,
  elementos,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [linhasParsed, setLinhasParsed] = useState<LinhaImportacao[]>([]);
  const [errosParse, setErrosParse] = useState<string[]>([]);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const resetar = () => {
    setArquivo(null);
    setLinhasParsed([]);
    setErrosParse([]);
    setImportando(false);
    setResultado(null);
    setErro(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  // Mapear nome/sigla → id
  const categoriaPorNome = (nome: string) =>
    categorias.find(
      (c) => c.nome.toLowerCase() === nome.toLowerCase(),
    )?.id;

  const unidadePorSigla = (sigla: string) =>
    unidades.find(
      (u) => u.sigla.toLowerCase() === sigla.toLowerCase(),
    )?.id;

  const elementoPorCodigo = (codigo: string) =>
    elementos.find(
      (e) => e.codigo.toLowerCase() === codigo.toLowerCase(),
    )?.id;

  const handleArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setArquivo(file);
    setResultado(null);
    setErro(null);

    const texto = await file.text();
    const linhas = texto.split(/\r?\n/).filter((l) => l.trim());

    if (linhas.length < 2) {
      setErro("O arquivo deve conter ao menos 1 linha de cabeçalho e 1 de dados.");
      return;
    }

    // Pular cabeçalho
    const erros: string[] = [];
    const dados: LinhaImportacao[] = [];

    for (let i = 1; i < linhas.length; i++) {
      const cols = parseCsvLine(linhas[i]);
      // Esperado: descricao;categoria;unidade;[elemento];[catmat];[descricao_detalhada]
      const [descricao, categoria, unidade, elemento, catmat, descDetalhada] = cols;

      if (!descricao || !categoria || !unidade) {
        erros.push(`Linha ${i + 1}: campos obrigatórios ausentes (descricao, categoria, unidade).`);
        continue;
      }

      const catId = categoriaPorNome(categoria);
      if (!catId) {
        erros.push(`Linha ${i + 1}: categoria "${categoria}" não encontrada.`);
        continue;
      }

      const undId = unidadePorSigla(unidade);
      if (!undId) {
        erros.push(`Linha ${i + 1}: unidade "${unidade}" não encontrada.`);
        continue;
      }

      const elemId = elemento ? elementoPorCodigo(elemento) : undefined;

      dados.push({
        descricao,
        categoria_id: catId,
        unidade_medida_id: undId,
        elemento_despesa_id: elemId,
        codigo_catmat: catmat || undefined,
        descricao_detalhada: descDetalhada || undefined,
      });
    }

    setLinhasParsed(dados);
    setErrosParse(erros);
  };

  const handleImportar = async () => {
    if (linhasParsed.length === 0) return;
    setImportando(true);
    setErro(null);
    try {
      const res = await importarProdutosCSV(linhasParsed);
      setResultado(res);
      if (res.inseridos > 0) onImportado();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro na importação.");
    } finally {
      setImportando(false);
    }
  };

  return (
    <Drawer
      open={aberto}
      onOpenChange={(v) => {
        if (!v) {
          resetar();
          onFechar();
        }
      }}
    >
      <DrawerContent side="right">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            Importar Produtos via CSV
          </DrawerTitle>
          <DrawerDescription>
            Envie um arquivo CSV separado por ponto-e-vírgula (;) com as colunas:
            <br />
            <code className="text-xs">
              descricao;categoria;unidade;elemento_despesa;catmat;descricao_detalhada
            </code>
          </DrawerDescription>
        </DrawerHeader>

        <DrawerBody>
        {/* Erro geral */}
        {erro && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {/* Upload */}
        <div className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleArquivo}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20"
          />

          {/* Preview */}
          {arquivo && !resultado && (
            <div className="rounded-lg border p-3 text-sm">
              <p>
                <strong>Arquivo:</strong> {arquivo.name} ({(arquivo.size / 1024).toFixed(1)} KB)
              </p>
              <p>
                <strong>Linhas válidas:</strong>{" "}
                <Badge variant="success">{linhasParsed.length}</Badge>
              </p>
              {errosParse.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium text-amber-600">
                    {errosParse.length} aviso(s):
                  </p>
                  <div className="mt-1 max-h-32 overflow-y-auto text-xs text-amber-700">
                    {errosParse.map((e, i) => (
                      <p key={i}>• {e}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resultado da importação */}
          {resultado && (
            <div className="rounded-lg border p-3 text-sm">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
                <strong>Importação concluída!</strong>
              </div>
              <p className="mt-1">
                Total processado: {resultado.total} | Inseridos:{" "}
                <strong>{resultado.inseridos}</strong>
              </p>
              {resultado.erros.length > 0 && (
                <div className="mt-2">
                  <p className="text-destructive">
                    {resultado.erros.length} erro(s):
                  </p>
                  <div className="mt-1 max-h-32 overflow-y-auto text-xs text-destructive">
                    {resultado.erros.map((e, i) => (
                      <p key={i}>
                        Linha {e.linha}: {e.mensagem}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        </DrawerBody>

        <DrawerFooter>
          <Button
            variant="outline"
            onClick={() => {
              resetar();
              onFechar();
            }}
          >
            {resultado ? "Fechar" : "Cancelar"}
          </Button>
          {!resultado && (
            <Button
              onClick={handleImportar}
              disabled={importando || linhasParsed.length === 0}
            >
              {importando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Importar {linhasParsed.length} item(ns)
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
