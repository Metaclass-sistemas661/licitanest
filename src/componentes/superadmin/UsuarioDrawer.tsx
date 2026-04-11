import { useEffect, useState, useCallback } from "react";
import {
  X, User, Mail, Phone, Hash, MapPin, Shield, Calendar, Clock,
  Globe, Monitor, Activity,
} from "lucide-react";
import { toast } from "sonner";
import { obterDetalheUsuario, atualizarUsuario, type UsuarioDetalhe } from "@/servicos/usuarios-superadmin";

interface UsuarioDrawerProps {
  usuarioId: string | null;
  onClose: () => void;
  onAtualizado: () => void;
}

function formatarData(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

function formatarDataHora(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR");
}

function tempoRelativo(data: string | null): string {
  if (!data) return "Nunca";
  const diff = Date.now() - new Date(data).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "Agora";
  if (min < 60) return `${min}min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d atrás`;
  return new Date(data).toLocaleDateString("pt-BR");
}

export function UsuarioDrawer({ usuarioId, onClose, onAtualizado }: UsuarioDrawerProps) {
  const [usuario, setUsuario] = useState<UsuarioDetalhe | null>(null);
  const [loading, setLoading] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<"dados" | "atividades">("dados");

  const carregar = useCallback(() => {
    if (!usuarioId) return;
    setLoading(true);
    obterDetalheUsuario(usuarioId)
      .then((u) => { setUsuario(u); setAbaAtiva("dados"); })
      .catch(() => toast.error("Erro ao carregar detalhes"))
      .finally(() => setLoading(false));
  }, [usuarioId]);

  useEffect(() => { carregar(); }, [carregar]);

  const handleToggleAtivo = async () => {
    if (!usuario) return;
    try {
      await atualizarUsuario(usuario.id, { ativo: !usuario.ativo });
      toast.success(`Usuário ${usuario.ativo ? "desativado" : "ativado"}`);
      carregar();
      onAtualizado();
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  if (!usuarioId) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col border-l bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-superadmin-accent/10 text-superadmin-accent font-bold">
              {usuario?.nome?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div>
              <h2 className="font-semibold">{usuario?.nome || "Carregando..."}</h2>
              {usuario && (
                <p className="text-xs text-muted-foreground">{usuario.perfil_nome} · {usuario.municipio_nome}/{usuario.municipio_uf}</p>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading || !usuario ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Carregando...</div>
        ) : (
          <>
            {/* Abas */}
            <div className="flex border-b px-6">
              {(["dados", "atividades"] as const).map((tab) => (
                <button key={tab} type="button" onClick={() => setAbaAtiva(tab)}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors ${abaAtiva === tab ? "border-b-2 border-superadmin-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  {tab === "dados" ? "Dados" : "Atividades"}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {abaAtiva === "dados" ? (
                <>
                  {/* Info pessoal */}
                  <Section title="Informações Pessoais">
                    <InfoRow icon={User} label="Nome" value={usuario.nome} />
                    <InfoRow icon={Mail} label="Email" value={usuario.email} />
                    <InfoRow icon={Hash} label="CPF" value={usuario.cpf || "—"} />
                    <InfoRow icon={Hash} label="Matrícula" value={usuario.matricula || "—"} />
                    <InfoRow icon={Phone} label="Telefone" value={usuario.telefone || "—"} />
                    <InfoRow icon={Calendar} label="Nascimento" value={formatarData(usuario.data_nascimento)} />
                  </Section>

                  {/* Vínculo */}
                  <Section title="Vínculo Institucional">
                    <InfoRow icon={MapPin} label="Prefeitura" value={`${usuario.municipio_nome}/${usuario.municipio_uf}`} />
                    <InfoRow icon={MapPin} label="Secretaria" value={usuario.secretaria_nome} />
                    <InfoRow icon={Shield} label="Perfil" value={usuario.perfil_nome} />
                    <InfoRow icon={Shield} label="SuperAdmin" value={usuario.is_superadmin ? "Sim" : "Não"} />
                  </Section>

                  {/* Segurança */}
                  <Section title="Segurança & Acesso">
                    <InfoRow icon={Shield} label="2FA" value={usuario.totp_ativado ? `Ativo desde ${formatarData(usuario.totp_ativado_em)}` : "Não configurado"} />
                    <InfoRow icon={Clock} label="Último Acesso" value={tempoRelativo(usuario.ultimo_acesso)} />
                    <InfoRow icon={Globe} label="Último IP" value={usuario.ultimo_ip || "—"} />
                    <InfoRow icon={Monitor} label="User Agent" value={usuario.ultimo_user_agent?.slice(0, 60) || "—"} />
                  </Section>

                  {/* Datas */}
                  <Section title="Datas">
                    <InfoRow icon={Calendar} label="Criado em" value={formatarDataHora(usuario.criado_em)} />
                    <InfoRow icon={Calendar} label="Atualizado em" value={formatarDataHora(usuario.atualizado_em)} />
                  </Section>
                </>
              ) : (
                /* Atividades recentes */
                <div className="space-y-3">
                  {usuario.atividades_recentes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhuma atividade recente</p>
                  ) : usuario.atividades_recentes.map((a, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                      <Activity className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold">{a.acao}</span>
                          <span className="text-xs text-muted-foreground">{a.tabela}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{formatarDataHora(a.criado_em)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t px-6 py-4">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${usuario.ativo ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                  {usuario.ativo ? "Ativo" : "Inativo"}
                </span>
              </div>
              <button type="button" onClick={handleToggleAtivo}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${usuario.ativo ? "bg-red-600 text-white hover:bg-red-700" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>
                {usuario.ativo ? "Desativar" : "Ativar"}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ── Auxiliares ──────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="w-24 shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="text-sm truncate">{value}</span>
    </div>
  );
}
