-- =============================================================================
-- LICITANEST — 26. Fontes de Preço — Fase 7 (Expansão P2 + P3)
-- =============================================================================
-- CUB/SINDUSCON, BNDES, SIA/SIH-SUS, Agências Reguladoras, INCRA/EMBRAPA
-- =============================================================================

-- ── Expandir CHECK da tabela fontes com tipos P2+P3 ──────────────────
ALTER TABLE fontes DROP CONSTRAINT IF EXISTS fontes_tipo_check;
ALTER TABLE fontes ADD CONSTRAINT fontes_tipo_check CHECK (tipo IN (
    'pncp', 'painel_precos', 'tce_mg', 'bps',
    'sinapi', 'conab', 'ceasa', 'cmed',
    'transparencia', 'diario_oficial', 'cotacao_direta',
    'comprasnet', 'catmat', 'arp', 'anp', 'fnde',
    'bps_saude', 'sigtap', 'ceasa_nacional', 'fipe', 'siasg', 'tcu',
    'cub', 'bndes', 'sia_sih', 'agencia_reg', 'incra'
));

-- Seed das novas fontes P2+P3
INSERT INTO fontes (nome, sigla, tipo, url_base, descricao) VALUES
    ('CUB/SINDUSCON — Custo Unitário Básico', 'CUB', 'cub', 'https://sindusconsp.com.br/indicadores/cub', 'Custo por m² de construção civil por estado e padrão construtivo'),
    ('BNDES — Cartão BNDES Produtos Credenciados', 'BNDES', 'bndes', 'https://www.cartaobndes.gov.br', 'Catálogo de máquinas, equipamentos e veículos com preços credenciados'),
    ('SIA/SIH-SUS — Procedimentos Hospitalares', 'SIA_SIH', 'sia_sih', 'https://apidadosabertos.saude.gov.br', 'Valores SUS para internações (SIH) e ambulatório (SIA) por complexidade'),
    ('Agências Reguladoras — ANEEL/ANATEL/ANTT', 'AG_REG', 'agencia_reg', 'https://dadosabertos.aneel.gov.br', 'Tarifas reguladas de energia, telecom e transporte por operadora/distribuidora'),
    ('INCRA/EMBRAPA — Preço de Terras', 'INCRA', 'incra', 'https://www.gov.br/incra/pt-br/assuntos/governanca-fundiaria', 'Valor de terras por tipo (lavoura, pastagem, cerrado, mata) por região')
ON CONFLICT (sigla) DO NOTHING;

-- ╔══════════════════════════════════════════════════════╗
-- ║  7.9 — CUB/SINDUSCON — Custo Unitário Básico        ║
-- ╚══════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS dados_fonte_cub (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uf                      CHAR(2) NOT NULL,
    padrao_construtivo      VARCHAR(10) NOT NULL
                            CHECK (padrao_construtivo IN ('R1', 'R8', 'R16', 'PP4', 'RP1Q', 'CSL8', 'CSL16', 'CAL8', 'GI', 'OUTRO')),
    tipo_custo              VARCHAR(20) DEFAULT 'total'
                            CHECK (tipo_custo IN ('material', 'mao_de_obra', 'total', 'despesas_administrativas')),
    valor_m2                NUMERIC(14,2) NOT NULL,
    mes_referencia          VARCHAR(7) NOT NULL,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(uf, padrao_construtivo, tipo_custo, mes_referencia)
);

CREATE INDEX idx_cub_uf ON dados_fonte_cub(uf);
CREATE INDEX idx_cub_padrao ON dados_fonte_cub(padrao_construtivo);
CREATE INDEX idx_cub_mes ON dados_fonte_cub(mes_referencia DESC);
CREATE INDEX idx_cub_uf_padrao_mes ON dados_fonte_cub(uf, padrao_construtivo, mes_referencia DESC);

-- ╔══════════════════════════════════════════════════════╗
-- ║  7.12 — BNDES — Cartão BNDES Credenciados           ║
-- ╚══════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS dados_fonte_bndes (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_produto      TEXT,
    descricao           TEXT NOT NULL,
    categoria           TEXT,
    fabricante          TEXT,
    fornecedor          TEXT,
    preco               NUMERIC(14,2) NOT NULL,
    condicao_pagamento  TEXT,
    data_catalogo       DATE,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bndes_descricao ON dados_fonte_bndes USING GIN (descricao gin_trgm_ops);
CREATE INDEX idx_bndes_categoria ON dados_fonte_bndes USING GIN (categoria gin_trgm_ops);
CREATE INDEX idx_bndes_fabricante ON dados_fonte_bndes USING GIN (fabricante gin_trgm_ops);
CREATE INDEX idx_bndes_data ON dados_fonte_bndes(data_catalogo DESC);

-- ╔══════════════════════════════════════════════════════╗
-- ║  7.13 — SIA/SIH-SUS — Ambulatório e Internações     ║
-- ╚══════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS dados_fonte_sia_sih (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_procedimento     VARCHAR(20) NOT NULL,
    nome_procedimento       TEXT NOT NULL,
    tipo_registro           VARCHAR(5) NOT NULL
                            CHECK (tipo_registro IN ('SIA', 'SIH')),
    complexidade            VARCHAR(10) CHECK (complexidade IN ('baixa', 'media', 'alta')),
    valor_unitario          NUMERIC(14,4),
    valor_medio             NUMERIC(14,4),
    quantidade_aprovada     INTEGER,
    competencia             VARCHAR(6),
    uf                      CHAR(2),
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(codigo_procedimento, tipo_registro, competencia, uf)
);

CREATE INDEX idx_sia_sih_codigo ON dados_fonte_sia_sih(codigo_procedimento);
CREATE INDEX idx_sia_sih_nome ON dados_fonte_sia_sih USING GIN (nome_procedimento gin_trgm_ops);
CREATE INDEX idx_sia_sih_tipo ON dados_fonte_sia_sih(tipo_registro);
CREATE INDEX idx_sia_sih_uf ON dados_fonte_sia_sih(uf);
CREATE INDEX idx_sia_sih_competencia ON dados_fonte_sia_sih(competencia DESC);

-- ╔══════════════════════════════════════════════════════╗
-- ║  7.15 — Agências Reguladoras (ANEEL/ANATEL/ANTT)    ║
-- ╚══════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS dados_fonte_agencias_reg (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agencia                     VARCHAR(10) NOT NULL
                                CHECK (agencia IN ('ANEEL', 'ANATEL', 'ANTT', 'ANTAQ')),
    descricao                   TEXT NOT NULL,
    tipo_tarifa                 TEXT,
    valor                       NUMERIC(14,4) NOT NULL,
    unidade                     TEXT,
    distribuidora_operadora     TEXT,
    uf                          CHAR(2),
    vigencia_inicio             DATE,
    vigencia_fim                DATE,
    criado_em                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ag_reg_agencia ON dados_fonte_agencias_reg(agencia);
CREATE INDEX idx_ag_reg_descricao ON dados_fonte_agencias_reg USING GIN (descricao gin_trgm_ops);
CREATE INDEX idx_ag_reg_uf ON dados_fonte_agencias_reg(uf);
CREATE INDEX idx_ag_reg_vigencia ON dados_fonte_agencias_reg(vigencia_fim DESC);
CREATE INDEX idx_ag_reg_distrib ON dados_fonte_agencias_reg USING GIN (distribuidora_operadora gin_trgm_ops);

-- ╔══════════════════════════════════════════════════════╗
-- ║  7.16 — INCRA/EMBRAPA — Preço de Terras             ║
-- ╚══════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS dados_fonte_incra (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo_terra              VARCHAR(20) NOT NULL
                            CHECK (tipo_terra IN ('lavoura', 'pastagem', 'cerrado', 'mata', 'campo', 'misto')),
    regiao                  TEXT,
    municipio_referencia    TEXT,
    uf                      CHAR(2) NOT NULL,
    valor_hectare           NUMERIC(14,2) NOT NULL,
    semestre_referencia     VARCHAR(7),
    fonte_dados             VARCHAR(10) DEFAULT 'INCRA'
                            CHECK (fonte_dados IN ('INCRA', 'FNP', 'EMBRAPA')),
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incra_tipo ON dados_fonte_incra(tipo_terra);
CREATE INDEX idx_incra_uf ON dados_fonte_incra(uf);
CREATE INDEX idx_incra_regiao ON dados_fonte_incra USING GIN (regiao gin_trgm_ops);
CREATE INDEX idx_incra_municipio ON dados_fonte_incra USING GIN (municipio_referencia gin_trgm_ops);
CREATE INDEX idx_incra_semestre ON dados_fonte_incra(semestre_referencia DESC);
CREATE INDEX idx_incra_uf_tipo ON dados_fonte_incra(uf, tipo_terra);
