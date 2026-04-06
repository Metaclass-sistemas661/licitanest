// Drawer lateral de versões (histórico) de uma cesta
import { useCallback, useEffect, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerBody,
} from "@/componentes/ui/drawer";
import { Button } from "@/componentes/ui/button";
import { Badge } from "@/componentes/ui/badge";
import { History, Loader2, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { CestaVersao } from "@/tipos";
import { listarVersoes, criarVersao } from "@/servicos/cestas";

interface Props {
  cestaId: string;
  aberto: boolean;
  onClose: () => void;
}

export function VersoesDialog({ cestaId, aberto, onClose }: Props) {
  const { servidor } = useAuth();
  const [versoes, setVersoes] = useState<CestaVersao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [criando, setCriando] = useState(false);
  const [descricaoNova, setDescricaoNova] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const dados = await listarVersoes(cestaId);
      setVersoes(dados);
    } catch {
      setVersoes([]);
    } finally {
      setCarregando(false);
    }
  }, [cestaId]);

  useEffect(() => {
    if (aberto) carregar();
  }, [aberto, carregar]);

  const handleCriarVersao = async () => {
    if (!servidor) return;
    setCriando(true);
    try {
      await criarVersao(cestaId, servidor.id, descricaoNova || undefined);
      setDescricaoNova("");
      await carregar();
    } catch {
      /* silencioso */
    } finally {
      setCriando(false);
    }
  };

  return (
    <Drawer open={aberto} onOpenChange={(v) => !v && onClose()}>
      <DrawerContent side="right">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <History className="h-5 w-5" /> Versões da Cesta
          </DrawerTitle>
        </DrawerHeader>

        <DrawerBody>
        {/* Criar nova versão */}
        <div className="flex gap-2 mb-4">
          <input
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Descrição da versão (opcional)"
            value={descricaoNova}
            onChange={(e) => setDescricaoNova(e.target.value)}
          />
          <Button size="sm" disabled={criando} onClick={handleCriarVersao}>
            {criando ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-1 h-4 w-4" />
            )}
            Criar
          </Button>
        </div>

        {/* Lista de versões */}
        {carregando ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : versoes.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma versão registrada.
          </p>
        ) : (
          <div className="space-y-3">
            {versoes.map((v) => (
              <div
                key={v.id}
                className="flex items-start gap-3 rounded-md border p-3"
              >
                <Badge variant="outline" className="shrink-0 tabular-nums">
                  v{v.versao}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{v.descricao ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    {v.alterado_por_servidor?.nome ?? "—"} —{" "}
                    {new Date(v.criado_em).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
