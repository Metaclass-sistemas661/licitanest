import { useState } from "react";
import { X, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { criarAditivo } from "@/servicos/contratos";
import type { Contrato } from "@/tipos";

interface AditivoModalProps {
  contrato: Contrato;
  onClose: () => void;
  onCriado: () => void;
}

const TIPOS_ADITIVO = [
  { value: "valor", label: "Acréscimo de Valor" },
  { value: "prazo", label: "Prorrogação de Prazo" },
  { value: "objeto", label: "Alteração de Objeto" },
  { value: "misto", label: "Misto (Valor + Prazo)" },
] as const;

function formatarCentavos(v: number): string {
  return (v / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function AditivoModal({ contrato, onClose, onCriado }: AditivoModalProps) {
  const [tipo, setTipo] = useState<string>("valor");
  const [numeroAditivo, setNumeroAditivo] = useState(
    `AD-${contrato.numero_contrato}-${String((contrato.aditivos?.length ?? 0) + 1).padStart(2, "0")}`,
  );
  const [descricao, setDescricao] = useState("");
  const [valorAcrescimo, setValorAcrescimo] = useState("");
  const [novaDataFim, setNovaDataFim] = useState("");
  const [novosLimites, setNovosLimites] = useState({
    usuarios: "",
    cestas: "",
    cotacoes_mes: "",
  });
  const [salvando, setSalvando] = useState(false);

  // Validação: acréscimo máximo de 25% do valor original (Lei 8.666)
  const valorAcrescimoNum = Math.round(Number(valorAcrescimo.replace(/\D/g, "")));
  const limite25 = Math.round(contrato.valor_total * 0.25);
  const excedeLimite = valorAcrescimoNum > limite25;

  const podeEnviar =
    numeroAditivo.trim() &&
    tipo &&
    descricao.trim().length >= 5 &&
    !excedeLimite &&
    !salvando;

  async function handleSalvar() {
    if (!podeEnviar) return;
    setSalvando(true);

    try {
      const dados: Record<string, unknown> = {
        numero_aditivo: numeroAditivo,
        tipo,
        descricao,
      };

      if (tipo === "valor" || tipo === "misto") {
        dados.valor_acrescimo = valorAcrescimoNum;
      }
      if (tipo === "prazo" || tipo === "misto") {
        if (novaDataFim) dados.nova_data_fim = novaDataFim;
      }

      // Novos limites (se preenchidos)
      const lim: Record<string, number> = {};
      if (novosLimites.usuarios) lim.usuarios = Number(novosLimites.usuarios);
      if (novosLimites.cestas) lim.cestas = Number(novosLimites.cestas);
      if (novosLimites.cotacoes_mes) lim.cotacoes_mes = Number(novosLimites.cotacoes_mes);
      if (Object.keys(lim).length) dados.novos_limites = lim;

      await criarAditivo(contrato.id, dados);
      toast.success("Aditivo criado com sucesso");
      onCriado();
      onClose();
    } catch {
      toast.error("Erro ao criar aditivo");
    } finally {
      setSalvando(false);
    }
  }

  function handleValor(v: string) {
    const nums = v.replace(/\D/g, "");
    if (!nums) { setValorAcrescimo(""); return; }
    const float = Number(nums) / 100;
    setValorAcrescimo(float.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg mx-4 bg-background rounded-xl shadow-2xl border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">Novo Aditivo</h2>
            <p className="text-xs text-muted-foreground">{contrato.numero_contrato}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Nº Aditivo */}
          <div>
            <label className="block text-sm font-medium mb-1">Nº Aditivo</label>
            <input
              value={numeroAditivo}
              onChange={(e) => setNumeroAditivo(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium mb-1">Tipo de Aditivo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              {TIPOS_ADITIVO.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium mb-1">Descrição / Justificativa</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              placeholder="Descreva o motivo do aditivo…"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
          </div>

          {/* Valor Acréscimo */}
          {(tipo === "valor" || tipo === "misto") && (
            <div>
              <label className="block text-sm font-medium mb-1">Valor do Acréscimo</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <input
                  value={valorAcrescimo}
                  onChange={(e) => handleValor(e.target.value)}
                  placeholder="0,00"
                  className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground">
                  Limite legal (25%): {formatarCentavos(limite25)}
                </span>
                {excedeLimite && (
                  <span className="text-xs text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Excede o limite de 25%
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Nova Data Fim */}
          {(tipo === "prazo" || tipo === "misto") && (
            <div>
              <label className="block text-sm font-medium mb-1">Nova Data de Término</label>
              <input
                type="date"
                value={novaDataFim}
                onChange={(e) => setNovaDataFim(e.target.value)}
                min={contrato.data_fim?.split("T")[0]}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              {contrato.data_fim && (
                <p className="text-xs text-muted-foreground mt-1">
                  Vigência atual: até {new Date(contrato.data_fim).toLocaleDateString("pt-BR")}
                </p>
              )}
            </div>
          )}

          {/* Novos Limites */}
          <div>
            <label className="block text-sm font-medium mb-1">Novos Limites (opcional)</label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <span className="text-xs text-muted-foreground">Usuários</span>
                <input
                  type="number"
                  min={0}
                  value={novosLimites.usuarios}
                  onChange={(e) => setNovosLimites((l) => ({ ...l, usuarios: e.target.value }))}
                  placeholder={String(contrato.limite_usuarios)}
                  className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Cestas</span>
                <input
                  type="number"
                  min={0}
                  value={novosLimites.cestas}
                  onChange={(e) => setNovosLimites((l) => ({ ...l, cestas: e.target.value }))}
                  placeholder={String(contrato.limite_cestas)}
                  className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Cotações/mês</span>
                <input
                  type="number"
                  min={0}
                  value={novosLimites.cotacoes_mes}
                  onChange={(e) => setNovosLimites((l) => ({ ...l, cotacoes_mes: e.target.value }))}
                  placeholder={String(contrato.limite_cotacoes_mes)}
                  className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!podeEnviar}
            onClick={handleSalvar}
            className="rounded-lg bg-superadmin-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {salvando ? <Loader2 className="h-4 w-4 animate-spin mx-4" /> : "Criar Aditivo"}
          </button>
        </div>
      </div>
    </div>
  );
}
