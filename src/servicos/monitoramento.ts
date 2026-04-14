import { api } from "@/lib/api";
import type {
  ErroSistema,
  ResumoErros,
  ResumoSaude,
  HealthCheck,
  MetricaSistema,
  ResultadoTeste,
  AlertaMonitoramento,
} from "@/tipos";

// ── Erros ──────────────────────────────────────────────────

export async function listarErros(params?: {
  page?: number;
  limit?: number;
  origem?: string;
  severidade?: string;
  resolvido?: boolean;
  busca?: string;
}): Promise<{ data: ErroSistema[]; pagination: { page: number; limit: number; total: number } }> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.origem) searchParams.set("origem", params.origem);
  if (params?.severidade) searchParams.set("severidade", params.severidade);
  if (params?.resolvido !== undefined) searchParams.set("resolvido", String(params.resolvido));
  if (params?.busca) searchParams.set("busca", params.busca);
  const qs = searchParams.toString();
  return api.get(`/api/superadmin/monitoramento/erros${qs ? `?${qs}` : ""}`);
}

export async function obterResumoErros(): Promise<{ data: ResumoErros }> {
  return api.get("/api/superadmin/monitoramento/erros/resumo");
}

export async function obterErro(id: string): Promise<{ data: ErroSistema }> {
  return api.get(`/api/superadmin/monitoramento/erros/${id}`);
}

export async function resolverErro(id: string, notas?: string): Promise<{ data: { resolvido: boolean } }> {
  return api.patch(`/api/superadmin/monitoramento/erros/${id}/resolver`, { notas_resolucao: notas });
}

// ── Saúde ──────────────────────────────────────────────────

export async function verificarSaude(): Promise<{ data: ResumoSaude }> {
  return api.get("/api/superadmin/monitoramento/saude");
}

export async function historicoSaude(limit?: number): Promise<{ data: HealthCheck[] }> {
  const qs = limit ? `?limit=${limit}` : "";
  return api.get(`/api/superadmin/monitoramento/saude/historico${qs}`);
}

// ── Métricas ───────────────────────────────────────────────

export async function listarMetricas(horas?: number): Promise<{ data: MetricaSistema[] }> {
  const qs = horas ? `?horas=${horas}` : "";
  return api.get(`/api/superadmin/monitoramento/metricas${qs}`);
}

// ── Testes ──────────────────────────────────────────────────

export async function listarResultadosTestes(params?: {
  suite?: string;
  limit?: number;
}): Promise<{ data: ResultadoTeste[] }> {
  const searchParams = new URLSearchParams();
  if (params?.suite) searchParams.set("suite", params.suite);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  const qs = searchParams.toString();
  return api.get(`/api/superadmin/monitoramento/testes${qs ? `?${qs}` : ""}`);
}

export async function executarSuiteTestes(suite: string): Promise<{ data: ResultadoTeste[] }> {
  return api.post("/api/superadmin/monitoramento/testes/executar", { suite });
}

// ── Alertas ─────────────────────────────────────────────────

export async function listarAlertas(naoLidos?: boolean, limit?: number): Promise<{ data: AlertaMonitoramento[] }> {
  const searchParams = new URLSearchParams();
  if (naoLidos) searchParams.set("nao_lidos", "true");
  if (limit) searchParams.set("limit", String(limit));
  const qs = searchParams.toString();
  return api.get(`/api/superadmin/monitoramento/alertas${qs ? `?${qs}` : ""}`);
}

export async function marcarAlertaLido(id: string): Promise<void> {
  await api.patch(`/api/superadmin/monitoramento/alertas/${id}/ler`);
}
