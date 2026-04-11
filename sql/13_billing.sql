-- =============================================================================
-- LICITANEST — 13. Billing e Assinaturas (Asaas)
-- =============================================================================
-- Tenant via: municipio_id direto em todas as tabelas
-- billing_eventos.municipio_id agora é NOT NULL (corrigido)
-- =============================================================================

CREATE TABLE planos (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome                    VARCHAR(30) NOT NULL UNIQUE,
    titulo                  TEXT NOT NULL,
    descricao               TEXT,
    preco_mensal            INTEGER NOT NULL DEFAULT 0,
    preco_anual             INTEGER NOT NULL DEFAULT 0,
    limite_usuarios         INTEGER NOT NULL DEFAULT 5,
    limite_cestas           INTEGER NOT NULL DEFAULT 10,
    limite_cotacoes_mes     INTEGER NOT NULL DEFAULT 20,
    funcionalidades         JSONB NOT NULL DEFAULT '[]',
    ativo                   BOOLEAN NOT NULL DEFAULT TRUE,
    asaas_price_id_mensal   TEXT,
    asaas_price_id_anual    TEXT,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE assinaturas (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    municipio_id            UUID NOT NULL REFERENCES municipios(id),
    plano_id                UUID NOT NULL REFERENCES planos(id),
    status                  VARCHAR(20) NOT NULL DEFAULT 'trial'
                            CHECK (status IN ('ativa','trial','cancelada','inadimplente','expirada')),
    intervalo               VARCHAR(10) NOT NULL DEFAULT 'mensal'
                            CHECK (intervalo IN ('mensal','anual')),
    inicio                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fim                     TIMESTAMPTZ,
    trial_fim               TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
    asaas_subscription_id   TEXT,
    asaas_customer_id       TEXT,
    valor_corrente          INTEGER NOT NULL DEFAULT 0,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancelado_em            TIMESTAMPTZ
);

CREATE INDEX idx_assinaturas_municipio ON assinaturas(municipio_id);
CREATE INDEX idx_assinaturas_status ON assinaturas(status);
CREATE INDEX idx_assinaturas_asaas_customer ON assinaturas(asaas_customer_id) WHERE asaas_customer_id IS NOT NULL;

CREATE TABLE faturas (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assinatura_id           UUID NOT NULL REFERENCES assinaturas(id),
    municipio_id            UUID NOT NULL REFERENCES municipios(id),
    numero                  TEXT NOT NULL,
    valor                   INTEGER NOT NULL,
    status                  VARCHAR(20) NOT NULL DEFAULT 'pendente'
                            CHECK (status IN ('pendente','paga','vencida','cancelada')),
    vencimento              DATE NOT NULL,
    pago_em                 TIMESTAMPTZ,
    asaas_payment_id        TEXT,
    url_boleto              TEXT,
    url_nf                  TEXT,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_faturas_assinatura ON faturas(assinatura_id);
CREATE INDEX idx_faturas_municipio ON faturas(municipio_id);
CREATE INDEX idx_faturas_status ON faturas(status);

CREATE TABLE metricas_uso_municipio (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    municipio_id            UUID NOT NULL REFERENCES municipios(id) UNIQUE,
    total_usuarios          INTEGER NOT NULL DEFAULT 0,
    total_cestas            INTEGER NOT NULL DEFAULT 0,
    total_cotacoes          INTEGER NOT NULL DEFAULT 0,
    total_produtos_catalogo INTEGER NOT NULL DEFAULT 0,
    cestas_ultimo_mes       INTEGER NOT NULL DEFAULT 0,
    cotacoes_ultimo_mes     INTEGER NOT NULL DEFAULT 0,
    ultimo_acesso           TIMESTAMPTZ,
    armazenamento_mb        NUMERIC(10,2) NOT NULL DEFAULT 0,
    atualizado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_metricas_municipio ON metricas_uso_municipio(municipio_id);

CREATE TABLE billing_eventos (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    municipio_id            UUID NOT NULL REFERENCES municipios(id),
    tipo                    VARCHAR(50) NOT NULL,
    payload                 JSONB NOT NULL DEFAULT '{}',
    asaas_event_id          TEXT,
    processado              BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_billing_eventos_tipo ON billing_eventos(tipo);
CREATE INDEX idx_billing_eventos_municipio ON billing_eventos(municipio_id);
