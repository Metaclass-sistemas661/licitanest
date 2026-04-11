-- =============================================================================
-- LICITANEST — 17. Importações em Lote e IA
-- =============================================================================
-- importacoes_lote: municipio_id adicionado (cesta_id é NULLABLE para catmat/fornecedores)
-- interacoes_ia: tenant via servidor_id → servidores → secretarias
-- =============================================================================

CREATE TABLE importacoes_lote (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    municipio_id UUID NOT NULL REFERENCES municipios(id),
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

CREATE INDEX idx_importacoes_municipio ON importacoes_lote(municipio_id);

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
