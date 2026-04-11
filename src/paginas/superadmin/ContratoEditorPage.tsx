import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Check,
  Building2,
  DollarSign,
  Settings2,
  User,
  FileText,
  Loader2,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { criarContrato, atualizarContrato, buscarContrato } from "@/servicos/contratos";
import { listarPrefeituras } from "@/servicos/prefeituras-superadmin";
import type { PrefeituraListItem } from "@/servicos/prefeituras-superadmin";
import { ContratoEditor } from "@/componentes/superadmin/ContratoEditor";

// ── Etapas ──────────────────────────────────────────────────────

const ETAPAS = [
  { key: "basicos", label: "Dados Básicos", icon: Building2 },
  { key: "valores", label: "Valores e Vigência", icon: DollarSign },
  { key: "limites", label: "Limites", icon: Settings2 },
  { key: "responsavel", label: "Responsável", icon: User },
  { key: "conteudo", label: "Conteúdo", icon: FileText },
] as const;



const MODALIDADES = [
  "Pregão Eletrônico",
  "Pregão Presencial",
  "Concorrência",
  "Tomada de Preços",
  "Convite",
  "Dispensa de Licitação",
  "Inexigibilidade",
  "Adesão a Ata (Carona)",
  "Concurso",
  "Leilão",
  "Diálogo Competitivo",
];

// ── Helpers ─────────────────────────────────────────────────────

function formatarCentavos(v: number): string {
  return (v / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseCurrency(val: string): number {
  const clean = val.replace(/[^\d,]/g, "").replace(",", ".");
  return Math.round(parseFloat(clean || "0") * 100);
}

function maskCPF(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function currencyInput(v: string): string {
  const d = v.replace(/\D/g, "");
  if (!d) return "";
  const num = parseInt(d) / 100;
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Formulário state ────────────────────────────────────────────

interface FormState {
  // basicos
  municipio_id: string;
  numero_contrato: string;
  objeto: string;
  numero_processo: string;
  modalidade: string;
  // valores
  valor_total: number; // centavos
  valor_total_display: string;
  quantidade_parcelas: number;
  data_inicio: string;
  data_fim: string;
  data_assinatura: string;
  // limites
  limite_usuarios: number;
  limite_cestas: number;
  limite_cotacoes_mes: number;
  // responsavel
  responsavel_nome: string;
  responsavel_cargo: string;
  responsavel_cpf: string;
  // conteudo
  conteudo_html: string;
  conteudo_json: Record<string, unknown> | null;
}

const DEFAULT_FORM: FormState = {
  municipio_id: "",
  numero_contrato: "",
  objeto: "",
  numero_processo: "",
  modalidade: "",
  valor_total: 0,
  valor_total_display: "",
  quantidade_parcelas: 12,
  data_inicio: "",
  data_fim: "",
  data_assinatura: "",
  limite_usuarios: 999,
  limite_cestas: 999,
  limite_cotacoes_mes: 999,
  responsavel_nome: "",
  responsavel_cargo: "",
  responsavel_cpf: "",
  conteudo_html: "",
  conteudo_json: null,
};

// ── Componente principal ────────────────────────────────────────

export function ContratoEditorPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const isEdit = !!id;

  const [etapaIdx, setEtapaIdx] = useState(0);
  const [form, setForm] = useState<FormState>({ ...DEFAULT_FORM });
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(isEdit);

  // Prefeituras autocomplete
  const [prefeituras, setPrefeituras] = useState<PrefeituraListItem[]>([]);
  const [prefBusca, setPrefBusca] = useState("");
  const [prefDropdownOpen, setPrefDropdownOpen] = useState(false);
  const [prefSelecionada, setPrefSelecionada] = useState<PrefeituraListItem | null>(null);

  // Carregar prefeituras
  useEffect(() => {
    listarPrefeituras({ limit: 200, status: "ativo" }).then((r) => setPrefeituras(r.data));
  }, []);

  // Carregar contrato para edição
  useEffect(() => {
    if (!id) return;
    setCarregando(true);
    buscarContrato(id)
      .then(({ data: c }) => {
        setForm({
          municipio_id: c.municipio_id,
          numero_contrato: c.numero_contrato,
          objeto: c.objeto,
          numero_processo: c.numero_processo || "",
          modalidade: c.modalidade || "",
          valor_total: c.valor_total,
          valor_total_display: currencyInput(String(c.valor_total)),
          quantidade_parcelas: c.quantidade_parcelas,
          data_inicio: c.data_inicio?.slice(0, 10) || "",
          data_fim: c.data_fim?.slice(0, 10) || "",
          data_assinatura: c.data_assinatura?.slice(0, 10) || "",
          limite_usuarios: c.limite_usuarios,
          limite_cestas: c.limite_cestas,
          limite_cotacoes_mes: c.limite_cotacoes_mes,
          responsavel_nome: c.responsavel_nome || "",
          responsavel_cargo: c.responsavel_cargo || "",
          responsavel_cpf: c.responsavel_cpf || "",
          conteudo_html: c.conteudo_html || "",
          conteudo_json: c.conteudo_json || null,
        });
        // set prefeitura selecionada
        const pref = prefeituras.find((p) => p.id === c.municipio_id);
        if (pref) setPrefSelecionada(pref);
        else if (c.municipio_nome) {
          setPrefSelecionada({
            id: c.municipio_id,
            nome: c.municipio_nome,
            uf: c.municipio_uf || "",
          } as PrefeituraListItem);
        }
      })
      .catch(() => toast.error("Erro ao carregar contrato"))
      .finally(() => setCarregando(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const etapa = ETAPAS[etapaIdx].key;
  const valorMensal = form.quantidade_parcelas > 0 ? Math.round(form.valor_total / form.quantidade_parcelas) : 0;

  const prefFiltradas = prefBusca
    ? prefeituras.filter(
        (p) =>
          p.nome.toLowerCase().includes(prefBusca.toLowerCase()) ||
          p.uf.toLowerCase().includes(prefBusca.toLowerCase()),
      )
    : prefeituras;

  // Validação por etapa
  function validarEtapa(): boolean {
    if (etapa === "basicos") {
      if (!form.municipio_id) { toast.error("Selecione uma prefeitura"); return false; }
      if (!form.numero_contrato.trim()) { toast.error("Nº do contrato obrigatório"); return false; }
      if (!form.objeto.trim() || form.objeto.trim().length < 10) { toast.error("Objeto deve ter ao menos 10 caracteres"); return false; }
    }
    if (etapa === "valores") {
      if (form.valor_total <= 0) { toast.error("Valor total deve ser maior que zero"); return false; }
      if (form.quantidade_parcelas < 1) { toast.error("Mínimo de 1 parcela"); return false; }
      if (!form.data_inicio) { toast.error("Data de início obrigatória"); return false; }
      if (!form.data_fim) { toast.error("Data de término obrigatória"); return false; }
      if (form.data_fim <= form.data_inicio) { toast.error("Data fim deve ser posterior ao início"); return false; }
    }
    if (etapa === "responsavel") {
      if (!form.responsavel_nome.trim()) { toast.error("Nome do responsável obrigatório"); return false; }
      if (!form.responsavel_cargo.trim()) { toast.error("Cargo do responsável obrigatório"); return false; }
    }
    return true;
  }

  function avancar() {
    if (!validarEtapa()) return;
    setEtapaIdx((i) => Math.min(i + 1, ETAPAS.length - 1));
  }

  function voltar() {
    setEtapaIdx((i) => Math.max(i - 1, 0));
  }

  const handleEditorChange = useCallback((html: string, json: Record<string, unknown>) => {
    setForm((f) => ({ ...f, conteudo_html: html, conteudo_json: json }));
  }, []);

  async function salvar() {
    if (!validarEtapa()) return;
    setSalvando(true);
    try {
      const payload = {
        municipio_id: form.municipio_id,
        numero_contrato: form.numero_contrato.trim(),
        objeto: form.objeto.trim(),
        numero_processo: form.numero_processo.trim() || null,
        modalidade: form.modalidade || null,
        valor_total: form.valor_total,
        valor_mensal: valorMensal,
        quantidade_parcelas: form.quantidade_parcelas,
        data_inicio: form.data_inicio,
        data_fim: form.data_fim,
        data_assinatura: form.data_assinatura || null,
        limite_usuarios: form.limite_usuarios,
        limite_cestas: form.limite_cestas,
        limite_cotacoes_mes: form.limite_cotacoes_mes,
        responsavel_nome: form.responsavel_nome.trim() || null,
        responsavel_cargo: form.responsavel_cargo.trim() || null,
        responsavel_cpf: form.responsavel_cpf.replace(/\D/g, "") || null,
        conteudo_html: form.conteudo_html || null,
        conteudo_json: form.conteudo_json,
        observacoes: null,
      };

      if (isEdit) {
        await atualizarContrato(id, payload);
        toast.success("Contrato atualizado!");
      } else {
        await criarContrato(payload);
        toast.success("Contrato criado!");
      }
      nav("/superadmin/contratos");
    } catch {
      toast.error("Erro ao salvar contrato");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-superadmin-accent" />
      </div>
    );
  }

  // Auto-sugestão de número
  const anoAtual = new Date().getFullYear();
  const sugestaoNumero = `CT-${anoAtual}/`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => nav("/superadmin/contratos")}
          className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">{isEdit ? "Editar Contrato" : "Novo Contrato"}</h1>
          <p className="text-sm text-muted-foreground">
            {isEdit ? `Editando ${form.numero_contrato}` : "Preencha todas as etapas"}
          </p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {ETAPAS.map((e, idx) => {
          const Icon = e.icon;
          const done = idx < etapaIdx;
          const active = idx === etapaIdx;
          return (
            <button
              key={e.key}
              type="button"
              onClick={() => { if (idx < etapaIdx) setEtapaIdx(idx); }}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap
                ${active ? "bg-superadmin-accent text-white" : done ? "bg-superadmin-accent/10 text-superadmin-accent cursor-pointer" : "text-muted-foreground"}`}
            >
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs
                ${active ? "bg-white/20" : done ? "bg-superadmin-accent/20" : "bg-muted"}`}>
                {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              </span>
              <span className="hidden sm:inline">{e.label}</span>
            </button>
          );
        })}
      </div>

      {/* ═══ Etapa: Dados Básicos ═══ */}
      {etapa === "basicos" && (
        <div className="rounded-xl border bg-card p-6 space-y-5">
          <h2 className="text-lg font-semibold">Dados Básicos</h2>

          {/* Prefeitura autocomplete */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Prefeitura *</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={prefSelecionada ? `${prefSelecionada.nome} — ${prefSelecionada.uf}` : prefBusca}
                onChange={(e) => {
                  setPrefBusca(e.target.value);
                  setPrefSelecionada(null);
                  setForm((f) => ({ ...f, municipio_id: "" }));
                  setPrefDropdownOpen(true);
                }}
                onFocus={() => setPrefDropdownOpen(true)}
                placeholder="Buscar prefeitura..."
                className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-superadmin-accent"
              />
              {prefDropdownOpen && !prefSelecionada && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border bg-popover shadow-lg">
                  {prefFiltradas.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">Nenhuma prefeitura encontrada</div>
                  ) : (
                    prefFiltradas.slice(0, 20).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setForm((f) => ({ ...f, municipio_id: p.id }));
                          setPrefSelecionada(p);
                          setPrefDropdownOpen(false);
                          setPrefBusca("");
                        }}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                      >
                        <span className="font-medium">{p.nome}</span>
                        <span className="ml-2 text-muted-foreground">{p.uf}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Nº Contrato */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nº do Contrato *</label>
            <input
              type="text"
              value={form.numero_contrato}
              onChange={(e) => setForm((f) => ({ ...f, numero_contrato: e.target.value }))}
              placeholder={sugestaoNumero}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-superadmin-accent"
            />
          </div>

          {/* Objeto */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Objeto *</label>
            <textarea
              value={form.objeto}
              onChange={(e) => setForm((f) => ({ ...f, objeto: e.target.value }))}
              rows={3}
              placeholder="Descreva o objeto do contrato..."
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-superadmin-accent resize-none"
            />
          </div>

          {/* Processo + Modalidade */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nº do Processo</label>
              <input
                type="text"
                value={form.numero_processo}
                onChange={(e) => setForm((f) => ({ ...f, numero_processo: e.target.value }))}
                placeholder="Ex: 001/2026"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-superadmin-accent"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Modalidade</label>
              <select
                value={form.modalidade}
                onChange={(e) => setForm((f) => ({ ...f, modalidade: e.target.value }))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-superadmin-accent"
              >
                <option value="">Selecione...</option>
                {MODALIDADES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Etapa: Valores e Vigência ═══ */}
      {etapa === "valores" && (
        <div className="rounded-xl border bg-card p-6 space-y-5">
          <h2 className="text-lg font-semibold">Valores e Vigência</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Valor Total */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Valor Total (R$) *</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">R$</span>
                <input
                  type="text"
                  value={form.valor_total_display}
                  onChange={(e) => {
                    const display = currencyInput(e.target.value);
                    const centavos = parseCurrency(display);
                    setForm((f) => ({ ...f, valor_total_display: display, valor_total: centavos }));
                  }}
                  placeholder="0,00"
                  className="w-full rounded-lg border bg-background pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-superadmin-accent"
                />
              </div>
            </div>

            {/* Qtd Parcelas */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Quantidade de Parcelas *</label>
              <input
                type="number"
                min={1}
                max={120}
                value={form.quantidade_parcelas}
                onChange={(e) => setForm((f) => ({ ...f, quantidade_parcelas: parseInt(e.target.value) || 1 }))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-superadmin-accent"
              />
            </div>
          </div>

          {/* Valor da parcela (readonly) */}
          <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm">
            <span className="text-muted-foreground">Valor da parcela: </span>
            <span className="font-semibold">{formatarCentavos(valorMensal)}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Data Início *</label>
              <input
                type="date"
                value={form.data_inicio}
                onChange={(e) => setForm((f) => ({ ...f, data_inicio: e.target.value }))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-superadmin-accent"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Data Fim *</label>
              <input
                type="date"
                value={form.data_fim}
                onChange={(e) => setForm((f) => ({ ...f, data_fim: e.target.value }))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-superadmin-accent"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Data Assinatura</label>
              <input
                type="date"
                value={form.data_assinatura}
                onChange={(e) => setForm((f) => ({ ...f, data_assinatura: e.target.value }))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-superadmin-accent"
              />
            </div>
          </div>
        </div>
      )}

      {/* ═══ Etapa: Limites ═══ */}
      {etapa === "limites" && (
        <div className="rounded-xl border bg-card p-6 space-y-5">
          <h2 className="text-lg font-semibold">Limites do Contrato</h2>
          <p className="text-sm text-muted-foreground">Defina os limites de uso que o município terá durante a vigência do contrato.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Limite de Usuários</label>
              <input
                type="number"
                min={1}
                value={form.limite_usuarios}
                onChange={(e) => setForm((f) => ({ ...f, limite_usuarios: parseInt(e.target.value) || 1 }))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-superadmin-accent"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Limite de Cestas</label>
              <input
                type="number"
                min={1}
                value={form.limite_cestas}
                onChange={(e) => setForm((f) => ({ ...f, limite_cestas: parseInt(e.target.value) || 1 }))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-superadmin-accent"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Limite de Cotações/mês</label>
              <input
                type="number"
                min={1}
                value={form.limite_cotacoes_mes}
                onChange={(e) => setForm((f) => ({ ...f, limite_cotacoes_mes: parseInt(e.target.value) || 1 }))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-superadmin-accent"
              />
            </div>
          </div>
        </div>
      )}

      {/* ═══ Etapa: Responsável ═══ */}
      {etapa === "responsavel" && (
        <div className="rounded-xl border bg-card p-6 space-y-5">
          <h2 className="text-lg font-semibold">Responsável pelo Contrato</h2>
          <p className="text-sm text-muted-foreground">Dados do representante legal do município que assinará o contrato.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nome Completo *</label>
              <input
                type="text"
                value={form.responsavel_nome}
                onChange={(e) => setForm((f) => ({ ...f, responsavel_nome: e.target.value }))}
                placeholder="Nome do representante"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-superadmin-accent"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Cargo *</label>
              <input
                type="text"
                value={form.responsavel_cargo}
                onChange={(e) => setForm((f) => ({ ...f, responsavel_cargo: e.target.value }))}
                placeholder="Ex: Prefeito(a) Municipal"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-superadmin-accent"
              />
            </div>
          </div>

          <div className="space-y-1.5 max-w-sm">
            <label className="text-sm font-medium">CPF</label>
            <input
              type="text"
              value={form.responsavel_cpf}
              onChange={(e) => setForm((f) => ({ ...f, responsavel_cpf: maskCPF(e.target.value) }))}
              placeholder="000.000.000-00"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-superadmin-accent"
            />
          </div>
        </div>
      )}

      {/* ═══ Etapa: Conteúdo (Editor TipTap) ═══ */}
      {etapa === "conteudo" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Conteúdo do Contrato</h2>
            <p className="text-xs text-muted-foreground">Use variáveis de template para inserir dados dinâmicos</p>
          </div>
          <ContratoEditor
            contentHtml={form.conteudo_html}
            contentJson={form.conteudo_json}
            onChange={handleEditorChange}
          />
        </div>
      )}

      {/* ═══ Navigation footer ═══ */}
      <div className="flex items-center justify-between rounded-xl border bg-card px-6 py-4">
        <button
          type="button"
          onClick={voltar}
          disabled={etapaIdx === 0}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-30"
        >
          <ArrowLeft className="h-4 w-4" /> Anterior
        </button>

        <span className="text-xs text-muted-foreground">
          Etapa {etapaIdx + 1} de {ETAPAS.length}
        </span>

        {etapaIdx < ETAPAS.length - 1 ? (
          <button
            type="button"
            onClick={avancar}
            className="flex items-center gap-2 rounded-lg bg-superadmin-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            Próximo <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={salvar}
            disabled={salvando}
            className="flex items-center gap-2 rounded-lg bg-superadmin-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? "Salvar Alterações" : "Criar Contrato"}
          </button>
        )}
      </div>
    </div>
  );
}
