-- =============================================================================
-- LICITANEST — 15. API Keys e Log de Acesso
-- =============================================================================
-- api_keys: tenant via municipio_id direto
-- api_log: municipio_id adicionado para RLS (api_key_id é NULLABLE)
-- =============================================================================

CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    municipio_id UUID NOT NULL REFERENCES municipios(id),
    nome VARCHAR(100) NOT NULL,
    chave_hash VARCHAR(128) NOT NULL,
    prefixo VARCHAR(12) NOT NULL,
    permissoes JSONB DEFAULT '["leitura"]',
    rate_limit_rpm INTEGER DEFAULT 60,
    ativo BOOLEAN DEFAULT TRUE,
    ultimo_uso_em TIMESTAMPTZ,
    total_requisicoes BIGINT DEFAULT 0,
    expira_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    criado_por UUID REFERENCES servidores(id),
    revogado_em TIMESTAMPTZ,
    revogado_por UUID REFERENCES servidores(id)
);

CREATE INDEX idx_api_keys_municipio ON api_keys(municipio_id);
CREATE INDEX idx_api_keys_prefixo ON api_keys(prefixo);
CREATE INDEX idx_api_keys_chave ON api_keys(chave_hash);

CREATE TABLE api_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID REFERENCES api_keys(id),
    municipio_id UUID NOT NULL REFERENCES municipios(id),
    metodo VARCHAR(10) NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    status_code INTEGER,
    ip VARCHAR(45),
    user_agent TEXT,
    latencia_ms INTEGER,
    request_body JSONB,
    response_resumo VARCHAR(200),
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_log_key ON api_log(api_key_id);
CREATE INDEX idx_api_log_endpoint ON api_log(endpoint);
CREATE INDEX idx_api_log_data ON api_log(criado_em DESC);
CREATE INDEX idx_api_log_municipio ON api_log(municipio_id);
