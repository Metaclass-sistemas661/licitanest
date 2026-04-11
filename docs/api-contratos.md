# API de Contratos — Documentação

## Visão Geral

A API de contratos gerencia o ciclo de vida completo dos contratos entre a LicitaNest e os municípios. Existem dois grupos de endpoints:

1. **SuperAdmin** — Gerenciamento completo (CRUD, envio, ativação)
2. **Portal do Município** — Visualização, verificação de identidade, assinatura digital

Autenticação via Firebase Auth (Bearer token). Todas as rotas requerem autenticação exceto onde indicado.

---

## Endpoints SuperAdmin

Requerem middleware `exigirSuperAdmin` (flag `is_superadmin = true` verificada diretamente no banco).

### GET /api/contratos
Lista contratos com paginação e filtros.

**Query Params:**
| Param | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `status` | string | — | Filtrar por status (`rascunho`, `pendente_assinatura`, `ativo`, `encerrado`, `cancelado`) |
| `municipio_id` | UUID | — | Filtrar por município |
| `page` | number | 1 | Página |
| `limit` | number | 20 | Itens por página |

**Resposta 200:**
```json
{
  "data": [{ "id": "uuid", "numero_contrato": "2024/001", "municipio_nome": "...", ... }],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

### GET /api/contratos/:id
Retorna contrato com aditivos.

**Resposta 200:**
```json
{
  "data": {
    "id": "uuid",
    "numero_contrato": "2024/001",
    "municipio_id": "uuid",
    "objeto": "Licença de uso...",
    "valor_total": 120000,
    "valor_mensal": 10000,
    "status": "ativo",
    "conteudo_html": "<h1>Contrato...</h1>",
    "aditivos": [...]
  }
}
```

### POST /api/contratos
Cria novo contrato.

**Body (JSON):**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `municipio_id` | UUID | Sim | ID do município |
| `numero_contrato` | string | Sim | Número identificador |
| `objeto` | string | Sim | Objeto do contrato |
| `valor_total` | number | Sim | Valor total em centavos |
| `valor_mensal` | number | Sim | Valor mensal em centavos |
| `quantidade_parcelas` | number | Não | Default: 1 |
| `data_inicio` | date | Sim | Data de início |
| `data_fim` | date | Sim | Data de término |
| `status` | string | Não | Default: `rascunho` |
| `conteudo_html` | string | Não | HTML do contrato (editor TipTap) |
| `conteudo_json` | object | Não | JSON do editor TipTap |
| `responsavel_nome` | string | Não | Nome do responsável no município |
| `responsavel_cpf` | string | Não | CPF do responsável |
| `responsavel_cargo` | string | Não | Cargo do responsável |
| `numero_processo` | string | Não | Número do processo licitatório |
| `modalidade` | string | Não | Modalidade da licitação |

**Resposta 201:** `{ "data": { ... contrato criado } }`

### PUT /api/contratos/:id
Atualiza contrato existente. Aceita qualquer campo do POST.

**Resposta 200:** `{ "data": { ... contrato atualizado } }`

### DELETE /api/contratos/:id
Soft delete (marca `deletado_em`).

**Resposta 204:** Sem corpo

### POST /api/contratos/:id/aditivo
Adiciona aditivo ao contrato.

**Body:**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `numero_aditivo` | string | Número do aditivo |
| `tipo` | string | `valor`, `prazo`, `escopo` |
| `descricao` | string | Descrição do aditivo |
| `valor_acrescimo` | number | Acréscimo em centavos |
| `nova_data_fim` | date | Nova data de término |
| `novos_limites` | object | `{ usuarios, cestas, cotacoes_mes }` |

### GET /api/contratos/:id/historico
Retorna histórico de alterações do contrato.

### GET /api/contratos/dashboard/resumo
Retorna KPIs resumidos dos contratos.

### POST /api/contratos/:id/pdf
Upload de PDF do contrato (multipart/form-data).

**Validações:**
- Magic bytes: verifica header `%PDF`
- Tamanho máximo: 20 MB
- Hash SHA-256 calculado e armazenado

### GET /api/contratos/:id/pdf/download
Retorna signed URL do GCS para download (expira em 15 min).

### POST /api/contratos/:id/enviar
Envia contrato para o município (muda status para `pendente_assinatura`, cria notificação).

### POST /api/contratos/:id/ativar
Ativa contrato e gera faturas automaticamente.

---

## Endpoints Portal do Município

Autenticados como servidor do município (RLS aplica filtro por `municipio_id`).

### GET /api/portal/contratos
Lista contratos do município autenticado.

### GET /api/portal/contratos/:id
Detalhe de um contrato com aditivos.

### GET /api/portal/contratos/:id/faturas
Lista faturas de um contrato.

### GET /api/portal/notificacoes
Lista notificações de contratos do município.

### PUT /api/portal/notificacoes/:id/lido
Marca notificação como lida.

### GET /api/portal/contratos/pendentes/count
Retorna contagem de contratos pendentes de assinatura.

### POST /api/portal/contratos/:id/verificar-acesso
Verifica identidade para acesso ao contrato.

**Body:**
```json
{
  "cpf": "529.982.247-25",
  "data_nascimento": "1990-01-15"
}
```

**Rate Limit:** 5 tentativas / 15 minutos (via `audit_log`).

**Resposta 200:**
```json
{ "data": { "token": "jwt-token-15min" } }
```

### POST /api/portal/contratos/:id/assinar
Assinatura digital do contrato com certificado X.509 (PFX/P12).

**Rate Limit:** 3 tentativas / 15 minutos (via `audit_log`).

**Body:**
```json
{
  "certificado_base64": "base64-encoded-pfx",
  "senha_certificado": "senha-do-certificado",
  "token_acesso": "jwt-do-verificar-acesso",
  "etapa": "validar" | "assinar"
}
```

**Etapa `validar`:** Retorna informações do certificado sem assinar.
```json
{
  "data": {
    "certificado": {
      "titular": "João da Silva",
      "cpf": "529.982.247-25",
      "emissor": "AC CERTISIGN",
      "validade_inicio": "2024-01-01",
      "validade_fim": "2027-01-01",
      "serial": "ABC123"
    }
  }
}
```

**Etapa `assinar`:** Gera hash SHA-256, assina com chave privada, atualiza status.
```json
{ "data": { "status": "assinado" } }
```

---

## Fluxo de Assinatura Digital

```
1. SuperAdmin cria contrato (rascunho)
   POST /api/contratos { ... }

2. SuperAdmin edita conteúdo no editor TipTap
   PUT /api/contratos/:id { conteudo_html, conteudo_json }

3. SuperAdmin carrega PDF assinado (opcional)
   POST /api/contratos/:id/pdf (multipart)

4. SuperAdmin envia para município
   POST /api/contratos/:id/enviar
   → status: pendente_assinatura
   → cria notificação no portal

5. Servidor do município acessa Portal de Contratos
   GET /api/portal/contratos

6. Servidor verifica identidade (CPF + data nascimento)
   POST /api/portal/contratos/:id/verificar-acesso
   → retorna JWT de acesso (15 min)

7. Servidor valida certificado digital (etapa 1)
   POST /api/portal/contratos/:id/assinar
   { etapa: "validar", certificado_base64, senha_certificado, token_acesso }
   → retorna dados do certificado (titular, CPF, emissor, validade)

8. Servidor confirma e assina (etapa 2)
   POST /api/portal/contratos/:id/assinar
   { etapa: "assinar", certificado_base64, senha_certificado, token_acesso }
   → gera hash SHA-256 do conteúdo HTML
   → assina hash com chave privada do certificado
   → atualiza contrato: status = assinado, dados da assinatura armazenados

9. SuperAdmin pode ativar contrato e gerar faturas
   POST /api/contratos/:id/ativar
```

---

## Onboarding de Novo Município

```
1. SuperAdmin acessa /superadmin/prefeituras
   → clica "Nova Prefeitura"

2. Preenche dados do município:
   - Nome, UF, CNPJ, Código IBGE
   - E-mail e nome do responsável

3. POST /api/tenants/onboarding
   → Cria município, secretaria padrão, usuário admin
   → Envia convite por e-mail via Firebase Auth

4. Responsável recebe e-mail
   → Define senha no Firebase Auth
   → Faz login no sistema

5. SuperAdmin cria contrato para o município
   POST /api/contratos { municipio_id: "..." }

6. SuperAdmin edita, carrega PDF, envia
   POST /api/contratos/:id/enviar

7. Município recebe notificação
   → Acessa Portal de Contratos
   → Verifica identidade → Assina digitalmente
```

---

## Segurança

| Mecanismo | Implementação |
|-----------|--------------|
| Autenticação | Firebase Auth + Bearer token |
| Autorização SuperAdmin | `exigirSuperAdmin` middleware (verifica no banco) |
| RLS Multi-tenant | `set_config('app.current_municipio_id', ...)` por request |
| Rate Limit Global | `@fastify/rate-limit` (100 req/min) |
| Rate Limit Auth | 5 req/min em `/api/auth` |
| Rate Limit Verificação | 5/15min via `audit_log` |
| Rate Limit Assinatura | 3/15min via `audit_log` |
| XSS Prevention | DOMPurify sanitiza HTML antes de render |
| Magic Bytes | Validação header `%PDF` em uploads |
| Signed URLs | GCS com expiração de 15 minutos |
| Audit Trail | `contratos_historico` + `audit_log` para todas ações críticas |
| CSRF | Token HMAC-SHA256 nos portais públicos |
| `is_superadmin` | Não retornado em endpoints de não-superadmins |
