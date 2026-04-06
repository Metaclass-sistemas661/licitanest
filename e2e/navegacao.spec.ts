import { test, expect } from "@playwright/test";

test.describe("Navegação — Rotas públicas", () => {
  test("página de login carrega com formulário", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("form")).toBeVisible();
    await expect(page.locator("input[type='email'], input[name='email']")).toBeVisible();
    await expect(page.locator("input[type='password'], input[name='password']")).toBeVisible();
    await expect(page.locator("button[type='submit']")).toBeVisible();
  });

  test("recuperar senha tem campo email", async ({ page }) => {
    await page.goto("/recuperar-senha");
    await expect(page.locator("input[type='email'], input[name='email']")).toBeVisible();
  });

  test("onboarding é acessível sem login", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page.locator("body")).not.toBeEmpty();
    // Não redireciona para login
    await expect(page).not.toHaveURL(/\/login/);
  });
});

test.describe("Navegação — Proteção de rotas", () => {
  test("dashboard redireciona para login sem auth", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test("cestas redireciona para login sem auth", async ({ page }) => {
    await page.goto("/cestas");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test("cotacoes redireciona para login sem auth", async ({ page }) => {
    await page.goto("/cotacoes");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test("relatorios redireciona para login sem auth", async ({ page }) => {
    await page.goto("/relatorios");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test("configuracoes redireciona para login sem auth", async ({ page }) => {
    await page.goto("/configuracoes");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test("workflow redireciona para login sem auth", async ({ page }) => {
    await page.goto("/workflow");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test("api-publica redireciona para login sem auth", async ({ page }) => {
    await page.goto("/api-publica");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});

test.describe("Navegação — Login fluxo", () => {
  test("link para recuperar senha existe na tela de login", async ({ page }) => {
    await page.goto("/login");
    const link = page.locator("a[href*='recuperar'], button:has-text('esquec'), a:has-text('esquec')").first();
    await expect(link).toBeVisible({ timeout: 3000 });
  });

  test("campo senha aceita input", async ({ page }) => {
    await page.goto("/login");
    const senhaInput = page.locator("input[type='password'], input[name='password']");
    await senhaInput.fill("minhaSenha123!");
    await expect(senhaInput).toHaveValue("minhaSenha123!");
  });
});
