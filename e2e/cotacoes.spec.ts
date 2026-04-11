import { test, expect } from "@playwright/test";

test.describe("Cotação Eletrônica — Proteção de acesso", () => {
  test("redireciona /cotacoes para login sem auth", async ({ page }) => {
    await page.goto("/cotacoes");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test("redireciona /cotacoes/nova para login sem auth", async ({ page }) => {
    await page.goto("/cotacoes/nova");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});

test.describe("Cotação Eletrônica — Fluxo (autenticado)", () => {
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

  test("lista cotações com tabela ou estado vazio", async ({ page }) => {
    await page.goto("/cotacoes");
    const tabela = page.locator("table, [role='table']");
    const vazio = page.locator("text=nenhuma, text=Nenhuma, text=Criar");
    await expect(tabela.or(vazio).first()).toBeVisible({ timeout: 10000 });
  });

  test("formulário de criação de cotação carrega", async ({ page }) => {
    await page.goto("/cotacoes/nova");
    const form = page.locator("form");
    const titulo = page.locator(
      "input[name*='titulo'], input[placeholder*='ítulo'], textarea[name*='titulo']",
    );
    await expect(form.or(titulo).first()).toBeVisible({ timeout: 10000 });
  });

  test("criar cotação → preencher dados básicos", async ({ page }) => {
    await page.goto("/cotacoes/nova");
    await page.waitForLoadState("networkidle");

    const titulo = page.locator("input[name*='titulo'], input[placeholder*='ítulo']").first();
    if (await titulo.isVisible({ timeout: 3000 }).catch(() => false)) {
      await titulo.fill("Cotação E2E Teste Automatizado");
    }

    const descricao = page.locator(
      "textarea[name*='descricao'], input[name*='descricao']",
    ).first();
    if (await descricao.isVisible({ timeout: 2000 }).catch(() => false)) {
      await descricao.fill("Descrição da cotação de teste");
    }

    // Verificar que formulário tem botão de submit
    const btnSalvar = page.locator(
      "button[type='submit'], button:has-text('Criar'), button:has-text('Salvar')",
    ).first();
    await expect(btnSalvar).toBeVisible({ timeout: 5000 });
  });
});
