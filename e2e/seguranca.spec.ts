import { test, expect } from "@playwright/test";

test.describe("Segurança — Headers e CSP", () => {
  test("responde com status 200 na rota raiz", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response?.status()).toBe(200);
  });

  test("HTML não contém API keys expostas", async ({ page }) => {
    await page.goto("/login");
    const content = await page.content();
    // Nenhuma chave sensível deve aparecer no HTML renderizado
    expect(content).not.toContain("sk-");
    expect(content).not.toContain("OPENAI_API_KEY");
    expect(content).not.toContain("ANTHROPIC_API_KEY");
    expect(content).not.toContain("RESEND_API_KEY");
    expect(content).not.toContain("STRIPE_SECRET_KEY");
    expect(content).not.toContain("GOVBR_CLIENT_SECRET");
  });

  test("não vaza stack traces em produção", async ({ page }) => {
    // Acessar rota inexistente
    await page.goto("/rota-que-nao-existe-xyz");
    const content = await page.content();
    // Não deve exibir stack traces ou erros internos
    expect(content).not.toContain("node_modules");
    expect(content).not.toContain("at Object.");
    expect(content).not.toContain("ENOENT");
  });
});

test.describe("PWA — Manifest e Service Worker", () => {
  test("manifest.json está acessível", async ({ request }) => {
    const response = await request.get("/manifest.json");
    expect(response.status()).toBe(200);
    const manifest = await response.json();
    expect(manifest.name).toBeTruthy();
    expect(manifest.icons).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
  });

  test("offline.html está acessível", async ({ request }) => {
    const response = await request.get("/offline.html");
    expect(response.status()).toBe(200);
  });
});
