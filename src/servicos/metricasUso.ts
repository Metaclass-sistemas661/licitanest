import { api } from "@/lib/api";
import type { MetricasUsoMunicipio } from "@/tipos";

export async function buscarMetricasUso(municipioId: string): Promise<MetricasUsoMunicipio | null> {
  try {
    const { data } = await api.get<{ data: MetricasUsoMunicipio | null }>(
      `/api/metricas-uso?municipio_id=${encodeURIComponent(municipioId)}`
    );
    return data;
  } catch {
    return null;
  }
}

export async function listarMetricasUso(): Promise<MetricasUsoMunicipio[]> {
  const { data } = await api.get<{ data: MetricasUsoMunicipio[] }>("/api/metricas-uso");
  return data ?? [];
}

export async function atualizarMetricasUso(municipioId: string): Promise<MetricasUsoMunicipio> {
  await api.post("/api/metricas-uso/atualizar", { municipio_id: municipioId });

  const resultado = await buscarMetricasUso(municipioId);
  if (!resultado) throw new Error("Métricas não encontradas após atualização");
  return resultado;
}
