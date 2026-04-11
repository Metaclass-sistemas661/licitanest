-- =============================================================================
-- LICITANEST — 30. Alinhamento do Banco de Produção (Fase 13)
-- =============================================================================
-- Adiciona colunas e tabelas que existem no schema local mas estão ausentes
-- no banco de produção. Usa DO blocks com IF NOT EXISTS para idempotência.
-- =============================================================================

BEGIN;

-- ── 1. usuarios — adicionar cpf, nivel_govbr, provedor, deletado_em ────────

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='cpf') THEN
        ALTER TABLE usuarios ADD COLUMN cpf VARCHAR(14);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='nivel_govbr') THEN
        ALTER TABLE usuarios ADD COLUMN nivel_govbr VARCHAR(10);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='provedor') THEN
        ALTER TABLE usuarios ADD COLUMN provedor VARCHAR(20) DEFAULT 'email';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='deletado_em') THEN
        ALTER TABLE usuarios ADD COLUMN deletado_em TIMESTAMPTZ;
    END IF;
END $$;

-- ── 2. fornecedores — adicionar municipio_id ────────────────────────────────
-- NOTA: Adicionado como NULLABLE para não quebrar registros existentes.
-- Após backfill dos dados, execute:
--   ALTER TABLE fornecedores ALTER COLUMN municipio_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fornecedores' AND column_name='municipio_id') THEN
        ALTER TABLE fornecedores ADD COLUMN municipio_id UUID REFERENCES municipios(id);
    END IF;
END $$;

-- ── 3. dispositivos_fcm — adicionar municipio_id ────────────────────────────
-- NOTA: Adicionado como NULLABLE. Após backfill:
--   ALTER TABLE dispositivos_fcm ALTER COLUMN municipio_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dispositivos_fcm' AND column_name='municipio_id') THEN
        ALTER TABLE dispositivos_fcm ADD COLUMN municipio_id UUID REFERENCES municipios(id);
    END IF;
END $$;

-- ── 4. servidores — adicionar totp_recovery_codes ───────────────────────────

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='servidores' AND column_name='totp_recovery_codes') THEN
        ALTER TABLE servidores ADD COLUMN totp_recovery_codes TEXT;
    END IF;
END $$;

-- ── 5. emails_enviados — adicionar municipio_id ─────────────────────────────
-- NOTA: Adicionado como NULLABLE. Após backfill:
--   ALTER TABLE emails_enviados ALTER COLUMN municipio_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='emails_enviados' AND column_name='municipio_id') THEN
        ALTER TABLE emails_enviados ADD COLUMN municipio_id UUID REFERENCES municipios(id);
    END IF;
END $$;

-- ── 6. alertas_sistema — criar tabela se não existir ────────────────────────

CREATE TABLE IF NOT EXISTS alertas_sistema (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo        VARCHAR(50) NOT NULL,
    severidade  VARCHAR(20) NOT NULL DEFAULT 'warning' CHECK (severidade IN ('info', 'warning', 'critical')),
    mensagem    TEXT NOT NULL,
    dados       JSONB,
    resolvido   BOOLEAN NOT NULL DEFAULT FALSE,
    resolvido_em TIMESTAMPTZ,
    resolvido_por UUID REFERENCES servidores(id),
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 7. api_keys — constraint JSONB (a função validar_permissoes_api já existe) ──
-- O arquivo 28 tentou aplicar na tabela chaves_api_externa (que não existe).
-- A tabela real é api_keys. Aplica a constraint aqui.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_api_keys_permissoes'
    ) THEN
        IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'validar_permissoes_api') THEN
            ALTER TABLE api_keys ADD CONSTRAINT chk_api_keys_permissoes
                CHECK (validar_permissoes_api(permissoes));
        END IF;
    END IF;
END $$;

-- ── 8. Re-aplicar soft delete constraints que falharam ──────────────────────

-- 8a. usuarios — agora tem deletado_em e cpf
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_firebase_uid_key;
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_email_key;
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_cpf_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_firebase_uid_active
  ON usuarios(firebase_uid) WHERE deletado_em IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_email_active
  ON usuarios(email) WHERE deletado_em IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_cpf_active
  ON usuarios(cpf) WHERE deletado_em IS NULL AND cpf IS NOT NULL;

-- 8b. fornecedores — agora tem municipio_id
-- Não havia constraint para dropar (fornecedores_cpf_cnpj_municipio_id_key não existia)
CREATE UNIQUE INDEX IF NOT EXISTS idx_fornecedores_cpf_cnpj_municipio_active
  ON fornecedores(cpf_cnpj, municipio_id) WHERE deletado_em IS NULL AND municipio_id IS NOT NULL;

COMMIT;

-- ── Verificação ─────────────────────────────────────────────────────────────
DO $$
DECLARE
    _ok INTEGER := 0;
    _total INTEGER := 6;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='deletado_em') THEN _ok := _ok + 1; END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fornecedores' AND column_name='municipio_id') THEN _ok := _ok + 1; END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dispositivos_fcm' AND column_name='municipio_id') THEN _ok := _ok + 1; END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='servidores' AND column_name='totp_recovery_codes') THEN _ok := _ok + 1; END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='emails_enviados' AND column_name='municipio_id') THEN _ok := _ok + 1; END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='alertas_sistema') THEN _ok := _ok + 1; END IF;

    RAISE NOTICE '=== ALINHAMENTO: %/% verificações OK ===', _ok, _total;
END $$;
