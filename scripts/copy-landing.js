/**
 * Post-build: copia landing page para dist/
 * - dist/index.html (SPA React) → dist/app.html
 * - landing/* → dist/ (landing vira a raiz)
 * - Reescreve ../public/ → / nos HTML (assets já estão na raiz do dist via Vite)
 * - landing/login.html redireciona para /login (SPA)
 */
import { cpSync, renameSync, existsSync, readdirSync, readFileSync, writeFileSync, unlinkSync } from "fs";
import { resolve, dirname, extname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const dist = resolve(root, "dist");
const landing = resolve(root, "landing");

// 1. Renomear SPA index.html → app.html
renameSync(resolve(dist, "index.html"), resolve(dist, "app.html"));
console.log("✓ dist/index.html → dist/app.html");

// 2. Copiar landing/ → dist/ (CSS, JS, HTML)
cpSync(landing, dist, { recursive: true, force: true });
console.log("✓ landing/* → dist/");

// 3. Reescrever paths ../public/ → / em todos os HTML copiados
function fixAssetPaths(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      fixAssetPaths(fullPath);
    } else if (extname(entry.name) === ".html") {
      let content = readFileSync(fullPath, "utf-8");
      const original = content;
      content = content.replace(/\.\.\/public\//g, "/");
      if (content !== original) {
        writeFileSync(fullPath, content);
        console.log(`✓ Paths reescritos: ${entry.name}`);
      }
    }
  }
}
fixAssetPaths(dist);
console.log("✓ ../public/ → / em todos os HTML da landing");

// 4. Remover login.html do dist (o Firebase rewrite /login → /app.html cuida disso)
const loginHtml = resolve(dist, "login.html");
if (existsSync(loginHtml)) {
  unlinkSync(loginHtml);
  console.log("✓ dist/login.html removido (rewrite Firebase cuida de /login)");
}

// 5. Verificar páginas estáticas da landing
const landingPages = [
  "contato.html",
  "politica-de-privacidade.html",
  "termos-de-uso.html",
  "preferencias-de-cookies.html",
  "canal-lgpd.html",
];

for (const page of landingPages) {
  if (existsSync(resolve(dist, page))) {
    console.log(`✓ dist/${page} (mantido da landing)`);
  }
}

console.log("✅ Landing page integrada ao build");
