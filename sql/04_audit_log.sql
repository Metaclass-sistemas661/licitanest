-- =============================================================================
-- LICITANEST — 04. Audit Log (imutável, TCU/TCE)
-- =============================================================================
-- municipio_id adicionado para RLS multi-tenant direto (evita JOIN 3 hops)
-- NULLABLE para entradas de sistema (purge, migrations)
-- =============================================================================

CREATE TABLE audit_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    servidor_id     UUID REFERENCES servidores(id),
    municipio_id    UUID REFERENCES municipios(id),
    acao            VARCHAR(50) NOT NULL,
    tabela          VARCHAR(100),
    registro_id     TEXT,
    dados_anteriores JSONB,
    dados_novos     JSONB,
    ip_address      TEXT,
    user_agent      TEXT,
    hash            TEXT,
    hash_anterior   TEXT,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_servidor ON audit_log(servidor_id);
CREATE INDEX idx_audit_log_municipio ON audit_log(municipio_id);
CREATE INDEX idx_audit_log_acao ON audit_log(acao);
CREATE INDEX idx_audit_log_tabela ON audit_log(tabela, registro_id);
CREATE INDEX idx_audit_log_criado ON audit_log(criado_em DESC);
CREATE INDEX idx_audit_log_servidor_criado ON audit_log(servidor_id, criado_em DESC);
CREATE INDEX idx_audit_log_municipio_criado ON audit_log(municipio_id, criado_em DESC);
