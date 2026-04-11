-- =============================================================================
-- LICITANEST — 29. Soft Delete Unique Constraints (Fase 13.2)
-- =============================================================================
-- Substituir UNIQUE simples por partial unique indexes que só verificam
-- registros ativos (deletado_em IS NULL), permitindo reutilizar email/CPF
-- após soft delete.
-- =============================================================================

-- ── 1. usuarios ─────────────────────────────────────────────────────────────
-- Remover constraints UNIQUE simples e criar partial unique indexes

ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_firebase_uid_key;
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_email_key;
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_cpf_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_firebase_uid_active
  ON usuarios(firebase_uid) WHERE deletado_em IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_email_active
  ON usuarios(email) WHERE deletado_em IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_cpf_active
  ON usuarios(cpf) WHERE deletado_em IS NULL AND cpf IS NOT NULL;

-- ── 2. municipios ───────────────────────────────────────────────────────────

ALTER TABLE municipios DROP CONSTRAINT IF EXISTS municipios_codigo_ibge_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_municipios_ibge_active
  ON municipios(codigo_ibge) WHERE deletado_em IS NULL;

-- ── 3. servidores ───────────────────────────────────────────────────────────

ALTER TABLE servidores DROP CONSTRAINT IF EXISTS servidores_user_id_key;
ALTER TABLE servidores DROP CONSTRAINT IF EXISTS servidores_email_key;
ALTER TABLE servidores DROP CONSTRAINT IF EXISTS servidores_cpf_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_servidores_user_id_active
  ON servidores(user_id) WHERE deletado_em IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_servidores_email_active
  ON servidores(email) WHERE deletado_em IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_servidores_cpf_active
  ON servidores(cpf) WHERE deletado_em IS NULL AND cpf IS NOT NULL;

-- ── 4. categorias ───────────────────────────────────────────────────────────

ALTER TABLE categorias DROP CONSTRAINT IF EXISTS categorias_nome_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_categorias_nome_active
  ON categorias(nome) WHERE deletado_em IS NULL;

-- ── 5. fornecedores ─────────────────────────────────────────────────────────
-- UNIQUE(cpf_cnpj, municipio_id) → partial unique index

ALTER TABLE fornecedores DROP CONSTRAINT IF EXISTS fornecedores_cpf_cnpj_municipio_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_fornecedores_cpf_cnpj_municipio_active
  ON fornecedores(cpf_cnpj, municipio_id) WHERE deletado_em IS NULL;

-- ── 6. secretarias (unicidade nome+municipio para ativos) ───────────────────

CREATE UNIQUE INDEX IF NOT EXISTS idx_secretarias_nome_municipio_active
  ON secretarias(nome, municipio_id) WHERE deletado_em IS NULL;
