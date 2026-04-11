-- =============================================================================
-- LICITANEST — 25. Fontes de Preço — Fase 7 (Expansão P1)
-- =============================================================================
-- BPS Saúde Ampliado, SIGTAP/SUS, CEASA Nacional, FIPE, SIASG/DW, TCU e-Preços
-- =============================================================================

-- ── Expandir CHECK da tabela fontes com tipos P1 ──────────────────
ALTER TABLE fontes DROP CONSTRAINT IF EXISTS fontes_tipo_check;
ALTER TABLE fontes ADD CONSTRAINT fontes_tipo_check CHECK (tipo IN (
    'pncp', 'painel_precos', 'tce_mg', 'bps',
    'sinapi', 'conab', 'ceasa', 'cmed',
    'transparencia', 'diario_oficial', 'cotacao_direta',
    'comprasnet', 'catmat', 'arp', 'anp', 'fnde',
    'bps_saude', 'sigtap', 'ceasa_nacional', 'fipe', 'siasg', 'tcu'
));

-- Seed das novas fontes P1
INSERT INTO fontes (nome, sigla, tipo, url_base, descricao) VALUES
    ('BPS Ampliado — Equipamentos e EPIs de Saúde', 'BPS_SAUDE', 'bps_saude', 'https://bfrancodeprecos.saude.gov.br', 'Banco de Preços em Saúde ampliado — equipamentos médicos, EPIs e instrumental cirúrgico'),
    ('SIGTAP/SUS — Tabela de Procedimentos', 'SIGTAP', 'sigtap', 'https://sigtap.datasus.gov.br', 'Tabela unificada de procedimentos SUS — valores ambulatoriais e hospitalares'),
    ('CEASAs Nacional — Hortifrúti Multi-Estado', 'CEASA_NAC', 'ceasa_nacional', 'https://ceagesp.gov.br', 'Cotações de hortifrúti das principais CEASAs (SP, PR, CE, RJ, BA, GO, RS)'),
    ('Tabela FIPE — Veículos', 'FIPE', 'fipe', 'https://veiculos.fipe.org.br', 'Preços de referência para veículos — carros, motos e caminhões'),
    ('SIASG/DW — Data Warehouse de Compras Gov', 'SIASG', 'siasg', 'https://dw.comprasnet.gov.br', 'Dados agregados de compras governamentais — média, mín, máx por item'),
    ('TCU e-Preços — Estimativas de Preços', 'TCU', 'tcu', 'https://portal.tcu.gov.br/dados-abertos', 'Base de estimativas de preços do TCU — mediana, quartis, metodologia rigorosa')
ON CONFLICT (sigla) DO NOTHING;

-- ╔══════════════════════════════════════════════════════╗
-- ║  7.2 — BPS Ampliado (Equipamentos Médicos/EPIs)     ║
-- ╚══════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS dados_fonte_bps_saude (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_br_saude     TEXT,
    descricao           TEXT NOT NULL,
    tipo_item           VARCHAR(30) DEFAULT 'equipamento'
                        CHECK (tipo_item IN ('equipamento', 'epi', 'instrumental', 'mobiliario', 'outro')),
    fabricante          TEXT,
    modelo              TEXT,
    unidade             TEXT,
    preco_unitario      NUMERIC(14,4) NOT NULL,
    quantidade          INTEGER,
    orgao_comprador     TEXT,
    uf                  CHAR(2),
    data_compra         DATE,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bps_saude_descricao ON dados_fonte_bps_saude USING GIN (descricao gin_trgm_ops);
CREATE INDEX idx_bps_saude_tipo ON dados_fonte_bps_saude(tipo_item);
CREATE INDEX idx_bps_saude_uf ON dados_fonte_bps_saude(uf);
CREATE INDEX idx_bps_saude_data ON dados_fonte_bps_saude(data_compra DESC);
CREATE INDEX idx_bps_saude_fabricante ON dados_fonte_bps_saude USING GIN (fabricante gin_trgm_ops);

-- ╔══════════════════════════════════════════════════════╗
-- ║  7.3 — SIGTAP/SUS — Procedimentos                  ║
-- ╚══════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS dados_fonte_sigtap (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_procedimento     VARCHAR(20) NOT NULL,
    nome_procedimento       TEXT NOT NULL,
    grupo                   TEXT,
    subgrupo                TEXT,
    forma_organizacao       TEXT,
    complexidade            VARCHAR(10) CHECK (complexidade IN ('baixa', 'media', 'alta')),
    valor_ambulatorial      NUMERIC(14,4),
    valor_hospitalar        NUMERIC(14,4),
    competencia             VARCHAR(6),
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(codigo_procedimento, competencia)
);

CREATE INDEX idx_sigtap_codigo ON dados_fonte_sigtap(codigo_procedimento);
CREATE INDEX idx_sigtap_nome ON dados_fonte_sigtap USING GIN (nome_procedimento gin_trgm_ops);
CREATE INDEX idx_sigtap_grupo ON dados_fonte_sigtap USING GIN (grupo gin_trgm_ops);
CREATE INDEX idx_sigtap_complexidade ON dados_fonte_sigtap(complexidade);
CREATE INDEX idx_sigtap_competencia ON dados_fonte_sigtap(competencia DESC);

-- ╔══════════════════════════════════════════════════════╗
-- ║  7.6 — CEASAs Nacional (Multi-Estado)               ║
-- ╚══════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS dados_fonte_ceasa_nacional (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    produto             TEXT NOT NULL,
    variedade           TEXT,
    unidade             TEXT,
    preco_minimo        NUMERIC(14,4),
    preco_maximo        NUMERIC(14,4),
    preco_comum         NUMERIC(14,4),
    ceasa_origem        TEXT NOT NULL,
    uf                  CHAR(2) NOT NULL,
    data_cotacao        DATE NOT NULL,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ceasa_nac_produto ON dados_fonte_ceasa_nacional USING GIN (produto gin_trgm_ops);
CREATE INDEX idx_ceasa_nac_uf ON dados_fonte_ceasa_nacional(uf);
CREATE INDEX idx_ceasa_nac_ceasa ON dados_fonte_ceasa_nacional(ceasa_origem);
CREATE INDEX idx_ceasa_nac_data ON dados_fonte_ceasa_nacional(data_cotacao DESC);
CREATE INDEX idx_ceasa_nac_produto_uf_data ON dados_fonte_ceasa_nacional(uf, data_cotacao DESC);

-- ╔══════════════════════════════════════════════════════╗
-- ║  7.8 — Tabela FIPE — Veículos                      ║
-- ╚══════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS dados_fonte_fipe (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_fipe         VARCHAR(20) NOT NULL,
    tipo_veiculo        VARCHAR(15) NOT NULL
                        CHECK (tipo_veiculo IN ('carro', 'moto', 'caminhao')),
    marca               TEXT NOT NULL,
    modelo              TEXT NOT NULL,
    ano_modelo          VARCHAR(10),
    combustivel         TEXT,
    valor               NUMERIC(14,2) NOT NULL,
    mes_referencia      VARCHAR(20),
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(codigo_fipe, mes_referencia)
);

CREATE INDEX idx_fipe_codigo ON dados_fonte_fipe(codigo_fipe);
CREATE INDEX idx_fipe_tipo ON dados_fonte_fipe(tipo_veiculo);
CREATE INDEX idx_fipe_marca ON dados_fonte_fipe USING GIN (marca gin_trgm_ops);
CREATE INDEX idx_fipe_modelo ON dados_fonte_fipe USING GIN (modelo gin_trgm_ops);
CREATE INDEX idx_fipe_mes ON dados_fonte_fipe(mes_referencia DESC);

-- ╔══════════════════════════════════════════════════════╗
-- ║  7.10 — SIASG/DW — Dados Agregados de Compras      ║
-- ╚══════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS dados_fonte_siasg (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_item         TEXT,
    descricao           TEXT NOT NULL,
    unidade             TEXT,
    preco_medio         NUMERIC(14,4),
    preco_minimo        NUMERIC(14,4),
    preco_maximo        NUMERIC(14,4),
    desvio_padrao       NUMERIC(14,4),
    quantidade_compras  INTEGER,
    quantidade_orgaos   INTEGER,
    periodo_inicio      DATE,
    periodo_fim         DATE,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_siasg_descricao ON dados_fonte_siasg USING GIN (descricao gin_trgm_ops);
CREATE INDEX idx_siasg_codigo ON dados_fonte_siasg(codigo_item);
CREATE INDEX idx_siasg_periodo ON dados_fonte_siasg(periodo_fim DESC);
CREATE INDEX idx_siasg_preco ON dados_fonte_siasg(preco_medio);

-- ╔══════════════════════════════════════════════════════╗
-- ║  7.14 — TCU e-Preços — Estimativas                 ║
-- ╚══════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS dados_fonte_tcu (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    descricao               TEXT NOT NULL,
    unidade                 TEXT,
    mediana                 NUMERIC(14,4),
    quartil_1               NUMERIC(14,4),
    quartil_3               NUMERIC(14,4),
    preco_minimo            NUMERIC(14,4),
    preco_maximo            NUMERIC(14,4),
    quantidade_amostras     INTEGER,
    metodologia             TEXT,
    periodo_referencia      TEXT,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tcu_descricao ON dados_fonte_tcu USING GIN (descricao gin_trgm_ops);
CREATE INDEX idx_tcu_periodo ON dados_fonte_tcu(periodo_referencia DESC);
CREATE INDEX idx_tcu_mediana ON dados_fonte_tcu(mediana);
