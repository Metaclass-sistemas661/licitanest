import { useState } from "react";
import { X, Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { criarPrefeitura } from "@/servicos/prefeituras-superadmin";
import type { CriarPrefeituraPayload } from "@/servicos/prefeituras-superadmin";

interface NovaPrefeituraModalProps {
  aberto: boolean;
  onClose: () => void;
  onCriado: () => void;
}

const UFS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

function validarCNPJ(cnpj: string): boolean {
  const nums = cnpj.replace(/\D/g, "");
  if (nums.length !== 14) return false;
  if (/^(\d)\1+$/.test(nums)) return false;

  const calc = (slice: string, factors: number[]) => {
    let sum = 0;
    for (let i = 0; i < factors.length; i++) sum += parseInt(slice[i]) * factors[i];
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const d1 = calc(nums, [5,4,3,2,9,8,7,6,5,4,3,2]);
  const d2 = calc(nums, [6,5,4,3,2,9,8,7,6,5,4,3,2]);
  return parseInt(nums[12]) === d1 && parseInt(nums[13]) === d2;
}

function validarCodigoIBGE(cod: string): boolean {
  return /^\d{7}$/.test(cod);
}

function mascaraCNPJ(v: string): string {
  const nums = v.replace(/\D/g, "").slice(0, 14);
  return nums
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function mascaraCEP(v: string): string {
  const nums = v.replace(/\D/g, "").slice(0, 8);
  return nums.replace(/^(\d{5})(\d)/, "$1-$2");
}

function mascaraTelefone(v: string): string {
  const nums = v.replace(/\D/g, "").slice(0, 11);
  if (nums.length <= 10) return nums.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  return nums.replace(/^(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
}

function mascaraCPF(v: string): string {
  const nums = v.replace(/\D/g, "").slice(0, 11);
  return nums
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function validarCPF(cpf: string): boolean {
  const nums = cpf.replace(/\D/g, "");
  if (nums.length !== 11 || /^(\d)\1+$/.test(nums)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += parseInt(nums[i]) * (len + 1 - i);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return parseInt(nums[9]) === calc(9) && parseInt(nums[10]) === calc(10);
}

interface Erros {
  nome?: string;
  uf?: string;
  codigo_ibge?: string;
  cnpj?: string;
  email?: string;
  cep?: string;
  responsavel_cpf?: string;
  responsavel_email?: string;
}

export function NovaPrefeituraModal({ aberto, onClose, onCriado }: NovaPrefeituraModalProps) {
  const [form, setForm] = useState<CriarPrefeituraPayload>({
    nome: "",
    uf: "",
  });
  const [erros, setErros] = useState<Erros>({});
  const [salvando, setSalvando] = useState(false);
  const [buscandoCEP, setBuscandoCEP] = useState(false);

  const vf = (campo: keyof typeof form, valor: string) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  };

  const validar = (): boolean => {
    const e: Erros = {};
    if (!form.nome || form.nome.trim().length < 3) e.nome = "Nome obrigatório (mín. 3 caracteres)";
    if (!form.uf) e.uf = "Selecione a UF";
    if (form.codigo_ibge && !validarCodigoIBGE(form.codigo_ibge)) e.codigo_ibge = "Código IBGE deve ter 7 dígitos";
    if (form.cnpj && !validarCNPJ(form.cnpj)) e.cnpj = "CNPJ inválido";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Email inválido";
    if (form.cep && form.cep.replace(/\D/g, "").length !== 8) e.cep = "CEP deve ter 8 dígitos";
    if (form.responsavel_cpf && !validarCPF(form.responsavel_cpf)) e.responsavel_cpf = "CPF inválido";
    if (form.responsavel_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.responsavel_email)) e.responsavel_email = "Email inválido";
    setErros(e);
    return Object.keys(e).length === 0;
  };

  const buscarCEP = async (cep: string) => {
    const nums = cep.replace(/\D/g, "");
    if (nums.length !== 8) return;
    setBuscandoCEP(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${nums}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm((f) => ({
          ...f,
          endereco: `${data.logradouro || ""}, ${data.bairro || ""} - ${data.localidade || ""}`,
          uf: data.uf || f.uf,
        }));
      }
    } catch { /* silencioso */ }
    finally { setBuscandoCEP(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validar()) return;

    setSalvando(true);
    try {
      await criarPrefeitura(form);
      toast.success("Prefeitura criada com sucesso!");
      setForm({ nome: "", uf: "" });
      setErros({});
      onCriado();
    } catch {
      toast.error("Erro ao criar prefeitura");
    } finally {
      setSalvando(false);
    }
  };

  if (!aberto) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border bg-background shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-superadmin-accent/10">
                <Building2 className="h-4 w-4 text-superadmin-accent" />
              </div>
              <h2 className="text-lg font-semibold">Nova Prefeitura</h2>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-muted transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Dados do Município */}
            <SectionTitle>Dados do Município</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                label="Nome do Município *"
                value={form.nome}
                onChange={(v) => vf("nome", v)}
                error={erros.nome}
                placeholder="Ex: Belo Horizonte"
                className="sm:col-span-2"
              />
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">UF *</label>
                <select
                  value={form.uf}
                  onChange={(e) => vf("uf", e.target.value)}
                  className={`w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-superadmin-accent ${erros.uf ? "border-red-500" : ""}`}
                >
                  <option value="">Selecione...</option>
                  {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                </select>
                {erros.uf && <p className="mt-1 text-xs text-red-500">{erros.uf}</p>}
              </div>
              <Campo
                label="Código IBGE"
                value={form.codigo_ibge || ""}
                onChange={(v) => vf("codigo_ibge", v.replace(/\D/g, "").slice(0, 7))}
                error={erros.codigo_ibge}
                placeholder="7 dígitos"
              />
              <Campo
                label="CNPJ"
                value={form.cnpj || ""}
                onChange={(v) => vf("cnpj", mascaraCNPJ(v))}
                error={erros.cnpj}
                placeholder="00.000.000/0000-00"
              />
              <Campo
                label="Email Institucional"
                value={form.email || ""}
                onChange={(v) => vf("email", v)}
                error={erros.email}
                placeholder="prefeitura@municipio.gov.br"
                type="email"
              />
              <Campo
                label="CEP"
                value={form.cep || ""}
                onChange={(v) => {
                  const masked = mascaraCEP(v);
                  vf("cep", masked);
                  if (masked.replace(/\D/g, "").length === 8) buscarCEP(masked);
                }}
                error={erros.cep}
                placeholder="00000-000"
                suffix={buscandoCEP ? <Loader2 className="h-3 w-3 animate-spin" /> : undefined}
              />
              <Campo
                label="Endereço"
                value={form.endereco || ""}
                onChange={(v) => vf("endereco", v)}
                placeholder="Rua, Bairro, Cidade"
                className="sm:col-span-2"
              />
              <Campo
                label="Telefone"
                value={form.telefone || ""}
                onChange={(v) => vf("telefone", mascaraTelefone(v))}
                placeholder="(00) 00000-0000"
              />
            </div>

            {/* Responsável */}
            <SectionTitle>Responsável</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                label="Nome"
                value={form.responsavel_nome || ""}
                onChange={(v) => vf("responsavel_nome", v)}
                placeholder="Nome completo"
              />
              <Campo
                label="CPF"
                value={form.responsavel_cpf || ""}
                onChange={(v) => vf("responsavel_cpf", mascaraCPF(v))}
                error={erros.responsavel_cpf}
                placeholder="000.000.000-00"
              />
              <Campo
                label="Cargo"
                value={form.responsavel_cargo || ""}
                onChange={(v) => vf("responsavel_cargo", v)}
                placeholder="Secretário(a), Prefeito(a)..."
              />
              <Campo
                label="Email"
                value={form.responsavel_email || ""}
                onChange={(v) => vf("responsavel_email", v)}
                error={erros.responsavel_email}
                placeholder="responsavel@email.com"
                type="email"
              />
            </div>

            {/* Observações */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Observações</label>
              <textarea
                value={form.observacoes || ""}
                onChange={(e) => vf("observacoes", e.target.value)}
                rows={3}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-superadmin-accent resize-none"
                placeholder="Observações internas..."
              />
            </div>

            {/* Ações */}
            <div className="flex items-center justify-end gap-3 border-t pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="flex items-center gap-2 rounded-lg bg-superadmin-accent px-5 py-2 text-sm font-medium text-white hover:bg-superadmin-accent/90 disabled:opacity-50 transition-colors"
              >
                {salvando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {salvando ? "Criando..." : "Criar Prefeitura"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ── Componentes auxiliares ────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</h3>;
}

function Campo({
  label, value, onChange, error, placeholder, type = "text", className, suffix,
}: {
  label: string; value: string; onChange: (v: string) => void;
  error?: string; placeholder?: string; type?: string; className?: string;
  suffix?: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-superadmin-accent ${error ? "border-red-500" : ""}`}
        />
        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
