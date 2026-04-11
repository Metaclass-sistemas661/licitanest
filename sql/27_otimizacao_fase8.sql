-- ============================================================
-- 27 — Fase 8: Otimização de Queries & Índices
-- ============================================================
-- Índices GIN trigram faltantes para colunas com ILIKE
-- Corrige seq scans em tabelas de alto volume
-- ============================================================

-- 1. cestas.descricao_objeto — usado em cestas.ts e workflow.ts
CREATE INDEX IF NOT EXISTS idx_cestas_descricao_trgm
  ON cestas USING GIN (descricao_objeto gin_trgm_ops);

-- 2. dados_fonte_tce.municipio — B-tree existente (idx_tce_municipio) não serve para ILIKE
--    Adiciona GIN trigram complementar
CREATE INDEX IF NOT EXISTS idx_tce_municipio_trgm
  ON dados_fonte_tce USING GIN (municipio gin_trgm_ops);

-- 3. dados_fonte_comprasnet.fornecedor — usado com ILIKE em dados-fonte-fase7.ts
CREATE INDEX IF NOT EXISTS idx_comprasnet_fornecedor_trgm
  ON dados_fonte_comprasnet USING GIN (fornecedor gin_trgm_ops);

-- 4. dados_fonte_arp.descricao_item — ILIKE em dados-fonte-fase7.ts (já existe idx_arp_descricao, OK)
-- 5. dados_fonte_fnde.descricao_item — ILIKE em dados-fonte-fase7.ts (já existe idx_fnde_descricao, OK)

-- ── Índices B-tree adicionais para filtros frequentes ──

-- cestas por data de criação (ORDER BY criado_em DESC é frequente em listagens)
CREATE INDEX IF NOT EXISTS idx_cestas_criado_em
  ON cestas(criado_em DESC) WHERE deletado_em IS NULL;

-- precos_item por data_referencia + item (usado em análise crítica e relatórios)
CREATE INDEX IF NOT EXISTS idx_precos_item_data_item
  ON precos_item(item_cesta_id, data_referencia DESC);

-- servidores por user_id (usado em verificarAuth — chamado em CADA request)
CREATE INDEX IF NOT EXISTS idx_servidores_user_id
  ON servidores(user_id) WHERE deletado_em IS NULL;

-- ── Partial indexes para buscas filtradas ──

-- produtos_catalogo ativos (autocomplete e listagem filtram ativo=true)
CREATE INDEX IF NOT EXISTS idx_produtos_catalogo_ativo_descricao
  ON produtos_catalogo USING GIN (descricao gin_trgm_ops) WHERE ativo = true AND deletado_em IS NULL;

-- ── ANALYZE para atualizar estatísticas ──

ANALYZE cestas;
ANALYZE produtos_catalogo;
ANALYZE dados_fonte_tce;
ANALYZE dados_fonte_comprasnet;
ANALYZE servidores;
ANALYZE precos_item;
ANALYZE catmat_catser;
