import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Badge } from "@/componentes/ui/badge";
import { Input } from "@/componentes/ui/input";
import { Separator } from "@/componentes/ui/separator";
import {
  Shield,
  FileText,
  CheckCircle2,
  XCircle,
  Download,
  Key,
  Smartphone,
  AlertTriangle,
  ClipboardList,
  UserCheck,
  Lock,
  Eye,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useConsentimentos, useSolicitacoesLgpd } from "@/hooks/useFase17";
import {
  DOCUMENTOS_LGPD,
  TIPOS_SOLICITACAO_LGPD,
  gerarSegredoTOTP,
  gerarOtpAuthURI,
  ativar2FA,
  desativar2FA,
  gerarRelatorioDadosPessoais,
} from "@/servicos/lgpd";
import type { TipoConsentimento, TipoSolicitacaoLgpd } from "@/tipos";

type AbaLgpd = "consentimentos" | "solicitacoes" | "2fa" | "dados";

export function LGPDPage() {
  const { servidor } = useAuth();
  const [aba, setAba] = useState<AbaLgpd>("consentimentos");
  const [descricaoSolicitacao, setDescricaoSolicitacao] = useState("");
  const [totp2FA, setTotp2FA] = useState(false);
  const [segredoQR, setSegredoQR] = useState<string | null>(null);

  const {
    consentimentos,
    pendentes,
    carregando: _carregandoConsent,
    registrar,
    revogar,
  } = useConsentimentos(servidor?.id);

  const {
    solicitacoes,
    carregando: carregandoSolic,
    criar: criarSolicitacao,
  } = useSolicitacoesLgpd(servidor?.id);

  const handleAtivar2FA = async () => {
    if (!servidor) return;
    const segredo = gerarSegredoTOTP();
    await ativar2FA(servidor.id, segredo);
    setSegredoQR(segredo);
    setTotp2FA(true);
  };

  const handleDesativar2FA = async () => {
    if (!servidor) return;
    await desativar2FA(servidor.id);
    setTotp2FA(false);
    setSegredoQR(null);
  };

  const handleBaixarDados = async () => {
    if (!servidor) return;
    try {
      const dados = await gerarRelatorioDadosPessoais(servidor.id);
      const blob = new Blob([JSON.stringify(dados, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `meus_dados_${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Erro ao exportar dados");
    }
  };

  const abas: Array<{ id: AbaLgpd; label: string; icon: React.ReactNode }> = [
    { id: "consentimentos", label: "Consentimentos", icon: <FileText className="h-4 w-4" /> },
    { id: "solicitacoes", label: "Solicitações", icon: <ClipboardList className="h-4 w-4" /> },
    { id: "2fa", label: "Autenticação 2FA", icon: <Key className="h-4 w-4" /> },
    { id: "dados", label: "Meus Dados", icon: <Eye className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Privacidade e LGPD
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Lei Geral de Proteção de Dados Pessoais — Gerencie seus consentimentos, dados e segurança
        </p>
      </div>

      {/* Alerta de pendências */}
      {pendentes.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-amber-800">
                Você possui {pendentes.length} consentimento(s) obrigatório(s) pendente(s)
              </p>
              <p className="text-sm text-amber-700">
                {pendentes.map((p) => DOCUMENTOS_LGPD[p].titulo).join(", ")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Abas */}
      <div className="flex gap-1 border-b">
        {abas.map((a) => (
          <Button
            key={a.id}
            variant={aba === a.id ? "default" : "ghost"}
            size="sm"
            className="rounded-b-none"
            onClick={() => setAba(a.id)}
          >
            {a.icon}
            <span className="ml-1">{a.label}</span>
          </Button>
        ))}
      </div>

      {/* Conteúdo das abas */}
      {aba === "consentimentos" && (
        <div className="space-y-3">
          {(Object.entries(DOCUMENTOS_LGPD) as [TipoConsentimento, typeof DOCUMENTOS_LGPD["termos_uso"]][]).map(
            ([tipo, doc]) => {
              const consentimento = consentimentos.find(
                (c) => c.tipo === tipo && c.aceito && !c.revogado_em,
              );
              const aceito = !!consentimento;

              return (
                <Card
                  key={tipo}
                  className={aceito ? "border-green-200" : doc.obrigatorio ? "border-red-200" : ""}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {aceito ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-gray-400" />
                          )}
                          <span className="font-medium">{doc.titulo}</span>
                          {doc.obrigatorio && (
                            <Badge variant="destructive" className="text-xs">
                              Obrigatório
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            v{doc.versao}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 ml-7">
                          {doc.descricao}
                        </p>
                        {consentimento && (
                          <p className="text-xs text-muted-foreground mt-1 ml-7">
                            Aceito em: {new Date(consentimento.aceito_em!).toLocaleString("pt-BR")}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {aceito ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => revogar(tipo)}
                            disabled={doc.obrigatorio}
                          >
                            Revogar
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => registrar(tipo, true)}>
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Aceitar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            },
          )}
        </div>
      )}

      {aba === "solicitacoes" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Nova Solicitação</CardTitle>
              <CardDescription>
                Exercer seus direitos como titular dos dados conforme a LGPD
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(Object.entries(TIPOS_SOLICITACAO_LGPD) as [TipoSolicitacaoLgpd, typeof TIPOS_SOLICITACAO_LGPD["exclusao"]][]).map(
                  ([tipo, info]) => (
                    <Card
                      key={tipo}
                      className="cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() =>
                        criarSolicitacao(tipo, descricaoSolicitacao || undefined)
                      }
                    >
                      <CardContent className="py-4">
                        <p className="font-medium text-sm">{info.titulo}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {info.descricao}
                        </p>
                        <Badge variant="outline" className="text-xs mt-2">
                          {info.artigo}
                        </Badge>
                      </CardContent>
                    </Card>
                  ),
                )}
              </div>
              <Input
                placeholder="Descrição adicional (opcional)..."
                value={descricaoSolicitacao}
                onChange={(e) => setDescricaoSolicitacao(e.target.value)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Histórico de Solicitações</CardTitle>
            </CardHeader>
            <CardContent>
              {carregandoSolic ? (
                <p className="text-muted-foreground">Carregando...</p>
              ) : solicitacoes.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhuma solicitação registrada
                </p>
              ) : (
                <div className="space-y-2">
                  {solicitacoes.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border">
                      <Badge
                        variant="outline"
                        className={
                          s.status === "concluida"
                            ? "bg-green-100 text-green-700"
                            : s.status === "recusada"
                            ? "bg-red-100 text-red-700"
                            : s.status === "em_andamento"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-amber-100 text-amber-700"
                        }
                      >
                        {s.status}
                      </Badge>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {TIPOS_SOLICITACAO_LGPD[s.tipo]?.titulo ?? s.tipo}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(s.criado_em).toLocaleString("pt-BR")}
                        </p>
                      </div>
                      {s.resposta && (
                        <Badge variant="secondary" className="text-xs">
                          Respondida
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {aba === "2fa" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Autenticação de Dois Fatores (2FA)
            </CardTitle>
            <CardDescription>
              Proteja sua conta com autenticação TOTP via Google Authenticator, Authy ou similar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {totp2FA || segredoQR ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="font-medium">2FA ativado</p>
                    <p className="text-sm text-muted-foreground">
                      Sua conta está protegida com autenticação de dois fatores
                    </p>
                  </div>
                </div>

                {segredoQR && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="py-4 space-y-3">
                      <p className="text-sm font-medium text-blue-800">
                        Escaneie o QR Code no seu aplicativo autenticador:
                      </p>
                      <div className="p-4 bg-white rounded-lg border text-center">
                        <code className="text-xs break-all">
                          {gerarOtpAuthURI(servidor?.email ?? "", segredoQR)}
                        </code>
                      </div>
                      <p className="text-xs text-blue-700">
                        Ou insira manualmente o segredo: <strong>{segredoQR}</strong>
                      </p>
                    </CardContent>
                  </Card>
                )}

                <Button variant="destructive" size="sm" onClick={handleDesativar2FA}>
                  <Lock className="h-4 w-4 mr-2" />
                  Desativar 2FA
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <XCircle className="h-6 w-6 text-gray-400" />
                  <div>
                    <p className="font-medium">2FA desativado</p>
                    <p className="text-sm text-muted-foreground">
                      Recomendamos ativar para maior segurança da sua conta
                    </p>
                  </div>
                </div>
                <Button onClick={handleAtivar2FA}>
                  <Key className="h-4 w-4 mr-2" />
                  Ativar Autenticação 2FA
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {aba === "dados" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Meus Dados Pessoais
            </CardTitle>
            <CardDescription>
              Visualize e exporte seus dados pessoais conforme Art. 18 da LGPD
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {servidor && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Nome</p>
                    <p className="text-sm font-medium">{servidor.nome}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">E-mail</p>
                    <p className="text-sm font-medium">{servidor.email}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">CPF</p>
                    <p className="text-sm font-medium">{servidor.cpf ?? "Não informado"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Matrícula</p>
                    <p className="text-sm font-medium">{servidor.matricula ?? "Não informada"}</p>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleBaixarDados}>
                <Download className="h-4 w-4 mr-2" />
                Exportar Meus Dados (JSON)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default LGPDPage;
