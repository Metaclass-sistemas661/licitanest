-- =============================================================================
-- LICITANEST — 24. Fontes de Preço — Fase 7 (Expansão P0)
-- =============================================================================
-- ComprasNet, CATMAT/CATSER, ARP (Atas Registro Preço), ANP, FNDE
-- Dados de referência nacional — sem isolamento multi-tenant
-- =============================================================================

-- ── Expandir CHECK da tabela fontes ──────────────────
ALTER TABLE fontes DROP CONSTRAINT IF EXISTS fontes_tipo_check;
ALTER TABLE fontes ADD CONSTRAINT fontes_tipo_check CHECK (tipo IN (
    'pncp', 'painel_precos', 'tce_mg', 'bps',
    'sinapi', 'conab', 'ceasa', 'cmed',
    'transparencia', 'diario_oficial', 'cotacao_direta',
    'comprasnet', 'catmat', 'arp', 'anp', 'fnde'
));

-- Seed das novas fontes
INSERT INTO fontes (nome, sigla, tipo, url_base, descricao) VALUES
    ('ComprasNet — Compras Governamentais', 'COMPRASNET', 'comprasnet', 'https://compras.dados.gov.br', 'Histórico massivo de compras federais (Lei 8.666) — contratos, atas e materiais'),
    ('CATMAT/CATSER — Catálogo de Materiais e Serviços', 'CATMAT', 'catmat', 'https://compras.dados.gov.br/materiais/v1', 'Catálogo oficial de materiais e serviços do Governo Federal'),
    ('Atas de Registro de Preços Vigentes (PNCP)', 'ARP', 'arp', 'https://pncp.gov.br/api/consulta/v1/atas', 'Atas de registro de preço vigentes — fonte prioritária IN 65/2021 Art. 5º, I'),
    ('ANP — Preços de Combustíveis', 'ANP', 'anp', 'https://dados.gov.br/dados/conjuntos-dados/serie-historica-de-precos-de-combustiveis-e-de-glp', 'Preços semanais de combustíveis por município (gasolina, diesel, etanol, GNV, GLP)'),
    ('FNDE/PNAE — Merenda Escolar', 'FNDE', 'fnde', 'https://www.fnde.gov.br/dadosabertos/', 'Preços de referência para alimentação escolar — PNAE e agricultura familiar')
ON CONFLICT (sigla) DO NOTHING;

-- ╔══════════════════════════════════════════════════════╗
-- ║  ComprasNet — Compras Federais (histórico Lei 8.666)║
-- ╚══════════════════════════════════════════════════════╝

CREATE TABLE dados_fonte_comprasnet (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    orgao               TEXT NOT NULL,
    uasg                VARCHAR(10),
    descricao_item      TEXT NOT NULL,
    unidade             TEXT,
    quantidade          NUMERIC(14,4),
    valor_unitario      NUMERIC(14,4) NOT NULL,
    valor_total         NUMERIC(14,4),
    modalidade          TEXT,
    numero_contrato     TEXT,
    numero_ata          TEXT,
    data_publicacao     DATE,
    uf                  CHAR(2),
    tipo_registro       VARCHAR(20) DEFAULT 'contrato'
                        CHECK (tipo_registro IN ('contrato', 'ata', 'material')),
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comprasnet_descricao ON dados_fonte_comprasnet USING GIN (descricao_item gin_trgm_ops);
CREATE INDEX idx_comprasnet_data ON dados_fonte_comprasnet(data_publicacao DESC);
CREATE INDEX idx_comprasnet_uf ON dados_fonte_comprasnet(uf);
CREATE INDEX idx_comprasnet_uasg ON dados_fonte_comprasnet(uasg);
CREATE INDEX idx_comprasnet_modalidade ON dados_fonte_comprasnet(modalidade);

-- ╔══════════════════════════════════════════════════════╗
-- ║  CATMAT/CATSER — Catálogo de Materiais e Serviços   ║
-- ╚══════════════════════════════════════════════════════╝

CREATE TABLE dados_fonte_catmat (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_catmat       VARCHAR(30) NOT NULL,
    descricao           TEXT NOT NULL,
    grupo               TEXT,
    classe              TEXT,
    pdm                 TEXT,
    status              VARCHAR(20) DEFAULT 'ativo',
    sustentavel         BOOLEAN NOT NULL DEFAULT FALSE,
    tipo_registro       VARCHAR(10) NOT NULL DEFAULT 'material'
                        CHECK (tipo_registro IN ('material', 'servico')),
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(codigo_catmat, tipo_registro)
);

CREATE INDEX idx_catmat_codigo ON dados_fonte_catmat(codigo_catmat);
CREATE INDEX idx_catmat_descricao ON dados_fonte_catmat USING GIN (descricao gin_trgm_ops);
CREATE INDEX idx_catmat_grupo ON dados_fonte_catmat USING GIN (grupo gin_trgm_ops);
CREATE INDEX idx_catmat_classe ON dados_fonte_catmat USING GIN (classe gin_trgm_ops);
CREATE INDEX idx_catmat_tipo ON dados_fonte_catmat(tipo_registro);
CREATE INDEX idx_catmat_sustentavel ON dados_fonte_catmat(sustentavel) WHERE sustentavel = TRUE;

-- ╔══════════════════════════════════════════════════════╗
-- ║  ARP — Atas de Registro de Preços Vigentes          ║
-- ╚══════════════════════════════════════════════════════╝

CREATE TABLE dados_fonte_arp (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    orgao                   TEXT NOT NULL,
    numero_ata              TEXT,
    numero_licitacao        TEXT,
    descricao_item          TEXT NOT NULL,
    marca                   TEXT,
    unidade                 TEXT,
    quantidade              NUMERIC(14,4),
    valor_unitario          NUMERIC(14,4) NOT NULL,
    fornecedor              TEXT,
    cnpj_fornecedor         VARCHAR(18),
    data_vigencia_inicio    DATE NOT NULL,
    data_vigencia_fim       DATE NOT NULL,
    uf                      CHAR(2),
    vigente                 BOOLEAN GENERATED ALWAYS AS (data_vigencia_fim >= CURRENT_DATE) STORED,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_arp_descricao ON dados_fonte_arp USING GIN (descricao_item gin_trgm_ops);
CREATE INDEX idx_arp_vigencia ON dados_fonte_arp(data_vigencia_fim DESC);
CREATE INDEX idx_arp_vigente ON dados_fonte_arp(vigente) WHERE vigente = TRUE;
CREATE INDEX idx_arp_uf ON dados_fonte_arp(uf);
CREATE INDEX idx_arp_fornecedor ON dados_fonte_arp USING GIN (fornecedor gin_trgm_ops);
CREATE INDEX idx_arp_orgao ON dados_fonte_arp USING GIN (orgao gin_trgm_ops);

-- ╔══════════════════════════════════════════════════════╗
-- ║  ANP — Preços de Combustíveis                       ║
-- ╚══════════════════════════════════════════════════════╝

CREATE TABLE dados_fonte_anp (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    produto             TEXT NOT NULL,
    bandeira            TEXT,
    valor_revenda       NUMERIC(14,4) NOT NULL,
    valor_distribuicao  NUMERIC(14,4),
    municipio           TEXT,
    uf                  CHAR(2) NOT NULL,
    data_coleta         DATE NOT NULL,
    nome_posto          TEXT,
    cnpj_posto          VARCHAR(18),
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_anp_produto ON dados_fonte_anp(produto);
CREATE INDEX idx_anp_uf ON dados_fonte_anp(uf);
CREATE INDEX idx_anp_municipio ON dados_fonte_anp USING GIN (municipio gin_trgm_ops);
CREATE INDEX idx_anp_data ON dados_fonte_anp(data_coleta DESC);
CREATE INDEX idx_anp_produto_uf_data ON dados_fonte_anp(produto, uf, data_coleta DESC);

-- ╔══════════════════════════════════════════════════════╗
-- ║  FNDE/PNAE — Merenda Escolar                       ║
-- ╚══════════════════════════════════════════════════════╝

CREATE TABLE dados_fonte_fnde (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    descricao_item      TEXT NOT NULL,
    unidade             TEXT,
    valor_referencia    NUMERIC(14,4) NOT NULL,
    regiao              TEXT,
    uf                  CHAR(2),
    tipo_agricultura    VARCHAR(20) DEFAULT 'convencional'
                        CHECK (tipo_agricultura IN ('familiar', 'convencional')),
    programa            VARCHAR(20) DEFAULT 'PNAE'
                        CHECK (programa IN ('PNAE', 'PNAC')),
    vigencia            DATE,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fnde_descricao ON dados_fonte_fnde USING GIN (descricao_item gin_trgm_ops);
CREATE INDEX idx_fnde_uf ON dados_fonte_fnde(uf);
CREATE INDEX idx_fnde_regiao ON dados_fonte_fnde(regiao);
CREATE INDEX idx_fnde_tipo ON dados_fonte_fnde(tipo_agricultura);
CREATE INDEX idx_fnde_programa ON dados_fonte_fnde(programa);
CREATE INDEX idx_fnde_vigencia ON dados_fonte_fnde(vigencia DESC);
