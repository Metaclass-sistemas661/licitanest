import { test, expect } from "@playwright/test";

test.describe("Login — Jornada crítica", () => {
  test("exibe página de login", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/LicitaNest/i);
    await expect(page.locator("input[type='email'], input[name='email']")).toBeVisible();
  });

  test("rejeita credenciais inválidas", async ({ page }) => {
    await page.goto("/login");
    await page.fill("input[type='email'], input[name='email']", "invalido@teste.com");
    await page.fill("input[type='password'], input[name='password']", "senhaerrada");
    await page.click("button[type='submit']");
    // Deve exibir mensagem de erro
    await expect(page.locator("text=erro, text=inválid, text=incorret").first()).toBeVisible({ timeout: 5000 });
  });

  test("redireciona rota protegida para login", async ({ page }) => {
    await page.goto("/");
    // Sem autenticação, deve redirecionar para /login
    await expect(page).toHaveURL(/\/login/);
  });

  test("página de recuperar senha carrega", async ({ page }) => {
    await page.goto("/recuperar-senha");
    await expect(page.locator("input[type='email'], input[name='email']")).toBeVisible();
  });
});

test.describe("Onboarding — Rota pública", () => {
  test("página de onboarding carrega", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page.locator("body")).not.toBeEmpty();
  });
});
