-- =============================================================================
-- LICITANEST — 31. Contratos Governamentais
-- =============================================================================
-- Migra o modelo de planos/assinaturas para contratos administrativos.
-- Adiciona flag superadmin e campo data_nascimento em servidores.
-- =============================================================================

-- ── 1. Flag SuperAdmin e data de nascimento em servidores ────────────────────

ALTER TABLE servidores ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE servidores ADD COLUMN IF NOT EXISTS data_nascimento DATE;

COMMENT ON COLUMN servidores.is_superadmin IS 'Flag para acesso ao painel SuperAdmin (apenas o desenvolvedor)';
COMMENT ON COLUMN servidores.data_nascimento IS 'Data de nascimento — usado na verificação de identidade para assinatura de contratos';

-- ── 2. Tabela de Contratos ──────────────────────────────────────────────────

CREATE TABLE contratos (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    municipio_id                UUID NOT NULL REFERENCES municipios(id) ON DELETE RESTRICT,

    -- Dados do contrato
    numero_contrato             VARCHAR(50) NOT NULL,
    objeto                      TEXT NOT NULL,
    valor_total                 INTEGER NOT NULL,               -- centavos (R$12.000 = 1200000)
    valor_mensal                INTEGER,                        -- parcela mensal em centavos
    quantidade_parcelas         INTEGER NOT NULL DEFAULT 1,

    -- Vigência
    data_inicio                 DATE NOT NULL,
    data_fim                    DATE NOT NULL,
    data_assinatura             DATE,

    -- Limites contratados
    limite_usuarios             INTEGER NOT NULL DEFAULT 999,
    limite_cestas               INTEGER NOT NULL DEFAULT 999,
    limite_cotacoes_mes         INTEGER NOT NULL DEFAULT 999,

    -- Status
    status                      VARCHAR(25) NOT NULL DEFAULT 'rascunho'
                                CHECK (status IN (
                                    'rascunho',
                                    'pendente_assinatura',
                                    'ativo',
                                    'suspenso',
                                    'encerrado',
                                    'cancelado',
                                    'renovacao'
                                )),

    -- Documentos PDF
    pdf_url                     TEXT,
    pdf_nome_arquivo            VARCHAR(255),
    pdf_tamanho_bytes           BIGINT,
    pdf_hash_sha256             VARCHAR(64),

    -- Conteúdo do editor rico (TipTap)
    conteudo_html               TEXT,
    conteudo_json               JSONB,

    -- Assinatura digital ICP-Brasil
    assinatura_digital_status   VARCHAR(20) DEFAULT 'pendente'
                                CHECK (assinatura_digital_status IN (
                                    'pendente', 'assinado', 'recusado', 'expirado'
                                )),
    assinatura_digital_certificado  JSONB,          -- dados do certificado X.509
    assinatura_digital_hash     VARCHAR(128),        -- hash do documento assinado
    assinatura_digital_em       TIMESTAMPTZ,         -- timestamp da assinatura
    assinatura_digital_por      UUID REFERENCES servidores(id),

    -- Responsável pela contratação (lado do município)
    responsavel_nome            VARCHAR(255),
    responsavel_cargo           VARCHAR(255),
    responsavel_cpf             VARCHAR(14),

    -- Referência ao processo licitatório
    numero_processo             VARCHAR(50),
    modalidade                  VARCHAR(50),

    observacoes                 TEXT,

    -- Auditoria
    criado_por                  UUID REFERENCES servidores(id),
    atualizado_por              UUID REFERENCES servidores(id),
    criado_em                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deletado_em                 TIMESTAMPTZ
);

-- Índices
CREATE INDEX idx_contratos_municipio ON contratos(municipio_id);
CREATE INDEX idx_contratos_status ON contratos(status);
CREATE INDEX idx_contratos_vigencia ON contratos(data_inicio, data_fim);
CREATE INDEX idx_contratos_numero ON contratos(numero_contrato);
CREATE INDEX idx_contratos_assinatura_digital ON contratos(assinatura_digital_status);

-- RLS
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos FORCE ROW LEVEL SECURITY;
CREATE POLICY contratos_tenant ON contratos
    USING (municipio_id = current_setting('app.current_municipio_id', true)::uuid)
    WITH CHECK (municipio_id = current_setting('app.current_municipio_id', true)::uuid);

-- Trigger: atualizar timestamp
CREATE TRIGGER trg_contratos_updated BEFORE UPDATE ON contratos
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

-- Trigger: auditoria
CREATE TRIGGER trg_audit_contratos AFTER INSERT OR UPDATE OR DELETE ON contratos
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ── 3. Tabela de Aditivos ───────────────────────────────────────────────────

CREATE TABLE contratos_aditivos (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contrato_id         UUID NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,

    numero_aditivo      VARCHAR(50) NOT NULL,
    tipo                VARCHAR(30) NOT NULL
                        CHECK (tipo IN ('valor', 'prazo', 'objeto', 'misto')),
    descricao           TEXT NOT NULL,

    -- Alterações
    valor_acrescimo     INTEGER DEFAULT 0,              -- centavos (+/-)
    nova_data_fim       DATE,
    novos_limites       JSONB,

    -- Documento
    pdf_url             TEXT,
    pdf_nome_arquivo    VARCHAR(255),

    data_assinatura     DATE,
    criado_por          UUID REFERENCES servidores(id),
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_aditivos_contrato ON contratos_aditivos(contrato_id);

-- ── 4. Tabela de Histórico de Contratos (Audit Trail) ───────────────────────

CREATE TABLE contratos_historico (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contrato_id         UUID NOT NULL REFERENCES contratos(id),
    acao                VARCHAR(30) NOT NULL,
    campo_alterado      VARCHAR(100),
    valor_anterior      TEXT,
    valor_novo          TEXT,
    usuario_id          UUID REFERENCES servidores(id),
    ip_address          INET,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contratos_hist_contrato ON contratos_historico(contrato_id);
CREATE INDEX idx_contratos_hist_acao ON contratos_historico(acao);

-- ── 5. Tabela de Notificações de Contratos ──────────────────────────────────

CREATE TABLE contratos_notificacoes (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contrato_id         UUID NOT NULL REFERENCES contratos(id),
    municipio_id        UUID NOT NULL REFERENCES municipios(id),
    servidor_id         UUID NOT NULL REFERENCES servidores(id),

    tipo                VARCHAR(30) NOT NULL
                        CHECK (tipo IN (
                            'novo_contrato',
                            'aditivo',
                            'vencimento_proximo',
                            'documento_assinado'
                        )),
    titulo              TEXT NOT NULL,
    mensagem            TEXT,
    lido                BOOLEAN NOT NULL DEFAULT FALSE,
    lido_em             TIMESTAMPTZ,

    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contratos_notif_municipio ON contratos_notificacoes(municipio_id);
CREATE INDEX idx_contratos_notif_servidor ON contratos_notificacoes(servidor_id);
CREATE INDEX idx_contratos_notif_lido ON contratos_notificacoes(lido) WHERE lido = FALSE;

-- RLS para notificações (município vê apenas suas notificações)
ALTER TABLE contratos_notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos_notificacoes FORCE ROW LEVEL SECURITY;
CREATE POLICY contratos_notificacoes_tenant ON contratos_notificacoes
    USING (municipio_id = current_setting('app.current_municipio_id', true)::uuid)
    WITH CHECK (municipio_id = current_setting('app.current_municipio_id', true)::uuid);

-- ── 6. Reestruturação de Faturas ────────────────────────────────────────────
-- Adiciona contrato_id e parcela. Mantém assinatura_id para retrocompatibilidade.

ALTER TABLE faturas ADD COLUMN IF NOT EXISTS contrato_id UUID REFERENCES contratos(id);
ALTER TABLE faturas ADD COLUMN IF NOT EXISTS parcela INTEGER DEFAULT 1;
ALTER TABLE faturas ADD COLUMN IF NOT EXISTS comprovante_url TEXT;
ALTER TABLE faturas ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE faturas ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Tornar assinatura_id opcional (para novas faturas vinculadas a contrato)
ALTER TABLE faturas ALTER COLUMN assinatura_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_faturas_contrato ON faturas(contrato_id) WHERE contrato_id IS NOT NULL;

-- ── 7. Comentários finais ───────────────────────────────────────────────────

COMMENT ON TABLE contratos IS 'Contratos administrativos entre a plataforma e os municípios';
COMMENT ON TABLE contratos_aditivos IS 'Termos aditivos dos contratos (prazo, valor, objeto)';
COMMENT ON TABLE contratos_historico IS 'Audit trail de todas as alterações em contratos';
COMMENT ON TABLE contratos_notificacoes IS 'Notificações enviadas aos municípios sobre contratos';
