#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# LicitaNest — Backup & Disaster Recovery Automation
# ═══════════════════════════════════════════════════════════════════════
# Este script configura backups automatizados no Google Cloud SQL
# e exportação periódica para Cloud Storage.
#
# Uso:
#   chmod +x scripts/setup-backup-dr.sh
#   ./scripts/setup-backup-dr.sh
#
# Pré-requisitos:
#   - gcloud CLI autenticado com permissões de admin
#   - Projeto GCP ativo: sistema-de-gestao-16e15
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-sistema-de-gestao-16e15}"
REGION="southamerica-east1"
INSTANCE="licitanest-db"
BACKUP_BUCKET="gs://${PROJECT_ID}-db-backups"

echo "══ 1/5 — Configurar backup automático diário no Cloud SQL ══"
gcloud sql instances patch "$INSTANCE" \
  --backup-start-time="03:00" \
  --enable-bin-log \
  --retained-backups-count=30 \
  --retained-transaction-log-days=7 \
  --project="$PROJECT_ID" \
  --quiet

echo "✓ Backup automático: diário às 03:00 UTC, retenção de 30 dias"

echo ""
echo "══ 2/5 — Habilitar Point-in-Time Recovery (PITR) ══"
gcloud sql instances patch "$INSTANCE" \
  --enable-point-in-time-recovery \
  --project="$PROJECT_ID" \
  --quiet

echo "✓ PITR habilitado: restauração para qualquer ponto nos últimos 7 dias"

echo ""
echo "══ 3/5 — Criar bucket de export (se não existir) ══"
gsutil ls "$BACKUP_BUCKET" 2>/dev/null || \
  gsutil mb -p "$PROJECT_ID" -l "$REGION" -b on "$BACKUP_BUCKET"

# Lifecycle: limpar exports com mais de 90 dias
cat > /tmp/lifecycle.json << 'EOF'
{
  "rule": [{
    "action": {"type": "Delete"},
    "condition": {"age": 90}
  }]
}
EOF
gsutil lifecycle set /tmp/lifecycle.json "$BACKUP_BUCKET"

echo "✓ Bucket: $BACKUP_BUCKET (retenção 90 dias)"

echo ""
echo "══ 4/5 — Dar permissão ao Cloud SQL para escrever no bucket ══"
SA_EMAIL=$(gcloud sql instances describe "$INSTANCE" \
  --project="$PROJECT_ID" \
  --format="value(serviceAccountEmailAddress)")

gsutil iam ch "serviceAccount:${SA_EMAIL}:objectCreator" "$BACKUP_BUCKET"

echo "✓ Service account $SA_EMAIL com permissão de escrita"

echo ""
echo "══ 5/5 — Criar Cloud Scheduler para export semanal ══"

# Criar job que exporta SQL dump toda segunda às 04:00 UTC
gcloud scheduler jobs create http "licitanest-db-weekly-export" \
  --schedule="0 4 * * 1" \
  --uri="https://sqladmin.googleapis.com/sql/v1beta4/projects/${PROJECT_ID}/instances/${INSTANCE}/export" \
  --http-method=POST \
  --message-body="{
    \"exportContext\": {
      \"fileType\": \"SQL\",
      \"uri\": \"${BACKUP_BUCKET}/weekly/licitanest-\$(date +%Y%m%d).sql.gz\",
      \"databases\": [\"licitanest\"],
      \"offload\": true
    }
  }" \
  --oauth-service-account-email="${SA_EMAIL}" \
  --location="$REGION" \
  --project="$PROJECT_ID" \
  --quiet 2>/dev/null || echo "⚠ Job já existe — pulando criação"

echo "✓ Export semanal configurado: toda segunda às 04:00 UTC"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  BACKUP & DR — CONFIGURAÇÃO COMPLETA"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "  Estratégia de backup (3 camadas):"
echo "  ┌─────────────────────────────────────────────────┐"
echo "  │ 1. Cloud SQL Automático  │ Diário 03:00 UTC    │"
echo "  │    Retenção: 30 dias     │ PITR: 7 dias        │"
echo "  ├─────────────────────────────────────────────────┤"
echo "  │ 2. Export SQL → GCS      │ Semanal 04:00 seg   │"
echo "  │    Bucket: $BACKUP_BUCKET                      │"
echo "  │    Retenção: 90 dias     │ Lifecycle automático │"
echo "  ├─────────────────────────────────────────────────┤"
echo "  │ 3. Cloud SQL Replicas    │ Configurar manual    │"
echo "  │    (opcional HA)         │ Ver comandos abaixo  │"
echo "  └─────────────────────────────────────────────────┘"
echo ""
echo "  ── Comandos de recuperação ──"
echo ""
echo "  # Restaurar último backup automático:"
echo "  gcloud sql backups list --instance=$INSTANCE"
echo "  gcloud sql backups restore <BACKUP_ID> --restore-instance=$INSTANCE"
echo ""
echo "  # Restaurar PITR (ponto específico no tempo):"
echo "  gcloud sql instances clone $INSTANCE licitanest-db-restore \\"
echo "    --point-in-time='2026-04-07T14:30:00Z'"
echo ""
echo "  # Restaurar de export no GCS:"
echo "  gcloud sql import sql $INSTANCE \\"
echo "    ${BACKUP_BUCKET}/weekly/licitanest-20260407.sql.gz \\"
echo "    --database=licitanest"
echo ""
echo "  ── Para Alta Disponibilidade (opcional) ──"
echo "  gcloud sql instances patch $INSTANCE --availability-type=REGIONAL"
echo ""
