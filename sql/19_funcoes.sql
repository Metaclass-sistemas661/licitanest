-- =============================================================================
-- LICITANEST — 19. Funções Auxiliares
-- =============================================================================

-- Atualizar timestamp automaticamente
CREATE OR REPLACE FUNCTION atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper: retorna municipio_id configurado na sessão RLS
CREATE OR REPLACE FUNCTION current_municipio_id() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.current_municipio_id', true), '')::UUID;
$$ LANGUAGE sql STABLE;

-- Auto-preencher municipio_id a partir da sessão RLS
-- Aplicado em tabelas que receberam municipio_id para isolamento
CREATE OR REPLACE FUNCTION preencher_municipio_id() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.municipio_id IS NULL THEN
        NEW.municipio_id := current_municipio_id();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
        servidor_id, municipio_id, acao, tabela, registro_id,
        dados_anteriores, dados_novos, ip_address, user_agent
    ) VALUES (
        p_servidor_id, current_municipio_id(), p_acao, p_tabela, p_registro_id,
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
