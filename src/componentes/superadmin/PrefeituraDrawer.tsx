import { useEffect, useState, useCallback } from "react";
import {
  X,
  Building2,
  Users,
  FileText,
  BarChart3,
  Clock,
  Shield,
  MapPin,
  Mail,
  Phone,
  Hash,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { obterDetalhesPrefeitura, atualizarPrefeitura } from "@/servicos/prefeituras-superadmin";
import type { PrefeituraDetalhes } from "@/servicos/prefeituras-superadmin";

interface PrefeituraDrawerProps {
  prefeituraId: string | null;
  onClose: () => void;
  onAtualizado: () => void;
}

function formatarCentavos(v: number): string {
  return (v / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

function tempoRelativo(d: string | null): string {
  if (!d) return "Nunca";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Agora";
  if (mins < 60) return `${mins}min atrás`;
  const horas = Math.floor(mins / 60);
  if (horas < 24) return `${horas}h atrás`;
  const dias = Math.floor(horas / 24);
  if (dias < 30) return `${dias}d atrás`;
  return formatarData(d);
}

const STATUS_BADGE: Record<string, { label: string; cor: string }> = {
  rascunho: { label: "Rascunho", cor: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400" },
  pendente_assinatura: { label: "Pendente Assinatura", cor: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  ativo: { label: "Ativo", cor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  suspenso: { label: "Suspenso", cor: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  encerrado: { label: "Encerrado", cor: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400" },
  cancelado: { label: "Cancelado", cor: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  renovacao: { label: "Renovação", cor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
};

type AbaDrawer = "dados" | "contratos" | "usuarios" | "metricas";

export function PrefeituraDrawer({ prefeituraId, onClose, onAtualizado }: PrefeituraDrawerProps) {
  const [detalhes, setDetalhes] = useState<PrefeituraDetalhes | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [abaDrawer, setAbaDrawer] = useState<AbaDrawer>("dados");
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    if (!prefeituraId) return;
    setCarregando(true);
    try {
      const res = await obterDetalhesPrefeitura(prefeituraId);
      setDetalhes(res.data);
    } catch { /* interceptor */ }
    finally { setCarregando(false); }
  }, [prefeituraId]);

  useEffect(() => {
    if (prefeituraId) {
      carregar();
      setAbaDrawer("dados");
    } else {
      setDetalhes(null);
    }
  }, [prefeituraId, carregar]);

  const handleToggleAtivo = async () => {
    if (!detalhes) return;
    setSalvando(true);
    try {
      await atualizarPrefeitura(detalhes.id, { ativo: !detalhes.ativo });
      toast.success(detalhes.ativo ? "Prefeitura desativada" : "Prefeitura ativada");
      onAtualizado();
      await carregar();
    } catch {
      toast.error("Erro ao atualizar");
    } finally {
      setSalvando(false);
    }
  };

  const aberto = !!prefeituraId;

  return (
    <>
      {/* Backdrop */}
      {aberto && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-lg transform border-l bg-background shadow-2xl transition-transform duration-300 ${
          aberto ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {aberto && (
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-superadmin-accent/10">
                  <Building2 className="h-4 w-4 text-superadmin-accent" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">{detalhes?.nome || "Carregando..."}</h2>
                  {detalhes && (
                    <p className="text-xs text-muted-foreground">{detalhes.uf} · {detalhes.codigo_ibge || "Sem IBGE"}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Mini abas */}
            <div className="flex gap-1 border-b px-4 pt-2">
              {([
                { key: "dados" as const, label: "Dados", icon: Building2 },
                { key: "contratos" as const, label: "Contratos", icon: FileText },
                { key: "usuarios" as const, label: "Usuários", icon: Users },
                { key: "metricas" as const, label: "Métricas", icon: BarChart3 },
              ]).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAbaDrawer(key)}
                  className={`flex items-center gap-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                    abaDrawer === key
                      ? "border-superadmin-accent text-superadmin-accent"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {label}
                </button>
              ))}
            </div>

            {/* Conteúdo */}
            <div className="flex-1 overflow-y-auto p-6">
              {carregando ? (
                <div className="flex items-center justify-center py-20">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-superadmin-accent border-t-transparent" />
                </div>
              ) : detalhes ? (
                <>
                  {abaDrawer === "dados" && <DadosTab detalhes={detalhes} />}
                  {abaDrawer === "contratos" && <ContratosTab detalhes={detalhes} />}
                  {abaDrawer === "usuarios" && <UsuariosTab detalhes={detalhes} />}
                  {abaDrawer === "metricas" && <MetricasTab detalhes={detalhes} />}
                </>
              ) : null}
            </div>

            {/* Footer com ações */}
            {detalhes && (
              <div className="flex items-center justify-between border-t px-6 py-4">
                <button
                  type="button"
                  onClick={handleToggleAtivo}
                  disabled={salvando}
                  className={`rounded-lg px-4 py-2 text-xs font-medium transition-colors ${
                    detalhes.ativo
                      ? "border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
                      : "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400"
                  }`}
                >
                  {salvando ? "Salvando..." : detalhes.ativo ? "Desativar Prefeitura" : "Ativar Prefeitura"}
                </button>
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  detalhes.ativo
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400"
                }`}>
                  {detalhes.ativo ? "Ativa" : "Inativa"}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ── Dados Cadastrais ──────────────────────────────────────────

function DadosTab({ detalhes: d }: { detalhes: PrefeituraDetalhes }) {
  return (
    <div className="space-y-6">
      <Section title="Dados do Município">
        <InfoRow icon={Building2} label="Nome" value={d.nome} />
        <InfoRow icon={MapPin} label="UF" value={d.uf} />
        <InfoRow icon={Hash} label="Código IBGE" value={d.codigo_ibge || "—"} />
        <InfoRow icon={Hash} label="CNPJ" value={d.cnpj || "—"} />
        <InfoRow icon={MapPin} label="Endereço" value={d.endereco || "—"} />
        <InfoRow icon={MapPin} label="CEP" value={d.cep || "—"} />
        <InfoRow icon={Phone} label="Telefone" value={d.telefone || "—"} />
        <InfoRow icon={Mail} label="Email" value={d.email || "—"} />
        <InfoRow icon={Calendar} label="Cadastro" value={formatarData(d.criado_em)} />
      </Section>

      {(d.responsavel_nome || d.responsavel_email) && (
        <Section title="Responsável">
          <InfoRow icon={Users} label="Nome" value={d.responsavel_nome || "—"} />
          <InfoRow icon={Hash} label="CPF" value={d.responsavel_cpf || "—"} />
          <InfoRow icon={FileText} label="Cargo" value={d.responsavel_cargo || "—"} />
          <InfoRow icon={Mail} label="Email" value={d.responsavel_email || "—"} />
        </Section>
      )}

      {d.observacoes && (
        <Section title="Observações">
          <p className="text-sm text-muted-foreground">{d.observacoes}</p>
        </Section>
      )}

      {d.secretarias.length > 0 && (
        <Section title={`Secretarias (${d.secretarias.length})`}>
          <div className="space-y-2">
            {d.secretarias.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div>
                  <span className="text-sm font-medium">{s.nome}</span>
                  {s.sigla && <span className="ml-2 text-xs text-muted-foreground">({s.sigla})</span>}
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  s.ativo
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400"
                }`}>
                  {s.ativo ? "Ativa" : "Inativa"}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ── Contratos ──────────────────────────────────────────────

function ContratosTab({ detalhes: d }: { detalhes: PrefeituraDetalhes }) {
  if (d.contratos.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-center text-muted-foreground">
        <FileText className="mb-2 h-8 w-8 opacity-50" />
        <p className="text-sm">Nenhum contrato encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {d.contratos.map((c) => {
        const badge = STATUS_BADGE[c.status] || STATUS_BADGE.rascunho;
        return (
          <div key={c.id} className="rounded-xl border p-4 space-y-2 hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{c.numero_contrato}</span>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.cor}`}>
                {badge.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{c.objeto}</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Valor</span>
                <p className="font-medium">{formatarCentavos(c.valor_total)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Início</span>
                <p className="font-medium">{formatarData(c.data_inicio)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Fim</span>
                <p className="font-medium">{formatarData(c.data_fim)}</p>
              </div>
            </div>
            <div className="flex gap-4 text-[10px] text-muted-foreground">
              <span>👥 {c.limite_usuarios} usuários</span>
              <span>📦 {c.limite_cestas} cestas</span>
              <span>📊 {c.limite_cotacoes_mes} cotações/mês</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Usuários ──────────────────────────────────────────────

function UsuariosTab({ detalhes: d }: { detalhes: PrefeituraDetalhes }) {
  if (d.usuarios.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-center text-muted-foreground">
        <Users className="mb-2 h-8 w-8 opacity-50" />
        <p className="text-sm">Nenhum usuário cadastrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {d.usuarios.map((u) => (
        <div key={u.id} className="flex items-center gap-3 rounded-lg border px-4 py-3 hover:bg-muted/30 transition-colors">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-superadmin-accent/10 text-xs font-bold text-superadmin-accent">
            {u.nome.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">{u.nome}</span>
              {u.totp_ativado && <Shield className="h-3 w-3 text-emerald-500" />}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{u.email}</span>
              <span>·</span>
              <span>{u.secretaria_nome}</span>
            </div>
          </div>
          <div className="text-right">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
              u.perfil_nome === "administrador"
                ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                : u.perfil_nome === "gestor"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400"
            }`}>
              {u.perfil_nome}
            </span>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              <Clock className="inline h-2.5 w-2.5 mr-0.5" />
              {tempoRelativo(u.ultimo_acesso)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Métricas ──────────────────────────────────────────────

function MetricasTab({ detalhes: d }: { detalhes: PrefeituraDetalhes }) {
  const m = d.metricas;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <MetricaCard label="Cestas criadas" valor={m.total_cestas} />
        <MetricaCard label="Cotações" valor={m.total_cotacoes} />
        <MetricaCard label="Usuários" valor={d.usuarios.length} />
        <MetricaCard label="Contratos" valor={d.contratos.length} />
      </div>

      <Section title="Últimas informações">
        <InfoRow icon={Clock} label="Última atividade" value={tempoRelativo(m.ultima_atividade)} />
        <InfoRow icon={Users} label="2FA habilitado" value={`${d.usuarios.filter((u) => u.totp_ativado).length}/${d.usuarios.length}`} />
        <InfoRow icon={FileText} label="Contrato ativo" value={d.contratos.find((c) => c.status === "ativo")?.numero_contrato || "Nenhum"} />
      </Section>
    </div>
  );
}

function MetricaCard({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="rounded-lg border p-4 text-center">
      <p className="text-2xl font-bold text-superadmin-accent">{valor}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

// ── Componentes utilitários ──────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

function InfoRow({
  icon: Icon, label, value,
}: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}
