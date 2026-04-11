-- =============================================================================
-- LICITANEST — Schema Consolidado para Google Cloud SQL (PostgreSQL 15)
-- Gerado a partir de 21 migrations Supabase, sem dependências Supabase
-- Data: Abril/2026
-- =============================================================================
-- Conformidade: Lei 14.133/2021, Decreto 11.462/2023, IN SEGES 65/2021, LGPD
-- =============================================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- =============================================================================
-- 0. TABELA DE USUÁRIOS (substitui auth.users do Supabase)
-- =============================================================================

CREATE TABLE usuarios (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firebase_uid    TEXT UNIQUE NOT NULL,
    email           TEXT NOT NULL UNIQUE,
    nome            TEXT,
    avatar_url      TEXT,
    email_verificado BOOLEAN NOT NULL DEFAULT FALSE,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_login    TIMESTAMPTZ,
    cpf             VARCHAR(14) UNIQUE,
    nivel_govbr     VARCHAR(10),
    provedor        VARCHAR(20) DEFAULT 'email',
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deletado_em     TIMESTAMPTZ
);

CREATE INDEX idx_usuarios_firebase ON usuarios(firebase_uid);
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_cpf ON usuarios(cpf) WHERE cpf IS NOT NULL;

-- =============================================================================
-- 1. TABELAS DE ADMINISTRAÇÃO E ACESSO
-- =============================================================================

CREATE TABLE municipios (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome            TEXT NOT NULL,
    uf              CHAR(2) NOT NULL DEFAULT 'MG',
    codigo_ibge     VARCHAR(7) UNIQUE,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deletado_em     TIMESTAMPTZ
);

CREATE TABLE secretarias (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome            TEXT NOT NULL,
    sigla           VARCHAR(20),
    municipio_id    UUID NOT NULL REFERENCES municipios(id),
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deletado_em     TIMESTAMPTZ
);

CREATE INDEX idx_secretarias_municipio ON secretarias(municipio_id) WHERE deletado_em IS NULL;

CREATE TABLE perfis (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome            VARCHAR(50) NOT NULL UNIQUE,
    descricao       TEXT,
    permissoes      JSONB NOT NULL DEFAULT '{}',
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE servidores (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID UNIQUE REFERENCES usuarios(id),
    nome            TEXT NOT NULL,
    email           TEXT NOT NULL UNIQUE,
    cpf             VARCHAR(14) UNIQUE,
    matricula       VARCHAR(50),
    perfil_id       UUID NOT NULL REFERENCES perfis(id),
    secretaria_id   UUID NOT NULL REFERENCES secretarias(id),
    telefone        VARCHAR(20),
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_acesso   TIMESTAMPTZ,
    totp_secret     TEXT,
    totp_ativado    BOOLEAN DEFAULT FALSE,
    totp_ativado_em TIMESTAMPTZ,
    totp_recovery_codes TEXT,
    ultimo_ip       INET,
    ultimo_user_agent TEXT,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deletado_em     TIMESTAMPTZ
);

CREATE INDEX idx_servidores_secretaria ON servidores(secretaria_id) WHERE deletado_em IS NULL;
CREATE INDEX idx_servidores_perfil ON servidores(perfil_id);
CREATE INDEX idx_servidores_user ON servidores(user_id);
CREATE INDEX idx_servidores_user_active ON servidores(user_id, secretaria_id) WHERE deletado_em IS NULL;

CREATE TABLE cidades_regiao (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome            TEXT NOT NULL,
    uf              CHAR(2) NOT NULL DEFAULT 'MG',
    codigo_ibge     VARCHAR(7),
    municipio_id    UUID NOT NULL REFERENCES municipios(id),
    distancia_km    NUMERIC(8,2),
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deletado_em     TIMESTAMPTZ
);

CREATE INDEX idx_cidades_regiao_municipio ON cidades_regiao(municipio_id) WHERE deletado_em IS NULL;

CREATE TABLE audit_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    servidor_id     UUID REFERENCES servidores(id),
    acao            VARCHAR(50) NOT NULL,
    tabela          VARCHAR(100),
    registro_id     TEXT,
    dados_anteriores JSONB,
    dados_novos     JSONB,
    ip_address      TEXT,
    user_agent      TEXT,
    hash            TEXT,
    hash_anterior   TEXT,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_servidor ON audit_log(servidor_id);
CREATE INDEX idx_audit_log_acao ON audit_log(acao);
CREATE INDEX idx_audit_log_tabela ON audit_log(tabela, registro_id);
CREATE INDEX idx_audit_log_criado ON audit_log(criado_em DESC);
CREATE INDEX idx_audit_log_servidor_criado ON audit_log(servidor_id, criado_em DESC);

-- =============================================================================
-- 2. CATÁLOGO PADRONIZADO DE PRODUTOS E SERVIÇOS
-- =============================================================================

CREATE TABLE categorias (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome            TEXT NOT NULL UNIQUE,
    descricao       TEXT,
    icone           VARCHAR(50),
    ordem           INTEGER NOT NULL DEFAULT 0,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deletado_em     TIMESTAMPTZ
);

CREATE TABLE unidades_medida (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sigla           VARCHAR(20) NOT NULL UNIQUE,
    descricao       TEXT NOT NULL,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE elementos_despesa (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo          VARCHAR(20) NOT NULL UNIQUE,
    descricao       TEXT NOT NULL,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE catmat_catser (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo          TEXT NOT NULL,
    descricao       TEXT NOT NULL,
    tipo            TEXT NOT NULL CHECK (tipo IN ('material', 'servico')),
    grupo           TEXT,
    classe          TEXT,
    padrao_descritivo TEXT,
    unidade_fornecimento TEXT,
    sustentavel     BOOLEAN DEFAULT FALSE,
    ativo           BOOLEAN DEFAULT TRUE,
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_catmat_codigo ON catmat_catser(codigo);
CREATE INDEX idx_catmat_tipo ON catmat_catser(tipo);
CREATE INDEX idx_catmat_descricao_trgm ON catmat_catser USING gin(descricao gin_trgm_ops);

CREATE TABLE produtos_catalogo (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    descricao           TEXT NOT NULL,
    descricao_detalhada TEXT,
    categoria_id        UUID NOT NULL REFERENCES categorias(id),
    unidade_medida_id   UUID NOT NULL REFERENCES unidades_medida(id),
    elemento_despesa_id UUID REFERENCES elementos_despesa(id),
    codigo_catmat       VARCHAR(30),
    catmat_catser_id    UUID REFERENCES catmat_catser(id),
    ativo               BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deletado_em         TIMESTAMPTZ
);

CREATE INDEX idx_produtos_catalogo_categoria ON produtos_catalogo(categoria_id) WHERE deletado_em IS NULL;
CREATE INDEX idx_produtos_catalogo_elemento ON produtos_catalogo(elemento_despesa_id) WHERE deletado_em IS NULL;
CREATE INDEX idx_produtos_catalogo_descricao ON produtos_catalogo USING GIN (descricao gin_trgm_ops);

CREATE TABLE solicitacoes_catalogo (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    descricao           TEXT NOT NULL,
    justificativa       TEXT,
    categoria_id        UUID REFERENCES categorias(id),
    unidade_medida_id   UUID REFERENCES unidades_medida(id),
    solicitante_id      UUID NOT NULL REFERENCES servidores(id),
    status              VARCHAR(20) NOT NULL DEFAULT 'pendente'
                        CHECK (status IN ('pendente', 'aprovada', 'recusada')),
    resposta            TEXT,
    produto_criado_id   UUID REFERENCES produtos_catalogo(id),
    respondido_por      UUID REFERENCES servidores(id),
    respondido_em       TIMESTAMPTZ,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_solicitacoes_status ON solicitacoes_catalogo(status);
CREATE INDEX idx_solicitacoes_solicitante ON solicitacoes_catalogo(solicitante_id);

-- =============================================================================
-- 3. FORNECEDORES
-- =============================================================================

CREATE TABLE fornecedores (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cpf_cnpj        VARCHAR(18) NOT NULL,
    razao_social    TEXT NOT NULL,
    nome_fantasia   TEXT,
    rua             TEXT,
    numero          VARCHAR(20),
    complemento     TEXT,
    bairro          TEXT,
    cep             VARCHAR(10),
    cidade          TEXT,
    uf              CHAR(2),
    telefone        VARCHAR(20),
    email           TEXT,
    municipio_id    UUID NOT NULL REFERENCES municipios(id),
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deletado_em     TIMESTAMPTZ,
    UNIQUE(cpf_cnpj, municipio_id)
);

CREATE INDEX idx_fornecedores_cpf_cnpj ON fornecedores(cpf_cnpj);
CREATE INDEX idx_fornecedores_municipio ON fornecedores(municipio_id) WHERE deletado_em IS NULL;
CREATE INDEX idx_fornecedores_razao ON fornecedores USING GIN (razao_social gin_trgm_ops);

-- =============================================================================
-- 4. FONTES DE PREÇOS
-- =============================================================================

CREATE TABLE fontes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome            TEXT NOT NULL,
    sigla           VARCHAR(30) NOT NULL UNIQUE,
    tipo            VARCHAR(30) NOT NULL
                    CHECK (tipo IN (
                        'pncp', 'painel_precos', 'tce_mg', 'bps',
                        'sinapi', 'conab', 'ceasa', 'cmed',
                        'transparencia', 'diario_oficial', 'cotacao_direta'
                    )),
    url_base        TEXT,
    descricao       TEXT,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 5. CESTAS DE PREÇOS (CORE)
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
    -- Campos de correção monetária
    data_base_correcao  DATE,
    correcao_aplicada_em TIMESTAMPTZ,
    -- Campos de workflow (Fase 17)
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
    -- Campos de correção monetária
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

-- =============================================================================
-- 6. DADOS DAS FONTES DE PREÇOS (CRAWLERS)
-- =============================================================================

CREATE TABLE dados_fonte_pncp (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    orgao               TEXT NOT NULL,
    cnpj_orgao          VARCHAR(18),
    uf_orgao            CHAR(2),
    cidade_orgao        TEXT,
    descricao_item      TEXT NOT NULL,
    unidade             TEXT,
    quantidade          NUMERIC(14,4),
    valor_unitario      NUMERIC(14,4) NOT NULL,
    valor_total         NUMERIC(14,4),
    data_homologacao    DATE,
    numero_contrato     TEXT,
    modalidade          TEXT,
    documento_url       TEXT,
    codigo_item         TEXT,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pncp_descricao ON dados_fonte_pncp USING GIN (descricao_item gin_trgm_ops);
CREATE INDEX idx_pncp_data ON dados_fonte_pncp(data_homologacao DESC);
CREATE INDEX idx_pncp_uf ON dados_fonte_pncp(uf_orgao);

CREATE TABLE dados_fonte_painel (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    orgao               TEXT NOT NULL,
    descricao_item      TEXT NOT NULL,
    unidade             TEXT,
    valor_unitario      NUMERIC(14,4) NOT NULL,
    data_compra         DATE,
    modalidade          TEXT,
    numero_processo     TEXT,
    documento_url       TEXT,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_painel_descricao ON dados_fonte_painel USING GIN (descricao_item gin_trgm_ops);
CREATE INDEX idx_painel_data ON dados_fonte_painel(data_compra DESC);

CREATE TABLE dados_fonte_tce (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    orgao               TEXT NOT NULL,
    municipio           TEXT,
    descricao_item      TEXT NOT NULL,
    unidade             TEXT,
    valor_unitario      NUMERIC(14,4) NOT NULL,
    data_contrato       DATE,
    numero_contrato     TEXT,
    documento_url       TEXT,
    uf                  VARCHAR(2) NOT NULL DEFAULT 'MG',
    fonte_tce           VARCHAR(20) NOT NULL DEFAULT 'TCE/MG',
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tce_descricao ON dados_fonte_tce USING GIN (descricao_item gin_trgm_ops);
CREATE INDEX idx_tce_municipio ON dados_fonte_tce(municipio);
CREATE INDEX idx_tce_uf ON dados_fonte_tce(uf);
CREATE INDEX idx_tce_fonte ON dados_fonte_tce(fonte_tce);

CREATE TABLE dados_fonte_bps (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_br           VARCHAR(30),
    descricao_item      TEXT NOT NULL,
    apresentacao        TEXT,
    unidade             TEXT,
    valor_unitario      NUMERIC(14,4) NOT NULL,
    quantidade          NUMERIC(14,4),
    instituicao         TEXT,
    uf                  CHAR(2),
    data_compra         DATE,
    modalidade          TEXT,
    media_ponderada     NUMERIC(14,4),
    total_registros_consulta INTEGER,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bps_codigo ON dados_fonte_bps(codigo_br);
CREATE INDEX idx_bps_descricao ON dados_fonte_bps USING GIN (descricao_item gin_trgm_ops);
CREATE INDEX idx_bps_codigo_data ON dados_fonte_bps(codigo_br, data_compra DESC);
CREATE INDEX idx_bps_uf ON dados_fonte_bps(uf);
CREATE INDEX idx_bps_instituicao ON dados_fonte_bps USING GIN (instituicao gin_trgm_ops);

CREATE TABLE dados_fonte_sinapi (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_sinapi       VARCHAR(20) NOT NULL,
    descricao_item      TEXT NOT NULL,
    unidade             TEXT,
    valor_unitario      NUMERIC(14,4) NOT NULL,
    uf                  CHAR(2) NOT NULL DEFAULT 'MG',
    mes_referencia      DATE NOT NULL,
    tipo                VARCHAR(20),
    desonerado          BOOLEAN NOT NULL DEFAULT FALSE,
    origem              VARCHAR(20) DEFAULT 'CEF',
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sinapi_codigo ON dados_fonte_sinapi(codigo_sinapi);
CREATE INDEX idx_sinapi_descricao ON dados_fonte_sinapi USING GIN (descricao_item gin_trgm_ops);
CREATE INDEX idx_sinapi_mes ON dados_fonte_sinapi(mes_referencia DESC);
CREATE INDEX idx_sinapi_codigo_uf_mes ON dados_fonte_sinapi(codigo_sinapi, uf, mes_referencia DESC);
CREATE INDEX idx_sinapi_tipo ON dados_fonte_sinapi(tipo);
CREATE INDEX idx_sinapi_uf ON dados_fonte_sinapi(uf);

CREATE TABLE dados_fonte_conab (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    descricao_item      TEXT NOT NULL,
    unidade             TEXT,
    valor_unitario      NUMERIC(14,4) NOT NULL,
    cidade              TEXT,
    uf                  CHAR(2) NOT NULL DEFAULT 'MG',
    data_referencia     DATE NOT NULL,
    tipo_produto        VARCHAR(50),
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conab_descricao ON dados_fonte_conab USING GIN (descricao_item gin_trgm_ops);
CREATE INDEX idx_conab_data ON dados_fonte_conab(data_referencia DESC);
CREATE INDEX idx_conab_cidade ON dados_fonte_conab(cidade);
CREATE INDEX idx_conab_uf ON dados_fonte_conab(uf);

CREATE TABLE dados_fonte_ceasa (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    descricao_item      TEXT NOT NULL,
    variedade           TEXT,
    unidade             TEXT,
    valor_minimo        NUMERIC(14,4),
    valor_maximo        NUMERIC(14,4),
    valor_comum         NUMERIC(14,4) NOT NULL,
    data_cotacao        DATE NOT NULL,
    turno               VARCHAR(20),
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ceasa_descricao ON dados_fonte_ceasa USING GIN (descricao_item gin_trgm_ops);
CREATE INDEX idx_ceasa_data ON dados_fonte_ceasa(data_cotacao DESC);
CREATE INDEX idx_ceasa_variedade ON dados_fonte_ceasa USING GIN (variedade gin_trgm_ops);

CREATE TABLE dados_fonte_cmed (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registro_anvisa         VARCHAR(20),
    principio_ativo         TEXT NOT NULL,
    descricao_produto       TEXT NOT NULL,
    apresentacao            TEXT,
    laboratorio             TEXT,
    ean                     VARCHAR(20),
    pmvg_sem_impostos       NUMERIC(14,4),
    pmvg_com_impostos       NUMERIC(14,4),
    pmc                     NUMERIC(14,4),
    icms_0                  NUMERIC(14,4),
    lista_concessao         TEXT,
    data_publicacao         DATE,
    tipo_produto            VARCHAR(30),
    regime_preco            VARCHAR(30),
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cmed_registro ON dados_fonte_cmed(registro_anvisa);
CREATE INDEX idx_cmed_principio ON dados_fonte_cmed USING GIN (principio_ativo gin_trgm_ops);
CREATE INDEX idx_cmed_descricao ON dados_fonte_cmed USING GIN (descricao_produto gin_trgm_ops);
CREATE INDEX idx_cmed_laboratorio ON dados_fonte_cmed USING GIN (laboratorio gin_trgm_ops);
CREATE INDEX idx_cmed_ean ON dados_fonte_cmed(ean);
CREATE INDEX idx_cmed_data ON dados_fonte_cmed(data_publicacao DESC);

CREATE TABLE execucoes_crawler (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fonte_id            UUID NOT NULL REFERENCES fontes(id),
    status              VARCHAR(20) NOT NULL DEFAULT 'executando'
                        CHECK (status IN ('executando', 'sucesso', 'falha', 'parcial')),
    itens_processados   INTEGER DEFAULT 0,
    itens_novos         INTEGER DEFAULT 0,
    itens_atualizados   INTEGER DEFAULT 0,
    erro_mensagem       TEXT,
    iniciado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finalizado_em       TIMESTAMPTZ,
    duracao_segundos    INTEGER
);

CREATE INDEX idx_execucoes_fonte ON execucoes_crawler(fonte_id);
CREATE INDEX idx_execucoes_status ON execucoes_crawler(status);

CREATE TABLE cache_consultas (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fonte_tipo          VARCHAR(30) NOT NULL,
    chave_consulta      TEXT NOT NULL,
    resultado           JSONB,
    consultado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expira_em           TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
    UNIQUE(fonte_tipo, chave_consulta)
);

CREATE INDEX idx_cache_expira ON cache_consultas(expira_em);

-- =============================================================================
-- 7. CORREÇÃO MONETÁRIA
-- =============================================================================

CREATE TABLE indices_correcao (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo            VARCHAR(10) NOT NULL CHECK (tipo IN ('ipca', 'igpm')),
    ano             INTEGER NOT NULL,
    mes             INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
    valor           NUMERIC(12,8) NOT NULL,
    acumulado_12m   NUMERIC(12,8),
    fonte           TEXT,
    importado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tipo, ano, mes)
);

CREATE INDEX idx_indices_tipo_periodo ON indices_correcao(tipo, ano DESC, mes DESC);
CREATE INDEX idx_indices_tipo ON indices_correcao(tipo);

CREATE TABLE log_importacao_indices (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo            VARCHAR(10) NOT NULL,
    registros_importados INTEGER NOT NULL DEFAULT 0,
    periodo_inicio  TEXT,
    periodo_fim     TEXT,
    fonte_url       TEXT,
    erro            TEXT,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE indices_atualizacoes_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    indice          VARCHAR(20) NOT NULL,
    mes_referencia  VARCHAR(7) NOT NULL,
    valor_anterior  NUMERIC(12,6),
    valor_novo      NUMERIC(12,6) NOT NULL,
    fonte_url       VARCHAR(500),
    metodo          VARCHAR(30) DEFAULT 'cloud_function',
    sucesso         BOOLEAN DEFAULT TRUE,
    erro            TEXT,
    executado_em    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_indices_log_mes ON indices_atualizacoes_log(indice, mes_referencia);

-- =============================================================================
-- 8. COTAÇÃO ELETRÔNICA
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

-- =============================================================================
-- 9. DASHBOARD E ATIVIDADES
-- =============================================================================

CREATE TABLE atividades (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    servidor_id     UUID REFERENCES servidores(id),
    secretaria_id   UUID REFERENCES secretarias(id),
    tipo            TEXT NOT NULL CHECK (tipo IN (
        'cesta_criada', 'cesta_concluida', 'cesta_arquivada',
        'item_adicionado', 'item_removido',
        'preco_adicionado', 'preco_excluido', 'preco_reincluido',
        'cotacao_criada', 'cotacao_enviada', 'cotacao_respondida',
        'correcao_aplicada',
        'catalogo_produto_criado', 'catalogo_solicitacao',
        'relatorio_gerado'
    )),
    descricao       TEXT NOT NULL,
    entidade_tipo   TEXT,
    entidade_id     UUID,
    dados_extra     JSONB,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_atividades_servidor ON atividades(servidor_id);
CREATE INDEX idx_atividades_secretaria ON atividades(secretaria_id);
CREATE INDEX idx_atividades_criado ON atividades(criado_em DESC);
CREATE INDEX idx_atividades_tipo ON atividades(tipo);

-- =============================================================================
-- 10. RELATÓRIOS
-- =============================================================================

CREATE TABLE relatorios_gerados (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cesta_id      UUID NOT NULL REFERENCES cestas(id) ON DELETE CASCADE,
    tipo          TEXT NOT NULL CHECK (tipo IN ('mapa_apuracao', 'fontes_precos', 'correcao_monetaria')),
    formato       TEXT NOT NULL CHECK (formato IN ('pdf', 'xlsx')),
    nome_arquivo  TEXT NOT NULL,
    storage_path  TEXT,
    tamanho_bytes BIGINT,
    gerado_por    UUID NOT NULL REFERENCES servidores(id),
    gerado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_relatorios_gerados_cesta ON relatorios_gerados(cesta_id);
CREATE INDEX idx_relatorios_gerados_servidor ON relatorios_gerados(gerado_por);
CREATE INDEX idx_relatorios_gerados_data ON relatorios_gerados(gerado_em DESC);

-- =============================================================================
-- 11. MULTI-TENANCY E BILLING (ASAAS)
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
    municipio_id            UUID REFERENCES municipios(id),
    tipo                    VARCHAR(50) NOT NULL,
    payload                 JSONB NOT NULL DEFAULT '{}',
    asaas_event_id          TEXT,
    processado              BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_billing_eventos_tipo ON billing_eventos(tipo);

-- =============================================================================
-- 12. EMAILS, ASSINATURAS ELETRÔNICAS, API KEYS
-- =============================================================================

CREATE TABLE emails_enviados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE TABLE assinaturas_eletronicas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    municipio_id UUID NOT NULL REFERENCES municipios(id),
    nome VARCHAR(100) NOT NULL,
    chave_hash VARCHAR(128) NOT NULL,
    prefixo VARCHAR(12) NOT NULL,
    permissoes JSONB DEFAULT '["leitura"]',
    rate_limit_rpm INTEGER DEFAULT 60,
    ativo BOOLEAN DEFAULT TRUE,
    ultimo_uso_em TIMESTAMPTZ,
    total_requisicoes BIGINT DEFAULT 0,
    expira_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    criado_por UUID REFERENCES servidores(id),
    revogado_em TIMESTAMPTZ,
    revogado_por UUID REFERENCES servidores(id)
);

CREATE INDEX idx_api_keys_municipio ON api_keys(municipio_id);
CREATE INDEX idx_api_keys_prefixo ON api_keys(prefixo);
CREATE INDEX idx_api_keys_chave ON api_keys(chave_hash);

CREATE TABLE api_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID REFERENCES api_keys(id),
    metodo VARCHAR(10) NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    status_code INTEGER,
    ip VARCHAR(45),
    user_agent TEXT,
    latencia_ms INTEGER,
    request_body JSONB,
    response_resumo VARCHAR(200),
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_log_key ON api_log(api_key_id);
CREATE INDEX idx_api_log_endpoint ON api_log(endpoint);
CREATE INDEX idx_api_log_data ON api_log(criado_em DESC);

-- =============================================================================
-- 13. WORKFLOW, LGPD, IMPORTAÇÃO, IA
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

CREATE TABLE importacoes_lote (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cesta_id UUID REFERENCES cestas(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('precos', 'produtos', 'catmat', 'fornecedores', 'arp')),
    nome_arquivo TEXT NOT NULL,
    tamanho_bytes BIGINT,
    total_linhas INTEGER DEFAULT 0,
    linhas_importadas INTEGER DEFAULT 0,
    linhas_erro INTEGER DEFAULT 0,
    erros JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'processando' CHECK (status IN ('processando', 'concluida', 'parcial', 'falhou')),
    importado_por UUID NOT NULL REFERENCES servidores(id),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    finalizado_em TIMESTAMPTZ
);

CREATE TABLE interacoes_ia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    servidor_id UUID NOT NULL REFERENCES servidores(id),
    tipo TEXT NOT NULL CHECK (tipo IN ('sugestao_fonte', 'analise_preco', 'texto_justificativa', 'pesquisa_natural', 'memorial_calculo')),
    prompt TEXT NOT NULL,
    resposta TEXT,
    modelo TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
    tokens_input INTEGER,
    tokens_output INTEGER,
    custo_estimado NUMERIC(10,6),
    duracao_ms INTEGER,
    avaliacao_usuario INTEGER CHECK (avaliacao_usuario BETWEEN 1 AND 5),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_interacoes_ia_servidor ON interacoes_ia(servidor_id);

-- =============================================================================
-- 14. DISPOSITIVOS FCM E RATE LIMITING
-- =============================================================================

CREATE TABLE dispositivos_fcm (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_fcm       TEXT NOT NULL UNIQUE,
    plataforma      VARCHAR(20) NOT NULL DEFAULT 'web',
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dispositivos_fcm_user ON dispositivos_fcm(user_id) WHERE ativo = TRUE;

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

-- =============================================================================
-- 15. FUNÇÕES AUXILIARES
-- =============================================================================

-- Atualizar timestamp automaticamente
CREATE OR REPLACE FUNCTION atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers de timestamp
CREATE TRIGGER trg_usuarios_updated BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();
CREATE TRIGGER trg_municipios_updated BEFORE UPDATE ON municipios
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();
CREATE TRIGGER trg_secretarias_updated BEFORE UPDATE ON secretarias
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();
CREATE TRIGGER trg_servidores_updated BEFORE UPDATE ON servidores
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();
CREATE TRIGGER trg_produtos_catalogo_updated BEFORE UPDATE ON produtos_catalogo
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();
CREATE TRIGGER trg_fornecedores_updated BEFORE UPDATE ON fornecedores
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();
CREATE TRIGGER trg_cestas_updated BEFORE UPDATE ON cestas
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();
CREATE TRIGGER trg_itens_cesta_updated BEFORE UPDATE ON itens_cesta
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();
CREATE TRIGGER trg_cotacoes_updated BEFORE UPDATE ON cotacoes
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();
CREATE TRIGGER trg_dispositivos_fcm_updated BEFORE UPDATE ON dispositivos_fcm
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

-- Busca no catálogo sem acentos
CREATE OR REPLACE FUNCTION buscar_catalogo(termo TEXT, limite INTEGER DEFAULT 50, pagina INTEGER DEFAULT 1)
RETURNS SETOF produtos_catalogo AS $$
BEGIN
    RETURN QUERY
    SELECT p.*
    FROM produtos_catalogo p
    WHERE p.deletado_em IS NULL
      AND p.ativo = TRUE
      AND (
          unaccent(lower(p.descricao)) ILIKE '%' || unaccent(lower(termo)) || '%'
          OR p.descricao % termo
      )
    ORDER BY similarity(p.descricao, termo) DESC
    LIMIT limite
    OFFSET (pagina - 1) * limite;
END;
$$ LANGUAGE plpgsql STABLE;

-- Calcular estatísticas de preço de um item
CREATE OR REPLACE FUNCTION calcular_estatisticas_item(p_item_cesta_id UUID)
RETURNS TABLE(menor NUMERIC, maior NUMERIC, media NUMERIC, mediana NUMERIC, total_fontes BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT
        MIN(pi.valor_unitario)::NUMERIC AS menor,
        MAX(pi.valor_unitario)::NUMERIC AS maior,
        AVG(pi.valor_unitario)::NUMERIC AS media,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY pi.valor_unitario)::NUMERIC AS mediana,
        COUNT(*)::BIGINT AS total_fontes
    FROM precos_item pi
    WHERE pi.item_cesta_id = p_item_cesta_id
      AND pi.excluido_calculo = FALSE;
END;
$$ LANGUAGE plpgsql STABLE;

-- Verificar cestas expiradas
CREATE OR REPLACE FUNCTION fn_verificar_cestas_expiradas()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    UPDATE cestas
    SET status_workflow = 'expirada'
    WHERE status_workflow IN ('aprovada', 'publicada')
      AND expira_em IS NOT NULL
      AND expira_em < now();
END;
$$;

-- Número sequencial de tramitação
CREATE OR REPLACE FUNCTION fn_proximo_numero_tramitacao(p_cesta_id UUID)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM tramitacoes_cesta WHERE cesta_id = p_cesta_id;
    RETURN v_count + 1;
END;
$$;

-- Atualizar métricas de uso
CREATE OR REPLACE FUNCTION fn_atualizar_metricas_uso(p_municipio_id UUID)
RETURNS void AS $$
DECLARE
    v_secretaria_ids UUID[];
    v_total_usuarios INT;
    v_total_cestas INT;
    v_total_cotacoes INT;
    v_total_produtos INT;
    v_cestas_mes INT;
    v_cotacoes_mes INT;
BEGIN
    SELECT ARRAY_AGG(id) INTO v_secretaria_ids
    FROM secretarias WHERE municipio_id = p_municipio_id AND deletado_em IS NULL;

    SELECT COUNT(*) INTO v_total_usuarios
    FROM servidores WHERE secretaria_id = ANY(v_secretaria_ids) AND deletado_em IS NULL;

    SELECT COUNT(*) INTO v_total_cestas
    FROM cestas WHERE secretaria_id = ANY(v_secretaria_ids) AND deletado_em IS NULL;

    SELECT COUNT(*) INTO v_cestas_mes
    FROM cestas WHERE secretaria_id = ANY(v_secretaria_ids) AND deletado_em IS NULL
      AND criado_em >= NOW() - INTERVAL '1 month';

    SELECT COUNT(*) INTO v_total_cotacoes
    FROM cotacoes WHERE cesta_id IN (
        SELECT id FROM cestas WHERE secretaria_id = ANY(v_secretaria_ids)
    ) AND deletado_em IS NULL;

    SELECT COUNT(*) INTO v_cotacoes_mes
    FROM cotacoes WHERE cesta_id IN (
        SELECT id FROM cestas WHERE secretaria_id = ANY(v_secretaria_ids)
    ) AND deletado_em IS NULL AND criado_em >= NOW() - INTERVAL '1 month';

    SELECT COUNT(*) INTO v_total_produtos FROM produtos_catalogo WHERE deletado_em IS NULL;

    INSERT INTO metricas_uso_municipio (
        municipio_id, total_usuarios, total_cestas, total_cotacoes,
        total_produtos_catalogo, cestas_ultimo_mes, cotacoes_ultimo_mes,
        ultimo_acesso, atualizado_em
    ) VALUES (
        p_municipio_id, v_total_usuarios, v_total_cestas, v_total_cotacoes,
        v_total_produtos, v_cestas_mes, v_cotacoes_mes, NOW(), NOW()
    )
    ON CONFLICT (municipio_id) DO UPDATE SET
        total_usuarios = EXCLUDED.total_usuarios,
        total_cestas = EXCLUDED.total_cestas,
        total_cotacoes = EXCLUDED.total_cotacoes,
        total_produtos_catalogo = EXCLUDED.total_produtos_catalogo,
        cestas_ultimo_mes = EXCLUDED.cestas_ultimo_mes,
        cotacoes_ultimo_mes = EXCLUDED.cotacoes_ultimo_mes,
        ultimo_acesso = EXCLUDED.ultimo_acesso,
        atualizado_em = EXCLUDED.atualizado_em;
END;
$$ LANGUAGE plpgsql;

-- Registrar auditoria (chamada pela API)
CREATE OR REPLACE FUNCTION fn_registrar_auditoria(
    p_servidor_id UUID,
    p_acao TEXT,
    p_tabela TEXT DEFAULT NULL,
    p_registro_id TEXT DEFAULT NULL,
    p_dados_anteriores JSONB DEFAULT NULL,
    p_dados_novos JSONB DEFAULT NULL,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO audit_log (
        servidor_id, acao, tabela, registro_id,
        dados_anteriores, dados_novos, ip_address, user_agent
    ) VALUES (
        p_servidor_id, p_acao, p_tabela, p_registro_id::UUID,
        p_dados_anteriores, p_dados_novos, p_ip_address, p_user_agent
    )
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Validar API Key
CREATE OR REPLACE FUNCTION fn_validar_api_key(p_chave_hash VARCHAR)
RETURNS TABLE (
    api_key_id UUID,
    municipio_id UUID,
    permissoes JSONB,
    rate_limit_rpm INTEGER
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT ak.id, ak.municipio_id, ak.permissoes, ak.rate_limit_rpm
    FROM api_keys ak
    WHERE ak.chave_hash = p_chave_hash
      AND ak.ativo = TRUE
      AND (ak.expira_em IS NULL OR ak.expira_em > NOW())
      AND ak.revogado_em IS NULL;

    UPDATE api_keys
    SET ultimo_uso_em = NOW(), total_requisicoes = total_requisicoes + 1
    WHERE chave_hash = p_chave_hash;
END;
$$;

-- Verificar rate limit
CREATE OR REPLACE FUNCTION verificar_rate_limit(
    p_chave TEXT,
    p_limite INT DEFAULT 60,
    p_janela_segundos INT DEFAULT 60
)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
    v_contagem INT;
BEGIN
    DELETE FROM rate_limits WHERE janela_fim < NOW();

    SELECT contagem INTO v_contagem
    FROM rate_limits
    WHERE chave = p_chave AND janela_fim > NOW()
    LIMIT 1;

    IF v_contagem IS NULL THEN
        INSERT INTO rate_limits (chave, contagem, janela_inicio, janela_fim)
        VALUES (p_chave, 1, NOW(), NOW() + (p_janela_segundos || ' seconds')::INTERVAL);
        RETURN TRUE;
    ELSIF v_contagem < p_limite THEN
        UPDATE rate_limits SET contagem = contagem + 1
        WHERE chave = p_chave AND janela_fim > NOW();
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$;

-- =============================================================================
-- 16. VIEWS
-- =============================================================================

-- Dashboard métricas
CREATE OR REPLACE VIEW v_dashboard_metricas AS
SELECT
    COUNT(DISTINCT c.id) FILTER (WHERE c.deletado_em IS NULL) AS total_cestas,
    COUNT(DISTINCT c.id) FILTER (WHERE c.status IN ('rascunho','em_andamento') AND c.deletado_em IS NULL) AS cestas_ativas,
    COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'concluida' AND c.deletado_em IS NULL) AS cestas_concluidas,
    COUNT(DISTINCT c.id) FILTER (WHERE c.criado_em >= date_trunc('month', CURRENT_DATE) AND c.deletado_em IS NULL) AS cestas_mes_atual,
    (SELECT COUNT(*) FROM produtos_catalogo WHERE deletado_em IS NULL AND ativo = TRUE) AS total_produtos_catalogo,
    (SELECT COUNT(*) FROM precos_item) AS total_precos,
    (SELECT COUNT(*) FROM precos_item WHERE excluido_calculo = TRUE) AS total_precos_excluidos,
    (SELECT COUNT(*) FROM fornecedores WHERE deletado_em IS NULL AND ativo = TRUE) AS total_fornecedores,
    (SELECT COUNT(*) FROM cotacoes WHERE deletado_em IS NULL) AS total_cotacoes,
    (SELECT COUNT(*) FROM cotacoes WHERE status = 'enviada' AND deletado_em IS NULL) AS cotacoes_ativas
FROM cestas c;

-- Métricas por secretaria
CREATE OR REPLACE VIEW v_metricas_por_secretaria AS
SELECT
    s.id AS secretaria_id, s.nome AS secretaria_nome, s.sigla AS secretaria_sigla,
    COUNT(DISTINCT c.id) FILTER (WHERE c.deletado_em IS NULL) AS total_cestas,
    COUNT(DISTINCT c.id) FILTER (WHERE c.status IN ('rascunho','em_andamento') AND c.deletado_em IS NULL) AS cestas_ativas,
    COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'concluida' AND c.deletado_em IS NULL) AS cestas_concluidas,
    COUNT(DISTINCT c.id) FILTER (WHERE c.status IN ('rascunho','em_andamento') AND c.deletado_em IS NULL
                                   AND c.criado_em < NOW() - INTERVAL '30 days') AS cestas_pendentes_antigas,
    COALESCE(SUM(CASE WHEN ic.media IS NOT NULL AND ic.menor_preco IS NOT NULL AND ic.media > 0
                      THEN (ic.media - ic.menor_preco) * ic.quantidade ELSE 0 END), 0) AS economia_estimada,
    COALESCE(SUM(CASE WHEN ic.media IS NOT NULL THEN ic.media * ic.quantidade ELSE 0 END), 0) AS valor_total_media
FROM secretarias s
LEFT JOIN cestas c ON c.secretaria_id = s.id AND c.deletado_em IS NULL
LEFT JOIN itens_cesta ic ON ic.cesta_id = c.id
WHERE s.deletado_em IS NULL AND s.ativo = TRUE
GROUP BY s.id, s.nome, s.sigla;

-- Fontes mais utilizadas
CREATE OR REPLACE VIEW v_fontes_utilizacao AS
SELECT
    f.id AS fonte_id, f.nome, f.sigla, f.tipo,
    COUNT(pi.id) AS total_precos,
    COUNT(DISTINCT pi.item_cesta_id) AS total_itens_distintos
FROM fontes f
LEFT JOIN precos_item pi ON pi.fonte_id = f.id
WHERE f.ativo = TRUE
GROUP BY f.id, f.nome, f.sigla, f.tipo
ORDER BY total_precos DESC;

-- Cotação resumo
CREATE OR REPLACE VIEW v_cotacao_resumo AS
SELECT
    c.id, c.cesta_id, c.numero, c.titulo, c.status,
    c.data_abertura, c.data_encerramento, c.criado_por,
    (SELECT COUNT(*) FROM cotacao_itens ci WHERE ci.cotacao_id = c.id) AS total_itens,
    (SELECT COUNT(*) FROM cotacao_fornecedores cf WHERE cf.cotacao_id = c.id) AS total_fornecedores,
    (SELECT COUNT(DISTINCT cf2.id) FROM cotacao_fornecedores cf2
     JOIN respostas_cotacao rc ON rc.cotacao_fornecedor_id = cf2.id
     WHERE cf2.cotacao_id = c.id) AS total_responderam,
    (SELECT COUNT(*) FROM cotacao_lancamentos_manuais lm WHERE lm.cotacao_id = c.id) AS total_lancamentos_manuais
FROM cotacoes c WHERE c.deletado_em IS NULL;

-- Últimos índices disponíveis
CREATE OR REPLACE VIEW v_ultimos_indices AS
SELECT DISTINCT ON (tipo) tipo, ano, mes, valor, acumulado_12m, importado_em
FROM indices_correcao ORDER BY tipo, ano DESC, mes DESC;

-- Série histórica de índices
CREATE OR REPLACE VIEW v_serie_indices AS
SELECT tipo, ano, mes, valor, acumulado_12m,
       TO_CHAR(MAKE_DATE(ano, mes, 1), 'YYYY-MM') AS periodo
FROM indices_correcao ORDER BY tipo, ano, mes;

-- BPS média ponderada
CREATE OR REPLACE VIEW vw_bps_media_ponderada AS
SELECT codigo_br, descricao_item, apresentacao, unidade,
       COUNT(*) AS total_registros,
       ROUND(SUM(valor_unitario * COALESCE(quantidade, 1)) / NULLIF(SUM(COALESCE(quantidade, 1)), 0), 4) AS media_ponderada,
       MIN(valor_unitario) AS menor_preco, MAX(valor_unitario) AS maior_preco,
       MAX(data_compra) AS ultima_compra
FROM dados_fonte_bps WHERE codigo_br IS NOT NULL
GROUP BY codigo_br, descricao_item, apresentacao, unidade;

-- SINAPI último mês
CREATE OR REPLACE VIEW vw_sinapi_ultimo_mes AS
SELECT DISTINCT ON (codigo_sinapi, uf)
    id, codigo_sinapi, descricao_item, unidade, valor_unitario,
    uf, mes_referencia, tipo, desonerado, origem
FROM dados_fonte_sinapi ORDER BY codigo_sinapi, uf, mes_referencia DESC;

-- CONAB última cotação
CREATE OR REPLACE VIEW vw_conab_ultima_cotacao AS
SELECT DISTINCT ON (descricao_item, cidade, uf)
    id, descricao_item, unidade, valor_unitario, cidade, uf, data_referencia, tipo_produto
FROM dados_fonte_conab ORDER BY descricao_item, cidade, uf, data_referencia DESC;

-- CEASA última cotação
CREATE OR REPLACE VIEW vw_ceasa_ultima_cotacao AS
SELECT DISTINCT ON (descricao_item, variedade)
    id, descricao_item, variedade, unidade, valor_minimo, valor_maximo, valor_comum,
    data_cotacao, turno
FROM dados_fonte_ceasa ORDER BY descricao_item, variedade, data_cotacao DESC;

-- CMED preços atuais
CREATE OR REPLACE VIEW vw_cmed_precos_atuais AS
SELECT DISTINCT ON (registro_anvisa, apresentacao)
    id, registro_anvisa, principio_ativo, descricao_produto, apresentacao,
    laboratorio, ean, pmvg_sem_impostos, pmvg_com_impostos, pmc, icms_0,
    lista_concessao, tipo_produto, regime_preco, data_publicacao
FROM dados_fonte_cmed ORDER BY registro_anvisa, apresentacao, data_publicacao DESC;

-- Cestas com workflow
CREATE OR REPLACE VIEW vw_cestas_workflow AS
SELECT
    c.id, c.descricao_objeto, c.status_workflow, c.metodologia_calculo,
    c.bloqueada, c.expira_em, c.validade_meses, c.fundamentacao_legal,
    c.numero_minimo_fontes,
    s.nome AS secretaria_nome, m.nome AS municipio_nome, m.uf,
    criador.nome AS criador_nome, aprov.nome AS aprovador_nome,
    c.aprovada_em, c.publicada_em, c.criado_em,
    (SELECT COUNT(*) FROM itens_cesta ic WHERE ic.cesta_id = c.id) AS total_itens,
    (SELECT COUNT(DISTINCT pi.fonte_id) FROM precos_item pi
     JOIN itens_cesta ic ON ic.id = pi.item_cesta_id
     WHERE ic.cesta_id = c.id AND NOT pi.excluido_calculo) AS total_fontes_distintas,
    chk.aprovado AS checklist_aprovado,
    (SELECT status_novo FROM tramitacoes_cesta tc
     WHERE tc.cesta_id = c.id ORDER BY tc.criado_em DESC LIMIT 1) AS ultima_tramitacao
FROM cestas c
JOIN secretarias s ON s.id = c.secretaria_id
JOIN municipios m ON m.id = s.municipio_id
LEFT JOIN servidores criador ON criador.id = c.criado_por
LEFT JOIN servidores aprov ON aprov.id = c.aprovador_id
LEFT JOIN checklist_conformidade chk ON chk.cesta_id = c.id
WHERE c.deletado_em IS NULL;

-- API estatísticas
CREATE OR REPLACE VIEW vw_api_estatisticas AS
SELECT
    ak.id AS api_key_id, ak.nome, ak.prefixo, ak.municipio_id,
    ak.ativo, ak.total_requisicoes, ak.ultimo_uso_em,
    (SELECT COUNT(*) FROM api_log al WHERE al.api_key_id = ak.id AND al.criado_em > NOW() - INTERVAL '24 hours') AS requisicoes_24h,
    (SELECT COUNT(*) FROM api_log al WHERE al.api_key_id = ak.id AND al.criado_em > NOW() - INTERVAL '1 hour') AS requisicoes_1h,
    (SELECT AVG(al.latencia_ms) FROM api_log al WHERE al.api_key_id = ak.id AND al.criado_em > NOW() - INTERVAL '24 hours') AS latencia_media_24h
FROM api_keys ak WHERE ak.revogado_em IS NULL;

-- =============================================================================
-- 17. SEED DATA
-- =============================================================================

-- Perfis padrão
INSERT INTO perfis (nome, descricao, permissoes) VALUES
    ('administrador', 'Acesso total ao sistema', '{"admin": true, "cestas": "crud", "catalogo": "crud", "fornecedores": "crud", "cotacoes": "crud", "relatorios": "crud", "configuracoes": "crud"}'),
    ('gestor', 'Gestor de compras', '{"admin": false, "cestas": "crud", "catalogo": "read", "fornecedores": "crud", "cotacoes": "crud", "relatorios": "crud", "configuracoes": "read"}'),
    ('pesquisador', 'Pesquisador de preços', '{"admin": false, "cestas": "crud", "catalogo": "read", "fornecedores": "read", "cotacoes": "read", "relatorios": "read", "configuracoes": "none"}');

-- Fontes de preço
INSERT INTO fontes (nome, sigla, tipo, url_base, descricao) VALUES
    ('Portal Nacional de Contratações Públicas', 'PNCP', 'pncp', 'https://pncp.gov.br', 'Contratos, atas e preços de todos os órgãos públicos'),
    ('Painel de Preços do Governo Federal', 'PAINEL', 'painel_precos', 'https://paineldeprecos.planejamento.gov.br', 'Preços praticados pela administração federal'),
    ('TCE/MG — Tribunal de Contas de Minas Gerais', 'TCE-MG', 'tce_mg', 'https://www.tce.mg.gov.br', 'Contratos e atas de municípios de MG'),
    ('Banco de Preços em Saúde', 'BPS', 'bps', 'https://bps.saude.gov.br', 'Preços de medicamentos e insumos de saúde'),
    ('SINAPI — Sistema Nacional de Pesquisa de Custos', 'SINAPI', 'sinapi', 'https://www.caixa.gov.br/poder-publico/modernizacao-gestao/sinapi', 'Custos de construção civil'),
    ('CONAB — Tabela de Preços MG', 'CONAB', 'conab', 'https://www.conab.gov.br', 'Preços de gêneros alimentícios'),
    ('CEASA-MG — Central de Abastecimento', 'CEASA-MG', 'ceasa', 'https://www.ceasaminas.com.br', 'Cotações de hortifrúti e alimentos'),
    ('CMED/ANVISA — Preços de Medicamentos', 'CMED', 'cmed', 'https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos', 'Preços máximos de medicamentos (tabela CMED)'),
    ('Portais de Transparência', 'TRANSPARENCIA', 'transparencia', NULL, 'Contratos e atas de registro de preços de portais de transparência'),
    ('Diários Oficiais', 'DO', 'diario_oficial', NULL, 'Extratos de contratos publicados em Diários Oficiais'),
    ('Cotação Direta com Fornecedores', 'COTACAO', 'cotacao_direta', NULL, 'Cotações obtidas diretamente com fornecedores via módulo eletrônico');

-- Categorias
INSERT INTO categorias (nome, descricao, ordem) VALUES
    ('Gêneros Alimentícios', 'Arroz, feijão, açúcar, leite, carnes, óleos e demais gêneros', 1),
    ('Materiais de Higiene e Limpeza', 'Sabão, detergente, desinfetante, papel higiênico e afins', 2),
    ('Copa e Cozinha', 'Utensílios de copa, cozinha e refeitório', 3),
    ('Utensílios Domésticos', 'Vassoura, balde, pano de chão e similares', 4),
    ('Embalagens', 'Sacos, sacolas, bobinas, filme plástico', 5),
    ('Material de Expediente', 'Papel, caneta, lápis, grampo, envelope e demais', 6),
    ('Material Didático e Pedagógico', 'Livros, cadernos, materiais para sala de aula', 7),
    ('Material de Informática', 'Toner, cartuchos, periféricos, cabos e acessórios', 8),
    ('Material Esportivo', 'Bolas, redes, uniformes esportivos, equipamentos', 9),
    ('Material de Construção', 'Cimento, areia, brita, tijolo, telha e afins', 10),
    ('Material Elétrico e Eletrônico', 'Fios, cabos, lâmpadas, disjuntores, tomadas', 11),
    ('Material Hidráulico', 'Canos, conexões, válvulas, registros', 12),
    ('Medicamentos', 'Medicamentos de uso geral e especializado', 13),
    ('Materiais Farmacológicos', 'Insumos farmacêuticos e materiais de farmácia', 14),
    ('Material Hospitalar', 'Seringas, luvas, máscaras, equipamentos médicos', 15),
    ('Material Odontológico', 'Resinas, instrumentais, materiais de consumo odontológico', 16),
    ('Material Laboratorial', 'Reagentes, vidrarias, equipamentos de laboratório', 17),
    ('Material Veterinário', 'Medicamentos e insumos veterinários', 18),
    ('Combustíveis e Lubrificantes', 'Gasolina, diesel, etanol, óleos lubrificantes', 19),
    ('Pneus e Baterias Automotivas', 'Pneus, câmaras de ar, baterias para veículos', 20);

-- Unidades de medida
INSERT INTO unidades_medida (sigla, descricao) VALUES
    ('UN', 'Unidade'), ('KG', 'Quilograma'), ('G', 'Grama'), ('MG', 'Miligrama'),
    ('L', 'Litro'), ('ML', 'Mililitro'), ('M', 'Metro'), ('M²', 'Metro Quadrado'),
    ('M³', 'Metro Cúbico'), ('CM', 'Centímetro'), ('MM', 'Milímetro'),
    ('CX', 'Caixa'), ('PCT', 'Pacote'), ('FD', 'Fardo'), ('SC', 'Saco'),
    ('DZ', 'Dúzia'), ('RL', 'Rolo'), ('FR', 'Frasco'), ('TB', 'Tubo'),
    ('GL', 'Galão'), ('BD', 'Balde'), ('CT', 'Cartela'), ('BL', 'Blister'),
    ('AMP', 'Ampola'), ('CP', 'Comprimido'), ('CAP', 'Cápsula'), ('PAR', 'Par'),
    ('JG', 'Jogo'), ('KIT', 'Kit'), ('TN', 'Tonelada'), ('LT', 'Lata'),
    ('PT', 'Pote'), ('BB', 'Bobina'), ('RS', 'Resma'), ('FL', 'Folha'),
    ('VD', 'Vidro'), ('HR', 'Hora'), ('DIA', 'Diária'), ('MES', 'Mensal'),
    ('SV', 'Serviço');

-- Planos padrão (billing Asaas)
INSERT INTO planos (nome, titulo, descricao, preco_mensal, preco_anual, limite_usuarios, limite_cestas, limite_cotacoes_mes, funcionalidades) VALUES
    ('gratuito', 'Gratuito', 'Ideal para conhecer a plataforma', 0, 0, 3, 5, 10,
     '["catalogo","cestas_basico","pesquisa_rapida"]'),
    ('basico', 'Básico', 'Para municípios de pequeno porte', 14900, 149000, 10, 30, 50,
     '["catalogo","cestas_basico","pesquisa_rapida","cotacoes","fornecedores","relatorios"]'),
    ('profissional', 'Profissional', 'Para municípios de médio porte', 29900, 299000, 30, 100, 200,
     '["catalogo","cestas_basico","pesquisa_rapida","cotacoes","fornecedores","relatorios","comparador","templates","historico","mapa_calor","alertas","sicom","ia","ocr"]'),
    ('enterprise', 'Enterprise', 'Para grandes municípios e consórcios', 59900, 599000, 999, 999, 999,
     '["catalogo","cestas_basico","pesquisa_rapida","cotacoes","fornecedores","relatorios","comparador","templates","historico","mapa_calor","alertas","sicom","ia","ocr","api_rest","suporte_prioritario","sla_99_9"]');

-- =============================================================================
-- ROW-LEVEL SECURITY (RLS) — Isolamento multi-tenant por municipio_id
-- =============================================================================
-- A aplicação deve executar: SET LOCAL app.current_municipio_id = '<uuid>';
-- no início de cada transação autenticada.
-- =============================================================================

-- Role da aplicação (revogar superuser)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user NOLOGIN;
  END IF;
END $$;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO app_user;
-- Revogar mutações no audit_log (append-only)
REVOKE UPDATE, DELETE ON audit_log FROM app_user;

-- Helper: retorna municipio_id configurado na sessão
CREATE OR REPLACE FUNCTION current_municipio_id() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.current_municipio_id', true), '')::UUID;
$$ LANGUAGE sql STABLE;

-- ── fornecedores (direto) ───────────────────────────────────
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores FORCE ROW LEVEL SECURITY;
CREATE POLICY fornecedores_tenant ON fornecedores
  USING (municipio_id = current_municipio_id())
  WITH CHECK (municipio_id = current_municipio_id());

-- ── servidores (via secretarias) ────────────────────────────
ALTER TABLE servidores ENABLE ROW LEVEL SECURITY;
ALTER TABLE servidores FORCE ROW LEVEL SECURITY;
CREATE POLICY servidores_tenant ON servidores
  USING (secretaria_id IN (SELECT id FROM secretarias WHERE municipio_id = current_municipio_id()))
  WITH CHECK (secretaria_id IN (SELECT id FROM secretarias WHERE municipio_id = current_municipio_id()));

-- ── cestas (via secretarias) ────────────────────────────────
ALTER TABLE cestas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cestas FORCE ROW LEVEL SECURITY;
CREATE POLICY cestas_tenant ON cestas
  USING (secretaria_id IN (SELECT id FROM secretarias WHERE municipio_id = current_municipio_id()))
  WITH CHECK (secretaria_id IN (SELECT id FROM secretarias WHERE municipio_id = current_municipio_id()));

-- ── itens_cesta (via cestas → secretarias) ──────────────────
ALTER TABLE itens_cesta ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_cesta FORCE ROW LEVEL SECURITY;
CREATE POLICY itens_cesta_tenant ON itens_cesta
  USING (cesta_id IN (
    SELECT c.id FROM cestas c
    JOIN secretarias sec ON c.secretaria_id = sec.id
    WHERE sec.municipio_id = current_municipio_id()
  ));

-- ── precos_item (via itens_cesta → cestas → secretarias) ────
ALTER TABLE precos_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE precos_item FORCE ROW LEVEL SECURITY;
CREATE POLICY precos_item_tenant ON precos_item
  USING (item_cesta_id IN (
    SELECT ic.id FROM itens_cesta ic
    JOIN cestas c ON ic.cesta_id = c.id
    JOIN secretarias sec ON c.secretaria_id = sec.id
    WHERE sec.municipio_id = current_municipio_id()
  ));

-- ── documentos_comprobatorios (via precos_item chain) ───────
ALTER TABLE documentos_comprobatorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_comprobatorios FORCE ROW LEVEL SECURITY;
CREATE POLICY documentos_tenant ON documentos_comprobatorios
  USING (preco_item_id IN (
    SELECT pi.id FROM precos_item pi
    JOIN itens_cesta ic ON pi.item_cesta_id = ic.id
    JOIN cestas c ON ic.cesta_id = c.id
    JOIN secretarias sec ON c.secretaria_id = sec.id
    WHERE sec.municipio_id = current_municipio_id()
  ));

-- ── cotacoes (via cestas → secretarias) ─────────────────────
ALTER TABLE cotacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotacoes FORCE ROW LEVEL SECURITY;
CREATE POLICY cotacoes_tenant ON cotacoes
  USING (cesta_id IN (
    SELECT c.id FROM cestas c
    JOIN secretarias sec ON c.secretaria_id = sec.id
    WHERE sec.municipio_id = current_municipio_id()
  ));

-- =============================================================================
-- AUDITORIA IMUTÁVEL — Hash Chain + Triggers de Proteção
-- =============================================================================

-- Trigger: calcula hash SHA-256 encadeado (blockchain-like) ao inserir no audit_log
CREATE OR REPLACE FUNCTION calcular_hash_audit() RETURNS TRIGGER AS $$
DECLARE
  ultimo_hash TEXT;
BEGIN
  SELECT hash INTO ultimo_hash FROM audit_log ORDER BY criado_em DESC, id DESC LIMIT 1;
  NEW.hash_anterior := COALESCE(ultimo_hash, 'GENESIS');
  NEW.hash := encode(
    sha256(
      convert_to(
        COALESCE(NEW.tabela, '') || '|' ||
        COALESCE(NEW.acao, '') || '|' ||
        COALESCE(NEW.registro_id, '') || '|' ||
        COALESCE(NEW.dados_novos::text, '') || '|' ||
        COALESCE(NEW.ip_address, '') || '|' ||
        NEW.criado_em::text || '|' ||
        COALESCE(NEW.hash_anterior, 'GENESIS'),
        'UTF8'
      )
    ), 'hex');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_hash BEFORE INSERT ON audit_log
  FOR EACH ROW EXECUTE FUNCTION calcular_hash_audit();

-- Trigger: rejeita UPDATE e DELETE no audit_log (imutabilidade TCU/TCE)
CREATE OR REPLACE FUNCTION audit_log_imutavel() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log é imutável: operações UPDATE e DELETE não são permitidas (exigência TCU/TCE)';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_imutavel BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_imutavel();

-- =============================================================================
-- AUDITORIA AUTOMÁTICA — Trigger genérico para tabelas sensíveis
-- =============================================================================

CREATE OR REPLACE FUNCTION audit_trigger_func() RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_log (acao, tabela, registro_id, dados_novos)
    VALUES ('INSERT', TG_TABLE_NAME, NEW.id::text, to_jsonb(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_log (acao, tabela, registro_id, dados_anteriores, dados_novos)
    VALUES ('UPDATE', TG_TABLE_NAME, NEW.id::text, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_log (acao, tabela, registro_id, dados_anteriores)
    VALUES ('DELETE', TG_TABLE_NAME, OLD.id::text, to_jsonb(OLD));
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Aplicar em tabelas sensíveis (mutações registradas automaticamente)
CREATE TRIGGER trg_audit_cestas AFTER INSERT OR UPDATE OR DELETE ON cestas
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER trg_audit_itens_cesta AFTER INSERT OR UPDATE OR DELETE ON itens_cesta
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER trg_audit_precos_item AFTER INSERT OR UPDATE OR DELETE ON precos_item
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER trg_audit_fornecedores AFTER INSERT OR UPDATE OR DELETE ON fornecedores
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER trg_audit_cotacoes AFTER INSERT OR UPDATE OR DELETE ON cotacoes
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER trg_audit_servidores AFTER INSERT OR UPDATE OR DELETE ON servidores
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER trg_audit_documentos AFTER INSERT OR UPDATE OR DELETE ON documentos_comprobatorios
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER trg_audit_consentimentos AFTER INSERT OR UPDATE OR DELETE ON consentimentos_lgpd
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER trg_audit_solicitacoes AFTER INSERT OR UPDATE OR DELETE ON solicitacoes_lgpd
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- =============================================================================
-- POLÍTICA DE RETENÇÃO DE DADOS (LGPD)
-- Períodos: audit_log=5 anos, cestas concluídas=5 anos, usuários inativos=2 anos,
--           interacoes_ia=1 ano, tokens expirados=30 dias
-- =============================================================================

CREATE OR REPLACE FUNCTION purgar_dados_expirados() RETURNS TABLE(tabela TEXT, registros_removidos BIGINT) AS $$
DECLARE
  n BIGINT;
BEGIN
  -- 1. Registrar purge no audit_log ANTES de executar
  INSERT INTO audit_log (acao, tabela, dados_novos)
  VALUES ('PURGE_LGPD', 'sistema', '{"descricao":"Execução automática de política de retenção LGPD"}'::jsonb);

  -- 2. Tokens de cotação expirados (> 30 dias)
  DELETE FROM cotacao_fornecedores WHERE token_expira_em < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS n = ROW_COUNT;
  tabela := 'cotacao_fornecedores'; registros_removidos := n; RETURN NEXT;

  -- 3. Interações de IA (> 1 ano)
  DELETE FROM interacoes_ia WHERE criado_em < NOW() - INTERVAL '1 year';
  GET DIAGNOSTICS n = ROW_COUNT;
  tabela := 'interacoes_ia'; registros_removidos := n; RETURN NEXT;

  -- 4. Usuários inativos soft-deleted (> 2 anos do soft delete)
  DELETE FROM usuarios WHERE deletado_em IS NOT NULL AND deletado_em < NOW() - INTERVAL '2 years';
  GET DIAGNOSTICS n = ROW_COUNT;
  tabela := 'usuarios_inativos'; registros_removidos := n; RETURN NEXT;

  -- 5. Audit logs (> 5 anos) — mínimo legal
  DELETE FROM audit_log WHERE criado_em < NOW() - INTERVAL '5 years';
  GET DIAGNOSTICS n = ROW_COUNT;
  tabela := 'audit_log'; registros_removidos := n; RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FIM DO SCHEMA CONSOLIDADO
-- =============================================================================
