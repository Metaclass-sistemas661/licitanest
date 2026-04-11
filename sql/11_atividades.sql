-- =============================================================================
-- LICITANEST — 11. Dashboard e Atividades
-- =============================================================================
-- municipio_id adicionado para RLS direto (secretaria_id e servidor_id são NULLABLE)
-- =============================================================================

CREATE TABLE atividades (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    servidor_id     UUID REFERENCES servidores(id),
    secretaria_id   UUID REFERENCES secretarias(id),
    municipio_id    UUID NOT NULL REFERENCES municipios(id),
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
CREATE INDEX idx_atividades_municipio ON atividades(municipio_id);
CREATE INDEX idx_atividades_criado ON atividades(criado_em DESC);
CREATE INDEX idx_atividades_tipo ON atividades(tipo);
