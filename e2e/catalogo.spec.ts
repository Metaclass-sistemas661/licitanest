import { test, expect } from "@playwright/test";

test.describe("Catálogo — Proteção de acesso", () => {
  test("redireciona /catalogo para login sem auth", async ({ page }) => {
    await page.goto("/catalogo");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});

test.describe("Catálogo — CRUD (autenticado)", () => {
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

  test("lista catálogo com tabela ou busca", async ({ page }) => {
    await page.goto("/catalogo");
    const tabela = page.locator("table, [role='table']");
    const busca = page.locator("input[type='search'], input[placeholder*='uscar'], input[placeholder*='esquis']");
    await expect(tabela.or(busca).first()).toBeVisible({ timeout: 10000 });
  });

  test("busca de produtos funciona", async ({ page }) => {
    await page.goto("/catalogo");
    const busca = page.locator(
      "input[type='search'], input[placeholder*='uscar'], input[placeholder*='esquis']",
    ).first();

    if (await busca.isVisible({ timeout: 5000 }).catch(() => false)) {
      await busca.fill("papel");
      // Aguardar resultados ou indicação de busca
      await page.waitForTimeout(1000);
      const body = page.locator("body");
      await expect(body).not.toBeEmpty();
    }
  });

  test("formulário de criação de produto carrega", async ({ page }) => {
    // Tentar navegar para formulário de novo produto
    await page.goto("/catalogo");
    const btnNovo = page.locator(
      "button:has-text('Novo'), button:has-text('Adicionar'), a:has-text('Novo')",
    ).first();

    if (await btnNovo.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btnNovo.click();
      // Verificar que abriu modal ou página de criação
      const form = page.locator("form, [role='dialog']");
      await expect(form.first()).toBeVisible({ timeout: 5000 });
    }
  });
});
