/**
 * Post-build: copia landing page para dist/
 * - dist/index.html (SPA React) → dist/app.html
 * - landing/* → dist/ (landing vira a raiz)
 * - Reescreve ../public/ → / nos HTML (assets já estão na raiz do dist via Vite)
 * - landing/login.html redireciona para /login (SPA)
 */
import { cpSync, renameSync, writeFileSync, existsSync, readdirSync, readFileSync } from "fs";
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

// 3. Substituir login.html por redirect para /login (SPA)
writeFileSync(
  resolve(dist, "login.html"),
  `<!DOCTYPE html>
<html><head><meta http-equiv="refresh" content="0;url=/login"></head>
<body><a href="/login">Entrar</a></body></html>`
);
console.log("✓ dist/login.html → redirect para /login");

// 4. Criar redirects para outras páginas estáticas da landing que o SPA não tem
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
