import { useCallback, useState } from "react";
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
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Wand2,
  Save,
  Scale,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useChecklist } from "@/hooks/useFase17";
import { CRITERIOS_CHECKLIST } from "@/servicos/workflow";
import type { CriterioChecklist, ChecklistConformidade } from "@/tipos";

const CRITERIOS_ARRAY = (Object.entries(CRITERIOS_CHECKLIST) as [CriterioChecklist, { label: string; descricao: string; artigo: string }][]).map(
  ([campo, info]) => ({ campo, ...info }),
);

export function ChecklistINPage() {
  const { servidor } = useAuth();
  const [cestaId, setCestaId] = useState("");
  const [cestaIdInput, setCestaIdInput] = useState("");

  const { checklist, carregando, salvando, salvar, autoVerificar } = useChecklist(
    cestaId || undefined,
  );

  const [dadosLocal, setDadosLocal] = useState<Partial<ChecklistConformidade>>({});
  const [resultadoAuto, setResultadoAuto] = useState<Partial<ChecklistConformidade> | null>(null);

  const handleCarregar = useCallback(() => {
    if (cestaIdInput.trim()) {
      setCestaId(cestaIdInput.trim());
    }
  }, [cestaIdInput]);

  const handleAutoVerificar = useCallback(async () => {
    const resultado = await autoVerificar();
    if (resultado) {
      setResultadoAuto(resultado);
      setDadosLocal(resultado);
    }
  }, [autoVerificar]);

  const handleSalvar = useCallback(async () => {
    if (!servidor) return;
    await salvar(dadosLocal, servidor.id);
    setResultadoAuto(null);
  }, [dadosLocal, servidor, salvar]);

  const toggleCriterio = useCallback(
    (criterio: CriterioChecklist) => {
      setDadosLocal((prev) => ({
        ...prev,
        [criterio]: !(prev[criterio] ?? checklist?.[criterio] ?? false),
      }));
    },
    [checklist],
  );

  const getValorCriterio = (criterio: CriterioChecklist): boolean => {
    return dadosLocal[criterio] ?? checklist?.[criterio] ?? false;
  };

  const totalAtendidos = CRITERIOS_ARRAY.filter((c) =>
    getValorCriterio(c.campo),
  ).length;
  const totalCriterios = CRITERIOS_ARRAY.length;
  const percentual = Math.round((totalAtendidos / totalCriterios) * 100);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6" />
          Checklist de Conformidade — IN 65/2021
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Verificação de conformidade da pesquisa de preços conforme Instrução Normativa SEGES/ME nº 65/2021
        </p>
      </div>

      {/* Seletor de cesta */}
      <Card>
        <CardContent className="py-4">
          <div className="flex gap-3 items-center">
            <Input
              placeholder="ID da cesta de preços..."
              value={cestaIdInput}
              onChange={(e) => setCestaIdInput(e.target.value)}
              className="max-w-md"
            />
            <Button onClick={handleCarregar} disabled={!cestaIdInput.trim()}>
              <ArrowRight className="h-4 w-4 mr-2" />
              Carregar Checklist
            </Button>
          </div>
        </CardContent>
      </Card>

      {!cestaId ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Selecione uma cesta de preços para verificar a conformidade</p>
          </CardContent>
        </Card>
      ) : carregando ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Carregando checklist...
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-3xl font-bold">{totalAtendidos}/{totalCriterios}</p>
                <p className="text-sm text-muted-foreground">Critérios atendidos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <p className={`text-3xl font-bold ${percentual === 100 ? "text-green-600" : percentual >= 70 ? "text-amber-600" : "text-red-600"}`}>
                  {percentual}%
                </p>
                <p className="text-sm text-muted-foreground">Conformidade</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                {percentual === 100 ? (
                  <Badge className="bg-green-100 text-green-700 text-lg py-1 px-3">
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Aprovado
                  </Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-700 text-lg py-1 px-3">
                    <AlertCircle className="h-4 w-4 mr-1" /> Pendente
                  </Badge>
                )}
                <p className="text-sm text-muted-foreground mt-2">Status</p>
              </CardContent>
            </Card>
          </div>

          {/* Barra de ações */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleAutoVerificar}>
              <Wand2 className="h-4 w-4 mr-2" />
              Auto-verificar
            </Button>
            <Button onClick={handleSalvar} disabled={salvando}>
              <Save className="h-4 w-4 mr-2" />
              {salvando ? "Salvando..." : "Salvar Checklist"}
            </Button>
          </div>

          {/* Lista de critérios */}
          <div className="space-y-3">
            {CRITERIOS_ARRAY.map((criterio) => {
              const atendido = getValorCriterio(criterio.campo);
              return (
                <Card
                  key={criterio.campo}
                  className={`cursor-pointer transition-all ${
                    atendido
                      ? "border-green-200 bg-green-50/50"
                      : "border-red-200 bg-red-50/30"
                  }`}
                  onClick={() => toggleCriterio(criterio.campo)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {atendido ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{criterio.label}</div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {criterio.descricao}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            <Scale className="h-3 w-3 mr-1" />
                            {criterio.artigo}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Resultado auto-verificação */}
          {resultadoAuto && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Wand2 className="h-4 w-4" />
                  Resultado da Auto-Verificação
                </CardTitle>
                <CardDescription>
                  O sistema verificou automaticamente os critérios com base nos dados da cesta
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>
                  Critérios verificáveis automaticamente foram atualizados. 
                  Revise os critérios que necessitam de verificação manual.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Observações do checklist */}
          {checklist && (
            <Card>
              <CardContent className="py-4 space-y-2">
                {checklist.verificado_por && (
                  <p className="text-sm text-muted-foreground">
                    Verificado em: {new Date(checklist.verificado_em ?? "").toLocaleString("pt-BR")}
                  </p>
                )}
                {checklist.observacoes && (
                  <p className="text-sm">{checklist.observacoes}</p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

export default ChecklistINPage;
