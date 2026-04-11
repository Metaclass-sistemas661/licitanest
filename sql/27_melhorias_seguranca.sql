-- =============================================================================
-- LICITANEST — 27. Melhorias de Segurança e Performance (Enterprise Hardening)
-- =============================================================================
-- Aplicar APÓS todos os scripts 01-26.
-- Cada bloco é idempotente (usa IF NOT EXISTS / OR REPLACE / DO $$ BEGIN...END $$).
-- =============================================================================

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. BILLING: CHECK constraints para preços não-negativos
-- ══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'planos_preco_mensal_nonneg'
  ) THEN
    ALTER TABLE planos ADD CONSTRAINT planos_preco_mensal_nonneg CHECK (preco_mensal >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'planos_preco_anual_nonneg'
  ) THEN
    ALTER TABLE planos ADD CONSTRAINT planos_preco_anual_nonneg CHECK (preco_anual >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'faturas_valor_nonneg'
  ) THEN
    ALTER TABLE faturas ADD CONSTRAINT faturas_valor_nonneg CHECK (valor >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'assinaturas_valor_nonneg'
  ) THEN
    ALTER TABLE assinaturas ADD CONSTRAINT assinaturas_valor_nonneg CHECK (valor_corrente >= 0);
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. BILLING_EVENTOS: UNIQUE constraint em asaas_event_id para idempotência
-- ══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_billing_eventos_asaas_event_id_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_billing_eventos_asaas_event_id_unique
      ON billing_eventos(asaas_event_id) WHERE asaas_event_id IS NOT NULL;
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. RACE CONDITION: fn_proximo_numero_tramitacao com LOCK (advisory lock)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_proximo_numero_tramitacao(p_cesta_id UUID)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
    v_count INTEGER;
    v_lock_key BIGINT;
BEGIN
    -- Advisory lock baseado no cesta_id para serializar acessos concorrentes
    v_lock_key := ('x' || left(replace(p_cesta_id::TEXT, '-', ''), 15))::BIT(60)::BIGINT;
    PERFORM pg_advisory_xact_lock(v_lock_key);

    SELECT COUNT(*) INTO v_count
    FROM tramitacoes_cesta
    WHERE cesta_id = p_cesta_id;

    RETURN v_count + 1;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. VIEWS: Corrigir v_dashboard_metricas com filtro de tenant
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_dashboard_metricas AS
SELECT
    COUNT(DISTINCT c.id) FILTER (WHERE c.deletado_em IS NULL) AS total_cestas,
    COUNT(DISTINCT c.id) FILTER (WHERE c.status IN ('rascunho','em_andamento') AND c.deletado_em IS NULL) AS cestas_ativas,
    COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'concluida' AND c.deletado_em IS NULL) AS cestas_concluidas,
    COUNT(DISTINCT c.id) FILTER (WHERE c.criado_em >= date_trunc('month', CURRENT_DATE) AND c.deletado_em IS NULL) AS cestas_mes_atual,
    (SELECT COUNT(*) FROM produtos_catalogo WHERE deletado_em IS NULL AND ativo = TRUE) AS total_produtos_catalogo,
    (SELECT COUNT(*) FROM precos_item pi
     JOIN itens_cesta ic ON pi.item_cesta_id = ic.id
     JOIN cestas c2 ON ic.cesta_id = c2.id
     JOIN secretarias s2 ON c2.secretaria_id = s2.id
     WHERE s2.municipio_id = current_municipio_id()) AS total_precos,
    (SELECT COUNT(*) FROM precos_item pi
     JOIN itens_cesta ic ON pi.item_cesta_id = ic.id
     JOIN cestas c2 ON ic.cesta_id = c2.id
     JOIN secretarias s2 ON c2.secretaria_id = s2.id
     WHERE pi.excluido_calculo = TRUE AND s2.municipio_id = current_municipio_id()) AS total_precos_excluidos,
    (SELECT COUNT(*) FROM fornecedores WHERE deletado_em IS NULL AND ativo = TRUE
     AND municipio_id = current_municipio_id()) AS total_fornecedores,
    (SELECT COUNT(*) FROM cotacoes cot
     JOIN cestas c3 ON cot.cesta_id = c3.id
     JOIN secretarias s3 ON c3.secretaria_id = s3.id
     WHERE cot.deletado_em IS NULL AND s3.municipio_id = current_municipio_id()) AS total_cotacoes,
    (SELECT COUNT(*) FROM cotacoes cot
     JOIN cestas c3 ON cot.cesta_id = c3.id
     JOIN secretarias s3 ON c3.secretaria_id = s3.id
     WHERE cot.status = 'enviada' AND cot.deletado_em IS NULL AND s3.municipio_id = current_municipio_id()) AS cotacoes_ativas
FROM cestas c
JOIN secretarias sec ON c.secretaria_id = sec.id
WHERE sec.municipio_id = current_municipio_id();

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. VIEWS: Corrigir v_metricas_por_secretaria com filtro de tenant
-- ══════════════════════════════════════════════════════════════════════════════

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
  AND s.municipio_id = current_municipio_id()
GROUP BY s.id, s.nome, s.sigla;

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. ÍNDICES COMPOSTOS faltantes para queries críticas
-- ══════════════════════════════════════════════════════════════════════════════

-- Cestas: filtro composto por secretaria + status (mais usado no frontend)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_cestas_sec_status_active') THEN
    CREATE INDEX idx_cestas_sec_status_active
      ON cestas(secretaria_id, status) WHERE deletado_em IS NULL;
  END IF;
END $$;

-- Cotações: ordenação por criado_em para dashboard
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_cotacoes_criado_em_desc') THEN
    CREATE INDEX idx_cotacoes_criado_em_desc
      ON cotacoes(criado_em DESC) WHERE deletado_em IS NULL;
  END IF;
END $$;

-- Cestas: workflow status para views
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_cestas_workflow_status') THEN
    CREATE INDEX idx_cestas_workflow_status
      ON cestas(status_workflow) WHERE deletado_em IS NULL;
  END IF;
END $$;

-- Faturas: busca por asaas_payment_id (usado no webhook)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_faturas_asaas_payment_id') THEN
    CREATE INDEX idx_faturas_asaas_payment_id
      ON faturas(asaas_payment_id) WHERE asaas_payment_id IS NOT NULL;
  END IF;
END $$;

-- Precos_item: busca por item_cesta_id (FK mais consultada)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_precos_item_cesta_calc') THEN
    CREATE INDEX idx_precos_item_cesta_calc
      ON precos_item(item_cesta_id) WHERE excluido_calculo = FALSE;
  END IF;
END $$;

-- Audit_log: particionamento conceitual via índice parcial por mês corrente
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_log_criado_em') THEN
    CREATE INDEX idx_audit_log_criado_em
      ON audit_log(criado_em DESC);
  END IF;
END $$;

-- Tramitações: busca por cesta_id para fn_proximo_numero_tramitacao
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tramitacoes_cesta_id') THEN
    CREATE INDEX idx_tramitacoes_cesta_id
      ON tramitacoes_cesta(cesta_id);
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 7. fn_atualizar_metricas_uso: Otimizar N+1 → single query
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_atualizar_metricas_uso(p_municipio_id UUID)
RETURNS void AS $$
BEGIN
    INSERT INTO metricas_uso_municipio (
        municipio_id, total_usuarios, total_cestas, total_cotacoes,
        total_produtos_catalogo, cestas_ultimo_mes, cotacoes_ultimo_mes,
        ultimo_acesso, atualizado_em
    )
    SELECT
        p_municipio_id,
        (SELECT COUNT(*) FROM servidores s
         JOIN secretarias sec ON s.secretaria_id = sec.id
         WHERE sec.municipio_id = p_municipio_id AND s.deletado_em IS NULL),
        (SELECT COUNT(*) FROM cestas c
         JOIN secretarias sec ON c.secretaria_id = sec.id
         WHERE sec.municipio_id = p_municipio_id AND c.deletado_em IS NULL),
        (SELECT COUNT(*) FROM cotacoes cot
         JOIN cestas c ON cot.cesta_id = c.id
         JOIN secretarias sec ON c.secretaria_id = sec.id
         WHERE sec.municipio_id = p_municipio_id AND cot.deletado_em IS NULL),
        (SELECT COUNT(*) FROM produtos_catalogo WHERE deletado_em IS NULL),
        (SELECT COUNT(*) FROM cestas c
         JOIN secretarias sec ON c.secretaria_id = sec.id
         WHERE sec.municipio_id = p_municipio_id AND c.deletado_em IS NULL
           AND c.criado_em >= NOW() - INTERVAL '1 month'),
        (SELECT COUNT(*) FROM cotacoes cot
         JOIN cestas c ON cot.cesta_id = c.id
         JOIN secretarias sec ON c.secretaria_id = sec.id
         WHERE sec.municipio_id = p_municipio_id AND cot.deletado_em IS NULL
           AND cot.criado_em >= NOW() - INTERVAL '1 month'),
        NOW(),
        NOW()
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

-- =============================================================================
-- FIM — Script idempotente, seguro para reaplicar.
-- =============================================================================
