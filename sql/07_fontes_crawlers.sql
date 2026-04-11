-- =============================================================================
-- LICITANEST — 07. Fontes de Preço e Dados dos Crawlers (global)
-- =============================================================================
-- Dados de referência nacional: PNCP, Painel, TCE, BPS, SINAPI, CONAB, CEASA, CMED
-- Sem isolamento multi-tenant (dados públicos compartilhados)
-- =============================================================================

CREATE TABLE fontes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome            TEXT NOT NULL,
    sigla           VARCHAR(30) NOT NULL UNIQUE,
    tipo            VARCHAR(30) NOT NULL
                    CHECK (tipo IN (
                        'pncp', 'painel_precos', 'tce_mg', 'bps',
                        'sinapi', 'conab', 'ceasa', 'cmed',
                        'transparencia', 'diario_oficial', 'cotacao_direta'
                    )),
    url_base        TEXT,
    descricao       TEXT,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── PNCP ────────────────────────────────────────────────────
CREATE TABLE dados_fonte_pncp (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    orgao               TEXT NOT NULL,
    cnpj_orgao          VARCHAR(18),
    uf_orgao            CHAR(2),
    cidade_orgao        TEXT,
    descricao_item      TEXT NOT NULL,
    unidade             TEXT,
    quantidade          NUMERIC(14,4),
    valor_unitario      NUMERIC(14,4) NOT NULL,
    valor_total         NUMERIC(14,4),
    data_homologacao    DATE,
    numero_contrato     TEXT,
    modalidade          TEXT,
    documento_url       TEXT,
    codigo_item         TEXT,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pncp_descricao ON dados_fonte_pncp USING GIN (descricao_item gin_trgm_ops);
CREATE INDEX idx_pncp_data ON dados_fonte_pncp(data_homologacao DESC);
CREATE INDEX idx_pncp_uf ON dados_fonte_pncp(uf_orgao);

-- ── Painel de Preços ────────────────────────────────────────
CREATE TABLE dados_fonte_painel (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    orgao               TEXT NOT NULL,
    descricao_item      TEXT NOT NULL,
    unidade             TEXT,
    valor_unitario      NUMERIC(14,4) NOT NULL,
    data_compra         DATE,
    modalidade          TEXT,
    numero_processo     TEXT,
    documento_url       TEXT,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_painel_descricao ON dados_fonte_painel USING GIN (descricao_item gin_trgm_ops);
CREATE INDEX idx_painel_data ON dados_fonte_painel(data_compra DESC);

-- ── TCE ─────────────────────────────────────────────────────
CREATE TABLE dados_fonte_tce (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    orgao               TEXT NOT NULL,
    municipio           TEXT,
    descricao_item      TEXT NOT NULL,
    unidade             TEXT,
    valor_unitario      NUMERIC(14,4) NOT NULL,
    data_contrato       DATE,
    numero_contrato     TEXT,
    documento_url       TEXT,
    uf                  VARCHAR(2) NOT NULL DEFAULT 'MG',
    fonte_tce           VARCHAR(20) NOT NULL DEFAULT 'TCE/MG',
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tce_descricao ON dados_fonte_tce USING GIN (descricao_item gin_trgm_ops);
CREATE INDEX idx_tce_municipio ON dados_fonte_tce(municipio);
CREATE INDEX idx_tce_uf ON dados_fonte_tce(uf);
CREATE INDEX idx_tce_fonte ON dados_fonte_tce(fonte_tce);

-- ── BPS ─────────────────────────────────────────────────────
CREATE TABLE dados_fonte_bps (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_br           VARCHAR(30),
    descricao_item      TEXT NOT NULL,
    apresentacao        TEXT,
    unidade             TEXT,
    valor_unitario      NUMERIC(14,4) NOT NULL,
    quantidade          NUMERIC(14,4),
    instituicao         TEXT,
    uf                  CHAR(2),
    data_compra         DATE,
    modalidade          TEXT,
    media_ponderada     NUMERIC(14,4),
    total_registros_consulta INTEGER,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bps_codigo ON dados_fonte_bps(codigo_br);
CREATE INDEX idx_bps_descricao ON dados_fonte_bps USING GIN (descricao_item gin_trgm_ops);
CREATE INDEX idx_bps_codigo_data ON dados_fonte_bps(codigo_br, data_compra DESC);
CREATE INDEX idx_bps_uf ON dados_fonte_bps(uf);
CREATE INDEX idx_bps_instituicao ON dados_fonte_bps USING GIN (instituicao gin_trgm_ops);

-- ── SINAPI ──────────────────────────────────────────────────
CREATE TABLE dados_fonte_sinapi (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_sinapi       VARCHAR(20) NOT NULL,
    descricao_item      TEXT NOT NULL,
    unidade             TEXT,
    valor_unitario      NUMERIC(14,4) NOT NULL,
    uf                  CHAR(2) NOT NULL DEFAULT 'MG',
    mes_referencia      DATE NOT NULL,
    tipo                VARCHAR(20),
    desonerado          BOOLEAN NOT NULL DEFAULT FALSE,
    origem              VARCHAR(20) DEFAULT 'CEF',
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sinapi_codigo ON dados_fonte_sinapi(codigo_sinapi);
CREATE INDEX idx_sinapi_descricao ON dados_fonte_sinapi USING GIN (descricao_item gin_trgm_ops);
CREATE INDEX idx_sinapi_mes ON dados_fonte_sinapi(mes_referencia DESC);
CREATE INDEX idx_sinapi_codigo_uf_mes ON dados_fonte_sinapi(codigo_sinapi, uf, mes_referencia DESC);
CREATE INDEX idx_sinapi_tipo ON dados_fonte_sinapi(tipo);
CREATE INDEX idx_sinapi_uf ON dados_fonte_sinapi(uf);

-- ── CONAB ───────────────────────────────────────────────────
CREATE TABLE dados_fonte_conab (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    descricao_item      TEXT NOT NULL,
    unidade             TEXT,
    valor_unitario      NUMERIC(14,4) NOT NULL,
    cidade              TEXT,
    uf                  CHAR(2) NOT NULL DEFAULT 'MG',
    data_referencia     DATE NOT NULL,
    tipo_produto        VARCHAR(50),
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conab_descricao ON dados_fonte_conab USING GIN (descricao_item gin_trgm_ops);
CREATE INDEX idx_conab_data ON dados_fonte_conab(data_referencia DESC);
CREATE INDEX idx_conab_cidade ON dados_fonte_conab(cidade);
CREATE INDEX idx_conab_uf ON dados_fonte_conab(uf);

-- ── CEASA ───────────────────────────────────────────────────
CREATE TABLE dados_fonte_ceasa (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    descricao_item      TEXT NOT NULL,
    variedade           TEXT,
    unidade             TEXT,
    valor_minimo        NUMERIC(14,4),
    valor_maximo        NUMERIC(14,4),
    valor_comum         NUMERIC(14,4) NOT NULL,
    data_cotacao        DATE NOT NULL,
    turno               VARCHAR(20),
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ceasa_descricao ON dados_fonte_ceasa USING GIN (descricao_item gin_trgm_ops);
CREATE INDEX idx_ceasa_data ON dados_fonte_ceasa(data_cotacao DESC);
CREATE INDEX idx_ceasa_variedade ON dados_fonte_ceasa USING GIN (variedade gin_trgm_ops);

-- ── CMED / ANVISA ───────────────────────────────────────────
CREATE TABLE dados_fonte_cmed (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registro_anvisa         VARCHAR(20),
    principio_ativo         TEXT NOT NULL,
    descricao_produto       TEXT NOT NULL,
    apresentacao            TEXT,
    laboratorio             TEXT,
    ean                     VARCHAR(20),
    pmvg_sem_impostos       NUMERIC(14,4),
    pmvg_com_impostos       NUMERIC(14,4),
    pmc                     NUMERIC(14,4),
    icms_0                  NUMERIC(14,4),
    lista_concessao         TEXT,
    data_publicacao         DATE,
    tipo_produto            VARCHAR(30),
    regime_preco            VARCHAR(30),
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cmed_registro ON dados_fonte_cmed(registro_anvisa);
CREATE INDEX idx_cmed_principio ON dados_fonte_cmed USING GIN (principio_ativo gin_trgm_ops);
CREATE INDEX idx_cmed_descricao ON dados_fonte_cmed USING GIN (descricao_produto gin_trgm_ops);
CREATE INDEX idx_cmed_laboratorio ON dados_fonte_cmed USING GIN (laboratorio gin_trgm_ops);
CREATE INDEX idx_cmed_ean ON dados_fonte_cmed(ean);
CREATE INDEX idx_cmed_data ON dados_fonte_cmed(data_publicacao DESC);

-- ── Execuções de Crawler e Cache ────────────────────────────
CREATE TABLE execucoes_crawler (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fonte_id            UUID NOT NULL REFERENCES fontes(id),
    status              VARCHAR(20) NOT NULL DEFAULT 'executando'
                        CHECK (status IN ('executando', 'sucesso', 'falha', 'parcial')),
    itens_processados   INTEGER DEFAULT 0,
    itens_novos         INTEGER DEFAULT 0,
    itens_atualizados   INTEGER DEFAULT 0,
    erro_mensagem       TEXT,
    iniciado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finalizado_em       TIMESTAMPTZ,
    duracao_segundos    INTEGER
);

CREATE INDEX idx_execucoes_fonte ON execucoes_crawler(fonte_id);
CREATE INDEX idx_execucoes_status ON execucoes_crawler(status);

CREATE TABLE cache_consultas (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fonte_tipo          VARCHAR(30) NOT NULL,
    chave_consulta      TEXT NOT NULL,
    resultado           JSONB,
    consultado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expira_em           TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
    UNIQUE(fonte_tipo, chave_consulta)
);

CREATE INDEX idx_cache_expira ON cache_consultas(expira_em);
