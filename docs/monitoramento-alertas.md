## Configuração de Monitoramento e Alertas — Fase 12.2

### Sentry (Erros e Performance)

**Backend (API):** `@sentry/node` configurado em `api/src/config/sentry.ts`
**Frontend:** `@sentry/react` configurado em `src/lib/sentry.ts`

#### Alertas Sentry (configurar no dashboard):

1. **Taxa de Erro > 5%**
   - Tipo: Issue Alert
   - Condição: `Number of events > 5% of total requests in 5 minutes`
   - Notificação: Email + Slack

2. **Latência p95 > 3s**
   - Tipo: Metric Alert  
   - Métrica: `transaction.duration` p95 > 3000ms
   - Janela: 5 minutos
   - Notificação: Email + Slack

3. **Erros novos não tratados**
   - Tipo: Issue Alert
   - Condição: `First seen`, `Is unhandled`
   - Notificação: Email

### Google Cloud Monitoring

#### Alertas Recomendados (configurar via Console ou Terraform):

```yaml
# 1. CPU Cloud Run > 80%
alertPolicy:
  displayName: "LicitaNest API - CPU Alta"
  conditions:
    - displayName: "CPU > 80%"
      conditionThreshold:
        filter: 'resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/container/cpu/utilizations"'
        comparison: COMPARISON_GT
        thresholdValue: 0.8
        duration: "300s"
        aggregations:
          - alignmentPeriod: "60s"
            perSeriesAligner: ALIGN_PERCENTILE_95

# 2. Memória Cloud Run > 85%
  - displayName: "Memória > 85%"
    conditionThreshold:
      filter: 'resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/container/memory/utilizations"'
      comparison: COMPARISON_GT
      thresholdValue: 0.85
      duration: "300s"

# 3. Conexões Cloud SQL > 80% do max
  - displayName: "Conexões DB > 80%"
    conditionThreshold:
      filter: 'resource.type="cloudsql_database" AND metric.type="cloudsql.googleapis.com/database/postgresql/num_backends"'
      comparison: COMPARISON_GT
      thresholdValue: 80  # max_connections default = 100
      duration: "120s"

# 4. Cloud Function atualizar-indices falhou
  - displayName: "Cloud Function Índices - Falha"
    conditionThreshold:
      filter: 'resource.type="cloud_function" AND resource.labels.function_name="atualizar-indices" AND metric.type="cloudfunctions.googleapis.com/function/execution_count" AND metric.labels.status!="ok"'
      comparison: COMPARISON_GT
      thresholdValue: 0
      duration: "0s"

# 5. Latência API p95 > 3s
  - displayName: "Latência API > 3s"
    conditionThreshold:
      filter: 'resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/request_latencies"'
      comparison: COMPARISON_GT
      thresholdValue: 3000
      duration: "300s"
      aggregations:
        - alignmentPeriod: "60s"
          perSeriesAligner: ALIGN_PERCENTILE_95
```

#### Dashboard Cloud Monitoring

Métricas recomendadas para o dashboard:
- Request count por status (2xx, 4xx, 5xx)
- Latência p50, p95, p99
- CPU e memória por revisão
- Conexões ativas no Cloud SQL
- Execuções Cloud Function (sucesso/falha)
- Tamanho da DLQ de auditoria (custom metric)

### Endpoint de Monitoramento Interno

`GET /api/health` — Health check existente
`GET /api/admin/metricas-dlq` — Estatísticas da fila de auditoria (admin only)
