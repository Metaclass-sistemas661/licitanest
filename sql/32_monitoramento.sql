-- ============================================================
-- 32_monitoramento.sql — Fase 3: Monitoramento Geral do Sistema
-- Tabelas para erros, métricas, health checks e resultados de testes
-- ============================================================

-- Schema dedicado ao SuperAdmin (criado em migrações anteriores se necessário)
CREATE SCHEMA IF NOT EXISTS superadmin;

-- ────────────────────────────────────────────────────────────
-- 1. Erros capturados (frontend + API + cloud functions)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS superadmin.erros_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origem VARCHAR(20) NOT NULL CHECK (origem IN ('frontend', 'api', 'cloud_function', 'cron', 'webhook')),
  severidade VARCHAR(10) NOT NULL CHECK (severidade IN ('critical', 'error', 'warning', 'info')),
  mensagem TEXT NOT NULL,
  stack_trace TEXT,
  arquivo VARCHAR(500),
  linha INTEGER,
  coluna INTEGER,
  funcao VARCHAR(300),
  modulo VARCHAR(200),
  url_requisicao VARCHAR(2000),
  metodo_http VARCHAR(10),
  status_http INTEGER,
  request_body JSONB,
  response_body JSONB,
  headers JSONB,
  usuario_id UUID,
  municipio_id UUID,
  user_agent TEXT,
  ip_address INET,
  browser VARCHAR(100),
  os VARCHAR(100),
  fingerprint VARCHAR(64),
  ocorrencias INTEGER DEFAULT 1,
  primeira_ocorrencia TIMESTAMPTZ DEFAULT now(),
  ultima_ocorrencia TIMESTAMPTZ DEFAULT now(),
  resolvido BOOLEAN DEFAULT false,
  resolvido_por UUID,
  resolvido_em TIMESTAMPTZ,
  notas_resolucao TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_erros_origem ON superadmin.erros_sistema(origem);
CREATE INDEX IF NOT EXISTS idx_erros_severidade ON superadmin.erros_sistema(severidade);
CREATE INDEX IF NOT EXISTS idx_erros_resolvido ON superadmin.erros_sistema(resolvido);
CREATE INDEX IF NOT EXISTS idx_erros_fingerprint ON superadmin.erros_sistema(fingerprint);
CREATE INDEX IF NOT EXISTS idx_erros_created ON superadmin.erros_sistema(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_erros_municipio ON superadmin.erros_sistema(municipio_id);
CREATE INDEX IF NOT EXISTS idx_erros_sev_resolvido ON superadmin.erros_sistema(severidade, resolvido) WHERE resolvido = false;

-- ────────────────────────────────────────────────────────────
-- 2. Métricas de saúde do sistema
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS superadmin.metricas_sistema (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT now(),
  tipo VARCHAR(30) NOT NULL,
  valor NUMERIC NOT NULL,
  unidade VARCHAR(20),
  labels JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_metricas_tipo_ts ON superadmin.metricas_sistema(tipo, timestamp DESC);

-- ────────────────────────────────────────────────────────────
-- 3. Resultados de health checks
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS superadmin.health_checks (
  id BIGSERIAL PRIMARY KEY,
  servico VARCHAR(50) NOT NULL,
  status VARCHAR(10) NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
  latencia_ms INTEGER,
  detalhes JSONB,
  verificado_em TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_health_servico ON superadmin.health_checks(servico, verificado_em DESC);

-- ────────────────────────────────────────────────────────────
-- 4. Resultados de testes automatizados
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS superadmin.resultados_testes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suite VARCHAR(100) NOT NULL,
  teste VARCHAR(300) NOT NULL,
  status VARCHAR(10) NOT NULL CHECK (status IN ('pass', 'fail', 'skip', 'error')),
  duracao_ms INTEGER,
  mensagem_erro TEXT,
  stack_trace TEXT,
  executado_por UUID,
  executado_em TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_testes_suite ON superadmin.resultados_testes(suite, executado_em DESC);

-- ────────────────────────────────────────────────────────────
-- 5. Regras de alerta configuráveis
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS superadmin.regras_alerta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(200) NOT NULL,
  condicao VARCHAR(50) NOT NULL,
  parametros JSONB DEFAULT '{}',
  ativo BOOLEAN DEFAULT true,
  canais JSONB DEFAULT '["in_app"]',
  criado_por UUID,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 6. Alertas disparados
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS superadmin.alertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regra_id UUID REFERENCES superadmin.regras_alerta(id),
  severidade VARCHAR(10) NOT NULL DEFAULT 'warning',
  titulo VARCHAR(300) NOT NULL,
  descricao TEXT,
  lido BOOLEAN DEFAULT false,
  lido_em TIMESTAMPTZ,
  referencia_tipo VARCHAR(50),
  referencia_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alertas_lido ON superadmin.alertas(lido, created_at DESC);

-- ────────────────────────────────────────────────────────────
-- Particionamento automático de métricas (retenção 90 dias)
-- ────────────────────────────────────────────────────────────
-- Em produção, configurar pg_partman ou cron para:
-- DELETE FROM superadmin.metricas_sistema WHERE timestamp < now() - INTERVAL '90 days';
-- DELETE FROM superadmin.health_checks WHERE verificado_em < now() - INTERVAL '90 days';
