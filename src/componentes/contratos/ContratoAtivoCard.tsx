import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Badge } from "@/componentes/ui/badge";
import { FileSignature, AlertTriangle, ArrowRight } from "lucide-react";
import { listarContratosPortal } from "@/servicos/contratos";
import { useAuth } from "@/hooks/useAuth";
import type { Contrato } from "@/tipos";

export function ContratoAtivoCard() {
  const { perfil } = useAuth();
  const navigate = useNavigate();
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [pendentes, setPendentes] = useState(0);

  useEffect(() => {
    if (perfil !== "administrador") return;
    listarContratosPortal()
      .then((res) => {
        const list = res.data;
        const ativo = list.find((c) => c.status === "ativo");
        const pend = list.filter((c) => c.status === "pendente_assinatura").length;
        setContrato(ativo ?? null);
        setPendentes(pend);
      })
      .catch(() => {});
  }, [perfil]);

  if (perfil !== "administrador") return null;
  if (!contrato && pendentes === 0) return null;

  const dias = contrato?.data_fim
    ? Math.ceil((new Date(contrato.data_fim).getTime() - Date.now()) / 86400000)
    : null;

  const pctVigencia = contrato?.data_inicio && contrato?.data_fim
    ? Math.min(100, Math.max(0, Math.round(
        ((Date.now() - new Date(contrato.data_inicio).getTime()) /
        (new Date(contrato.data_fim).getTime() - new Date(contrato.data_inicio).getTime())) * 100
      )))
    : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Contrato Ativo</CardTitle>
        <FileSignature className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        {contrato ? (
          <div className="space-y-3">
            <p className="text-lg font-bold">{contrato.numero_contrato}</p>

            {/* Barra de vigência */}
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{contrato.data_inicio && new Date(contrato.data_inicio).toLocaleDateString("pt-BR")}</span>
                <span>{contrato.data_fim && new Date(contrato.data_fim).toLocaleDateString("pt-BR")}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    dias !== null && dias <= 30
                      ? "bg-red-500"
                      : dias !== null && dias <= 90
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  }`}
                  style={{ width: `${pctVigencia}%` }}
                />
              </div>
              {dias !== null && (
                <p className={`mt-1 text-xs font-medium ${
                  dias <= 30 ? "text-red-600" : dias <= 90 ? "text-amber-600" : "text-muted-foreground"
                }`}>
                  {dias > 0 ? `${dias} dias restantes` : "Contrato vencido"}
                  {dias <= 90 && dias > 0 && (
                    <AlertTriangle className="ml-1 inline h-3 w-3" />
                  )}
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum contrato ativo</p>
        )}

        {pendentes > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <Badge variant="warning">{pendentes} pendente(s)</Badge>
            <span className="text-xs text-muted-foreground">aguardando assinatura</span>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full justify-between"
          onClick={() => navigate("/contratos")}
        >
          Ver contratos
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
