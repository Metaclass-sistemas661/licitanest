-- =============================================================================
-- LICITANEST — 09. Correção Monetária (global)
-- =============================================================================

CREATE TABLE indices_correcao (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo            VARCHAR(10) NOT NULL CHECK (tipo IN ('ipca', 'igpm')),
    ano             INTEGER NOT NULL,
    mes             INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
    valor           NUMERIC(12,8) NOT NULL,
    acumulado_12m   NUMERIC(12,8),
    fonte           TEXT,
    importado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tipo, ano, mes)
);

CREATE INDEX idx_indices_tipo_periodo ON indices_correcao(tipo, ano DESC, mes DESC);
CREATE INDEX idx_indices_tipo ON indices_correcao(tipo);

CREATE TABLE log_importacao_indices (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo            VARCHAR(10) NOT NULL,
    registros_importados INTEGER NOT NULL DEFAULT 0,
    periodo_inicio  TEXT,
    periodo_fim     TEXT,
    fonte_url       TEXT,
    erro            TEXT,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE indices_atualizacoes_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    indice          VARCHAR(20) NOT NULL,
    mes_referencia  VARCHAR(7) NOT NULL,
    valor_anterior  NUMERIC(12,6),
    valor_novo      NUMERIC(12,6) NOT NULL,
    fonte_url       VARCHAR(500),
    metodo          VARCHAR(30) DEFAULT 'cloud_function',
    sucesso         BOOLEAN DEFAULT TRUE,
    erro            TEXT,
    executado_em    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_indices_log_mes ON indices_atualizacoes_log(indice, mes_referencia);
