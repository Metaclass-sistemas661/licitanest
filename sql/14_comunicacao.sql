-- =============================================================================
-- LICITANEST — 14. E-mails e Assinaturas Eletrônicas
-- =============================================================================
-- municipio_id adicionado em ambas tabelas para RLS multi-tenant
-- =============================================================================

CREATE TABLE emails_enviados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    municipio_id UUID NOT NULL REFERENCES municipios(id),
    tipo VARCHAR(50) NOT NULL,
    destinatario_email VARCHAR(320) NOT NULL,
    destinatario_nome VARCHAR(200),
    assunto VARCHAR(500) NOT NULL,
    corpo_html TEXT,
    corpo_texto TEXT,
    referencia_tipo VARCHAR(50),
    referencia_id UUID,
    provedor VARCHAR(30) DEFAULT 'resend',
    provedor_message_id VARCHAR(200),
    status VARCHAR(20) DEFAULT 'pendente',
    tentativas INTEGER DEFAULT 0,
    ultimo_erro TEXT,
    enviado_em TIMESTAMPTZ,
    entregue_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    criado_por UUID REFERENCES servidores(id)
);

CREATE INDEX idx_emails_tipo ON emails_enviados(tipo);
CREATE INDEX idx_emails_status ON emails_enviados(status);
CREATE INDEX idx_emails_referencia ON emails_enviados(referencia_tipo, referencia_id);
CREATE INDEX idx_emails_destinatario ON emails_enviados(destinatario_email);
CREATE INDEX idx_emails_municipio ON emails_enviados(municipio_id);

CREATE TABLE assinaturas_eletronicas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    municipio_id UUID NOT NULL REFERENCES municipios(id),
    tipo VARCHAR(30) NOT NULL,
    referencia_tipo VARCHAR(50) NOT NULL,
    referencia_id UUID NOT NULL,
    nome_assinante VARCHAR(200) NOT NULL,
    cpf_cnpj_assinante VARCHAR(20),
    email_assinante VARCHAR(320),
    ip_assinante VARCHAR(45),
    user_agent TEXT,
    hash_documento VARCHAR(128),
    dados_assinados JSONB,
    assinado_em TIMESTAMPTZ DEFAULT NOW(),
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assinaturas_referencia ON assinaturas_eletronicas(referencia_tipo, referencia_id);
CREATE INDEX idx_assinaturas_cpf ON assinaturas_eletronicas(cpf_cnpj_assinante);
CREATE INDEX idx_assinaturas_eletronicas_municipio ON assinaturas_eletronicas(municipio_id);

-- Assinaturas Digitais ICP-Brasil (Fase 11.2)
CREATE TABLE assinaturas_digitais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    municipio_id UUID NOT NULL REFERENCES municipios(id),
    referencia_tipo VARCHAR(50) NOT NULL,
    referencia_id UUID NOT NULL,
    tipo_assinatura VARCHAR(20) NOT NULL DEFAULT 'simples' CHECK (tipo_assinatura IN ('simples', 'icp-brasil')),
    hash_documento VARCHAR(128) NOT NULL,
    certificado_thumbprint VARCHAR(64),
    certificado_dados JSONB,
    assinatura_pkcs7 TEXT,
    cadeia_certificacao TEXT,
    cadeia_verificada BOOLEAN DEFAULT FALSE,
    nome_assinante VARCHAR(200) NOT NULL,
    cpf_cnpj_assinante VARCHAR(20) NOT NULL,
    servidor_id UUID REFERENCES servidores(id),
    ip_assinante VARCHAR(45),
    validado BOOLEAN DEFAULT FALSE,
    validado_em TIMESTAMPTZ,
    assinado_em TIMESTAMPTZ DEFAULT NOW(),
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assinaturas_digitais_ref ON assinaturas_digitais(referencia_tipo, referencia_id);
CREATE INDEX idx_assinaturas_digitais_municipio ON assinaturas_digitais(municipio_id);
CREATE INDEX idx_assinaturas_digitais_cpf ON assinaturas_digitais(cpf_cnpj_assinante);
