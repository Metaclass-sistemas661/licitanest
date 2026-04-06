#!/usr/bin/env node
/**
 * Script de migração de usuários: Supabase Auth → Firebase Auth + Cloud SQL
 *
 * Uso:
 *   1. Configure as variáveis de ambiente (ou .env):
 *      - SUPABASE_URL
 *      - SUPABASE_SERVICE_ROLE_KEY
 *      - GOOGLE_APPLICATION_CREDENTIALS (caminho para service-account.json)
 *      - DB_HOST, DB_NAME, DB_USER, DB_PASSWORD
 *
 *   2. Execute:
 *      node scripts/migrar-usuarios-firebase.js
 *
 * Notas:
 *   - Senhas NÃO podem ser migradas (Supabase usa bcrypt internamente).
 *     Usuários precisarão usar "Esqueci minha senha" após a migração.
 *   - O script é idempotente: pode ser executado múltiplas vezes sem duplicar.
 *   - Gera relatório em scripts/migracao-report.json ao final.
 */

import admin from "firebase-admin";
import pg from "pg";

// ── Configuração ─────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DB_CONFIG = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "licitanest",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
};

// ── Inicialização ────────────────────────────────────

admin.initializeApp({
  projectId: process.env.GCP_PROJECT || "sistema-de-gestao-16e15",
});

const pool = new pg.Pool(DB_CONFIG);

// ── Tipos ────────────────────────────────────────────

/**
 * @typedef {{ id: string, email: string, email_confirmed_at: string|null, phone: string|null, created_at: string, user_metadata: Record<string, unknown> }} SupabaseUser
 */

// ── Funções ──────────────────────────────────────────

/**
 * Buscar todos os usuários do Supabase Auth via Admin API
 */
async function buscarUsuariosSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.\n" +
      "Obtenha em: Supabase Dashboard → Settings → API"
    );
  }

  const usuarios = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=${perPage}`,
      {
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    );

    if (!res.ok) {
      throw new Error(`Erro ao buscar usuários do Supabase: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    const users = data.users || data;

    if (!Array.isArray(users) || users.length === 0) break;

    usuarios.push(...users);

    if (users.length < perPage) break;
    page++;
  }

  return usuarios;
}

/**
 * Buscar dados do servidor vinculado ao auth_user_id no Supabase DB
 */
async function buscarServidorSupabase(authUserId) {
  // Consulta ao banco Supabase (mesmo banco, tabela servidores)
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/servidores?auth_user_id=eq.${authUserId}&select=*,perfis(nome),secretarias(id,nome,municipio_id)&deletado_em=is.null`,
    {
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
    }
  );

  if (!res.ok) return null;
  const data = await res.json();
  return data[0] || null;
}

/**
 * Migrar um único usuário
 */
async function migrarUsuario(supabaseUser, stats) {
  const email = supabaseUser.email;
  if (!email) {
    stats.ignorados.push({ id: supabaseUser.id, motivo: "sem email" });
    return;
  }

  // Verificar se já existe no Firebase
  let firebaseUser;
  try {
    firebaseUser = await admin.auth().getUserByEmail(email);
    stats.jaExistentes++;
    console.log(`  ⏭ ${email} — já existe no Firebase (uid: ${firebaseUser.uid})`);
  } catch {
    // Criar no Firebase Auth
    try {
      firebaseUser = await admin.auth().createUser({
        email,
        emailVerified: !!supabaseUser.email_confirmed_at,
        displayName: supabaseUser.user_metadata?.nome || supabaseUser.user_metadata?.full_name || null,
        phoneNumber: supabaseUser.phone || undefined,
        disabled: false,
      });
      stats.criadosFirebase++;
      console.log(`  ✅ ${email} — criado no Firebase (uid: ${firebaseUser.uid})`);
    } catch (err) {
      stats.erros.push({ email, erro: err.message });
      console.error(`  ❌ ${email} — erro ao criar no Firebase:`, err.message);
      return;
    }
  }

  // Verificar se já existe na tabela usuarios do Cloud SQL
  const { rows: existente } = await pool.query(
    `SELECT id FROM usuarios WHERE email = $1 AND deletado_em IS NULL`,
    [email]
  );

  if (existente.length > 0) {
    // Atualizar firebase_uid se necessário
    await pool.query(
      `UPDATE usuarios SET firebase_uid = $1, atualizado_em = NOW() WHERE id = $2 AND (firebase_uid IS NULL OR firebase_uid != $1)`,
      [firebaseUser.uid, existente[0].id]
    );
    console.log(`  🔗 ${email} — vinculado ao registro existente no Cloud SQL`);
    return;
  }

  // Buscar dados do servidor no Supabase
  const servidor = await buscarServidorSupabase(supabaseUser.id);

  // Inserir na tabela usuarios do Cloud SQL
  const { rows: novoUsuario } = await pool.query(
    `INSERT INTO usuarios (firebase_uid, email, email_verificado, nome, cpf, provedor, criado_em)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (email) DO UPDATE SET firebase_uid = EXCLUDED.firebase_uid, atualizado_em = NOW()
     RETURNING id`,
    [
      firebaseUser.uid,
      email,
      !!supabaseUser.email_confirmed_at,
      servidor?.nome || supabaseUser.user_metadata?.nome || null,
      servidor?.cpf || null,
      supabaseUser.app_metadata?.provider === "govbr" ? "govbr" : "email",
      supabaseUser.created_at,
    ]
  );

  // Se havia servidor vinculado, atualizar usuario_id na tabela servidores
  if (servidor && novoUsuario[0]) {
    await pool.query(
      `UPDATE servidores SET usuario_id = $1 WHERE id = $2`,
      [novoUsuario[0].id, servidor.id]
    );
    console.log(`  🔗 ${email} — servidor ${servidor.nome} vinculado`);
  }

  stats.criadosCloudSql++;
}

// ── Execução principal ───────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  Migração de Usuários: Supabase → Firebase/Cloud SQL");
  console.log("═══════════════════════════════════════════════════\n");

  const stats = {
    total: 0,
    criadosFirebase: 0,
    criadosCloudSql: 0,
    jaExistentes: 0,
    ignorados: [],
    erros: [],
  };

  try {
    // 1. Buscar usuários do Supabase
    console.log("📥 Buscando usuários do Supabase Auth...");
    const usuarios = await buscarUsuariosSupabase();
    stats.total = usuarios.length;
    console.log(`   Encontrados: ${usuarios.length} usuários\n`);

    if (usuarios.length === 0) {
      console.log("Nenhum usuário para migrar.");
      return;
    }

    // 2. Migrar cada usuário
    console.log("🔄 Migrando usuários...\n");
    for (const user of usuarios) {
      await migrarUsuario(user, stats);
    }

    // 3. Relatório
    console.log("\n═══════════════════════════════════════════════════");
    console.log("  RELATÓRIO DE MIGRAÇÃO");
    console.log("═══════════════════════════════════════════════════");
    console.log(`  Total de usuários Supabase:   ${stats.total}`);
    console.log(`  Criados no Firebase Auth:     ${stats.criadosFirebase}`);
    console.log(`  Criados no Cloud SQL:         ${stats.criadosCloudSql}`);
    console.log(`  Já existiam no Firebase:      ${stats.jaExistentes}`);
    console.log(`  Ignorados (sem email):        ${stats.ignorados.length}`);
    console.log(`  Erros:                        ${stats.erros.length}`);
    console.log("═══════════════════════════════════════════════════\n");

    if (stats.erros.length > 0) {
      console.log("❌ Erros encontrados:");
      for (const e of stats.erros) {
        console.log(`   - ${e.email}: ${e.erro}`);
      }
    }

    // Salvar relatório em JSON
    const fs = await import("fs");
    const reportPath = new URL("./migracao-report.json", import.meta.url);
    fs.writeFileSync(
      reportPath,
      JSON.stringify({ ...stats, executadoEm: new Date().toISOString() }, null, 2)
    );
    console.log(`📄 Relatório salvo em: ${reportPath}`);

    if (stats.erros.length > 0) {
      console.log("\n⚠️  Alguns usuários falharam. Corrija os erros e execute novamente.");
      console.log("   O script é idempotente — não duplicará dados.");
    } else {
      console.log("\n✅ Migração concluída com sucesso!");
      console.log("   Usuários precisarão redefinir suas senhas (Firebase não importa hashes bcrypt do Supabase).");
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("\n💀 Erro fatal:", err.message);
  process.exit(1);
});
