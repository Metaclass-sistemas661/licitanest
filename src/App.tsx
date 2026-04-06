import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contextos/AuthContexto";
import { PrivateRoute } from "@/componentes/auth/PrivateRoute";
import { AppLayout } from "@/componentes/layout/AppLayout";
import { Toaster } from "sonner";
import { PageLoader } from "@/componentes/ui/page-loader";
import { PwaInstallBanner, PwaUpdateBanner, OfflineIndicator } from "@/componentes/pwa";

/* ── Lazy-loaded pages ─────────────────────────────────── */
const DashboardPage = lazy(() => import("@/paginas/DashboardPage").then(m => ({ default: m.DashboardPage })));
const CatalogoPage = lazy(() => import("@/paginas/CatalogoPage").then(m => ({ default: m.CatalogoPage })));
const CestasPage = lazy(() => import("@/paginas/CestasPage").then(m => ({ default: m.CestasPage })));
const WizardNovaCesta = lazy(() => import("@/paginas/cestas/WizardNovaCesta").then(m => ({ default: m.WizardNovaCesta })));
const DetalheCestaPage = lazy(() => import("@/paginas/cestas/DetalheCestaPage").then(m => ({ default: m.DetalheCestaPage })));
const FornecedoresPage = lazy(() => import("@/paginas/FornecedoresPage").then(m => ({ default: m.FornecedoresPage })));
const CotacoesPage = lazy(() => import("@/paginas/cotacoes/CotacoesPage").then(m => ({ default: m.CotacoesPage })));
const DetalheCotacaoPage = lazy(() => import("@/paginas/cotacoes/DetalheCotacaoPage").then(m => ({ default: m.DetalheCotacaoPage })));
const PortalFornecedorPage = lazy(() => import("@/paginas/cotacoes/PortalFornecedorPage").then(m => ({ default: m.PortalFornecedorPage })));
const RelatoriosPage = lazy(() => import("@/paginas/RelatoriosPage").then(m => ({ default: m.RelatoriosPage })));
const ConfiguracoesPage = lazy(() => import("@/paginas/ConfiguracoesPage").then(m => ({ default: m.ConfiguracoesPage })));
const PesquisaRapidaPage = lazy(() => import("@/paginas/PesquisaRapidaPage").then(m => ({ default: m.PesquisaRapidaPage })));
const PainelGestorPage = lazy(() => import("@/paginas/PainelGestorPage").then(m => ({ default: m.PainelGestorPage })));
const LoginPage = lazy(() => import("@/paginas/LoginPage").then(m => ({ default: m.LoginPage })));
const RecuperarSenhaPage = lazy(() => import("@/paginas/RecuperarSenhaPage").then(m => ({ default: m.RecuperarSenhaPage })));
const RedefinirSenhaPage = lazy(() => import("@/paginas/RedefinirSenhaPage").then(m => ({ default: m.RedefinirSenhaPage })));
const AjudaPage = lazy(() => import("@/paginas/AjudaPage").then(m => ({ default: m.AjudaPage })));

/* ── Phase 13 — Funcionalidades Avançadas ────────────── */
const ComparadorCestasPage = lazy(() => import("@/paginas/ComparadorCestasPage").then(m => ({ default: m.ComparadorCestasPage })));
const TemplatesCestasPage = lazy(() => import("@/paginas/TemplatesCestasPage").then(m => ({ default: m.TemplatesCestasPage })));
const HistoricoPrecoPage = lazy(() => import("@/paginas/HistoricoPrecoPage").then(m => ({ default: m.HistoricoPrecoPage })));
const MapaCalorRegionalPage = lazy(() => import("@/paginas/MapaCalorRegionalPage").then(m => ({ default: m.MapaCalorRegionalPage })));
const AlertasPrecoPage = lazy(() => import("@/paginas/AlertasPrecoPage").then(m => ({ default: m.AlertasPrecoPage })));
const ExportacaoSicomPage = lazy(() => import("@/paginas/ExportacaoSicomPage").then(m => ({ default: m.ExportacaoSicomPage })));
const SugestaoFontesIAPage = lazy(() => import("@/paginas/SugestaoFontesIAPage").then(m => ({ default: m.SugestaoFontesIAPage })));
const OcrCotacoesPage = lazy(() => import("@/paginas/OcrCotacoesPage").then(m => ({ default: m.OcrCotacoesPage })));

/* ── Phase 14 — Multi-Tenancy & Escalabilidade ───────── */
const OnboardingPage = lazy(() => import("@/paginas/OnboardingPage").then(m => ({ default: m.OnboardingPage })));
const BillingPage = lazy(() => import("@/paginas/BillingPage").then(m => ({ default: m.BillingPage })));
const AdminMetaclassPage = lazy(() => import("@/paginas/AdminMetaclassPage").then(m => ({ default: m.AdminMetaclassPage })));
const MetricasUsoPage = lazy(() => import("@/paginas/MetricasUsoPage").then(m => ({ default: m.MetricasUsoPage })));

/* ── Phase 15 — Mobile / PWA ─────────────────────── */
const NotificacoesPage = lazy(() => import("@/paginas/NotificacoesPage").then(m => ({ default: m.NotificacoesPage })));

/* ── Phase 16 — Consolidação & Qualidade ─────────── */
const ApiPublicaPage = lazy(() => import("@/paginas/ApiPublicaPage").then(m => ({ default: m.ApiPublicaPage })));

function App() {
  return (
    <AuthProvider>
      {/* PWA global UI */}
      <OfflineIndicator />
      <PwaInstallBanner />
      <PwaUpdateBanner />

      {/* Toaster global — sonner */}
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          duration: 4000,
          className: "font-sans",
        }}
      />

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

              {/* Phase 14 — Multi-Tenancy */}
              <Route path="billing" element={<BillingPage />} />
              <Route path="metricas-uso" element={<MetricasUsoPage />} />
              <Route path="notificacoes" element={<NotificacoesPage />} />
              <Route path="api-publica" element={<ApiPublicaPage />} />
              <Route
                path="admin-metaclass"
                element={
                  <PrivateRoute perfisPermitidos={["administrador"]}>
                    <AdminMetaclassPage />
                  </PrivateRoute>
                }
              />

              {/* Apenas administrador / gestor */}
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
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}

export default App;
