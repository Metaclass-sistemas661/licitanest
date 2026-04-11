-- =============================================================================
-- LICITANEST — 08. Cestas de Preços (core do sistema)
-- =============================================================================
-- Cestas, lotes, itens, preços, documentos comprobatórios, versões
-- Tenant via: cestas.secretaria_id → secretarias.municipio_id
-- =============================================================================

CREATE TABLE cestas (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    descricao_objeto    TEXT NOT NULL,
    data                DATE NOT NULL DEFAULT CURRENT_DATE,
    tipo_calculo        VARCHAR(20) NOT NULL DEFAULT 'media'
                        CHECK (tipo_calculo IN ('media', 'mediana', 'menor_preco')),
    tipo_correcao       VARCHAR(20) NOT NULL DEFAULT 'nenhuma'
                        CHECK (tipo_correcao IN ('ipca', 'igpm', 'nenhuma')),
    indice_correcao     VARCHAR(20),
    status              VARCHAR(20) NOT NULL DEFAULT 'rascunho'
                        CHECK (status IN ('rascunho', 'em_andamento', 'concluida', 'arquivada')),
    percentual_alerta   NUMERIC(5,2) NOT NULL DEFAULT 30.00,
    secretaria_id       UUID NOT NULL REFERENCES secretarias(id),
    criado_por          UUID NOT NULL REFERENCES servidores(id),
    concluida_em        TIMESTAMPTZ,
    data_base_correcao  DATE,
    correcao_aplicada_em TIMESTAMPTZ,
    -- Workflow (Fase 17)
    status_workflow     TEXT DEFAULT 'rascunho'
                        CHECK (status_workflow IN (
                            'rascunho', 'em_pesquisa', 'em_analise', 'aguardando_aprovacao',
                            'aprovada', 'devolvida', 'publicada', 'arquivada', 'expirada'
                        )),
    aprovador_id        UUID REFERENCES servidores(id),
    aprovada_em         TIMESTAMPTZ,
    publicada_em        TIMESTAMPTZ,
    validade_meses      INTEGER DEFAULT 6,
    expira_em           TIMESTAMPTZ,
    metodologia_calculo TEXT DEFAULT 'mediana'
                        CHECK (metodologia_calculo IN ('media', 'mediana', 'menor_preco', 'media_saneada')),
    bloqueada           BOOLEAN DEFAULT FALSE,
    numero_minimo_fontes INTEGER DEFAULT 3,
    fundamentacao_legal TEXT,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deletado_em         TIMESTAMPTZ
);

CREATE INDEX idx_cestas_secretaria ON cestas(secretaria_id) WHERE deletado_em IS NULL;
CREATE INDEX idx_cestas_status ON cestas(status) WHERE deletado_em IS NULL;
CREATE INDEX idx_cestas_criado_por ON cestas(criado_por);

CREATE TABLE lotes_cesta (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cesta_id        UUID NOT NULL REFERENCES cestas(id) ON DELETE CASCADE,
    numero          INTEGER NOT NULL,
    descricao       TEXT,
    ordem           INTEGER NOT NULL DEFAULT 0,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(cesta_id, numero)
);

CREATE INDEX idx_lotes_cesta ON lotes_cesta(cesta_id);

CREATE TABLE itens_cesta (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cesta_id        UUID NOT NULL REFERENCES cestas(id) ON DELETE CASCADE,
    produto_id      UUID NOT NULL REFERENCES produtos_catalogo(id),
    lote_id         UUID REFERENCES lotes_cesta(id),
    quantidade      NUMERIC(12,4) NOT NULL DEFAULT 1,
    ordem           INTEGER NOT NULL DEFAULT 0,
    menor_preco     NUMERIC(14,4),
    maior_preco     NUMERIC(14,4),
    media           NUMERIC(14,4),
    mediana         NUMERIC(14,4),
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_itens_cesta_cesta ON itens_cesta(cesta_id);
CREATE INDEX idx_itens_cesta_produto ON itens_cesta(produto_id);
CREATE INDEX idx_itens_cesta_lote ON itens_cesta(lote_id);

CREATE TABLE precos_item (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_cesta_id       UUID NOT NULL REFERENCES itens_cesta(id) ON DELETE CASCADE,
    fonte_id            UUID NOT NULL REFERENCES fontes(id),
    valor_unitario      NUMERIC(14,4) NOT NULL,
    valor_corrigido     NUMERIC(14,4),
    data_referencia     DATE NOT NULL,
    orgao               TEXT,
    cnpj_orgao          VARCHAR(18),
    descricao_fonte     TEXT,
    unidade_fonte       TEXT,
    documento_url       TEXT,
    excluido_calculo    BOOLEAN NOT NULL DEFAULT FALSE,
    justificativa_exclusao TEXT,
    excluido_por        UUID REFERENCES servidores(id),
    excluido_em         TIMESTAMPTZ,
    indice_correcao_tipo VARCHAR(10),
    data_base_correcao  DATE,
    fator_correcao      NUMERIC(12,8),
    corrigido_em        TIMESTAMPTZ,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_precos_item_cesta ON precos_item(item_cesta_id);
CREATE INDEX idx_precos_item_fonte ON precos_item(fonte_id);
CREATE INDEX idx_precos_item_data ON precos_item(data_referencia DESC);

CREATE TABLE documentos_comprobatorios (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    preco_item_id   UUID NOT NULL REFERENCES precos_item(id) ON DELETE CASCADE,
    nome_arquivo    TEXT NOT NULL,
    tipo_arquivo    VARCHAR(20) NOT NULL,
    tamanho_bytes   BIGINT,
    storage_path    TEXT NOT NULL,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documentos_preco ON documentos_comprobatorios(preco_item_id);

CREATE TABLE cestas_versoes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cesta_id        UUID NOT NULL REFERENCES cestas(id) ON DELETE CASCADE,
    versao          INTEGER NOT NULL,
    dados_snapshot  JSONB NOT NULL,
    alterado_por    UUID NOT NULL REFERENCES servidores(id),
    descricao       TEXT,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cestas_versoes_cesta ON cestas_versoes(cesta_id);
