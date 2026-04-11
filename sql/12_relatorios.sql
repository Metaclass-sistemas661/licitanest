-- =============================================================================
-- LICITANEST — 12. Relatórios Gerados
-- =============================================================================
-- Tenant via: cesta_id → cestas.secretaria_id → secretarias.municipio_id
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
