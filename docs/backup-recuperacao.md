## Backup e Recuperação de Desastres — LicitaNest

### 1. Configuração Cloud SQL (PostgreSQL)

#### Backup Automático
- **Frequência:** Diário (janela de backup: 02:00–06:00 UTC-3)
- **Retenção:** 30 dias (backups automáticos)
- **Localização:** Multi-regional (us ou southamerica1, conforme instância)
- **Tipo:** Incremental (WAL archiving)

#### Point-in-Time Recovery (PITR)
- **Status:** HABILITADO
- **Granularidade:** Qualquer ponto nos últimos 7 dias (WAL logs)
- **Configuração:**
  ```bash
  gcloud sql instances patch licitanest-db \
    --enable-point-in-time-recovery \
    --retained-transaction-log-days=7
  ```

#### Backup On-Demand
```bash
# Criar backup manual antes de deploys ou migrações
gcloud sql backups create --instance=licitanest-db \
  --description="Pre-deploy $(date +%Y-%m-%d)"
```

### 2. Objetivos de Recuperação

| Métrica | Valor | Justificativa |
|---------|-------|---------------|
| **RPO** (Recovery Point Objective) | **< 5 minutos** | PITR com WAL archiving contínuo |
| **RTO** (Recovery Time Objective) | **< 30 minutos** | Restauração Cloud SQL + redeploy Cloud Run |

### 3. Procedimento de Restauração (DR Drill)

#### 3.1 Restauração Completa (última snapshot)
```bash
# 1. Criar instância temporária a partir do backup
gcloud sql instances restore-backup licitanest-db \
  --backup-id=BACKUP_ID \
  --restore-instance=licitanest-db-recovery

# 2. Verificar integridade
psql -h IP_RECOVERY -U postgres -d licitanest -c "
  SELECT COUNT(*) AS usuarios FROM usuarios;
  SELECT COUNT(*) AS audit_entries FROM audit_log;
  SELECT COUNT(*) AS cestas FROM cestas WHERE deletado_em IS NULL;
  SELECT MAX(criado_em) AS ultimo_registro FROM audit_log;
"

# 3. Verificar hash chain do audit_log
psql -h IP_RECOVERY -U postgres -d licitanest -c "
  SELECT COUNT(*) AS registros_invalidos
  FROM audit_log al
  WHERE hash != encode(
    sha256((COALESCE(hash_anterior,'') || al.id || al.acao || al.criado_em::text)::bytea),
    'hex'
  );
"
# Resultado esperado: 0 registros inválidos

# 4. Se tudo OK, promover ou destruir instância de teste
gcloud sql instances delete licitanest-db-recovery --quiet
```

#### 3.2 Restauração Point-in-Time
```bash
# Restaurar para momento específico (ex: antes de um erro)
gcloud sql instances clone licitanest-db licitanest-db-pitr \
  --point-in-time="2026-04-07T10:00:00Z"

# Verificar dados e promover se necessário
```

#### 3.3 Restauração de Tabela Específica
```bash
# 1. Restaurar em instância temporária
# 2. Exportar apenas a tabela necessária
pg_dump -h IP_RECOVERY -U postgres -d licitanest \
  --table=NOME_TABELA --data-only -f tabela_backup.sql

# 3. Importar na instância principal
psql -h IP_PRINCIPAL -U postgres -d licitanest -f tabela_backup.sql
```

### 4. Checklist DR Drill (executar trimestralmente)

- [ ] Criar instância de recuperação a partir do backup mais recente
- [ ] Verificar contagem de registros nas tabelas principais
- [ ] Verificar integridade do hash chain do audit_log
- [ ] Verificar que PITR funciona (restaurar 1h antes do presente)
- [ ] Medir tempo total de restauração (documentar RTO real)
- [ ] Verificar que a aplicação conecta na instância restaurada
- [ ] Destruir instância temporária
- [ ] Documentar resultado e data do drill

### 5. Backup de Outros Componentes

| Componente | Backup | Retenção |
|------------|--------|----------|
| Cloud SQL (PostgreSQL) | Automático diário + PITR | 30 dias + 7 dias WAL |
| Cloud Storage (documentos) | Versionamento habilitado | 90 dias (lifecycle) |
| Firebase Auth (usuários) | Export automático via Admin SDK | Sob demanda |
| Redis (cache) | Não necessário (dados efêmeros) | N/A |
| Secrets (Secret Manager) | Versionamento automático | Todas as versões |

### 6. Último DR Drill

| Data | Tipo | RTO Medido | Resultado | Responsável |
|------|------|------------|-----------|-------------|
| *A preencher* | Completo | *A medir* | *Pendente* | *A definir* |

> **NOTA:** Executar o primeiro DR drill assim que a infraestrutura de produção estiver ativa.
> Repetir trimestralmente e após cada mudança significativa de schema.
