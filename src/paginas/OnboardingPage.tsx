import { useState } from "react";
import {
  Building2,
  User,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EtapaOnboarding, DadosOnboarding } from "@/tipos";
import { registrarMunicipio } from "@/servicos/tenants";

const ETAPAS: { chave: EtapaOnboarding; titulo: string; icone: React.ElementType }[] = [
  { chave: "dados_municipio", titulo: "Município", icone: Building2 },
  { chave: "dados_responsavel", titulo: "Responsável", icone: User },
  { chave: "confirmacao", titulo: "Confirmação", icone: CheckCircle2 },
];

const UFS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

export function OnboardingPage() {
  const [etapaAtual, setEtapaAtual] = useState(0);
  const [dados, setDados] = useState<DadosOnboarding>({
    municipio_nome: "",
    municipio_uf: "",
    municipio_codigo_ibge: "",
    responsavel_nome: "",
    responsavel_email: "",
    responsavel_cargo: "",
    responsavel_senha: "",
  });
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState("");

  const atualizarDados = (campo: keyof DadosOnboarding, valor: string) => {
    setDados((prev) => ({ ...prev, [campo]: valor }));
  };

  const podeAvancar = (): boolean => {
    if (etapaAtual === 0) return !!(dados.municipio_nome && dados.municipio_uf);
    if (etapaAtual === 1) return !!(dados.responsavel_nome && dados.responsavel_email && dados.responsavel_senha);
    return true;
  };

  const avancar = () => {
    if (etapaAtual < ETAPAS.length - 1) setEtapaAtual((e) => e + 1);
  };

  const voltar = () => {
    if (etapaAtual > 0) setEtapaAtual((e) => e - 1);
  };

  const finalizar = async () => {
    setCarregando(true);
    setErro("");
    try {
      await registrarMunicipio(dados);
      setSucesso(true);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao registrar município");
    } finally {
      setCarregando(false);
    }
  };

  if (sucesso) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900">Cadastro realizado!</h1>
          <p className="text-gray-600">
            Seu município foi registrado com sucesso. Verifique seu e-mail para confirmar a conta
            e começar a utilizar o LicitaNest.
          </p>
          <a
            href="/login"
            className="inline-block mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Ir para login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">LicitaNest</h1>
          <p className="text-gray-500 mt-1">Cadastre seu município em poucos minutos</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {ETAPAS.map((etapa, i) => {
            const Icon = etapa.icone;
            const ativo = i === etapaAtual;
            const completo = i < etapaAtual;
            return (
              <div key={etapa.chave} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition",
                    ativo && "bg-blue-600 text-white",
                    completo && "bg-green-100 text-green-700",
                    !ativo && !completo && "bg-gray-100 text-gray-400"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{etapa.titulo}</span>
                </div>
                {i < ETAPAS.length - 1 && (
                  <div className={cn("w-8 h-0.5", completo ? "bg-green-400" : "bg-gray-200")} />
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
          {/* Etapa 1: Dados do Município */}
          {etapaAtual === 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Dados do Município</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Município *</label>
                <input
                  type="text"
                  value={dados.municipio_nome}
                  onChange={(e) => atualizarDados("municipio_nome", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: Belo Horizonte"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">UF *</label>
                  <select
                    value={dados.municipio_uf}
                    onChange={(e) => atualizarDados("municipio_uf", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Selecione</option>
                    {UFS.map((uf) => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código IBGE</label>
                  <input
                    type="text"
                    value={dados.municipio_codigo_ibge}
                    onChange={(e) => atualizarDados("municipio_codigo_ibge", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Opcional"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Etapa 2: Dados do Responsável */}
          {etapaAtual === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Dados do Responsável</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo *</label>
                <input
                  type="text"
                  value={dados.responsavel_nome}
                  onChange={(e) => atualizarDados("responsavel_nome", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail institucional *</label>
                <input
                  type="email"
                  value={dados.responsavel_email}
                  onChange={(e) => atualizarDados("responsavel_email", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                <input
                  type="text"
                  value={dados.responsavel_cargo}
                  onChange={(e) => atualizarDados("responsavel_cargo", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: Secretário(a) de Administração"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
                <input
                  type="password"
                  value={dados.responsavel_senha}
                  onChange={(e) => atualizarDados("responsavel_senha", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
            </div>
          )}

          {/* Etapa 3: Confirmação */}
          {etapaAtual === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Confirme seus dados</h2>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-500">Município:</span>{" "}
                  <span className="text-gray-900">{dados.municipio_nome} — {dados.municipio_uf}</span>
                </div>
                {dados.municipio_codigo_ibge && (
                  <div>
                    <span className="font-medium text-gray-500">IBGE:</span>{" "}
                    <span className="text-gray-900">{dados.municipio_codigo_ibge}</span>
                  </div>
                )}
                <div>
                  <span className="font-medium text-gray-500">Responsável:</span>{" "}
                  <span className="text-gray-900">{dados.responsavel_nome}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-500">E-mail:</span>{" "}
                  <span className="text-gray-900">{dados.responsavel_email}</span>
                </div>
                {dados.responsavel_cargo && (
                  <div>
                    <span className="font-medium text-gray-500">Cargo:</span>{" "}
                    <span className="text-gray-900">{dados.responsavel_cargo}</span>
                  </div>
                )}
                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-400">
                    Após o cadastro, um administrador entrará em contato para formalizar o contrato.
                  </p>
                </div>
              </div>
              {erro && (
                <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{erro}</div>
              )}
            </div>
          )}

          {/* Navegação */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={voltar}
              disabled={etapaAtual === 0}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-30 transition"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>

            {etapaAtual < ETAPAS.length - 1 ? (
              <button
                onClick={avancar}
                disabled={!podeAvancar()}
                className="flex items-center gap-1.5 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
              >
                Próximo <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={finalizar}
                disabled={carregando}
                className="flex items-center gap-1.5 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
              >
                {carregando ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Registrando...</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4" /> Confirmar Cadastro</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
