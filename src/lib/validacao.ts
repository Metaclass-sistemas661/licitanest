// ═══════════════════════════════════════════════════════════════
// Zod Validation Schemas — Licitanest
// Validação centralizada em inputs críticos do sistema
// ═══════════════════════════════════════════════════════════════
import { z } from "zod";

// ── Senha forte ────────────────────────────────────────────
export const senhaSchema = z
  .string()
  .min(8, "A senha deve ter no mínimo 8 caracteres.")
  .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula.")
  .regex(/[a-z]/, "A senha deve conter pelo menos uma letra minúscula.")
  .regex(/[0-9]/, "A senha deve conter pelo menos um número.")
  .regex(/[^A-Za-z0-9]/, "A senha deve conter pelo menos um caractere especial (!@#$%...).");

export const emailSchema = z
  .string()
  .min(1, "Informe o e-mail.")
  .email("E-mail inválido.");

// ── Login ──────────────────────────────────────────────────
export const loginSchema = z.object({
  email: emailSchema,
  senha: z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
});

// ── Redefinir senha ────────────────────────────────────────
export const redefinirSenhaSchema = z
  .object({
    novaSenha: senhaSchema,
    confirmarSenha: z.string(),
  })
  .refine((data) => data.novaSenha === data.confirmarSenha, {
    message: "As senhas não coincidem.",
    path: ["confirmarSenha"],
  });

// ── Cadastro de servidor ──────────────────────────────────
export const servidorSchema = z.object({
  nome: z.string().min(3, "O nome deve ter no mínimo 3 caracteres.").max(200),
  email: emailSchema,
  cpf: z
    .string()
    .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/, "CPF inválido.")
    .optional()
    .or(z.literal("")),
  perfil_id: z.string().uuid("Selecione um perfil."),
  secretaria_id: z.string().uuid("Selecione uma secretaria."),
});

// ── Cesta de preços ───────────────────────────────────────
export const cestaSchema = z.object({
  descricao_objeto: z
    .string()
    .min(5, "A descrição do objeto deve ter no mínimo 5 caracteres.")
    .max(500),
  tipo_calculo: z.enum(["media", "mediana", "menor_preco"], {
    message: "Selecione o tipo de cálculo.",
  }),
  tipo_correcao: z.enum(["ipca", "igpm", "nenhuma"]).optional(),
  secretaria_id: z.string().uuid("Selecione a secretaria.").optional(),
});

// ── Item da cesta ─────────────────────────────────────────
export const itemCestaSchema = z.object({
  produto_id: z.string().uuid("Selecione um produto do catálogo."),
  quantidade: z.number().positive("A quantidade deve ser maior que zero."),
  lote_id: z.string().uuid().optional().nullable(),
});

// ── Preço de item ─────────────────────────────────────────
export const precoItemSchema = z.object({
  valor_unitario: z.number().positive("O valor deve ser maior que zero."),
  fonte_id: z.string().uuid("Selecione a fonte de preço.").optional(),
  data_referencia: z.string().min(1, "Informe a data de referência."),
  orgao: z.string().max(300).optional(),
  descricao_fonte: z.string().max(500).optional(),
});

// ── Cotação eletrônica ────────────────────────────────────
export const cotacaoSchema = z.object({
  titulo: z.string().min(3, "O título deve ter no mínimo 3 caracteres.").max(200),
  descricao: z.string().max(1000).optional(),
  data_encerramento: z.string().min(1, "Informe a data de encerramento."),
});

// ── Fornecedor ────────────────────────────────────────────
export const fornecedorSchema = z.object({
  razao_social: z.string().min(3, "Razão social deve ter no mínimo 3 caracteres."),
  cpf_cnpj: z
    .string()
    .regex(
      /^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$|^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/,
      "CPF ou CNPJ inválido.",
    ),
  email: emailSchema.optional().or(z.literal("")),
  telefone: z.string().max(20).optional(),
});

// ── Resposta do fornecedor (portal) ───────────────────────
export const respostaFornecedorSchema = z.object({
  valor_unitario: z.number().positive("O valor unitário deve ser positivo."),
  marca: z.string().max(200).optional(),
  observacoes: z.string().max(500).optional(),
  registro_anvisa: z.string().max(50).optional(),
  prazo_validade_dias: z.number().int().min(1).optional(),
});

// ── API Key ───────────────────────────────────────────────
export const apiKeySchema = z.object({
  nome: z.string().min(3, "Nome da chave deve ter no mínimo 3 caracteres.").max(100),
  permissoes: z.array(z.string()).min(1, "Selecione pelo menos uma permissão."),
  rate_limit_rpm: z.number().int().min(1).max(1000).default(60),
});

// ── Onboarding ────────────────────────────────────────────
export const onboardingMunicipioSchema = z.object({
  nome: z.string().min(3, "Nome do município deve ter no mínimo 3 caracteres."),
  uf: z.string().length(2, "Selecione o estado."),
  codigo_ibge: z.string().optional(),
});

// ── LGPD ──────────────────────────────────────────────────
export const solicitacaoLgpdSchema = z.object({
  tipo: z.enum(["exclusao", "portabilidade", "retificacao", "acesso"], {
    message: "Selecione o tipo de solicitação.",
  }),
  descricao: z.string().min(10, "Descreva sua solicitação com mais detalhes.").max(2000),
});

// ── Helper: validar e retornar erros formatados ───────────
export function validarComZod<T>(
  schema: z.ZodSchema<T>,
  dados: unknown,
): { sucesso: true; dados: T } | { sucesso: false; erros: Record<string, string> } {
  const resultado = schema.safeParse(dados);
  if (resultado.success) {
    return { sucesso: true, dados: resultado.data };
  }
  const erros: Record<string, string> = {};
  for (const issue of resultado.error.issues) {
    const campo = issue.path.join(".");
    if (!erros[campo]) {
      erros[campo] = issue.message;
    }
  }
  return { sucesso: false, erros };
}
