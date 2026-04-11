-- =============================================================================
-- LICITANEST — 02. Tabela de Usuários (substitui auth.users do Supabase)
-- =============================================================================

CREATE TABLE usuarios (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firebase_uid    TEXT UNIQUE NOT NULL,
    email           TEXT NOT NULL UNIQUE,
    nome            TEXT,
    avatar_url      TEXT,
    email_verificado BOOLEAN NOT NULL DEFAULT FALSE,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_login    TIMESTAMPTZ,
    cpf             VARCHAR(14) UNIQUE,
    nivel_govbr     VARCHAR(10),
    provedor        VARCHAR(20) DEFAULT 'email',
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deletado_em     TIMESTAMPTZ
);

CREATE INDEX idx_usuarios_firebase ON usuarios(firebase_uid);
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_cpf ON usuarios(cpf) WHERE cpf IS NOT NULL;
