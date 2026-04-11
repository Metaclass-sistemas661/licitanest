-- =============================================================================
-- LICITANEST — 10. Cotação Eletrônica
-- =============================================================================
-- Tenant via: cotacoes.cesta_id → cestas.secretaria_id → secretarias.municipio_id
-- =============================================================================

CREATE TABLE cotacoes (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cesta_id            UUID NOT NULL REFERENCES cestas(id),
    numero              SERIAL,
    titulo              TEXT NOT NULL,
    descricao           TEXT,
    data_abertura       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    data_encerramento   TIMESTAMPTZ NOT NULL,
    status              VARCHAR(30) NOT NULL DEFAULT 'rascunho'
                        CHECK (status IN ('rascunho','enviada','em_resposta','encerrada','cancelada')),
    criado_por          UUID NOT NULL REFERENCES servidores(id),
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deletado_em         TIMESTAMPTZ
);

CREATE INDEX idx_cotacoes_cesta ON cotacoes(cesta_id) WHERE deletado_em IS NULL;
CREATE INDEX idx_cotacoes_status ON cotacoes(status) WHERE deletado_em IS NULL;

CREATE TABLE cotacao_itens (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cotacao_id          UUID NOT NULL REFERENCES cotacoes(id) ON DELETE CASCADE,
    item_cesta_id       UUID NOT NULL REFERENCES itens_cesta(id),
    descricao_complementar TEXT,
    quantidade          NUMERIC(14,4) NOT NULL DEFAULT 1,
    unidade             VARCHAR(20),
    exige_anvisa        BOOLEAN NOT NULL DEFAULT FALSE,
    ordem               INTEGER NOT NULL DEFAULT 0,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cotacao_itens_cotacao ON cotacao_itens(cotacao_id);

CREATE TABLE cotacao_fornecedores (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cotacao_id          UUID NOT NULL REFERENCES cotacoes(id) ON DELETE CASCADE,
    fornecedor_id       UUID REFERENCES fornecedores(id),
    razao_social        TEXT NOT NULL,
    cpf_cnpj            VARCHAR(18),
    email               TEXT NOT NULL,
    telefone            VARCHAR(20),
    token_acesso        TEXT NOT NULL,
    token_expira_em     TIMESTAMPTZ NOT NULL,
    email_enviado       BOOLEAN NOT NULL DEFAULT FALSE,
    email_enviado_em    TIMESTAMPTZ,
    acessou_portal      BOOLEAN NOT NULL DEFAULT FALSE,
    acessou_em          TIMESTAMPTZ,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(cotacao_id, email)
);

CREATE INDEX idx_cotacao_fornecedores_cotacao ON cotacao_fornecedores(cotacao_id);
CREATE INDEX idx_cotacao_fornecedores_token ON cotacao_fornecedores(token_acesso);

CREATE TABLE respostas_cotacao (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cotacao_fornecedor_id   UUID NOT NULL REFERENCES cotacao_fornecedores(id) ON DELETE CASCADE,
    cotacao_item_id         UUID NOT NULL REFERENCES cotacao_itens(id) ON DELETE CASCADE,
    marca                   TEXT,
    valor_unitario          NUMERIC(14,4) NOT NULL,
    valor_total             NUMERIC(14,4),
    observacoes             TEXT,
    registro_anvisa         VARCHAR(30),
    endereco_completo       TEXT,
    cep                     VARCHAR(10),
    cidade                  VARCHAR(100),
    uf                      CHAR(2),
    prazo_validade_dias     INTEGER DEFAULT 60,
    nome_responsavel        TEXT,
    cpf_responsavel         VARCHAR(14),
    respondido_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    transferido_cesta       BOOLEAN NOT NULL DEFAULT FALSE,
    transferido_em          TIMESTAMPTZ,
    transferido_por         UUID REFERENCES servidores(id),
    UNIQUE(cotacao_fornecedor_id, cotacao_item_id)
);

CREATE INDEX idx_respostas_fornecedor ON respostas_cotacao(cotacao_fornecedor_id);
CREATE INDEX idx_respostas_item ON respostas_cotacao(cotacao_item_id);

CREATE TABLE cotacao_lancamentos_manuais (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cotacao_id          UUID NOT NULL REFERENCES cotacoes(id) ON DELETE CASCADE,
    item_cesta_id       UUID NOT NULL REFERENCES itens_cesta(id),
    razao_social        TEXT NOT NULL,
    cpf_cnpj            VARCHAR(18),
    email               VARCHAR(200),
    telefone            VARCHAR(20),
    marca               TEXT,
    valor_unitario      NUMERIC(14,4) NOT NULL,
    valor_total         NUMERIC(14,4),
    observacoes         TEXT,
    registro_anvisa     VARCHAR(30),
    meio_recebimento    VARCHAR(30) NOT NULL DEFAULT 'manual'
                        CHECK (meio_recebimento IN ('email','whatsapp','telefone','presencial','manual')),
    lancado_por         UUID NOT NULL REFERENCES servidores(id),
    lancado_em          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    transferido_cesta   BOOLEAN NOT NULL DEFAULT FALSE,
    transferido_em      TIMESTAMPTZ
);

CREATE INDEX idx_lancamentos_manuais_cotacao ON cotacao_lancamentos_manuais(cotacao_id);
