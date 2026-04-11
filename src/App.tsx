import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contextos/AuthContexto";
import { PrivateRoute } from "@/componentes/auth/PrivateRoute";
import { SuperAdminGuard } from "@/componentes/auth/SuperAdminGuard";
import { AppLayout } from "@/componentes/layout/AppLayout";
import { SuperAdminLayout } from "@/componentes/layout/SuperAdminLayout";
import { Toaster } from "sonner";
import { PageLoader } from "@/componentes/ui/page-loader";
import { ErrorBoundary } from "@/componentes/ui/error-boundary";
import { PwaInstallBanner, PwaUpdateBanner, OfflineIndicator } from "@/componentes/pwa";
import { AceiteTermosModal } from "@/componentes/auth/AceiteTermosModal";

/* ── Enterprise lazy loader with per-chunk retry + cache bust ── */
async function purgeSwCaches(): Promise<void> {
  if (!("caches" in window)) return;
  const names = await window.caches.keys();
  await Promise.all(
    names
      .filter((n) => n.includes("precache") || n.includes("workbox"))
      .map((n) => window.caches.delete(n)),
  );
}

function lazyRetry<T extends Record<string, any>>(
  factory: () => Promise<T>,
  name: keyof T,
) {
  return lazy(() =>
    factory()
      .then((m) => {
        const key = `chunk-retry-${String(name)}`;
        sessionStorage.removeItem(key);
        return { default: m[name] as React.ComponentType };
      })
      .catch(async (err: Error) => {
        const key = `chunk-retry-${String(name)}`;
        const retries = Number(sessionStorage.getItem(key) || "0");

        if (retries < 2) {
          sessionStorage.setItem(key, String(retries + 1));
          await purgeSwCaches();
          window.location.reload();
          return { default: (() => null) as unknown as React.ComponentType };
        }

        sessionStorage.removeItem(key);
        throw err;
      }),
  );
}

/* ── Lazy-loaded pages ─────────────────────────────────── */
const DashboardPage = lazyRetry(() => import("@/paginas/DashboardPage"), "DashboardPage");
const CatalogoPage = lazyRetry(() => import("@/paginas/CatalogoPage"), "CatalogoPage");
const CestasPage = lazyRetry(() => import("@/paginas/CestasPage"), "CestasPage");
const WizardNovaCesta = lazyRetry(() => import("@/paginas/cestas/WizardNovaCesta"), "WizardNovaCesta");
const DetalheCestaPage = lazyRetry(() => import("@/paginas/cestas/DetalheCestaPage"), "DetalheCestaPage");
const FornecedoresPage = lazyRetry(() => import("@/paginas/FornecedoresPage"), "FornecedoresPage");
const CotacoesPage = lazyRetry(() => import("@/paginas/cotacoes/CotacoesPage"), "CotacoesPage");
const DetalheCotacaoPage = lazyRetry(() => import("@/paginas/cotacoes/DetalheCotacaoPage"), "DetalheCotacaoPage");
const PortalFornecedorPage = lazyRetry(() => import("@/paginas/cotacoes/PortalFornecedorPage"), "PortalFornecedorPage");
const RelatoriosPage = lazyRetry(() => import("@/paginas/RelatoriosPage"), "RelatoriosPage");
const ConfiguracoesPage = lazyRetry(() => import("@/paginas/ConfiguracoesPage"), "ConfiguracoesPage");
const PesquisaRapidaPage = lazyRetry(() => import("@/paginas/PesquisaRapidaPage"), "PesquisaRapidaPage");
const PainelGestorPage = lazyRetry(() => import("@/paginas/PainelGestorPage"), "PainelGestorPage");
const LoginPage = lazyRetry(() => import("@/paginas/LoginPage"), "LoginPage");
const RecuperarSenhaPage = lazyRetry(() => import("@/paginas/RecuperarSenhaPage"), "RecuperarSenhaPage");
const RedefinirSenhaPage = lazyRetry(() => import("@/paginas/RedefinirSenhaPage"), "RedefinirSenhaPage");
const AjudaPage = lazyRetry(() => import("@/paginas/AjudaPage"), "AjudaPage");

/* ── Phase 13 — Funcionalidades Avançadas ────────────── */
const ComparadorCestasPage = lazyRetry(() => import("@/paginas/ComparadorCestasPage"), "ComparadorCestasPage");
const TemplatesCestasPage = lazyRetry(() => import("@/paginas/TemplatesCestasPage"), "TemplatesCestasPage");
const HistoricoPrecoPage = lazyRetry(() => import("@/paginas/HistoricoPrecoPage"), "HistoricoPrecoPage");
const MapaCalorRegionalPage = lazyRetry(() => import("@/paginas/MapaCalorRegionalPage"), "MapaCalorRegionalPage");
const AlertasPrecoPage = lazyRetry(() => import("@/paginas/AlertasPrecoPage"), "AlertasPrecoPage");
const ExportacaoSicomPage = lazyRetry(() => import("@/paginas/ExportacaoSicomPage"), "ExportacaoSicomPage");
const SugestaoFontesIAPage = lazyRetry(() => import("@/paginas/SugestaoFontesIAPage"), "SugestaoFontesIAPage");
const OcrCotacoesPage = lazyRetry(() => import("@/paginas/OcrCotacoesPage"), "OcrCotacoesPage");

/* ── Phase 14 — Multi-Tenancy & Escalabilidade ───────── */
const OnboardingPage = lazyRetry(() => import("@/paginas/OnboardingPage"), "OnboardingPage");
const MetricasUsoPage = lazyRetry(() => import("@/paginas/MetricasUsoPage"), "MetricasUsoPage");

/* ── Phase 15 — Mobile / PWA ─────────────────────── */
const NotificacoesPage = lazyRetry(() => import("@/paginas/NotificacoesPage"), "NotificacoesPage");

/* ── Phase 16 — Consolidação & Qualidade ─────────── */
const ApiPublicaPage = lazyRetry(() => import("@/paginas/ApiPublicaPage"), "ApiPublicaPage");

/* ── Páginas órfãs registradas ────────────────────── */
const LGPDPage = lazyRetry(() => import("@/paginas/LGPDPage"), "LGPDPage");
const ChecklistINPage = lazyRetry(() => import("@/paginas/ChecklistINPage"), "ChecklistINPage");
const CatmatPage = lazyRetry(() => import("@/paginas/CatmatPage"), "CatmatPage");
const ImportacaoLotePage = lazyRetry(() => import("@/paginas/ImportacaoLotePage"), "ImportacaoLotePage");
const WorkflowPage = lazyRetry(() => import("@/paginas/WorkflowPage"), "WorkflowPage");
const IAAssistentePage = lazyRetry(() => import("@/paginas/IAAssistentePage"), "IAAssistentePage");

/* ── Phase 8 — Portal de Contratos (Município) ──────── */
const ContratosPortalPage = lazyRetry(() => import("@/paginas/ContratosPortalPage"), "ContratosPortalPage");
const ContratoDetalhePortalPage = lazyRetry(() => import("@/paginas/ContratoDetalhePortalPage"), "ContratoDetalhePortalPage");

/* ── SuperAdmin pages ────────────────────────────────── */
const SuperAdminDashboardPage = lazyRetry(() => import("@/paginas/superadmin/SuperAdminDashboardPage"), "SuperAdminDashboardPage");
const PrefeiturasPage = lazyRetry(() => import("@/paginas/superadmin/PrefeiturasPage"), "PrefeiturasPage");
const UsuariosGlobalPage = lazyRetry(() => import("@/paginas/superadmin/UsuariosGlobalPage"), "UsuariosGlobalPage");
const SAContratosPage = lazyRetry(() => import("@/paginas/superadmin/ContratosPage"), "ContratosPage");
const ContratoEditorPage = lazyRetry(() => import("@/paginas/superadmin/ContratoEditorPage"), "ContratoEditorPage");
const FaturasPage = lazyRetry(() => import("@/paginas/superadmin/FaturasPage"), "FaturasPage");
const AuditLogPage = lazyRetry(() => import("@/paginas/superadmin/AuditLogPage"), "AuditLogPage");
const ConfiguracoesSuperAdminPage = lazyRetry(() => import("@/paginas/superadmin/ConfiguracoesSuperAdminPage"), "ConfiguracoesSuperAdminPage");
const MonitoramentoPage = lazyRetry(() => import("@/paginas/superadmin/MonitoramentoPage"), "MonitoramentoPage");

function App() {
  return (
    <AuthProvider>
      {/* PWA global UI */}
      <OfflineIndicator />
      <PwaInstallBanner />
      <PwaUpdateBanner />

      {/* LGPD — Aceite obrigatório de termos */}
      <AceiteTermosModal />

      {/* Toaster global — sonner (premium) */}
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          duration: 4000,
          className: "font-sans backdrop-blur-sm shadow-lg rounded-xl border",
          style: {
            borderRadius: "0.75rem",
          },
        }}
      />

      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
          {/* ── Rotas públicas ──────────────────────────────── */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/recuperar-senha" element={<RecuperarSenhaPage />} />
          <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
          {/* Portal público do fornecedor (sem auth) */}
          <Route path="/portal/cotacao/:token" element={<PortalFornecedorPage />} />
          {/* Onboarding self-service (público) */}
          <Route path="/onboarding" element={<OnboardingPage />} />

          {/* ── Rotas protegidas ────────────────────────────── */}
          <Route element={<PrivateRoute />}>
            <Route path="/" element={<AppLayout />}>
              {/* Qualquer perfil autenticado */}
              <Route index element={<DashboardPage />} />
              <Route path="catalogo" element={<CatalogoPage />} />
              <Route path="cestas" element={<CestasPage />} />
              <Route path="cestas/nova" element={<WizardNovaCesta />} />
              <Route path="cestas/:cestaId" element={<DetalheCestaPage />} />
              <Route path="fornecedores" element={<FornecedoresPage />} />
              <Route path="cotacoes" element={<CotacoesPage />} />
              <Route path="cotacoes/:cotacaoId" element={<DetalheCotacaoPage />} />
              <Route path="pesquisa-rapida" element={<PesquisaRapidaPage />} />
              <Route path="relatorios" element={<RelatoriosPage />} />
              <Route path="ajuda" element={<AjudaPage />} />

              {/* Phase 13 — Funcionalidades Avançadas */}
              <Route path="comparador" element={<ComparadorCestasPage />} />
              <Route path="templates-cestas" element={<TemplatesCestasPage />} />
              <Route path="historico-precos" element={<HistoricoPrecoPage />} />
              <Route path="mapa-calor" element={<MapaCalorRegionalPage />} />
              <Route path="alertas-preco" element={<AlertasPrecoPage />} />
              <Route path="exportacao-sicom" element={<ExportacaoSicomPage />} />
              <Route path="sugestao-fontes-ia" element={<SugestaoFontesIAPage />} />
              <Route path="ocr-cotacoes" element={<OcrCotacoesPage />} />

              {/* Páginas anteriormente órfãs */}
              <Route path="lgpd" element={<LGPDPage />} />
              <Route path="checklist-in" element={<ChecklistINPage />} />
              <Route path="catmat" element={<CatmatPage />} />
              <Route path="workflow" element={<WorkflowPage />} />
              <Route path="ia-assistente" element={<IAAssistentePage />} />

              {/* Phase 8 — Portal de Contratos (Município) */}
              <Route path="contratos" element={
                <PrivateRoute perfisPermitidos={["administrador"]}>
                  <ContratosPortalPage />
                </PrivateRoute>
              } />
              <Route path="contratos/:id" element={
                <PrivateRoute perfisPermitidos={["administrador"]}>
                  <ContratoDetalhePortalPage />
                </PrivateRoute>
              } />

              {/* Phase 14 — Multi-Tenancy */}
              <Route path="metricas-uso" element={<MetricasUsoPage />} />
              <Route path="notificacoes" element={<NotificacoesPage />} />
              <Route path="api-publica" element={<ApiPublicaPage />} />

              {/* Apenas administrador / gestor */}
              <Route
                path="importacao-lote"
                element={
                  <PrivateRoute perfisPermitidos={["administrador", "gestor"]}>
                    <ImportacaoLotePage />
                  </PrivateRoute>
                }
              />
              <Route
                path="painel-gestor"
                element={
                  <PrivateRoute perfisPermitidos={["administrador", "gestor"]}>
                    <PainelGestorPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="configuracoes"
                element={
                  <PrivateRoute perfisPermitidos={["administrador"]}>
                    <ConfiguracoesPage />
                  </PrivateRoute>
                }
              />
            </Route>
          </Route>

          {/* ── Rotas SuperAdmin ─────────────────────────────── */}
          <Route element={<SuperAdminGuard />}>
            <Route path="/superadmin" element={<SuperAdminLayout />}>
              <Route index element={<SuperAdminDashboardPage />} />
              <Route path="prefeituras" element={<PrefeiturasPage />} />
              <Route path="usuarios" element={<UsuariosGlobalPage />} />
              <Route path="contratos" element={<SAContratosPage />} />
              <Route path="contratos/novo" element={<ContratoEditorPage />} />
              <Route path="contratos/:id/editar" element={<ContratoEditorPage />} />
              <Route path="faturas" element={<FaturasPage />} />
              <Route path="audit-log" element={<AuditLogPage />} />
              <Route path="monitoramento" element={<MonitoramentoPage />} />
              <Route path="configuracoes" element={<ConfiguracoesSuperAdminPage />} />
            </Route>
          </Route>

          {/* ── 404 — Rota não encontrada ─────────────────── */}
          <Route path="*" element={
            <div className="flex min-h-screen items-center justify-center bg-background">
              <div className="text-center space-y-4">
                <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
                <p className="text-lg text-muted-foreground">Página não encontrada</p>
                <a href="/" className="inline-block rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                  Voltar ao início
                </a>
              </div>
            </div>
          } />
        </Routes>
        </Suspense>
      </ErrorBoundary>
    </AuthProvider>
  );
}

export default App;
