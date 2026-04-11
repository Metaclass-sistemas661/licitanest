-- =============================================================================
-- LICITANEST — 22. Row-Level Security (RLS) — Isolamento Multi-Tenant COMPLETO
-- =============================================================================
-- OBRIGATÓRIO: A aplicação deve executar no início de cada transação autenticada:
--   SET LOCAL app.current_municipio_id = '<uuid-do-municipio>';
--
-- 34 tabelas protegidas, 0 furos de isolamento.
-- Tabelas GLOBAIS (sem RLS): categorias, unidades_medida, elementos_despesa,
--   catmat_catser, produtos_catalogo, fontes, dados_fonte_*, execucoes_crawler,
--   cache_consultas, indices_*, planos, rate_limits
-- =============================================================================

-- ══════════════════════════════════════════════════════════════════════════════
-- ROLE DA APLICAÇÃO (revogar superuser)
-- ══════════════════════════════════════════════════════════════════════════════

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

-- Revogar mutações no audit_log (append-only TCU/TCE)
REVOKE UPDATE, DELETE ON audit_log FROM app_user;

-- ══════════════════════════════════════════════════════════════════════════════
-- GRUPO 1: TABELAS COM municipio_id DIRETO (8 tabelas)
-- Política: USING (municipio_id = current_municipio_id())
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. secretarias
ALTER TABLE secretarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE secretarias FORCE ROW LEVEL SECURITY;
CREATE POLICY secretarias_tenant ON secretarias
  USING (municipio_id = current_municipio_id())
  WITH CHECK (municipio_id = current_municipio_id());

-- 2. fornecedores
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores FORCE ROW LEVEL SECURITY;
CREATE POLICY fornecedores_tenant ON fornecedores
  USING (municipio_id = current_municipio_id())
  WITH CHECK (municipio_id = current_municipio_id());

-- 3. cidades_regiao
ALTER TABLE cidades_regiao ENABLE ROW LEVEL SECURITY;
ALTER TABLE cidades_regiao FORCE ROW LEVEL SECURITY;
CREATE POLICY cidades_regiao_tenant ON cidades_regiao
  USING (municipio_id = current_municipio_id())
  WITH CHECK (municipio_id = current_municipio_id());

-- 4. assinaturas
ALTER TABLE assinaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE assinaturas FORCE ROW LEVEL SECURITY;
CREATE POLICY assinaturas_tenant ON assinaturas
  USING (municipio_id = current_municipio_id())
  WITH CHECK (municipio_id = current_municipio_id());

-- 5. faturas
ALTER TABLE faturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE faturas FORCE ROW LEVEL SECURITY;
CREATE POLICY faturas_tenant ON faturas
  USING (municipio_id = current_municipio_id())
  WITH CHECK (municipio_id = current_municipio_id());

-- 6. metricas_uso_municipio
ALTER TABLE metricas_uso_municipio ENABLE ROW LEVEL SECURITY;
ALTER TABLE metricas_uso_municipio FORCE ROW LEVEL SECURITY;
CREATE POLICY metricas_tenant ON metricas_uso_municipio
  USING (municipio_id = current_municipio_id())
  WITH CHECK (municipio_id = current_municipio_id());

-- 7. api_keys
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys FORCE ROW LEVEL SECURITY;
CREATE POLICY api_keys_tenant ON api_keys
  USING (municipio_id = current_municipio_id())
  WITH CHECK (municipio_id = current_municipio_id());

-- 8. billing_eventos
ALTER TABLE billing_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_eventos FORCE ROW LEVEL SECURITY;
CREATE POLICY billing_eventos_tenant ON billing_eventos
  USING (municipio_id = current_municipio_id())
  WITH CHECK (municipio_id = current_municipio_id());

-- ══════════════════════════════════════════════════════════════════════════════
-- GRUPO 2: TABELAS COM municipio_id ADICIONADO (7 tabelas)
-- Auto-preenchido pelo trigger preencher_municipio_id()
-- ══════════════════════════════════════════════════════════════════════════════

-- 9. audit_log (municipio_id NULLABLE para entradas de sistema)
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;
CREATE POLICY audit_log_tenant ON audit_log
  USING (municipio_id = current_municipio_id());

-- 10. atividades
ALTER TABLE atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE atividades FORCE ROW LEVEL SECURITY;
CREATE POLICY atividades_tenant ON atividades
  USING (municipio_id = current_municipio_id())
  WITH CHECK (municipio_id = current_municipio_id());

-- 11. emails_enviados
ALTER TABLE emails_enviados ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails_enviados FORCE ROW LEVEL SECURITY;
CREATE POLICY emails_tenant ON emails_enviados
  USING (municipio_id = current_municipio_id())
  WITH CHECK (municipio_id = current_municipio_id());

-- 12. assinaturas_eletronicas
ALTER TABLE assinaturas_eletronicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE assinaturas_eletronicas FORCE ROW LEVEL SECURITY;
CREATE POLICY assinaturas_eletronicas_tenant ON assinaturas_eletronicas
  USING (municipio_id = current_municipio_id())
  WITH CHECK (municipio_id = current_municipio_id());

-- 13. dispositivos_fcm
ALTER TABLE dispositivos_fcm ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispositivos_fcm FORCE ROW LEVEL SECURITY;
CREATE POLICY dispositivos_fcm_tenant ON dispositivos_fcm
  USING (municipio_id = current_municipio_id())
  WITH CHECK (municipio_id = current_municipio_id());

-- 14. importacoes_lote
ALTER TABLE importacoes_lote ENABLE ROW LEVEL SECURITY;
ALTER TABLE importacoes_lote FORCE ROW LEVEL SECURITY;
CREATE POLICY importacoes_lote_tenant ON importacoes_lote
  USING (municipio_id = current_municipio_id())
  WITH CHECK (municipio_id = current_municipio_id());

-- 15. api_log
ALTER TABLE api_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_log FORCE ROW LEVEL SECURITY;
CREATE POLICY api_log_tenant ON api_log
  USING (municipio_id = current_municipio_id())
  WITH CHECK (municipio_id = current_municipio_id());

-- ══════════════════════════════════════════════════════════════════════════════
-- GRUPO 3: TABELAS VIA secretaria_id → secretarias (2 tabelas)
-- ══════════════════════════════════════════════════════════════════════════════

-- 16. servidores
ALTER TABLE servidores ENABLE ROW LEVEL SECURITY;
ALTER TABLE servidores FORCE ROW LEVEL SECURITY;
CREATE POLICY servidores_tenant ON servidores
  USING (secretaria_id IN (
    SELECT id FROM secretarias WHERE municipio_id = current_municipio_id()
  ))
  WITH CHECK (secretaria_id IN (
    SELECT id FROM secretarias WHERE municipio_id = current_municipio_id()
  ));

-- 17. cestas
ALTER TABLE cestas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cestas FORCE ROW LEVEL SECURITY;
CREATE POLICY cestas_tenant ON cestas
  USING (secretaria_id IN (
    SELECT id FROM secretarias WHERE municipio_id = current_municipio_id()
  ))
  WITH CHECK (secretaria_id IN (
    SELECT id FROM secretarias WHERE municipio_id = current_municipio_id()
  ));

-- ══════════════════════════════════════════════════════════════════════════════
-- GRUPO 4: TABELAS VIA cesta_id → cestas → secretarias (6 tabelas)
-- ══════════════════════════════════════════════════════════════════════════════

-- 18. lotes_cesta
ALTER TABLE lotes_cesta ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotes_cesta FORCE ROW LEVEL SECURITY;
CREATE POLICY lotes_cesta_tenant ON lotes_cesta
  USING (cesta_id IN (
    SELECT c.id FROM cestas c
    JOIN secretarias sec ON c.secretaria_id = sec.id
    WHERE sec.municipio_id = current_municipio_id()
  ));

-- 19. itens_cesta
ALTER TABLE itens_cesta ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_cesta FORCE ROW LEVEL SECURITY;
CREATE POLICY itens_cesta_tenant ON itens_cesta
  USING (cesta_id IN (
    SELECT c.id FROM cestas c
    JOIN secretarias sec ON c.secretaria_id = sec.id
    WHERE sec.municipio_id = current_municipio_id()
  ));

-- 20. cestas_versoes
ALTER TABLE cestas_versoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cestas_versoes FORCE ROW LEVEL SECURITY;
CREATE POLICY cestas_versoes_tenant ON cestas_versoes
  USING (cesta_id IN (
    SELECT c.id FROM cestas c
    JOIN secretarias sec ON c.secretaria_id = sec.id
    WHERE sec.municipio_id = current_municipio_id()
  ));

-- 21. relatorios_gerados
ALTER TABLE relatorios_gerados ENABLE ROW LEVEL SECURITY;
ALTER TABLE relatorios_gerados FORCE ROW LEVEL SECURITY;
CREATE POLICY relatorios_tenant ON relatorios_gerados
  USING (cesta_id IN (
    SELECT c.id FROM cestas c
    JOIN secretarias sec ON c.secretaria_id = sec.id
    WHERE sec.municipio_id = current_municipio_id()
  ));

-- 22. tramitacoes_cesta
ALTER TABLE tramitacoes_cesta ENABLE ROW LEVEL SECURITY;
ALTER TABLE tramitacoes_cesta FORCE ROW LEVEL SECURITY;
CREATE POLICY tramitacoes_tenant ON tramitacoes_cesta
  USING (cesta_id IN (
    SELECT c.id FROM cestas c
    JOIN secretarias sec ON c.secretaria_id = sec.id
    WHERE sec.municipio_id = current_municipio_id()
  ));

-- 23. checklist_conformidade
ALTER TABLE checklist_conformidade ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_conformidade FORCE ROW LEVEL SECURITY;
CREATE POLICY checklist_tenant ON checklist_conformidade
  USING (cesta_id IN (
    SELECT c.id FROM cestas c
    JOIN secretarias sec ON c.secretaria_id = sec.id
    WHERE sec.municipio_id = current_municipio_id()
  ));

-- ══════════════════════════════════════════════════════════════════════════════
-- GRUPO 5: TABELAS VIA item_cesta_id / preco_item_id (deep chain, 2 tabelas)
-- ══════════════════════════════════════════════════════════════════════════════

-- 24. precos_item (via itens_cesta → cestas → secretarias)
ALTER TABLE precos_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE precos_item FORCE ROW LEVEL SECURITY;
CREATE POLICY precos_item_tenant ON precos_item
  USING (item_cesta_id IN (
    SELECT ic.id FROM itens_cesta ic
    JOIN cestas c ON ic.cesta_id = c.id
    JOIN secretarias sec ON c.secretaria_id = sec.id
    WHERE sec.municipio_id = current_municipio_id()
  ));

-- 25. documentos_comprobatorios (via precos_item → itens_cesta → cestas → secretarias)
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

-- ══════════════════════════════════════════════════════════════════════════════
-- GRUPO 6: TABELAS VIA cotacao_id → cotacoes → cestas → secretarias (4 tabelas)
-- ══════════════════════════════════════════════════════════════════════════════

-- 26. cotacoes
ALTER TABLE cotacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotacoes FORCE ROW LEVEL SECURITY;
CREATE POLICY cotacoes_tenant ON cotacoes
  USING (cesta_id IN (
    SELECT c.id FROM cestas c
    JOIN secretarias sec ON c.secretaria_id = sec.id
    WHERE sec.municipio_id = current_municipio_id()
  ));

-- 27. cotacao_itens
ALTER TABLE cotacao_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotacao_itens FORCE ROW LEVEL SECURITY;
CREATE POLICY cotacao_itens_tenant ON cotacao_itens
  USING (cotacao_id IN (
    SELECT cot.id FROM cotacoes cot
    JOIN cestas c ON cot.cesta_id = c.id
    JOIN secretarias sec ON c.secretaria_id = sec.id
    WHERE sec.municipio_id = current_municipio_id()
  ));

-- 28. cotacao_fornecedores
ALTER TABLE cotacao_fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotacao_fornecedores FORCE ROW LEVEL SECURITY;
CREATE POLICY cotacao_fornecedores_tenant ON cotacao_fornecedores
  USING (cotacao_id IN (
    SELECT cot.id FROM cotacoes cot
    JOIN cestas c ON cot.cesta_id = c.id
    JOIN secretarias sec ON c.secretaria_id = sec.id
    WHERE sec.municipio_id = current_municipio_id()
  ));

-- 29. cotacao_lancamentos_manuais
ALTER TABLE cotacao_lancamentos_manuais ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotacao_lancamentos_manuais FORCE ROW LEVEL SECURITY;
CREATE POLICY cotacao_lancamentos_tenant ON cotacao_lancamentos_manuais
  USING (cotacao_id IN (
    SELECT cot.id FROM cotacoes cot
    JOIN cestas c ON cot.cesta_id = c.id
    JOIN secretarias sec ON c.secretaria_id = sec.id
    WHERE sec.municipio_id = current_municipio_id()
  ));

-- ══════════════════════════════════════════════════════════════════════════════
-- GRUPO 7: TABELAS VIA cotacao_fornecedor_id (deep chain, 1 tabela)
-- ══════════════════════════════════════════════════════════════════════════════

-- 30. respostas_cotacao
ALTER TABLE respostas_cotacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE respostas_cotacao FORCE ROW LEVEL SECURITY;
CREATE POLICY respostas_cotacao_tenant ON respostas_cotacao
  USING (cotacao_fornecedor_id IN (
    SELECT cf.id FROM cotacao_fornecedores cf
    JOIN cotacoes cot ON cf.cotacao_id = cot.id
    JOIN cestas c ON cot.cesta_id = c.id
    JOIN secretarias sec ON c.secretaria_id = sec.id
    WHERE sec.municipio_id = current_municipio_id()
  ));

-- ══════════════════════════════════════════════════════════════════════════════
-- GRUPO 8: TABELAS VIA servidor_id → servidores → secretarias (4 tabelas)
-- ══════════════════════════════════════════════════════════════════════════════

-- 31. consentimentos_lgpd
ALTER TABLE consentimentos_lgpd ENABLE ROW LEVEL SECURITY;
ALTER TABLE consentimentos_lgpd FORCE ROW LEVEL SECURITY;
CREATE POLICY consentimentos_tenant ON consentimentos_lgpd
  USING (servidor_id IN (
    SELECT s.id FROM servidores s
    JOIN secretarias sec ON s.secretaria_id = sec.id
    WHERE sec.municipio_id = current_municipio_id()
  ));

-- 32. solicitacoes_lgpd
ALTER TABLE solicitacoes_lgpd ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitacoes_lgpd FORCE ROW LEVEL SECURITY;
CREATE POLICY solicitacoes_lgpd_tenant ON solicitacoes_lgpd
  USING (servidor_id IN (
    SELECT s.id FROM servidores s
    JOIN secretarias sec ON s.secretaria_id = sec.id
    WHERE sec.municipio_id = current_municipio_id()
  ));

-- 33. interacoes_ia
ALTER TABLE interacoes_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE interacoes_ia FORCE ROW LEVEL SECURITY;
CREATE POLICY interacoes_ia_tenant ON interacoes_ia
  USING (servidor_id IN (
    SELECT s.id FROM servidores s
    JOIN secretarias sec ON s.secretaria_id = sec.id
    WHERE sec.municipio_id = current_municipio_id()
  ));

-- 34. solicitacoes_catalogo
ALTER TABLE solicitacoes_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitacoes_catalogo FORCE ROW LEVEL SECURITY;
CREATE POLICY solicitacoes_catalogo_tenant ON solicitacoes_catalogo
  USING (solicitante_id IN (
    SELECT s.id FROM servidores s
    JOIN secretarias sec ON s.secretaria_id = sec.id
    WHERE sec.municipio_id = current_municipio_id()
  ));

-- ══════════════════════════════════════════════════════════════════════════════
-- RESUMO DE COBERTURA
-- ══════════════════════════════════════════════════════════════════════════════
-- ✅ 34 tabelas com RLS ativado e FORCE habilitado
-- ✅ 8 tabelas com municipio_id direto
-- ✅ 7 tabelas com municipio_id adicionado + auto-preenchimento via trigger
-- ✅ 2 tabelas via secretaria_id
-- ✅ 6 tabelas via cesta_id
-- ✅ 2 tabelas via item_cesta_id / preco_item_id
-- ✅ 4 tabelas via cotacao_id
-- ✅ 1 tabela via cotacao_fornecedor_id
-- ✅ 4 tabelas via servidor_id
--
-- 🔓 Tabelas GLOBAIS (sem RLS — correto por design):
--    categorias, unidades_medida, elementos_despesa, catmat_catser,
--    produtos_catalogo, fontes, dados_fonte_pncp, dados_fonte_painel,
--    dados_fonte_tce, dados_fonte_bps, dados_fonte_sinapi, dados_fonte_conab,
--    dados_fonte_ceasa, dados_fonte_cmed, execucoes_crawler, cache_consultas,
--    indices_correcao, log_importacao_indices, indices_atualizacoes_log,
--    planos, municipios, usuarios, perfis, rate_limits
-- =============================================================================
