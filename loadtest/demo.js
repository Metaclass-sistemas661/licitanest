// ═══════════════════════════════════════════════════════════════════════
// Load Test DEMO — Testa contra httpbin.org para demonstrar o k6
// Uso:  k6 run loadtest/demo.js
// ═══════════════════════════════════════════════════════════════════════
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "5s", target: 3 },   // Ramp up 3 VUs
    { duration: "10s", target: 3 },   // Mantém 3 VUs
    { duration: "5s", target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<1000"],
    http_req_failed: ["rate<0.05"],
  },
};

export default function () {
  // Simula o mesmo padrão que o smoke.js faz - GET em health check
  const res = http.get("https://httpbin.org/get");
  check(res, {
    "status 200": (r) => r.status === 200,
    "tempo < 1s": (r) => r.timings.duration < 1000,
  });
  sleep(1);
}
