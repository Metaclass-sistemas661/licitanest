import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { SendHorizonal, Plus, Mail } from "lucide-react";

export function CotacoesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Cotação Eletrônica</h2>
          <p className="text-muted-foreground">
            Envio de cotações para fornecedores com assinatura eletrônica
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nova Cotação
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Cotações Enviadas
            </CardTitle>
            <CardDescription>
              Disparo de e-mail com link para acesso ao sistema de cotação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Nenhuma cotação enviada. Crie uma nova cotação para disparar para fornecedores.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SendHorizonal className="h-5 w-5" />
              Respostas Recebidas
            </CardTitle>
            <CardDescription>
              Propostas recebidas com marca, valor unitário e registro ANVISA
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Nenhuma resposta recebida. As respostas dos fornecedores aparecerão aqui automaticamente.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
