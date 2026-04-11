-- =============================================================================
-- LICITANEST — 21. Triggers
-- =============================================================================
-- Inclui: timestamp automático, auto-preenchimento municipio_id,
-- auditoria imutável (hash chain), auto-audit em tabelas sensíveis,
-- política de retenção LGPD
-- =============================================================================

-- ══════════════════════════════════════════════════════════════════════════════
-- TRIGGERS DE TIMESTAMP (atualizado_em)
-- ══════════════════════════════════════════════════════════════════════════════

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

-- ══════════════════════════════════════════════════════════════════════════════
-- TRIGGERS DE AUTO-PREENCHIMENTO municipio_id (a partir da sessão RLS)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TRIGGER trg_audit_log_municipio BEFORE INSERT ON audit_log
    FOR EACH ROW EXECUTE FUNCTION preencher_municipio_id();
CREATE TRIGGER trg_atividades_municipio BEFORE INSERT ON atividades
    FOR EACH ROW EXECUTE FUNCTION preencher_municipio_id();
CREATE TRIGGER trg_emails_municipio BEFORE INSERT ON emails_enviados
    FOR EACH ROW EXECUTE FUNCTION preencher_municipio_id();
CREATE TRIGGER trg_assinaturas_elet_municipio BEFORE INSERT ON assinaturas_eletronicas
    FOR EACH ROW EXECUTE FUNCTION preencher_municipio_id();
CREATE TRIGGER trg_dispositivos_municipio BEFORE INSERT ON dispositivos_fcm
    FOR EACH ROW EXECUTE FUNCTION preencher_municipio_id();
CREATE TRIGGER trg_importacoes_municipio BEFORE INSERT ON importacoes_lote
    FOR EACH ROW EXECUTE FUNCTION preencher_municipio_id();
CREATE TRIGGER trg_api_log_municipio BEFORE INSERT ON api_log
    FOR EACH ROW EXECUTE FUNCTION preencher_municipio_id();
CREATE TRIGGER trg_billing_municipio BEFORE INSERT ON billing_eventos
    FOR EACH ROW EXECUTE FUNCTION preencher_municipio_id();

-- ══════════════════════════════════════════════════════════════════════════════
-- AUDITORIA IMUTÁVEL — Hash Chain SHA-256 (TCU/TCE)
-- ══════════════════════════════════════════════════════════════════════════════

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

-- Rejeitar UPDATE e DELETE no audit_log (imutabilidade)
CREATE OR REPLACE FUNCTION audit_log_imutavel() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log é imutável: operações UPDATE e DELETE não são permitidas (exigência TCU/TCE)';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_imutavel BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_imutavel();

-- ══════════════════════════════════════════════════════════════════════════════
-- AUDITORIA AUTOMÁTICA — Trigger genérico para tabelas sensíveis
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION audit_trigger_func() RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_log (acao, tabela, registro_id, dados_novos, municipio_id)
    VALUES ('INSERT', TG_TABLE_NAME, NEW.id::text, to_jsonb(NEW), current_municipio_id());
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_log (acao, tabela, registro_id, dados_anteriores, dados_novos, municipio_id)
    VALUES ('UPDATE', TG_TABLE_NAME, NEW.id::text, to_jsonb(OLD), to_jsonb(NEW), current_municipio_id());
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_log (acao, tabela, registro_id, dados_anteriores, municipio_id)
    VALUES ('DELETE', TG_TABLE_NAME, OLD.id::text, to_jsonb(OLD), current_municipio_id());
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

-- ══════════════════════════════════════════════════════════════════════════════
-- POLÍTICA DE RETENÇÃO DE DADOS (LGPD)
-- ══════════════════════════════════════════════════════════════════════════════

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
