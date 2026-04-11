-- =============================================================================
-- LICITANEST — 06. Fornecedores (tenant via municipio_id direto)
-- =============================================================================

CREATE TABLE fornecedores (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cpf_cnpj        VARCHAR(18) NOT NULL,
    razao_social    TEXT NOT NULL,
    nome_fantasia   TEXT,
    rua             TEXT,
    numero          VARCHAR(20),
    complemento     TEXT,
    bairro          TEXT,
    cep             VARCHAR(10),
    cidade          TEXT,
    uf              CHAR(2),
    telefone        VARCHAR(20),
    email           TEXT,
    municipio_id    UUID NOT NULL REFERENCES municipios(id),
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deletado_em     TIMESTAMPTZ,
    UNIQUE(cpf_cnpj, municipio_id)
);

CREATE INDEX idx_fornecedores_cpf_cnpj ON fornecedores(cpf_cnpj);
CREATE INDEX idx_fornecedores_municipio ON fornecedores(municipio_id) WHERE deletado_em IS NULL;
CREATE INDEX idx_fornecedores_razao ON fornecedores USING GIN (razao_social gin_trgm_ops);
