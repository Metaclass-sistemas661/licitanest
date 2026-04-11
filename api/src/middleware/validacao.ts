import { z, type ZodSchema } from "zod";
import type { FastifyRequest, FastifyReply } from "fastify";

// ══════════════════════════════════════════════════════════════════════════════
// Middleware Fastify para validação Zod — Enterprise Pattern
// Uso: app.post("/rota", { preHandler: validar(schema) }, handler)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Cria um preHandler Fastify que valida req.body contra um Zod schema.
 * Retorna 400 com detalhes dos campos inválidos se falhar.
 */
export function validarBody<T extends ZodSchema>(schema: T) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      const erros = result.error.issues.map((i) => ({
        campo: i.path.join("."),
        mensagem: i.message,
      }));
      reply.status(400).send({ error: "Dados inválidos", detalhes: erros });
      return;
    }
    // Substituir body pelo parsed (com coerção e defaults aplicados)
    (request as unknown as { body: z.infer<T> }).body = result.data;
  };
}

/**
 * Valida query string contra um Zod schema.
 */
export function validarQuery<T extends ZodSchema>(schema: T) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const result = schema.safeParse(request.query);
    if (!result.success) {
      const erros = result.error.issues.map((i) => ({
        campo: i.path.join("."),
        mensagem: i.message,
      }));
      reply.status(400).send({ error: "Parâmetros inválidos", detalhes: erros });
      return;
    }
    (request as unknown as { query: z.infer<T> }).query = result.data;
  };
}

/**
 * Valida params da URL (ex: :id) contra um Zod schema.
 */
export function validarParams<T extends ZodSchema>(schema: T) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const result = schema.safeParse(request.params);
    if (!result.success) {
      const erros = result.error.issues.map((i) => ({
        campo: i.path.join("."),
        mensagem: i.message,
      }));
      reply.status(400).send({ error: "Parâmetros de URL inválidos", detalhes: erros });
      return;
    }
    (request as unknown as { params: z.infer<T> }).params = result.data;
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// Schemas reutilizáveis
// ══════════════════════════════════════════════════════════════════════════════

/** UUID v4 */
export const uuidSchema = z.string().uuid("ID deve ser um UUID válido");

/** Params com :id */
export const idParamsSchema = z.object({ id: uuidSchema });

/** String não-vazia com trim */
export const textoObrigatorio = (max = 500) =>
  z.string().trim().min(1, "Campo obrigatório").max(max);

/** String opcional com trim */
export const textoOpcional = (max = 500) =>
  z.string().trim().max(max).optional().or(z.literal(""));

// ══════════════════════════════════════════════════════════════════════════════
// Schemas por domínio — Cestas
// ══════════════════════════════════════════════════════════════════════════════

export const criarCestaSchema = z.object({
  descricao_objeto: textoObrigatorio(1000),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Data deve estar no formato YYYY-MM-DD"),
  tipo_calculo: z.enum(["media", "mediana", "menor_preco", "media_ponderada"]),
  tipo_correcao: z.enum(["nenhuma", "ipca", "inpc", "igpm"]),
  percentual_alerta: z.number().min(0).max(100).optional().default(25),
  secretaria_id: uuidSchema,
  criado_por: uuidSchema,
});

export const atualizarCestaSchema = z.object({
  descricao_objeto: textoOpcional(1000),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  tipo_calculo: z.enum(["media", "mediana", "menor_preco", "media_ponderada"]).optional(),
  tipo_correcao: z.enum(["nenhuma", "ipca", "inpc", "igpm"]).optional(),
  percentual_alerta: z.number().min(0).max(100).optional(),
  status: z.enum(["rascunho", "em_andamento", "concluida", "cancelada"]).optional(),
}).refine((d) => Object.values(d).some((v) => v !== undefined), {
  message: "Pelo menos um campo deve ser informado",
});

export const duplicarCestaSchema = z.object({
  servidor_id: uuidSchema,
  com_fontes: z.boolean().optional().default(false),
});

export const versaoCestaSchema = z.object({
  servidor_id: uuidSchema,
  descricao: textoOpcional(500),
});

// ══════════════════════════════════════════════════════════════════════════════
// Schemas por domínio — Cotações
// ══════════════════════════════════════════════════════════════════════════════

export const criarCotacaoSchema = z.object({
  cesta_id: uuidSchema,
  titulo: textoObrigatorio(500),
  descricao: textoOpcional(2000),
  prazo_resposta: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Data deve estar no formato YYYY-MM-DD"),
  criado_por: uuidSchema,
});

export const atualizarCotacaoSchema = z.object({
  titulo: textoOpcional(500),
  descricao: textoOpcional(2000),
  prazo_resposta: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  status: z.enum(["rascunho", "enviada", "aberta", "encerrada", "cancelada"]).optional(),
}).refine((d) => Object.values(d).some((v) => v !== undefined), {
  message: "Pelo menos um campo deve ser informado",
});

export const adicionarItemCotacaoSchema = z.object({
  item_cesta_id: uuidSchema,
  quantidade_estimada: z.number().positive().optional(),
});

export const adicionarFornecedorCotacaoSchema = z.object({
  fornecedor_id: uuidSchema.optional(),
  nome: textoObrigatorio(200),
  email: z.string().email("E-mail inválido"),
  cnpj_cpf: textoOpcional(18),
  telefone: textoOpcional(20),
});

export const lancamentoManualSchema = z.object({
  item_cesta_id: uuidSchema,
  fornecedor_nome: textoObrigatorio(200),
  valor: z.number().positive("Valor deve ser maior que zero"),
  marca: textoOpcional(200),
  observacao: textoOpcional(1000),
  servidor_id: uuidSchema,
});

export const respostaPortalSchema = z.object({
  respostas: z.array(z.object({
    item_cotacao_id: uuidSchema,
    valor: z.number().nonnegative("Valor não pode ser negativo"),
    marca: textoOpcional(200),
    observacao: textoOpcional(1000),
  })).min(1, "Pelo menos uma resposta é obrigatória"),
  dados_fornecedor: z.object({
    nome: textoOpcional(200),
    telefone: textoOpcional(20),
  }).optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// Schemas por domínio — Billing
// ══════════════════════════════════════════════════════════════════════════════

export const atualizarAssinaturaSchema = z.object({
  plano_id: uuidSchema.optional(),
  intervalo: z.enum(["mensal", "anual"]).optional(),
  status: z.enum(["ativa", "trial", "cancelada", "inadimplente", "expirada"]).optional(),
}).refine((d) => Object.values(d).some((v) => v !== undefined), {
  message: "Pelo menos um campo deve ser informado",
});

export const checkoutSchema = z.object({
  plano_id: uuidSchema,
  intervalo: z.enum(["mensal", "anual"]),
});

// ══════════════════════════════════════════════════════════════════════════════
// Schemas por domínio — IA
// ══════════════════════════════════════════════════════════════════════════════

// Schema validado para dados_contexto da IA (Fase 13.1)
const dadosContextoIASchema = z.object({
  cesta_id: uuidSchema.optional(),
  produto_id: uuidSchema.optional(),
  cotacao_id: uuidSchema.optional(),
  fonte_id: uuidSchema.optional(),
  itens: z.array(z.record(z.string(), z.unknown())).max(100).optional(),
}).passthrough().optional();

export const completarIASchema = z.object({
  tipo: textoObrigatorio(100),
  prompt: z.string().trim().min(1, "Prompt é obrigatório").max(4000, "Prompt excede 4.000 caracteres"),
  servidor_id: uuidSchema,
  dados_contexto: dadosContextoIASchema,
});

export const avaliarIASchema = z.object({
  nota: z.number().int().min(1).max(5),
});
