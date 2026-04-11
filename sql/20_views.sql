-- =============================================================================
-- LICITANEST — 20. Views
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
