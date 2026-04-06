import { ShieldAlert } from "lucide-react";
import { Button } from "@/componentes/ui/button";
import { useNavigate } from "react-router-dom";

/**
 * Componente exibido dentro de uma página quando o perfil não tem acesso
 * a uma funcionalidade específica (diferente de rota inteira bloqueada).
 */
export function SemPermissao({ mensagem }: { mensagem?: string }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <ShieldAlert className="h-8 w-8 text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold">Acesso Restrito</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {mensagem || "Você não tem permissão para acessar este recurso."}
        </p>
      </div>
      <Button variant="outline" onClick={() => navigate("/")}>
        Voltar ao Dashboard
      </Button>
    </div>
  );
}
