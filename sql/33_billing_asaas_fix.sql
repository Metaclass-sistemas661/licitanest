-- =============================================================================
-- LICITANEST — 33. Correções Billing + Integração Asaas
-- =============================================================================
-- Corrige inconsistências entre Cloud Function, API, frontend e DB schema.
-- Adiciona campos necessários e índice UNIQUE para idempotência de webhook.
-- =============================================================================

-- ── 1. Atualizar CHECK constraint de faturas para aceitar status do webhook ──
-- O webhook Asaas grava 'estornada' e 'cancelada' além dos 4 originais

ALTER TABLE faturas DROP CONSTRAINT IF EXISTS faturas_status_check;
ALTER TABLE faturas ADD CONSTRAINT faturas_status_check
  CHECK (status IN ('pendente', 'paga', 'vencida', 'cancelada', 'estornada'));

-- ── 2. UNIQUE index para idempotência de billing_eventos ─────────────────────
-- A Cloud Function faz ON CONFLICT (asaas_event_id) — requer UNIQUE

CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_eventos_asaas_event_id
  ON billing_eventos(asaas_event_id)
  WHERE asaas_event_id IS NOT NULL;

-- ── 3. Adicionar coluna atualizado_em em faturas (se não existir) ────────────
-- A migration 31 já adicionou essa coluna, mas garantir existência

ALTER TABLE faturas ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ DEFAULT NOW();

-- ── 4. Adicionar contrato_id e parcela em faturas (se não existir) ───────────
-- A migration 31 já adicionou, mas garantir

ALTER TABLE faturas ADD COLUMN IF NOT EXISTS contrato_id UUID REFERENCES contratos(id);
ALTER TABLE faturas ADD COLUMN IF NOT EXISTS parcela INTEGER DEFAULT 1;
ALTER TABLE faturas ADD COLUMN IF NOT EXISTS comprovante_url TEXT;
ALTER TABLE faturas ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- ── 5. Relaxar assinatura_id NOT NULL em faturas ────────────────────────────
-- Faturas de contratos governamentais não têm assinatura vinculada

ALTER TABLE faturas ALTER COLUMN assinatura_id DROP NOT NULL;

-- ── 6. Adicionar campo url_boleto_pix para o Asaas ────────────────────────
-- O Asaas pode retornar invoiceUrl (link de pagamento genérico)

ALTER TABLE faturas ADD COLUMN IF NOT EXISTS url_pagamento TEXT;
ALTER TABLE faturas ADD COLUMN IF NOT EXISTS asaas_status TEXT;

-- ── 7. Atualizar status inconsistentes já gravados ─────────────────────────
-- Cloud Function escrevia 'pago'/'vencido'/'estornado'/'cancelado' (masculino)
-- Padronizar para feminino conforme constraint

UPDATE faturas SET status = 'paga' WHERE status = 'pago';
UPDATE faturas SET status = 'vencida' WHERE status = 'vencido';
UPDATE faturas SET status = 'estornada' WHERE status = 'estornado';
UPDATE faturas SET status = 'cancelada' WHERE status = 'cancelado';

-- ── 8. Tabela de sincronização Asaas ─────────────────────────────────────
-- Armazena última sincronização e resumo financeiro do Asaas

CREATE TABLE IF NOT EXISTS superadmin.asaas_sync (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo              VARCHAR(30) NOT NULL, -- 'payments', 'customers', 'subscriptions'
  ultima_sync       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_registros   INTEGER NOT NULL DEFAULT 0,
  resumo            JSONB NOT NULL DEFAULT '{}',
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asaas_sync_tipo ON superadmin.asaas_sync(tipo);

COMMENT ON TABLE superadmin.asaas_sync IS 'Registro de sincronizações com a API do Asaas';
