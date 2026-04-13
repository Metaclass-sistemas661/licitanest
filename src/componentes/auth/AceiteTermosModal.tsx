import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import { Button } from "@/componentes/ui/button";
import { Shield, ExternalLink } from "lucide-react";
import { verificarAceitePendente, registrarConsentimento } from "@/servicos/lgpd";
import { useAuth } from "@/hooks/useAuth";

export function AceiteTermosModal() {
  const { servidor } = useAuth();
  const [pendente, setPendente] = useState(false);
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [aceitouPrivacidade, setAceitouPrivacidade] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!servidor) return;
    verificarAceitePendente()
      .then((res) => setPendente(res.pendente))
      .catch(() => {}); // silently ignore if endpoint unavailable
  }, [servidor]);

  const handleAceitar = useCallback(async () => {
    if (!servidor) return;
    setEnviando(true);
    setErro(null);
    try {
      await registrarConsentimento(servidor.id, "termos_uso", true);
      await registrarConsentimento(servidor.id, "politica_privacidade", true);
      setPendente(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      setErro(`Falha ao registrar aceite: ${msg}. Tente limpar o cache em /clear-cache.html`);
    } finally {
      setEnviando(false);
    }
  }, [servidor]);

  if (!pendente || !servidor) return null;

  return (
    <Dialog open={pendente} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-lg max-h-[90dvh] flex flex-col [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Aceite de Termos Obrigatório
          </DialogTitle>
          <DialogDescription>
            Para continuar usando o LicitaNest, é necessário aceitar os termos
            atualizados conforme a Lei Geral de Proteção de Dados (LGPD).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto flex-1">
          <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <input
              type="checkbox"
              checked={aceitouTermos}
              onChange={(e) => setAceitouTermos(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300"
            />
            <div className="flex-1">
              <span className="text-sm font-medium">Termos de Uso</span>
              <p className="text-xs text-muted-foreground mt-1">
                Li e aceito os termos e condições de uso da plataforma LicitaNest.
              </p>
              <a
                href="/termos-de-uso.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary inline-flex items-center gap-1 mt-1 hover:underline"
              >
                Ler termos completos <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <input
              type="checkbox"
              checked={aceitouPrivacidade}
              onChange={(e) => setAceitouPrivacidade(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300"
            />
            <div className="flex-1">
              <span className="text-sm font-medium">Política de Privacidade</span>
              <p className="text-xs text-muted-foreground mt-1">
                Li e aceito a política de privacidade e o tratamento dos meus dados pessoais.
              </p>
              <a
                href="/politica-de-privacidade.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary inline-flex items-center gap-1 mt-1 hover:underline"
              >
                Ler política completa <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </label>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {erro && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {erro}
            </div>
          )}
          <Button
            onClick={handleAceitar}
            disabled={!aceitouTermos || !aceitouPrivacidade || enviando}
            className="w-full"
          >
            {enviando ? "Registrando aceite..." : "Aceitar e Continuar"}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Seu aceite será registrado com data, IP e versão do documento conforme LGPD Art. 8.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
