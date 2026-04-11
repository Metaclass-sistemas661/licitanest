// ═══════════════════════════════════════════════════════════════════════
// LicitaNest — Load Test com k6 (Grafana)
// Uso:  k6 run loadtest/smoke.js          (smoke: 5 VUs, 30s)
//       k6 run loadtest/smoke.js -e STAGE=load   (load: ramp 50 VUs, 5min)
//       k6 run loadtest/smoke.js -e STAGE=stress  (stress: 100 VUs, 10min)
//
// Pré-requisito: instalar k6 → https://grafana.com/docs/k6/latest/set-up/install-k6/
// ═══════════════════════════════════════════════════════════════════════
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

// ── Métricas customizadas ────────────────────
const errorRate = new Rate("errors");
const apiDuration = new Trend("api_duration", true);

// ── Configuração por estágio ─────────────────
const STAGE = __ENV.STAGE || "smoke";

const profiles = {
  smoke: {
    stages: [
      { duration: "10s", target: 5 },
      { duration: "20s", target: 5 },
    ],
    thresholds: {
      http_req_duration: ["p(95)<500"],
      errors: ["rate<0.01"],
    },
  },
  load: {
    stages: [
      { duration: "1m", target: 20 },
      { duration: "3m", target: 50 },
      { duration: "1m", target: 0 },
    ],
    thresholds: {
      http_req_duration: ["p(95)<1000", "p(99)<2000"],
      errors: ["rate<0.05"],
    },
  },
  stress: {
    stages: [
      { duration: "2m", target: 50 },
      { duration: "5m", target: 100 },
      { duration: "2m", target: 150 },
      { duration: "1m", target: 0 },
    ],
    thresholds: {
      http_req_duration: ["p(95)<2000"],
      errors: ["rate<0.10"],
    },
  },
};

export const options = profiles[STAGE];

// ── Configuração ─────────────────────────────
const BASE_URL = __ENV.BASE_URL || "http://localhost:8080";
const AUTH_TOKEN = __ENV.AUTH_TOKEN || ""; // Firebase ID token para rotas autenticadas

const headers = {
  "Content-Type": "application/json",
  ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
};

// ── Cenários de teste ────────────────────────
export default function () {
  // 1. Health check (sempre funciona)
  const health = http.get(`${BASE_URL}/api/health`);
  check(health, {
    "health: status 200": (r) => r.status === 200,
    "health: < 200ms": (r) => r.timings.duration < 200,
  });
  errorRate.add(health.status !== 200);
  apiDuration.add(health.timings.duration);

  // 2. Listar planos de billing (público, sem auth)
  if (AUTH_TOKEN) {
    const planos = http.get(`${BASE_URL}/api/billing/planos`, { headers });
    check(planos, {
      "planos: status 200": (r) => r.status === 200,
      "planos: tem data": (r) => {
        try { return JSON.parse(r.body).data.length >= 0; } catch { return false; }
      },
    });
    errorRate.add(planos.status !== 200);
    apiDuration.add(planos.timings.duration);
  }

  // 3. Dashboard (requer auth)
  if (AUTH_TOKEN) {
    const dash = http.get(`${BASE_URL}/api/dashboard/metricas`, { headers });
    check(dash, {
      "dashboard: status 200 ou 403": (r) => [200, 403].includes(r.status),
    });
    errorRate.add(![200, 403].includes(dash.status));
    apiDuration.add(dash.timings.duration);
  }

  // 4. Listar cestas (requer auth)
  if (AUTH_TOKEN) {
    const cestas = http.get(`${BASE_URL}/api/cestas?pagina=1&porPagina=10`, { headers });
    check(cestas, {
      "cestas: status ok": (r) => [200, 403].includes(r.status),
      "cestas: < 1s": (r) => r.timings.duration < 1000,
    });
    errorRate.add(![200, 403].includes(cestas.status));
    apiDuration.add(cestas.timings.duration);
  }

  // 5. Listar catálogo (requer auth)
  if (AUTH_TOKEN) {
    const cat = http.get(`${BASE_URL}/api/catalogo?pagina=1&porPagina=20`, { headers });
    check(cat, {
      "catalogo: status ok": (r) => [200, 403].includes(r.status),
    });
    apiDuration.add(cat.timings.duration);
  }

  sleep(1); // Simular think-time do usuário
}

// ── Relatório final ──────────────────────────
export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: " ", enableColors: true }),
    "loadtest/results.json": JSON.stringify(data, null, 2),
  };
}

import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.3/index.js";
