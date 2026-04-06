import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Users, Plus, Search } from "lucide-react";

export function FornecedoresPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Fornecedores</h2>
          <p className="text-muted-foreground">
            Cadastro e pesquisa de fornecedores com itens homologados/contratados
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Fornecedor
        </Button>
      </div>

      {/* Busca */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por CNPJ, razão social, produto..." className="pl-10" />
        </div>
        <Button variant="outline">Filtrar por Região</Button>
      </div>

      {/* Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Base de Fornecedores
          </CardTitle>
          <CardDescription>
            Alimentada continuamente com dados de contratações públicas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhum fornecedor cadastrado. A base será alimentada automaticamente com dados do PNCP e demais fontes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
