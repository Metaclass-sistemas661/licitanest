import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contextos/AuthContexto";
import { PrivateRoute } from "@/componentes/auth/PrivateRoute";
import { AppLayout } from "@/componentes/layout/AppLayout";
import { Toaster } from "sonner";
import { PageLoader } from "@/componentes/ui/page-loader";
import { ErrorBoundary } from "@/componentes/ui/error-boundary";
import { PwaInstallBanner, PwaUpdateBanner, OfflineIndicator } from "@/componentes/pwa";

/* ── Enterprise lazy loader with per-chunk retry + cache bust ── */
function lazyRetry<T extends Record<string, any>>(
  factory: () => Promise<T>,
  name: keyof T,
) {
  return lazy(() =>
    factory()
      .then((m) => {
        // Success — clear any previous retry flag for this chunk
        const key = `chunk-retry-${String(name)}`;
        sessionStorage.removeItem(key);
        return { default: m[name] as React.ComponentType };
      })
      .catch((err: Error) => {
        const key = `chunk-retry-${String(name)}`;
        const retries = Number(sessionStorage.getItem(key) || "0");

        if (retries < 2) {
          // Retry: cache-bust by appending timestamp to force fresh fetch
          sessionStorage.setItem(key, String(retries + 1));
          // Purge the failed module from browser cache
          if ("caches" in window) {
            window.caches.keys().then((names) =>
              names.forEach((n) => {
                if (n.includes("workbox-precache") || n.includes("precache")) {
                  window.caches.open(n).then((cache) =>
                    cache.keys().then((reqs) =>
                      reqs.forEach((req) => {
                        if (req.url.includes(String(name))) cache.delete(req);
                      }),
                    ),
                  );
                }
              }),
            );
          }
          window.location.reload();
          // Return empty component while reload happens
          return { default: (() => null) as unknown as React.ComponentType };
        }

        // Max retries exhausted — let ErrorBoundary handle it
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
const BillingPage = lazyRetry(() => import("@/paginas/BillingPage"), "BillingPage");
const AdminMetaclassPage = lazyRetry(() => import("@/paginas/AdminMetaclassPage"), "AdminMetaclassPage");
const MetricasUsoPage = lazyRetry(() => import("@/paginas/MetricasUsoPage"), "MetricasUsoPage");

/* ── Phase 15 — Mobile / PWA ─────────────────────── */
const NotificacoesPage = lazyRetry(() => import("@/paginas/NotificacoesPage"), "NotificacoesPage");

/* ── Phase 16 — Consolidação & Qualidade ─────────── */
const ApiPublicaPage = lazyRetry(() => import("@/paginas/ApiPublicaPage"), "ApiPublicaPage");

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
      </ErrorBoundary>
    </AuthProvider>
  );
}

export default App;
