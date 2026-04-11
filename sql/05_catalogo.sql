-- =============================================================================
-- LICITANEST — 05. Catálogo Padronizado (global, sem tenant)
-- =============================================================================
-- Tabelas de referência nacional: categorias, unidades, elementos de despesa,
-- CATMAT/CATSER, produtos do catálogo, solicitações de inclusão.
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
