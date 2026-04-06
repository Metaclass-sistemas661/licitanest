// ═══════════════════════════════════════════════════════════════════════════════
// Serviço de API Pública REST — Fase 16
// Gerenciamento de API Keys, logs de uso, rate limiting
// ═══════════════════════════════════════════════════════════════════════════════
import { api } from "@/lib/api";
import type {
  ApiKey,
  CriarApiKeyDTO,
  ApiKeyComChave,
  ApiLog,
  ApiEstatisticas,
} from "@/tipos";

// ╔══════════════════════════════════════════════════════╗
// ║  1. GERENCIAMENTO DE API KEYS                        ║
// ╚══════════════════════════════════════════════════════╝

/**
 * Gerar hash SHA-256 de uma string (para armazenar chaves de forma segura).
 */
async function gerarHash(texto: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = encoder.encode(texto);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Gerar chave de API aleatória com prefixo.
 * Formato: lnst_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 */
function gerarChaveAleatoria(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `lnst_${hex}`;
}

/**
 * Criar uma nova API Key.
 * A chave em texto plano é retornada APENAS neste momento.
 */
export async function criarApiKey(
  dto: CriarApiKeyDTO,
  criado_por?: string,
): Promise<ApiKeyComChave> {
  const chaveTexto = gerarChaveAleatoria();
  const chaveHash = await gerarHash(chaveTexto);
  const prefixo = chaveTexto.slice(0, 12);

  const { data } = await api.post<{ data: ApiKey }>(
    "/api/catalogo/api-keys",
    {
      municipio_id: dto.municipio_id,
      nome: dto.nome,
      chave_hash: chaveHash,
      prefixo,
      permissoes: dto.permissoes ?? ["leitura"],
      rate_limit_rpm: dto.rate_limit_rpm ?? 60,
      expira_em: dto.expira_em ?? null,
      criado_por: criado_por ?? null,
    },
  );

  return { ...data, chave_texto: chaveTexto };
}

/**
 * Listar API Keys do município do usuário.
 */
export async function listarApiKeys(
  municipioId?: string,
): Promise<ApiKey[]> {
  const params = new URLSearchParams();
  if (municipioId) params.set("municipio_id", municipioId);

  const { data } = await api.get<{ data: ApiKey[] }>(
    `/api/catalogo/api-keys?${params.toString()}`,
  );
  return data ?? [];
}

/**
 * Obter API Key por ID.
 */
export async function obterApiKey(id: string): Promise<ApiKey> {
  const { data } = await api.get<{ data: ApiKey }>(
    `/api/catalogo/api-keys/${encodeURIComponent(id)}`,
  );
  return data;
}

/**
 * Revogar (desativar permanentemente) uma API Key.
 */
export async function revogarApiKey(
  id: string,
  revogado_por?: string,
): Promise<void> {
  await api.put(`/api/catalogo/api-keys/${encodeURIComponent(id)}`, {
    ativo: false,
    revogado_em: new Date().toISOString(),
    revogado_por: revogado_por ?? null,
  });
}

/**
 * Ativar/desativar API Key temporariamente.
 */
export async function alternarStatusApiKey(
  id: string,
  ativo: boolean,
): Promise<void> {
  await api.put(`/api/catalogo/api-keys/${encodeURIComponent(id)}`, { ativo });
}

/**
 * Atualizar configurações de uma API Key.
 */
export async function atualizarApiKey(
  id: string,
  dados: {
    nome?: string;
    permissoes?: string[];
    rate_limit_rpm?: number;
    expira_em?: string | null;
  },
): Promise<ApiKey> {
  const { data } = await api.put<{ data: ApiKey }>(
    `/api/catalogo/api-keys/${encodeURIComponent(id)}`,
    dados,
  );
  return data;
}

// ╔══════════════════════════════════════════════════════╗
// ║  2. LOGS DE USO                                      ║
// ╚══════════════════════════════════════════════════════╝

/**
 * Listar logs de uso da API.
 */
export async function listarApiLogs(
  filtros: {
    api_key_id?: string;
    endpoint?: string;
    metodo?: string;
    de?: string;
    ate?: string;
  } = {},
  pagina = 1,
  porPagina = 50,
): Promise<{ data: ApiLog[]; total: number }> {
  const params = new URLSearchParams({
    pagina: String(pagina),
    por_pagina: String(porPagina),
  });
  if (filtros.api_key_id) params.set("api_key_id", filtros.api_key_id);
  if (filtros.endpoint) params.set("endpoint", filtros.endpoint);
  if (filtros.metodo) params.set("metodo", filtros.metodo);
  if (filtros.de) params.set("de", filtros.de);
  if (filtros.ate) params.set("ate", filtros.ate);

  const result = await api.get<{ data: ApiLog[]; total: number }>(
    `/api/catalogo/api-logs?${params.toString()}`,
  );
  return { data: result.data ?? [], total: result.total ?? 0 };
}

// ╔══════════════════════════════════════════════════════╗
// ║  3. ESTATÍSTICAS                                     ║
// ╚══════════════════════════════════════════════════════╝

/**
 * Obter estatísticas de todas as API Keys do município.
 */
export async function obterEstatisticasApi(
  municipioId?: string,
): Promise<ApiEstatisticas[]> {
  const params = new URLSearchParams();
  if (municipioId) params.set("municipio_id", municipioId);

  const { data } = await api.get<{ data: ApiEstatisticas[] }>(
    `/api/catalogo/api-estatisticas?${params.toString()}`,
  );
  return data ?? [];
}

// ╔══════════════════════════════════════════════════════╗
// ║  4. DOCUMENTAÇÃO DA API                              ║
// ╚══════════════════════════════════════════════════════╝

export interface EndpointDoc {
  metodo: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  descricao: string;
  permissao: string;
  parametros?: { nome: string; tipo: string; obrigatorio: boolean; descricao: string }[];
  exemplo_resposta?: string;
}

/**
 * Documentação dos endpoints disponíveis na API REST pública.
 */
export const ENDPOINTS_API: EndpointDoc[] = [
  {
    metodo: "GET",
    path: "/api/v1/catalogo",
    descricao: "Listar produtos do catálogo padronizado",
    permissao: "leitura",
    parametros: [
      { nome: "busca", tipo: "string", obrigatorio: false, descricao: "Filtro de texto" },
      { nome: "categoria_id", tipo: "uuid", obrigatorio: false, descricao: "Filtro por categoria" },
      { nome: "pagina", tipo: "number", obrigatorio: false, descricao: "Página (padrão: 1)" },
      { nome: "por_pagina", tipo: "number", obrigatorio: false, descricao: "Itens por página (padrão: 50, máx: 100)" },
    ],
    exemplo_resposta: `{
  "data": [{ "id": "...", "nome": "Arroz Tipo 1 5kg", "categoria": "Alimentícios", "unidade": "PCT" }],
  "total": 1250,
  "pagina": 1,
  "por_pagina": 50
}`,
  },
  {
    metodo: "GET",
    path: "/api/v1/catalogo/:id",
    descricao: "Obter detalhes de um produto do catálogo",
    permissao: "leitura",
    exemplo_resposta: `{
  "id": "...",
  "nome": "Arroz Tipo 1 5kg",
  "categoria": { "id": "...", "nome": "Alimentícios" },
  "unidade": "PCT",
  "elemento_despesa": "3.3.90.30"
}`,
  },
  {
    metodo: "GET",
    path: "/api/v1/cestas",
    descricao: "Listar cestas de preços do município",
    permissao: "leitura",
    parametros: [
      { nome: "status", tipo: "string", obrigatorio: false, descricao: "Filtro por status" },
      { nome: "pagina", tipo: "number", obrigatorio: false, descricao: "Página" },
    ],
    exemplo_resposta: `{
  "data": [{ "id": "...", "descricao_objeto": "Merenda Escolar", "status": "concluida", "valor_total": 125000.50 }],
  "total": 42
}`,
  },
  {
    metodo: "GET",
    path: "/api/v1/cestas/:id",
    descricao: "Obter detalhes de uma cesta com itens e preços",
    permissao: "leitura",
    exemplo_resposta: `{
  "id": "...",
  "descricao_objeto": "Merenda Escolar",
  "itens": [{ "produto": "Arroz Tipo 1", "media": 22.50, "mediana": 22.00, "menor": 19.90 }]
}`,
  },
  {
    metodo: "GET",
    path: "/api/v1/precos/:produto_id",
    descricao: "Consultar preços de um produto em todas as fontes",
    permissao: "leitura",
    parametros: [
      { nome: "periodo_meses", tipo: "number", obrigatorio: false, descricao: "Últimos N meses (padrão: 12)" },
      { nome: "uf", tipo: "string", obrigatorio: false, descricao: "Filtro por UF" },
    ],
  },
  {
    metodo: "POST",
    path: "/api/v1/cestas",
    descricao: "Criar nova cesta de preços via API",
    permissao: "escrita",
    parametros: [
      { nome: "descricao_objeto", tipo: "string", obrigatorio: true, descricao: "Descrição do objeto" },
      { nome: "tipo_calculo", tipo: "string", obrigatorio: false, descricao: "media | mediana | menor_preco" },
    ],
  },
  {
    metodo: "POST",
    path: "/api/v1/cestas/:id/itens",
    descricao: "Adicionar item a uma cesta",
    permissao: "escrita",
    parametros: [
      { nome: "produto_catalogo_id", tipo: "uuid", obrigatorio: true, descricao: "ID do produto" },
      { nome: "quantidade", tipo: "number", obrigatorio: true, descricao: "Quantidade" },
    ],
  },
  {
    metodo: "GET",
    path: "/api/v1/fornecedores",
    descricao: "Listar fornecedores cadastrados",
    permissao: "leitura",
  },
  {
    metodo: "GET",
    path: "/api/v1/cotacoes",
    descricao: "Listar cotações eletrônicas",
    permissao: "leitura",
    parametros: [
      { nome: "status", tipo: "string", obrigatorio: false, descricao: "Filtro por status" },
    ],
  },
  {
    metodo: "GET",
    path: "/api/v1/relatorios/mapa-apuracao/:cesta_id",
    descricao: "Gerar mapa de apuração de preços em JSON",
    permissao: "leitura",
  },
];

/**
 * Gerar snippet de código de exemplo para usar a API.
 */
export function gerarExemploCodigo(
  chaveApi: string,
  linguagem: "curl" | "javascript" | "python",
): string {
  const baseUrl = "https://api.licitanest.com.br";
  const placeholder = chaveApi || "lnst_sua_chave_aqui";

  switch (linguagem) {
    case "curl":
      return `curl -X GET "${baseUrl}/api/v1/catalogo?busca=arroz" \\
  -H "Authorization: Bearer ${placeholder}" \\
  -H "Content-Type: application/json"`;

    case "javascript":
      return `const response = await fetch("${baseUrl}/api/v1/catalogo?busca=arroz", {
  headers: {
    "Authorization": "Bearer ${placeholder}",
    "Content-Type": "application/json",
  },
});
const data = await response.json();
console.log(data);`;

    case "python":
      return `import requests

headers = {
    "Authorization": "Bearer ${placeholder}",
    "Content-Type": "application/json",
}

response = requests.get(
    "${baseUrl}/api/v1/catalogo",
    params={"busca": "arroz"},
    headers=headers,
)
print(response.json())`;
  }
}
