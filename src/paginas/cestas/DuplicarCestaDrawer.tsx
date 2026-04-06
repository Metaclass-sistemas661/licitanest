// Drawer lateral de duplicação de cesta
import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerBody,
  DrawerFooter,
} from "@/componentes/ui/drawer";
import { Button } from "@/componentes/ui/button";
import { Copy, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { duplicarCesta } from "@/servicos/cestas";

interface Props {
  cestaId: string;
  descricao: string;
  aberto: boolean;
  onClose: () => void;
}

export function DuplicarCestaDialog({
  cestaId,
  descricao,
  aberto,
  onClose,
}: Props) {
  const navigate = useNavigate();
  const { servidor } = useAuth();
  const [modo, setModo] = useState<"com" | "sem">("com");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleDuplicar = async () => {
    if (!servidor) return;
    setSalvando(true);
    setErro(null);
    try {
      const nova = await duplicarCesta(cestaId, servidor.id, modo === "com");
      onClose();
      navigate(`/cestas/${nova.id}`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao duplicar cesta");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Drawer open={aberto} onOpenChange={(v) => !v && onClose()}>
      <DrawerContent side="right">
        <DrawerHeader>
          <DrawerTitle>Duplicar Cesta</DrawerTitle>
        </DrawerHeader>

        <DrawerBody>
        <p className="text-sm text-muted-foreground mb-4">
          Duplicando: <strong>{descricao}</strong>
        </p>

        <div className="space-y-3">
          <label
            className={`flex cursor-pointer gap-3 rounded-md border p-4 transition ${
              modo === "com"
                ? "border-primary bg-primary/5"
                : "border-border"
            }`}
          >
            <input
              type="radio"
              name="modo"
              className="mt-0.5"
              checked={modo === "com"}
              onChange={() => setModo("com")}
            />
            <div>
              <p className="text-sm font-medium">Com todas as informações</p>
              <p className="text-xs text-muted-foreground">
                Copia itens, lotes, preços e fontes vinculadas
              </p>
            </div>
          </label>
          <label
            className={`flex cursor-pointer gap-3 rounded-md border p-4 transition ${
              modo === "sem"
                ? "border-primary bg-primary/5"
                : "border-border"
            }`}
          >
            <input
              type="radio"
              name="modo"
              className="mt-0.5"
              checked={modo === "sem"}
              onChange={() => setModo("sem")}
            />
            <div>
              <p className="text-sm font-medium">Apenas itens (sem fontes)</p>
              <p className="text-xs text-muted-foreground">
                Copia apenas itens e lotes — preços zerados
              </p>
            </div>
          </label>
        </div>

        {erro && (
          <p className="mt-3 text-sm text-destructive">{erro}</p>
        )}
        </DrawerBody>

        <DrawerFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={salvando} onClick={handleDuplicar}>
            {salvando ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Copy className="mr-1 h-4 w-4" />
            )}
            Duplicar
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
