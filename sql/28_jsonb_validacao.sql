-- =============================================================================
-- LICITANEST — 28. Validação de Schema JSONB (Fase 13.1)
-- =============================================================================
-- CHECK constraints para campos JSONB que exigem estrutura conhecida.
-- Campos genéricos (audit_log.dados_*, atividades.dados_extra) ficam sem
-- constraint por design — são logs de formato livre.
-- =============================================================================

-- ── 1. perfis.permissoes ────────────────────────────────────────────────────
-- Estrutura esperada: { "admin": true|false, "cestas": "crud"|"read"|"none", ... }
-- Chaves válidas: admin, cestas, catalogo, fornecedores, cotacoes, relatorios, configuracoes
-- Valores: boolean (admin) ou "crud"|"read"|"none" (demais)

CREATE OR REPLACE FUNCTION validar_permissoes_perfil(p JSONB) RETURNS BOOLEAN AS $$
BEGIN
  -- Deve ser objeto
  IF jsonb_typeof(p) != 'object' THEN RETURN FALSE; END IF;

  -- Todas as chaves devem estar no conjunto permitido
  IF EXISTS (
    SELECT 1 FROM jsonb_object_keys(p) k
    WHERE k NOT IN ('admin', 'cestas', 'catalogo', 'fornecedores', 'cotacoes', 'relatorios', 'configuracoes')
  ) THEN RETURN FALSE; END IF;

  -- 'admin' deve ser boolean se presente
  IF p ? 'admin' AND jsonb_typeof(p->'admin') != 'boolean' THEN RETURN FALSE; END IF;

  -- Demais chaves devem ser string com valor crud|read|none
  IF EXISTS (
    SELECT 1 FROM jsonb_each_text(p) kv
    WHERE kv.key != 'admin'
      AND kv.value NOT IN ('crud', 'read', 'none')
  ) THEN RETURN FALSE; END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

ALTER TABLE perfis ADD CONSTRAINT chk_permissoes_schema
  CHECK (validar_permissoes_perfil(permissoes));

-- ── 2. chaves_api_externa.permissoes ────────────────────────────────────────
-- Estrutura esperada: array de strings com valores permitidos

CREATE OR REPLACE FUNCTION validar_permissoes_api(p JSONB) RETURNS BOOLEAN AS $$
BEGIN
  IF jsonb_typeof(p) != 'array' THEN RETURN FALSE; END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(p) v
    WHERE v NOT IN ('leitura', 'escrita', 'admin')
  ) THEN RETURN FALSE; END IF;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chaves_api_externa') THEN
    ALTER TABLE chaves_api_externa ADD CONSTRAINT chk_permissoes_api_schema
      CHECK (validar_permissoes_api(permissoes));
  END IF;
END $$;

-- ── 3. interacoes_ia.dados_contexto ─────────────────────────────────────────
-- Adicionar coluna se não existir (usada no código mas ausente no schema original)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'interacoes_ia' AND column_name = 'dados_contexto'
  ) THEN
    ALTER TABLE interacoes_ia ADD COLUMN dados_contexto JSONB;
  END IF;
END $$;

-- Estrutura esperada: objeto com chaves opcionais conhecidas
-- { cesta_id?, produto_id?, cotacao_id?, fonte_id?, itens?: [...] }
CREATE OR REPLACE FUNCTION validar_dados_contexto_ia(d JSONB) RETURNS BOOLEAN AS $$
BEGIN
  IF d IS NULL THEN RETURN TRUE; END IF;
  IF jsonb_typeof(d) != 'object' THEN RETURN FALSE; END IF;
  -- Não permitir objetos excessivamente grandes (proteção contra abuso)
  IF length(d::text) > 10000 THEN RETURN FALSE; END IF;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

ALTER TABLE interacoes_ia ADD CONSTRAINT chk_dados_contexto_schema
  CHECK (validar_dados_contexto_ia(dados_contexto));

-- ── 4. importacoes_lote.erros ───────────────────────────────────────────────
-- Estrutura esperada: array de objetos { linha?, mensagem, campo? }

ALTER TABLE importacoes_lote ADD CONSTRAINT chk_erros_array
  CHECK (jsonb_typeof(erros) = 'array');

-- ── 5. planos.funcionalidades ───────────────────────────────────────────────
-- Estrutura esperada: array de strings

ALTER TABLE planos ADD CONSTRAINT chk_funcionalidades_array
  CHECK (jsonb_typeof(funcionalidades) = 'array');

-- ── 6. Adicionar coluna status em interacoes_ia se ausente ──────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'interacoes_ia' AND column_name = 'status'
  ) THEN
    ALTER TABLE interacoes_ia ADD COLUMN status VARCHAR(20) DEFAULT 'processando';
  END IF;
END $$;
