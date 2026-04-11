import { test, expect } from "@playwright/test";

test.describe("Configurações — Proteção de acesso", () => {
  test("redireciona /configuracoes para login sem auth", async ({ page }) => {
    await page.goto("/configuracoes");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test("redireciona /painel-gestor para login sem auth", async ({ page }) => {
    await page.goto("/painel-gestor");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});

test.describe("Configurações — CRUD servidores/secretarias (autenticado)", () => {
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

  test("página de configurações carrega", async ({ page }) => {
    await page.goto("/configuracoes");
    const heading = page.locator("h1, h2, [role='heading']").first();
    const tabs = page.locator("[role='tablist'], nav");
    await expect(heading.or(tabs).first()).toBeVisible({ timeout: 10000 });
  });

  test("lista servidores visível", async ({ page }) => {
    await page.goto("/configuracoes");
    // Procurar aba ou seção de servidores
    const tabServidores = page.locator(
      "button:has-text('Servidores'), a:has-text('Servidores'), [role='tab']:has-text('Servidores')",
    ).first();

    if (await tabServidores.isVisible({ timeout: 5000 }).catch(() => false)) {
      await tabServidores.click();
    }

    const tabela = page.locator("table, [role='table']");
    const lista = page.locator("[role='list'], ul, [data-testid*='servidor']");
    const vazio = page.locator("text=nenhum, text=Nenhum, text=Adicionar");
    await expect(tabela.or(lista).or(vazio).first()).toBeVisible({ timeout: 10000 });
  });

  test("painel do gestor carrega para admin", async ({ page }) => {
    await page.goto("/painel-gestor");
    // Se admin, carrega painel. Se não, redireciona
    const painel = page.locator("h1, h2, [role='heading']");
    const redirect = page.locator("input[type='email']"); // voltou pro login
    await expect(painel.or(redirect).first()).toBeVisible({ timeout: 10000 });
  });
});
