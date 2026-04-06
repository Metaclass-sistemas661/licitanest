export interface Paginacao {
  pagina: number;
  porPagina: number;
  offset: number;
}

export function parsePaginacao(query: Record<string, unknown>): Paginacao {
  const pagina = Math.max(1, Number(query.pagina) || 1);
  const porPagina = Math.min(100, Math.max(1, Number(query.porPagina) || 20));
  return { pagina, porPagina, offset: (pagina - 1) * porPagina };
}

export function respostaPaginada<T>(
  data: T[],
  total: number,
  pag: Paginacao,
) {
  return {
    data,
    total,
    pagina: pag.pagina,
    porPagina: pag.porPagina,
    totalPaginas: Math.ceil(total / pag.porPagina),
  };
}
