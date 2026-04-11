-- =============================================================================
-- LICITANEST — 34. Expandir tabela municípios para cadastro completo
-- =============================================================================

-- ── Dados cadastrais ─────────────────────────────────────────────────────────
ALTER TABLE municipios ADD COLUMN IF NOT EXISTS cnpj           VARCHAR(18) UNIQUE;
ALTER TABLE municipios ADD COLUMN IF NOT EXISTS endereco       TEXT;
ALTER TABLE municipios ADD COLUMN IF NOT EXISTS cep            VARCHAR(9);
ALTER TABLE municipios ADD COLUMN IF NOT EXISTS telefone       VARCHAR(20);
ALTER TABLE municipios ADD COLUMN IF NOT EXISTS email          TEXT;
ALTER TABLE municipios ADD COLUMN IF NOT EXISTS brasao_url     TEXT;

-- ── Responsável do município ─────────────────────────────────────────────────
ALTER TABLE municipios ADD COLUMN IF NOT EXISTS responsavel_nome  TEXT;
ALTER TABLE municipios ADD COLUMN IF NOT EXISTS responsavel_cpf   VARCHAR(14);
ALTER TABLE municipios ADD COLUMN IF NOT EXISTS responsavel_cargo TEXT;
ALTER TABLE municipios ADD COLUMN IF NOT EXISTS responsavel_email TEXT;

-- ── Observações ──────────────────────────────────────────────────────────────
ALTER TABLE municipios ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- ── Índice para busca ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_municipios_uf ON municipios(uf) WHERE deletado_em IS NULL;
CREATE INDEX IF NOT EXISTS idx_municipios_ativo ON municipios(ativo) WHERE deletado_em IS NULL;
CREATE INDEX IF NOT EXISTS idx_municipios_cnpj ON municipios(cnpj) WHERE deletado_em IS NULL AND cnpj IS NOT NULL;
