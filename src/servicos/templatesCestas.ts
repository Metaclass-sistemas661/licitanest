// Serviço de Templates de Cestas de Preços
import type { TemplateCesta, CategoriaTemplate } from "@/tipos";

// ── Templates pré-definidos ──────────────────────────
const TEMPLATES: TemplateCesta[] = [
  {
    id: "tpl-merenda-escolar",
    nome: "Merenda Escolar",
    descricao:
      "Template padrão para aquisição de gêneros alimentícios para merenda escolar municipal",
    categoria: "merenda_escolar",
    icone: "🍎",
    publico: true,
    itens: [
      { descricao: "Arroz tipo 1 (5kg)", unidade: "PCT", quantidade_sugerida: 500, categoria: "Alimentos" },
      { descricao: "Feijão carioca tipo 1 (1kg)", unidade: "PCT", quantidade_sugerida: 300, categoria: "Alimentos" },
      { descricao: "Macarrão espaguete (500g)", unidade: "PCT", quantidade_sugerida: 200, categoria: "Alimentos" },
      { descricao: "Óleo de soja (900ml)", unidade: "UN", quantidade_sugerida: 150, categoria: "Alimentos" },
      { descricao: "Açúcar cristal (5kg)", unidade: "PCT", quantidade_sugerida: 100, categoria: "Alimentos" },
      { descricao: "Sal refinado (1kg)", unidade: "PCT", quantidade_sugerida: 80, categoria: "Alimentos" },
      { descricao: "Leite integral UHT (1L)", unidade: "UN", quantidade_sugerida: 500, categoria: "Alimentos" },
      { descricao: "Farinha de trigo (1kg)", unidade: "PCT", quantidade_sugerida: 100, categoria: "Alimentos" },
      { descricao: "Extrato de tomate (340g)", unidade: "UN", quantidade_sugerida: 100, categoria: "Alimentos" },
      { descricao: "Carne bovina (patinho - kg)", unidade: "KG", quantidade_sugerida: 200, categoria: "Alimentos" },
      { descricao: "Frango inteiro congelado (kg)", unidade: "KG", quantidade_sugerida: 300, categoria: "Alimentos" },
      { descricao: "Banana prata (kg)", unidade: "KG", quantidade_sugerida: 100, categoria: "Alimentos" },
    ],
  },
  {
    id: "tpl-medicamentos-basicos",
    nome: "Medicamentos Básicos",
    descricao:
      "Template para aquisição de medicamentos essenciais da farmácia básica municipal",
    categoria: "medicamentos_basicos",
    icone: "💊",
    publico: true,
    itens: [
      { descricao: "Paracetamol 500mg (cx c/20)", unidade: "CX", quantidade_sugerida: 1000, categoria: "Medicamentos" },
      { descricao: "Dipirona 500mg (cx c/20)", unidade: "CX", quantidade_sugerida: 1000, categoria: "Medicamentos" },
      { descricao: "Ibuprofeno 600mg (cx c/20)", unidade: "CX", quantidade_sugerida: 500, categoria: "Medicamentos" },
      { descricao: "Amoxicilina 500mg (cx c/21)", unidade: "CX", quantidade_sugerida: 300, categoria: "Medicamentos" },
      { descricao: "Omeprazol 20mg (cx c/28)", unidade: "CX", quantidade_sugerida: 500, categoria: "Medicamentos" },
      { descricao: "Losartana 50mg (cx c/30)", unidade: "CX", quantidade_sugerida: 800, categoria: "Medicamentos" },
      { descricao: "Metformina 850mg (cx c/30)", unidade: "CX", quantidade_sugerida: 600, categoria: "Medicamentos" },
      { descricao: "Ácido Acetilsalicílico 100mg (cx c/30)", unidade: "CX", quantidade_sugerida: 400, categoria: "Medicamentos" },
      { descricao: "Soro fisiológico 0,9% (500ml)", unidade: "UN", quantidade_sugerida: 200, categoria: "Medicamentos" },
      { descricao: "Álcool gel 70% (500ml)", unidade: "UN", quantidade_sugerida: 300, categoria: "Medicamentos" },
    ],
  },
  {
    id: "tpl-material-escritorio",
    nome: "Material de Escritório",
    descricao:
      "Template para aquisição de materiais de expediente e escritório",
    categoria: "material_escritorio",
    icone: "📎",
    publico: true,
    itens: [
      { descricao: "Papel A4 branco (resma 500 fls)", unidade: "RSM", quantidade_sugerida: 200, categoria: "Escritório" },
      { descricao: "Caneta esferográfica azul", unidade: "UN", quantidade_sugerida: 500, categoria: "Escritório" },
      { descricao: "Caneta esferográfica preta", unidade: "UN", quantidade_sugerida: 300, categoria: "Escritório" },
      { descricao: "Lápis grafite nº2", unidade: "UN", quantidade_sugerida: 200, categoria: "Escritório" },
      { descricao: "Borracha branca", unidade: "UN", quantidade_sugerida: 100, categoria: "Escritório" },
      { descricao: "Grampeador de mesa", unidade: "UN", quantidade_sugerida: 30, categoria: "Escritório" },
      { descricao: "Grampos 26/6 (cx c/5000)", unidade: "CX", quantidade_sugerida: 50, categoria: "Escritório" },
      { descricao: "Clipes nº2 (cx c/500)", unidade: "CX", quantidade_sugerida: 50, categoria: "Escritório" },
      { descricao: "Pasta catálogo c/ 50 sacos", unidade: "UN", quantidade_sugerida: 50, categoria: "Escritório" },
      { descricao: "Envelope pardo A4", unidade: "UN", quantidade_sugerida: 200, categoria: "Escritório" },
      { descricao: "Fita adesiva transparente", unidade: "UN", quantidade_sugerida: 100, categoria: "Escritório" },
      { descricao: "Toner para impressora (preto)", unidade: "UN", quantidade_sugerida: 20, categoria: "Escritório" },
    ],
  },
  {
    id: "tpl-limpeza-higiene",
    nome: "Limpeza e Higiene",
    descricao:
      "Template para aquisição de materiais de limpeza e higiene institucional",
    categoria: "limpeza_higiene",
    icone: "🧹",
    publico: true,
    itens: [
      { descricao: "Água sanitária (1L)", unidade: "UN", quantidade_sugerida: 300, categoria: "Limpeza" },
      { descricao: "Detergente líquido (500ml)", unidade: "UN", quantidade_sugerida: 300, categoria: "Limpeza" },
      { descricao: "Desinfetante (2L)", unidade: "UN", quantidade_sugerida: 200, categoria: "Limpeza" },
      { descricao: "Sabão em pó (1kg)", unidade: "UN", quantidade_sugerida: 100, categoria: "Limpeza" },
      { descricao: "Esponja de limpeza", unidade: "UN", quantidade_sugerida: 200, categoria: "Limpeza" },
      { descricao: "Saco de lixo 100L (pct c/100)", unidade: "PCT", quantidade_sugerida: 50, categoria: "Limpeza" },
      { descricao: "Papel higiênico folha dupla (fardo c/64)", unidade: "FD", quantidade_sugerida: 30, categoria: "Higiene" },
      { descricao: "Papel toalha interfolhado (pct c/1000)", unidade: "PCT", quantidade_sugerida: 100, categoria: "Higiene" },
      { descricao: "Sabonete líquido (5L)", unidade: "GL", quantidade_sugerida: 50, categoria: "Higiene" },
      { descricao: "Luvas de procedimento (cx c/100)", unidade: "CX", quantidade_sugerida: 50, categoria: "Limpeza" },
    ],
  },
  {
    id: "tpl-informatica",
    nome: "Equipamentos de Informática",
    descricao:
      "Template para aquisição de equipamentos e acessórios de TI",
    categoria: "informatica",
    icone: "💻",
    publico: true,
    itens: [
      { descricao: "Computador desktop completo (i5, 8GB RAM, 256GB SSD)", unidade: "UN", quantidade_sugerida: 10, categoria: "Informática" },
      { descricao: "Monitor LED 21.5 polegadas", unidade: "UN", quantidade_sugerida: 10, categoria: "Informática" },
      { descricao: "Teclado USB padrão ABNT2", unidade: "UN", quantidade_sugerida: 20, categoria: "Informática" },
      { descricao: "Mouse óptico USB", unidade: "UN", quantidade_sugerida: 20, categoria: "Informática" },
      { descricao: "Notebook (i5, 8GB RAM, 256GB SSD)", unidade: "UN", quantidade_sugerida: 5, categoria: "Informática" },
      { descricao: "Impressora multifuncional laser mono", unidade: "UN", quantidade_sugerida: 3, categoria: "Informática" },
      { descricao: "Nobreak 600VA", unidade: "UN", quantidade_sugerida: 10, categoria: "Informática" },
      { descricao: "Cabo de rede Cat6 (caixa 305m)", unidade: "CX", quantidade_sugerida: 2, categoria: "Informática" },
      { descricao: "Switch 24 portas Gigabit", unidade: "UN", quantidade_sugerida: 2, categoria: "Informática" },
      { descricao: "Pen drive 64GB USB 3.0", unidade: "UN", quantidade_sugerida: 10, categoria: "Informática" },
    ],
  },
  {
    id: "tpl-construcao-civil",
    nome: "Construção Civil",
    descricao:
      "Template para aquisição de materiais de construção civil e manutenção predial",
    categoria: "construcao_civil",
    icone: "🏗️",
    publico: true,
    itens: [
      { descricao: "Cimento Portland CP II 50kg", unidade: "SC", quantidade_sugerida: 100, categoria: "Construção" },
      { descricao: "Areia média (m³)", unidade: "M3", quantidade_sugerida: 20, categoria: "Construção" },
      { descricao: "Brita nº 1 (m³)", unidade: "M3", quantidade_sugerida: 15, categoria: "Construção" },
      { descricao: "Tijolo cerâmico 6 furos", unidade: "MIL", quantidade_sugerida: 5, categoria: "Construção" },
      { descricao: "Vergalhão CA-50 10mm (12m)", unidade: "BR", quantidade_sugerida: 50, categoria: "Construção" },
      { descricao: "Telha fibrocimento 2,44m", unidade: "UN", quantidade_sugerida: 100, categoria: "Construção" },
      { descricao: "Tinta acrílica branca (18L)", unidade: "LT", quantidade_sugerida: 20, categoria: "Construção" },
      { descricao: "Tubo PVC 100mm (6m)", unidade: "UN", quantidade_sugerida: 30, categoria: "Construção" },
    ],
  },
  {
    id: "tpl-combustiveis",
    nome: "Combustíveis e Lubrificantes",
    descricao:
      "Template para aquisição de combustíveis e lubrificantes da frota municipal",
    categoria: "combustiveis",
    icone: "⛽",
    publico: true,
    itens: [
      { descricao: "Gasolina comum (litro)", unidade: "LT", quantidade_sugerida: 50000, categoria: "Combustíveis" },
      { descricao: "Diesel S10 (litro)", unidade: "LT", quantidade_sugerida: 80000, categoria: "Combustíveis" },
      { descricao: "Etanol hidratado (litro)", unidade: "LT", quantidade_sugerida: 20000, categoria: "Combustíveis" },
      { descricao: "Óleo lubrificante 15W40 (litro)", unidade: "LT", quantidade_sugerida: 500, categoria: "Lubrificantes" },
      { descricao: "Fluido de freio DOT 4 (500ml)", unidade: "UN", quantidade_sugerida: 50, categoria: "Lubrificantes" },
      { descricao: "Arla 32 (20L)", unidade: "GL", quantidade_sugerida: 200, categoria: "Combustíveis" },
    ],
  },
];

// ── Metadados de categorias ──────────────────────────
export const CATEGORIAS_TEMPLATE: Record<CategoriaTemplate, { label: string; icone: string; cor: string }> = {
  merenda_escolar: { label: "Merenda Escolar", icone: "🍎", cor: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  medicamentos_basicos: { label: "Medicamentos Básicos", icone: "💊", cor: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  material_escritorio: { label: "Material de Escritório", icone: "📎", cor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  limpeza_higiene: { label: "Limpeza e Higiene", icone: "🧹", cor: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  informatica: { label: "Informática", icone: "💻", cor: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
  construcao_civil: { label: "Construção Civil", icone: "🏗️", cor: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  alimentos_geral: { label: "Alimentos em Geral", icone: "🥘", cor: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  saude: { label: "Saúde", icone: "🏥", cor: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400" },
  combustiveis: { label: "Combustíveis", icone: "⛽", cor: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400" },
  personalizado: { label: "Personalizado", icone: "⚙️", cor: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400" },
};

// ── Funções públicas ─────────────────────────────────

/** Lista todos os templates disponíveis */
export function listarTemplates(filtroCategoria?: CategoriaTemplate): TemplateCesta[] {
  if (filtroCategoria) {
    return TEMPLATES.filter((t) => t.categoria === filtroCategoria);
  }
  return TEMPLATES;
}

/** Obtém um template pelo ID */
export function obterTemplate(id: string): TemplateCesta | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

/** Retorna o total de itens sugeridos num template */
export function totalItensTemplate(template: TemplateCesta): number {
  return template.itens.length;
}

/** Retorna categorias que possuem templates */
export function categoriasComTemplates(): CategoriaTemplate[] {
  const cats = new Set(TEMPLATES.map((t) => t.categoria));
  return Array.from(cats);
}
