-- =============================================================================
-- LICITANEST — 03. Municípios, Secretarias, Perfis, Servidores, Cidades Região
-- =============================================================================

CREATE TABLE municipios (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome            TEXT NOT NULL,
    uf              CHAR(2) NOT NULL DEFAULT 'MG',
    codigo_ibge     VARCHAR(7) UNIQUE,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deletado_em     TIMESTAMPTZ
);

CREATE TABLE secretarias (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome            TEXT NOT NULL,
    sigla           VARCHAR(20),
    municipio_id    UUID NOT NULL REFERENCES municipios(id),
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deletado_em     TIMESTAMPTZ
);

CREATE INDEX idx_secretarias_municipio ON secretarias(municipio_id) WHERE deletado_em IS NULL;

CREATE TABLE perfis (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome            VARCHAR(50) NOT NULL UNIQUE,
    descricao       TEXT,
    permissoes      JSONB NOT NULL DEFAULT '{}',
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE servidores (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID UNIQUE REFERENCES usuarios(id),
    nome            TEXT NOT NULL,
    email           TEXT NOT NULL UNIQUE,
    cpf             VARCHAR(14) UNIQUE,
    matricula       VARCHAR(50),
    perfil_id       UUID NOT NULL REFERENCES perfis(id),
    secretaria_id   UUID NOT NULL REFERENCES secretarias(id),
    telefone        VARCHAR(20),
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_acesso   TIMESTAMPTZ,
    totp_secret     TEXT,
    totp_ativado    BOOLEAN DEFAULT FALSE,
    totp_ativado_em TIMESTAMPTZ,
    totp_recovery_codes TEXT,
    ultimo_ip       INET,
    ultimo_user_agent TEXT,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deletado_em     TIMESTAMPTZ
);

CREATE INDEX idx_servidores_secretaria ON servidores(secretaria_id) WHERE deletado_em IS NULL;
CREATE INDEX idx_servidores_perfil ON servidores(perfil_id);
CREATE INDEX idx_servidores_user ON servidores(user_id);
CREATE INDEX idx_servidores_user_active ON servidores(user_id, secretaria_id) WHERE deletado_em IS NULL;

CREATE TABLE cidades_regiao (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome            TEXT NOT NULL,
    uf              CHAR(2) NOT NULL DEFAULT 'MG',
    codigo_ibge     VARCHAR(7),
    municipio_id    UUID NOT NULL REFERENCES municipios(id),
    distancia_km    NUMERIC(8,2),
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deletado_em     TIMESTAMPTZ
);

CREATE INDEX idx_cidades_regiao_municipio ON cidades_regiao(municipio_id) WHERE deletado_em IS NULL;
