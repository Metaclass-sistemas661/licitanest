import { Settings } from "lucide-react";

export function ConfiguracoesSuperAdminPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-superadmin-accent/10">
          <Settings className="h-5 w-5 text-superadmin-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-sm text-muted-foreground">Configurações globais da plataforma</p>
        </div>
      </div>
      <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground">
        <p className="text-sm">Será implementado na Fase 10.</p>
      </div>
    </div>
  );
}
