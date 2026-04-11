import { useState, useEffect } from "react";
import { X, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  criarUsuario, listarPrefeiturasFiltro, listarPerfisFiltro, listarSecretariasMunicipio,
  type PrefeituraOption, type PerfilOption, type SecretariaOption,
} from "@/servicos/usuarios-superadmin";

interface CriarUsuarioModalProps {
  aberto: boolean;
  onClose: () => void;
  onCriado: () => void;
}

function mascaraCPF(v: string): string {
  const nums = v.replace(/\D/g, "").slice(0, 11);
  return nums
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function mascaraTelefone(v: string): string {
  const nums = v.replace(/\D/g, "").slice(0, 11);
  if (nums.length <= 10) return nums.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  return nums.replace(/^(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
}

export function CriarUsuarioModal({ aberto, onClose, onCriado }: CriarUsuarioModalProps) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [matricula, setMatricula] = useState("");
  const [telefone, setTelefone] = useState("");
  const [municipioId, setMunicipioId] = useState("");
  const [secretariaId, setSecretariaId] = useState("");
  const [perfilId, setPerfilId] = useState("");

  const [prefeituras, setPrefeituras] = useState<PrefeituraOption[]>([]);
  const [perfis, setPerfis] = useState<PerfilOption[]>([]);
  const [secretarias, setSecretarias] = useState<SecretariaOption[]>([]);
  const [loadingSecretarias, setLoadingSecretarias] = useState(false);

  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    Promise.all([listarPrefeiturasFiltro(), listarPerfisFiltro()])
      .then(([p, pf]) => { setPrefeituras(p); setPerfis(pf); })
      .catch(() => {});
  }, [aberto]);

  useEffect(() => {
    if (!municipioId) { setSecretarias([]); setSecretariaId(""); return; }
    setLoadingSecretarias(true);
    setSecretariaId("");
    listarSecretariasMunicipio(municipioId)
      .then(setSecretarias)
      .catch(() => setSecretarias([]))
      .finally(() => setLoadingSecretarias(false));
  }, [municipioId]);

  const limpar = () => {
    setNome(""); setEmail(""); setCpf(""); setMatricula(""); setTelefone("");
    setMunicipioId(""); setSecretariaId(""); setPerfilId("");
    setErros({}); setSecretarias([]);
  };

  const validar = (): boolean => {
    const e: Record<string, string> = {};
    if (!nome.trim() || nome.trim().length < 3) e.nome = "Nome obrigatório (mín. 3 caracteres)";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Email inválido";
    if (!municipioId) e.municipio = "Selecione a prefeitura";
    if (!secretariaId) e.secretaria = "Selecione a secretaria";
    if (!perfilId) e.perfil = "Selecione o perfil";
    setErros(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validar()) return;

    setSalvando(true);
    try {
      const resultado = await criarUsuario({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        cpf: cpf || undefined,
        matricula: matricula || undefined,
        telefone: telefone || undefined,
        perfil_id: perfilId,
        secretaria_id: secretariaId,
      });
      toast.success("Usuário criado! Um email de redefinição de senha será enviado.", { duration: 6000 });
      if (resultado.resetLink) {
        toast.info("Link de acesso gerado. O usuário poderá definir sua senha pelo email.", { duration: 8000 });
      }
      limpar();
      onCriado();
    } catch {
      toast.error("Erro ao criar usuário");
    } finally {
      setSalvando(false);
    }
  };

  if (!aberto) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border bg-background shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-superadmin-accent/10">
                <UserPlus className="h-4 w-4 text-superadmin-accent" />
              </div>
              <h2 className="text-lg font-semibold">Novo Usuário</h2>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-muted transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5 p-6">
            {/* Nome */}
            <Campo label="Nome Completo *" value={nome} onChange={setNome} error={erros.nome} placeholder="Nome do servidor" />

            {/* Email */}
            <Campo label="Email *" value={email} onChange={setEmail} error={erros.email} placeholder="email@exemplo.com" type="email" />

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="CPF" value={cpf} onChange={(v) => setCpf(mascaraCPF(v))} placeholder="000.000.000-00" />
              <Campo label="Matrícula" value={matricula} onChange={setMatricula} placeholder="Matrícula funcional" />
            </div>

            <Campo label="Telefone" value={telefone} onChange={(v) => setTelefone(mascaraTelefone(v))} placeholder="(00) 00000-0000" />

            {/* Prefeitura */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Prefeitura *</label>
              <select value={municipioId} onChange={(e) => { setMunicipioId(e.target.value); setErros((p) => ({ ...p, municipio: "" })); }}
                className={`w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-superadmin-accent ${erros.municipio ? "border-red-500" : ""}`}>
                <option value="">Selecione a prefeitura...</option>
                {prefeituras.map((p) => <option key={p.id} value={p.id}>{p.nome} ({p.uf})</option>)}
              </select>
              {erros.municipio && <p className="mt-1 text-xs text-red-500">{erros.municipio}</p>}
            </div>

            {/* Secretaria */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Secretaria *</label>
              <select value={secretariaId} onChange={(e) => { setSecretariaId(e.target.value); setErros((p) => ({ ...p, secretaria: "" })); }}
                disabled={!municipioId || loadingSecretarias}
                className={`w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-superadmin-accent disabled:opacity-50 ${erros.secretaria ? "border-red-500" : ""}`}>
                <option value="">{loadingSecretarias ? "Carregando..." : municipioId ? "Selecione a secretaria..." : "Selecione a prefeitura primeiro"}</option>
                {secretarias.map((s) => <option key={s.id} value={s.id}>{s.nome}{s.sigla ? ` (${s.sigla})` : ""}</option>)}
              </select>
              {erros.secretaria && <p className="mt-1 text-xs text-red-500">{erros.secretaria}</p>}
            </div>

            {/* Perfil */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Perfil *</label>
              <select value={perfilId} onChange={(e) => { setPerfilId(e.target.value); setErros((p) => ({ ...p, perfil: "" })); }}
                className={`w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-superadmin-accent ${erros.perfil ? "border-red-500" : ""}`}>
                <option value="">Selecione o perfil...</option>
                {perfis.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
              {erros.perfil && <p className="mt-1 text-xs text-red-500">{erros.perfil}</p>}
            </div>

            {/* Ações */}
            <div className="flex items-center justify-end gap-3 border-t pt-4">
              <button type="button" onClick={onClose}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
              <button type="submit" disabled={salvando}
                className="flex items-center gap-2 rounded-lg bg-superadmin-accent px-5 py-2 text-sm font-medium text-white hover:bg-superadmin-accent/90 disabled:opacity-50 transition-colors">
                {salvando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {salvando ? "Criando..." : "Criar Usuário"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ── Campo auxiliar ──────────────────────────────────────────────────────────

function Campo({ label, value, onChange, error, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void;
  error?: string; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-superadmin-accent ${error ? "border-red-500" : ""}`} />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
