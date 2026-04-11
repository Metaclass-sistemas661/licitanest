import { test, expect } from "@playwright/test";

// ═══════════════════════════════════════════════════════════════
// SuperAdmin — Proteção de acesso
// ═══════════════════════════════════════════════════════════════

test.describe("SuperAdmin — Proteção de acesso", () => {
  test("redireciona /superadmin para login sem auth", async ({ page }) => {
    await page.goto("/superadmin");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test("redireciona /superadmin/prefeituras para login sem auth", async ({ page }) => {
    await page.goto("/superadmin/prefeituras");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test("redireciona /superadmin/contratos para login sem auth", async ({ page }) => {
    await page.goto("/superadmin/contratos");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test("redireciona /superadmin/usuarios-global para login sem auth", async ({ page }) => {
    await page.goto("/superadmin/usuarios-global");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});

// ═══════════════════════════════════════════════════════════════
// SuperAdmin — Fluxo autenticado
// ═══════════════════════════════════════════════════════════════

test.describe("SuperAdmin — Fluxo autenticado", () => {
  test.skip(
    !process.env.E2E_SUPERADMIN_EMAIL,
    "Requer variáveis E2E_SUPERADMIN_EMAIL e E2E_SUPERADMIN_PASSWORD",
  );

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill("input[type='email'], input[name='email']", process.env.E2E_SUPERADMIN_EMAIL!);
    await page.fill("input[type='password'], input[name='password']", process.env.E2E_SUPERADMIN_PASSWORD!);
    await page.click("button[type='submit']");
    await page.waitForURL(/\/superadmin/, { timeout: 15000 });
  });

  test("login como superadmin redireciona para /superadmin", async ({ page }) => {
    await expect(page).toHaveURL(/\/superadmin/);
    // Dashboard deve estar visível
    const heading = page.locator("h1, h2").filter({ hasText: /dashboard|super\s*admin/i });
    await expect(heading.first()).toBeVisible({ timeout: 10000 });
  });

  test("página de prefeituras carrega", async ({ page }) => {
    await page.goto("/superadmin/prefeituras");
    const tabela = page.locator("table, [role='table']");
    const vazio = page.locator("text=nenhuma, text=Nenhuma, text=Cadastrar, text=prefeitura");
    await expect(tabela.or(vazio).first()).toBeVisible({ timeout: 10000 });
  });

  test("página de contratos carrega", async ({ page }) => {
    await page.goto("/superadmin/contratos");
    const tabela = page.locator("table, [role='table']");
    const vazio = page.locator("text=nenhum, text=Nenhum, text=Criar, text=contrato");
    await expect(tabela.or(vazio).first()).toBeVisible({ timeout: 10000 });
  });

  test("criar contrato — formulário abre", async ({ page }) => {
    await page.goto("/superadmin/contratos");
    const btnCriar = page.locator("button, a").filter({ hasText: /novo|criar|adicionar/i }).first();
    if (await btnCriar.isVisible({ timeout: 5000 }).catch(() => false)) {
      await btnCriar.click();
      // Deve exibir formulário ou modal de criação
      const form = page.locator("form, [role='dialog']");
      const titulo = page.locator("input[name*='titulo'], input[placeholder*='ítulo']");
      await expect(form.or(titulo).first()).toBeVisible({ timeout: 10000 });
    }
  });

  test("dashboard financeiro carrega", async ({ page }) => {
    await page.goto("/superadmin/financeiro");
    const content = page.locator("h1, h2, [class*='card'], [class*='Card']");
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test("usuários global carrega", async ({ page }) => {
    await page.goto("/superadmin/usuarios-global");
    const tabela = page.locator("table, [role='table']");
    const vazio = page.locator("text=nenhum, text=Nenhum, text=usuário");
    await expect(tabela.or(vazio).first()).toBeVisible({ timeout: 10000 });
  });
});

// ═══════════════════════════════════════════════════════════════
// Portal de Contratos — Proteção de acesso
// ═══════════════════════════════════════════════════════════════

test.describe("Portal de Contratos — Proteção de acesso", () => {
  test("redireciona /contratos-portal para login sem auth", async ({ page }) => {
    await page.goto("/contratos-portal");
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});

// ═══════════════════════════════════════════════════════════════
// Portal de Contratos — Fluxo autenticado (município)
// ═══════════════════════════════════════════════════════════════

test.describe("Portal de Contratos — Fluxo de município", () => {
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

  test("página de contratos do portal carrega", async ({ page }) => {
    await page.goto("/contratos-portal");
    const content = page.locator("h1, h2, table, [role='table']");
    const vazio = page.locator("text=nenhum, text=Nenhum, text=contrato");
    await expect(content.or(vazio).first()).toBeVisible({ timeout: 10000 });
  });

  test("notificações são listadas se existirem", async ({ page }) => {
    await page.goto("/contratos-portal");
    // O badge de notificação ou a lista de contratos pendentes
    const notif = page.locator("[data-testid='notificacoes'], [class*='badge'], [class*='Badge']");
    const lista = page.locator("table, [role='table'], [class*='card']");
    await expect(notif.or(lista).first()).toBeVisible({ timeout: 10000 });
  });
});
