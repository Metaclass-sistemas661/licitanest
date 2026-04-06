import { useState } from "react";
import { Building2, UserCog, MapPin, Settings, Shield } from "lucide-react";
import { Button } from "@/componentes/ui/button";
import { SecretariasTab } from "./configuracoes/SecretariasTab";
import { ServidoresTab } from "./configuracoes/ServidoresTab";
import { CidadesTab } from "./configuracoes/CidadesTab";
import { SegurancaDoisFatoresTab } from "./configuracoes/SegurancaDoisFatoresTab";

type Aba = "secretarias" | "servidores" | "cidades" | "seguranca";

const ABAS: { id: Aba; label: string; icon: React.ElementType }[] = [
  { id: "secretarias", label: "Secretarias", icon: Building2 },
  { id: "servidores", label: "Servidores", icon: UserCog },
  { id: "cidades", label: "Cidades da Região", icon: MapPin },
  { id: "seguranca", label: "Segurança (2FA)", icon: Shield },
];

export function ConfiguracoesPage() {
  const [aba, setAba] = useState<Aba>("secretarias");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Settings className="h-6 w-6" />
          Configurações
        </h1>
        <p className="text-muted-foreground">
          Gerencie secretarias, servidores e cidades da região do seu município.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border bg-muted/40 p-1">
        {ABAS.map((t) => {
          const Icon = t.icon;
          return (
            <Button
              key={t.id}
              variant={aba === t.id ? "default" : "ghost"}
              size="sm"
              className="flex-1"
              onClick={() => setAba(t.id)}
            >
              <Icon className="mr-2 h-4 w-4" />
              {t.label}
            </Button>
          );
        })}
      </div>

      {/* Conteúdo da aba */}
      {aba === "secretarias" && <SecretariasTab />}
      {aba === "servidores" && <ServidoresTab />}
      {aba === "cidades" && <CidadesTab />}
      {aba === "seguranca" && <SegurancaDoisFatoresTab />}
    </div>
  );
}
