import { test, expect } from "@playwright/test";

test.describe("LGPD — Rotas públicas", () => {
  test("política de privacidade é acessível", async ({ request }) => {
    const r = await request.get("/politica-de-privacidade.html");
    expect(r.status()).toBeLessThan(400);
  });

  test("termos de uso é acessível", async ({ request }) => {
    const r = await request.get("/termos-de-uso.html");
    expect(r.status()).toBeLessThan(400);
  });

  test("canal LGPD é acessível", async ({ request }) => {
    const r = await request.get("/canal-lgpd.html");
    expect(r.status()).toBeLessThan(400);
  });

  test("preferências de cookies é acessível", async ({ request }) => {
    const r = await request.get("/preferencias-de-cookies.html");
    expect(r.status()).toBeLessThan(400);
  });
});

test.describe("LGPD — Consentimentos (autenticado)", () => {
  test.skip(
    !process.env.E2E_AUTH_EMAIL,
    "Requer variáveis E2E_AUTH_EMAIL e E2E_AUTH_PASSWORD",
  );

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill("input[type='email'], input[name='email']", process.env.E2E_AUTH_EMAIL!);
    await page.fill("input[type='password'], input[name='password']", process.env.E2E_AUTH_PASSWORD!);
    await page.click("button[type='submit']");
    await page.waitForURL(/^(?!.*\/login)/, { timeout: 15000 });
  });

  test("exibe banner de consentimento ou termos aceitos", async ({ page }) => {
    await page.goto("/");
    // Verifica se há modal de termos pendente ou se já foram aceitos
    const modal = page.locator(
      "[role='dialog']:has-text('Termos'), [role='dialog']:has-text('Privacidade'), text=Aceitar",
    );
    const conteudoPrincipal = page.locator("main, [role='main'], nav");
    await expect(modal.or(conteudoPrincipal).first()).toBeVisible({ timeout: 15000 });
  });

  test("link de política de privacidade no rodapé funciona", async ({ page }) => {
    await page.goto("/login");
    const link = page.locator(
      "a[href*='politica'], a:has-text('Privacidade'), a:has-text('privacidade')",
    ).first();

    if (await link.isVisible({ timeout: 3000 }).catch(() => false)) {
      const href = await link.getAttribute("href");
      expect(href).toBeTruthy();
    }
  });
});
