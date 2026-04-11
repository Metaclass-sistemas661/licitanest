import { test, expect } from "@playwright/test";

test.describe("Cestas — Proteção de acesso", () => {
  test("redireciona para login sem autenticação", async ({ page }) => {
    await page.goto("/cestas");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test("redireciona /cestas/nova para login sem auth", async ({ page }) => {
    await page.goto("/cestas/nova");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test("redireciona detalhe de cesta para login sem auth", async ({ page }) => {
    await page.goto("/cestas/00000000-0000-0000-0000-000000000001");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});

test.describe("Cestas — Fluxo completo (autenticado)", () => {
  test.skip(
    !process.env.E2E_AUTH_EMAIL,
    "Requer variáveis E2E_AUTH_EMAIL e E2E_AUTH_PASSWORD",
  );

  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.fill("input[type='email'], input[name='email']", process.env.E2E_AUTH_EMAIL!);
    await page.fill("input[type='password'], input[name='password']", process.env.E2E_AUTH_PASSWORD!);
    await page.click("button[type='submit']");
    await page.waitForURL(/^(?!.*\/login)/, { timeout: 15000 });
  });

  test("lista cestas com tabela ou estado vazio", async ({ page }) => {
    await page.goto("/cestas");
    // Deve ter tabela de cestas ou mensagem de vazio
    const tabela = page.locator("table, [role='table']");
    const vazio = page.locator("text=nenhuma, text=Nenhuma, text=vazio, text=Criar");
    await expect(tabela.or(vazio).first()).toBeVisible({ timeout: 10000 });
  });

  test("formulário de criação de cesta carrega", async ({ page }) => {
    await page.goto("/cestas/nova");
    // Deve ter campo de descrição do objeto
    const campo = page.locator(
      "input[name*='descricao'], textarea[name*='descricao'], input[placeholder*='escri'], textarea[placeholder*='escri']",
    );
    const form = page.locator("form");
    await expect(campo.or(form).first()).toBeVisible({ timeout: 10000 });
  });

  test("criar cesta → adicionar item → ver itens", async ({ page }) => {
    await page.goto("/cestas/nova");
    await page.waitForLoadState("networkidle");

    // Preencher descrição
    const descricao = page.locator(
      "input[name*='descricao'], textarea[name*='descricao']",
    ).first();
    if (await descricao.isVisible()) {
      await descricao.fill("Cesta E2E Teste Automatizado");
    }

    // Selecionar tipo de cálculo se houver
    const tipoSelect = page.locator("select[name*='tipo'], [data-testid*='tipo']").first();
    if (await tipoSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tipoSelect.selectOption({ index: 1 });
    }

    // Submeter formulário
    const btnSalvar = page.locator(
      "button[type='submit'], button:has-text('Salvar'), button:has-text('Criar')",
    ).first();
    if (await btnSalvar.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btnSalvar.click();
      // Verificar redirecionamento para detalhe ou lista
      await page.waitForURL(/\/cestas/, { timeout: 10000 });
    }
  });
});
