-- =============================================================================
-- LICITANEST — 16. Workflow, Conformidade e LGPD
-- =============================================================================
-- Tenant via cestas → secretarias (tramitações, checklist)
-- Tenant via servidores → secretarias (consentimentos, solicitações LGPD)
-- =============================================================================

CREATE TABLE tramitacoes_cesta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cesta_id UUID NOT NULL REFERENCES cestas(id) ON DELETE CASCADE,
    status_anterior TEXT NOT NULL,
    status_novo TEXT NOT NULL,
    servidor_id UUID NOT NULL REFERENCES servidores(id),
    observacoes TEXT,
    motivo_devolucao TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tramitacoes_cesta ON tramitacoes_cesta(cesta_id);
CREATE INDEX idx_tramitacoes_servidor ON tramitacoes_cesta(servidor_id);

CREATE TABLE checklist_conformidade (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cesta_id UUID NOT NULL REFERENCES cestas(id) ON DELETE CASCADE,
    verificado_por UUID REFERENCES servidores(id),
    verificado_em TIMESTAMPTZ,
    minimo_fontes_atendido BOOLEAN DEFAULT FALSE,
    diversidade_fontes BOOLEAN DEFAULT FALSE,
    prazo_precos_valido BOOLEAN DEFAULT FALSE,
    precos_dentro_validade BOOLEAN DEFAULT FALSE,
    outliers_tratados BOOLEAN DEFAULT FALSE,
    justificativa_exclusoes BOOLEAN DEFAULT FALSE,
    documentos_comprobatorios BOOLEAN DEFAULT FALSE,
    metodologia_definida BOOLEAN DEFAULT FALSE,
    fundamentacao_legal_presente BOOLEAN DEFAULT FALSE,
    assinaturas_presentes BOOLEAN DEFAULT FALSE,
    aprovado BOOLEAN DEFAULT FALSE,
    observacoes TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_checklist_cesta ON checklist_conformidade(cesta_id);

CREATE TABLE consentimentos_lgpd (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    servidor_id UUID NOT NULL REFERENCES servidores(id),
    tipo TEXT NOT NULL CHECK (tipo IN ('termos_uso', 'politica_privacidade', 'cookies', 'marketing')),
    aceito BOOLEAN NOT NULL DEFAULT FALSE,
    ip_address INET,
    user_agent TEXT,
    versao_documento TEXT NOT NULL DEFAULT '1.0',
    aceito_em TIMESTAMPTZ,
    revogado_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now(),
    UNIQUE (servidor_id, tipo)
);

CREATE INDEX idx_consentimentos_servidor ON consentimentos_lgpd(servidor_id);

CREATE TABLE solicitacoes_lgpd (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    servidor_id UUID NOT NULL REFERENCES servidores(id),
    tipo TEXT NOT NULL CHECK (tipo IN ('exclusao', 'portabilidade', 'retificacao', 'anonimizacao', 'revogacao')),
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'recusada')),
    descricao TEXT,
    resposta TEXT,
    respondido_por UUID REFERENCES servidores(id),
    respondido_em TIMESTAMPTZ,
    prazo_legal TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 days'),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
