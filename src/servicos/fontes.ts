// Serviço de Fontes de Preço (referência)
import { api } from "@/lib/api";
import type { FontePreco } from "@/tipos";

export async function listarFontes(apenasAtivas = true) {
  const params = new URLSearchParams();
  if (apenasAtivas) {
    params.set("ativo", "true");
  }
  const qs = params.toString();
  const { data } = await api.get<{ data: FontePreco[] }>(`/api/fontes${qs ? `?${qs}` : ""}`);
  return data ?? [];
}

export async function obterFonteCotacaoDireta() {
  const { data } = await api.get<{ data: FontePreco[] }>("/api/fontes?tipo=cotacao_direta&limit=1");
  return data?.[0] ?? null;
}
