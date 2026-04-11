-- =============================================================================
-- LICITANEST — 18. Infraestrutura (FCM, Rate Limiting)
-- =============================================================================
-- dispositivos_fcm: municipio_id adicionado (user_id→usuarios não tem tenant)
-- =============================================================================

CREATE TABLE dispositivos_fcm (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    municipio_id    UUID NOT NULL REFERENCES municipios(id),
    token_fcm       TEXT NOT NULL UNIQUE,
    plataforma      VARCHAR(20) NOT NULL DEFAULT 'web',
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dispositivos_fcm_user ON dispositivos_fcm(user_id) WHERE ativo = TRUE;
CREATE INDEX idx_dispositivos_fcm_municipio ON dispositivos_fcm(municipio_id);

CREATE TABLE rate_limits (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chave       TEXT NOT NULL,
    recurso     TEXT NOT NULL DEFAULT '',
    user_id     UUID,
    contagem    INT NOT NULL DEFAULT 1,
    janela_inicio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    janela_fim  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 minute'),
    criado_em   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rate_limits_chave ON rate_limits(chave, janela_fim);
CREATE INDEX idx_rate_limits_chave_criado ON rate_limits(chave, criado_em DESC);
CREATE INDEX idx_rate_limits_criado ON rate_limits(criado_em);

-- Alertas do sistema (DLQ, monitoramento) — Fase 12
CREATE TABLE alertas_sistema (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo        VARCHAR(50) NOT NULL,
    severidade  VARCHAR(20) NOT NULL DEFAULT 'warning' CHECK (severidade IN ('info', 'warning', 'critical')),
    mensagem    TEXT NOT NULL,
    dados       JSONB,
    resolvido   BOOLEAN NOT NULL DEFAULT FALSE,
    resolvido_em TIMESTAMPTZ,
    resolvido_por UUID REFERENCES servidores(id),
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alertas_sistema_tipo ON alertas_sistema(tipo, criado_em DESC);
CREATE INDEX idx_alertas_sistema_pendentes ON alertas_sistema(resolvido, criado_em DESC) WHERE resolvido = FALSE;
