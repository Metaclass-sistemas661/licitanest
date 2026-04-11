import { useState, useEffect } from "react";
import {
  Play, CheckCircle2, XCircle, AlertTriangle, Clock, Database,
  Server, Shield, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/componentes/ui/button";
import { listarResultadosTestes, executarSuiteTestes } from "@/servicos/monitoramento";
import type { ResultadoTeste, StatusTeste } from "@/tipos";
import { toast } from "sonner";

const SUITES = [
  { id: "database", label: "Database", icon: Database, descricao: "Conexão, schemas e tabelas" },
  { id: "api", label: "API", icon: Server, descricao: "Health check e configuração RLS" },
  { id: "integridade", label: "Integridade", icon: Shield, descricao: "Dados órfãos e consistência" },
];

const STATUS_CONFIG: Record<StatusTeste, { cor: string; bg: string; icon: React.ElementType; label: string }> = {
  pass: { cor: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30", icon: CheckCircle2, label: "OK" },
  fail: { cor: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30", icon: XCircle, label: "Falha" },
  skip: { cor: "text-gray-500", bg: "bg-gray-100 dark:bg-gray-800", icon: AlertTriangle, label: "Pulado" },
  error: { cor: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/30", icon: AlertTriangle, label: "Erro" },
};

export function TestesTab() {
  const [resultados, setResultados] = useState<ResultadoTeste[]>([]);
  const [loading, setLoading] = useState(true);
  const [executando, setExecutando] = useState<string | null>(null);

  useEffect(() => {
    carregar();
  }, []);

  const carregar = async () => {
    setLoading(true);
    try {
      const res = await listarResultadosTestes({ limit: 100 });
      setResultados(res.data);
    } catch {
      toast.error("Falha ao carregar resultados de testes");
    } finally {
      setLoading(false);
    }
  };

  const executar = async (suite: string) => {
    setExecutando(suite);
    try {
      const res = await executarSuiteTestes(suite);
      toast.success(`Suite "${suite}" executada: ${res.data.length} testes`);
      await carregar();
    } catch {
      toast.error(`Falha ao executar suite "${suite}"`);
    } finally {
      setExecutando(null);
    }
  };

  // Agrupar resultados por suite
  const porSuite = resultados.reduce<Record<string, ResultadoTeste[]>>((acc, r) => {
    if (!acc[r.suite]) acc[r.suite] = [];
    acc[r.suite].push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Cards de suites */}
      <div className="grid gap-4 sm:grid-cols-3">
        {SUITES.map(({ id, label, icon: Icon, descricao }) => {
          const testes = porSuite[id] ?? [];
          const ultimaExecucao = testes[0]?.executado_em;
          const falhas = testes.filter((t) => t.status === "fail" || t.status === "error").length;
          const successos = testes.filter((t) => t.status === "pass").length;

          return (
            <div key={id} className="rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{label}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => executar(id)}
                  disabled={executando !== null}
                >
                  {executando === id ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-1.5 h-4 w-4" />
                  )}
                  Executar
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{descricao}</p>
              <div className="mt-3 flex items-center gap-3 text-xs">
                <span className="text-green-600 dark:text-green-400">{successos} OK</span>
                {falhas > 0 && <span className="text-red-600 dark:text-red-400">{falhas} falhas</span>}
                {ultimaExecucao && (
                  <span className="text-muted-foreground">
                    <Clock className="mr-0.5 inline h-3 w-3" />
                    {new Date(ultimaExecucao).toLocaleString("pt-BR")}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Resultados detalhados */}
      <div className="rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-medium">Resultados Recentes</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : resultados.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Nenhum teste executado ainda. Clique em "Executar" acima.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Suite</th>
                  <th className="px-4 py-3">Teste</th>
                  <th className="px-4 py-3">Duração</th>
                  <th className="px-4 py-3">Executado em</th>
                  <th className="px-4 py-3">Mensagem</th>
                </tr>
              </thead>
              <tbody>
                {resultados.slice(0, 50).map((r) => {
                  const cfg = STATUS_CONFIG[r.status];
                  const StatusIcon = cfg.icon;
                  return (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", cfg.bg, cfg.cor)}>
                          <StatusIcon className="h-3.5 w-3.5" /> {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs capitalize">{r.suite}</td>
                      <td className="px-4 py-3 font-mono text-xs">{r.teste}</td>
                      <td className="px-4 py-3 text-xs">{r.duracao_ms != null ? `${r.duracao_ms}ms` : "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                        {new Date(r.executado_em).toLocaleString("pt-BR")}
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 text-xs text-muted-foreground">
                        {r.mensagem_erro ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
