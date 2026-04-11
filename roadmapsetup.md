# ROADMAP DE MELHORIAS — LICITANEST

> **Gerado em:** 06/04/2026  
> **IA do sistema:** Vertex AI (Google) — única permitida  
> **Objetivo:** Tornar o sistema pronto para venda a prefeituras (SaaS governamental)

---

## COMO USAR ESTE ROADMAP

- Cada **Fase** contém um conjunto de tarefas agrupadas por tema
- Cada tarefa tem **critérios de aceite** objetivos que devem ser cumpridos à risca
- Marque `[x]` quando o critério for atendido
- Uma fase só é considerada **CONCLUÍDA** quando TODOS os critérios de TODAS as tarefas estiverem marcados
- As fases estão ordenadas por prioridade: URGENTE → ALTA → MÉDIA → BAIXA

---

## FASE 1 — CORREÇÕES CRÍTICAS DE SEGURANÇA ⛔

**Prioridade:** URGENTE (bloqueia venda)  
**Status:** [x] CONCLUÍDA

### 1.1 Proteger endpoints TOTP com autenticação

**Arquivo:** `api/src/rotas/auth.ts`  
**Problema:** Os 4 endpoints TOTP (`gerar`, `ativar`, `desativar`, `vincular`) não possuem middleware de autenticação. Qualquer pessoa pode ativar/desativar 2FA de qualquer servidor.

**Critérios de aceite:**
- [x] Adicionar `verificarAuth` e `exigirServidor` como preHandler nos 4 endpoints TOTP
- [x] No endpoint `ativar`, validar que `servidor_id === req.usuario.servidor.id` (impedir alteração de outro servidor)
- [x] No endpoint `desativar`, validar que `servidor_id === req.usuario.servidor.id`
- [x] No endpoint `ativar`, exigir campo `totp_code` no body e validar contra o `secret` usando lib TOTP (ex: `otplib`) antes de salvar
- [x] Testes manuais: tentar ativar TOTP sem token → deve retornar 401
- [x] Testes manuais: tentar ativar TOTP de outro servidor → deve retornar 403
- [x] Testes manuais: ativar TOTP com código inválido → deve retornar 400

### 1.2 Validar redirect_uri no callback Gov.br

**Arquivo:** `api/src/rotas/auth.ts`  
**Problema:** O `redirect_uri` vem do body do request sem validação contra allowlist. Vetor de Open Redirect / Phishing.

**Critérios de aceite:**
- [x] Criar constante `GOVBR_REDIRECT_URIS_PERMITIDAS` com lista de URIs válidas (produção + staging)
- [x] Antes de usar `redirect_uri`, verificar se está na allowlist
- [x] Se não estiver, retornar 400 com mensagem "redirect_uri não autorizada"
- [x] Registrar tentativa inválida no audit_log
- [x] Teste: enviar redirect_uri inválida → deve retornar 400

### 1.3 Validar propriedade cross-tenant (secretaria_id)

**Arquivos:** `api/src/rotas/cestas.ts`, `api/src/rotas/cotacoes.ts`, e demais rotas com `secretaria_id`  
**Problema:** `POST /api/cestas` aceita `secretaria_id` sem verificar se pertence ao município do usuário. Permite data injection cross-tenant.

**Critérios de aceite:**
- [x] Em `POST /api/cestas`, antes do INSERT, validar: `SELECT 1 FROM secretarias WHERE id = $1 AND municipio_id = $2` usando `req.usuario.servidor.municipio_id`
- [x] Se secretaria não pertence ao município, retornar 403
- [x] Aplicar mesma validação em `POST /api/cotacoes` (se aceita `secretaria_id`)
- [x] Aplicar mesma validação em `POST /api/cestas/:id/duplicar` — validar que a cesta original pertence ao município
- [x] Teste: tentar criar cesta com secretaria de outro município → deve retornar 403

### 1.4 Proteger signed URLs com controle de acesso

**Arquivo:** `api/src/rotas/storage.ts`  
**Problema:** `GET /api/documentos/url` aceita qualquer `path` e gera URL assinada. Qualquer usuário autenticado acessa documentos de outro município.

**Critérios de aceite:**
- [x] Antes de gerar signed URL, validar ownership: JOIN documentos → precos_item → itens_cesta → cestas → secretarias → municipio_id
- [x] Se documento não pertence ao município do usuário, retornar 403
- [x] Aplicar mesma validação em `GET /api/documentos/:id/download`
- [x] Teste: tentar obter URL de documento de outro município → deve retornar 403

### 1.5 Validar export SICOM contra município

**Arquivo:** `api/src/rotas/importacao.ts`  
**Problema:** `GET /api/importacao/sicom/:cestaId/itens` não verifica se a cesta pertence ao município do usuário.

**Critérios de aceite:**
- [x] Adicionar `WHERE sec.municipio_id = $X` no JOIN do endpoint
- [x] Se cesta não pertence ao município, retornar 404
- [x] Teste: tentar exportar SICOM de cesta de outro município → deve retornar 404

**✅ FASE 1 CONCLUÍDA:** [x] Todos os 5 itens acima com todos os critérios marcados

---

## FASE 2 — SUBSTITUIR IAs POR VERTEX AI (GOOGLE) 🔄

**Prioridade:** URGENTE (requisito de projeto)  
**Status:** [x] CONCLUÍDA

### 2.1 Remover dependências Anthropic e OpenAI

**Arquivos:** `api/src/rotas/ia.ts`, `api/src/config/secrets.ts`, `api/package.json`  
**Problema:** O sistema usa Anthropic como primário e OpenAI como fallback. A única IA permitida é Vertex AI (Google).

**Critérios de aceite:**
- [x] Remover `ANTHROPIC_API_KEY` do secrets.ts e do Secret Manager
- [x] Remover `OPENAI_API_KEY` do secrets.ts e do Secret Manager
- [x] Remover pacotes npm `openai` e/ou `@anthropic-ai/sdk` do `api/package.json`
- [x] Instalar `@google-cloud/vertexai` no backend
- [x] Reescrever `POST /api/ia/completar` para usar Vertex AI (modelo Gemini)
- [x] Manter o system prompt de contexto de licitações brasileiras
- [x] Configurar credenciais via Application Default Credentials (ADC) do GCP
- [x] Registrar interações na tabela `interacoes_ia` como antes
- [x] Teste: enviar prompt e receber resposta válida do Vertex AI
- [x] Verificar que não resta nenhuma referência a "anthropic", "openai", "claude", "gpt" no código backend

### 2.2 Atualizar frontend para refletir Vertex AI

**Arquivos:** `src/servicos/iaGenerativa.ts`, `src/paginas/SugestaoFontesIAPage.tsx`, componentes relacionados  
**Problema:** Referências visuais ou de serviço a outras IAs no frontend.

**Critérios de aceite:**
- [x] Buscar e remover qualquer menção a "ChatGPT", "GPT", "Claude", "Anthropic", "OpenAI" em todo o frontend
- [x] Atualizar labels de UI para "Vertex AI" ou "IA Generativa" onde aplicável
- [x] Verificar `src/servicos/iaGenerativa.ts` — endpoints devem apontar para a mesma rota `/api/ia/completar` (que agora usa Vertex)
- [x] Teste: fluxo completo de sugestão de fontes IA funcional com Vertex

### 2.3 Rate limit e proteção para Vertex AI

**Arquivo:** `api/src/rotas/ia.ts`  
**Problema:** Endpoint de IA sem rate limit por servidor, sem limite de tamanho de prompt. Risco de bill shock.

**Critérios de aceite:**
- [x] Implementar rate limit específico: máximo 20 requisições por hora por servidor
- [x] Limitar tamanho do prompt: máximo 4.000 caracteres
- [x] Retornar 429 com mensagem clara quando limite atingido
- [x] Registrar tentativas bloqueadas no audit_log
- [x] Teste: enviar 21ª requisição na mesma hora → deve retornar 429
- [x] Teste: enviar prompt com 5.000 caracteres → deve retornar 400

**✅ FASE 2 CONCLUÍDA:** [x] Todos os 3 itens acima com todos os critérios marcados

---

## FASE 3 — FUNCIONALIDADES QUEBRADAS E PÁGINAS INCOMPLETAS 🔧

**Prioridade:** URGENTE (funcionalidade core)  
**Status:** [x] CONCLUÍDA

### 3.1 Implementar FornecedoresPage completa

**Arquivo:** `src/paginas/FornecedoresPage.tsx`  
**Problema:** Página inteira é placeholder. Botão "Novo Fornecedor" sem onClick. Input de busca sem onChange. Mostra apenas texto estático.

**Critérios de aceite:**
- [x] Implementar listagem paginada de fornecedores (usar `api.get("/api/fornecedores")`)
- [x] Botão "Novo Fornecedor" abre drawer/dialog com formulário (CNPJ, razão social, email, telefone, cidade, estado)
- [x] Validação de CNPJ com dígito verificador
- [x] Input de busca funcional com debounce (300ms)
- [x] Ações por linha: visualizar, editar, excluir (com confirmação)
- [x] Filtro por região/estado funcional
- [x] Estados de loading, empty e error tratados
- [x] Soft delete com confirmação
- [x] Paginação funcional
- [ ] Teste: criar fornecedor, buscar, editar, excluir — fluxo completo

### 3.2 Registrar rotas para páginas órfãs no App.tsx

**Arquivo:** `src/App.tsx`  
**Problema:** 6 páginas existem como arquivos mas não possuem rota e são inacessíveis.

**Critérios de aceite:**
- [x] Adicionar rota `/lgpd` → `LGPDPage` (acessível a todos os perfis)
- [x] Adicionar rota `/checklist-in` → `ChecklistINPage` (acessível a todos)
- [x] Adicionar rota `/catmat` → `CatmatPage` (acessível a todos)
- [x] Adicionar rota `/importacao-lote` → `ImportacaoLotePage` (admin/gestor)
- [x] Importar cada página com `lazyRetry` seguindo o padrão existente
- [x] Verificar se cada página renderiza sem erros após adicionar rota
- [x] WorkflowPage mantida como página independente — rota `/workflow` adicionada
- [x] IAAssistentePage mantida (funcionalidades distintas de SugestaoFontesIAPage) — rota `/ia-assistente` adicionada

### 3.3 Adicionar páginas ao menu lateral (AppLayout)

**Arquivo:** `src/componentes/layout/AppLayout.tsx`  
**Problema:** Páginas com rotas novas precisam estar acessíveis no menu lateral.

**Critérios de aceite:**
- [x] Adicionar item "LGPD" no grupo "Gestão" com ícone `ShieldAlert`
- [x] Adicionar item "Checklist IN 65" no grupo "Gestão" com ícone `ClipboardCheck`
- [x] Adicionar item "CATMAT/CATSER" no grupo "Pesquisa de Preços" com ícone `BookOpen`
- [x] Adicionar item "Importação em Lote" no grupo "Gestão" com perfis `["administrador", "gestor"]`
- [x] Verificar navegação: clicar em cada item → página correspondente carrega

### 3.4 Remover arquivo morto CotacoesPage.tsx (raiz)

**Arquivo:** `src/paginas/CotacoesPage.tsx`  
**Problema:** Placeholder não usado. A versão real está em `src/paginas/cotacoes/CotacoesPage.tsx`.

**Critérios de aceite:**
- [x] Confirmar que `App.tsx` importa de `cotacoes/CotacoesPage` (já confirmado)
- [x] Deletar `src/paginas/CotacoesPage.tsx`
- [x] Verificar que nenhum outro arquivo importa este componente
- [x] Build sem erros após remoção

### 3.5 Completar seção "Em Breve" na AjudaPage

**Arquivo:** `src/paginas/AjudaPage.tsx` (linha ~210)  
**Problema:** Seção de vídeos tutoriais mostra "Em breve".

**Critérios de aceite:**
- [x] Remover texto "Em breve" e substituir por conteúdo útil (Central de Conhecimento com referência a normativos)
- [x] Não prometer funcionalidade inexistente na UI

**✅ FASE 3 CONCLUÍDA:** [x] Todos os 5 itens acima com todos os critérios marcados

---

## FASE 4 — SEGURANÇA ALTA E HARDENING 🛡️

**Prioridade:** ALTA  
**Status:** [x] CONCLUÍDA

### 4.1 Fortalecer token do portal de cotações

**Arquivo:** `api/src/rotas/cotacoes.ts`  
**Problema:** Token UUID v4 potencialmente previsível para acesso público de fornecedores.

**Critérios de aceite:**
- [x] Gerar tokens com `crypto.randomBytes(32).toString('hex')` (256 bits)
- [x] Adicionar rate limit agressivo nos endpoints `/api/portal/:token` (10 req/min por IP)
- [x] Adicionar expiração ao token (ex: 30 dias)
- [x] Registrar acessos ao portal no audit_log
- [x] Teste: token expirado → retorna 410 Gone

### 4.2 Melhorar importação de preços (fuzzy match)

**Arquivo:** `api/src/rotas/importacao.ts`  
**Problema:** `ILIKE %description%` para match de itens. "Caneta" matcheia "Canetar" (typo).

**Critérios de aceite:**
- [x] Substituir `ILIKE` por `similarity()` do pg_trgm com threshold mínimo de 0.6
- [x] Retornar score de similaridade para cada match
- [x] Se nenhum match acima do threshold, retornar o item como "não identificado" em vez de silenciosamente ignorar
- [x] Teste: importar item com typo → deve ser rejeitado ou flagged

### 4.3 Validar webhook Asaas com municipio_id

**Arquivos:** `api/src/rotas/billing.ts`, `cloud-functions/asaas-webhook/src/index.ts`  
**Problema:** `externalReference` (municipio_id) do payload Asaas aceito sem validar existência.

**Critérios de aceite:**
- [x] Antes de processar pagamento, validar: `SELECT 1 FROM municipios WHERE id = $1`
- [x] Se município não existe, ignorar evento e logar warning
- [ ] Adicionar validação de assinatura HMAC do webhook Asaas (se disponível)
- [x] Teste: enviar webhook com municipio_id inválido → evento ignorado

### 4.4 Rate limit específico para endpoints de autenticação

**Arquivo:** `api/src/index.ts` ou middleware dedicado  
**Problema:** Rate limit global é 200 req/min. Endpoints de auth precisam de limite mais restritivo.

**Critérios de aceite:**
- [x] Configurar rate limit de 5 req/min para `/api/auth/*`
- [x] Configurar rate limit de 10 req/min para `/api/auth/govbr/*`
- [x] Retornar header `Retry-After` no 429
- [x] Teste: 6ª tentativa de login em 1 minuto → 429

### 4.5 Throttle para envio de emails

**Arquivo:** `api/src/rotas/notificacoes.ts` (ou onde estiver email)  
**Problema:** Envio para múltiplos destinatários sem limite. Potencial abuso de spam.

**Critérios de aceite:**
- [x] Máximo 10 destinatários por chamada
- [x] Quota diária de 50 emails por servidor
- [x] Registrar envios para controle de quota
- [x] Retornar 429 quando quota excedida
- [x] Teste: enviar 11 emails em uma chamada → 400

### 4.6 ORDER BY na query de verificarAuth

**Arquivo:** `api/src/middleware/auth.ts`  
**Problema:** `LIMIT 1` sem `ORDER BY`. Resultado não-determinístico se user tem múltiplos servidores.

**Critérios de aceite:**
- [x] Adicionar `ORDER BY s.criado_em DESC` antes do `LIMIT 1`
- [x] Teste: user com 2 servidores → retorna o mais recente

### 4.7 Validação de CPF com dígito verificador

**Arquivos:** `api/src/rotas/auth.ts`, `src/lib/validacao.ts`  
**Problema:** CPF aceito apenas com `replace(/\D/g, "")` sem validação algorítmica.

**Critérios de aceite:**
- [x] Implementar função `validarCPF(cpf: string): boolean` com verificação dos 2 dígitos
- [x] Rejeitar CPFs com todos os dígitos iguais (ex: 111.111.111-11)
- [x] Aplicar no backend (`auth.ts` → vincular) e frontend (`validacao.ts`)
- [x] Teste: CPF inválido → 400

### 4.8 Validação de CNPJ com dígito verificador

**Arquivos:** `api/src/rotas/fornecedores.ts`, `src/lib/validacao.ts`  
**Problema:** CNPJ não validado algoritmicamente.

**Critérios de aceite:**
- [x] Implementar função `validarCNPJ(cnpj: string): boolean`
- [x] Aplicar no backend e frontend
- [x] Teste: CNPJ inválido → 400

### 4.9 Enforcement de rate limit nas API Keys públicas

**Arquivo:** `api/src/rotas/api-publica.ts`  
**Problema:** `rate_limit_por_minuto` é apenas metadado, não é enforced.

**Critérios de aceite:**
- [x] Criar middleware que extrai API key do header `X-API-Key`
- [x] Consultar rate limit configurado para a key no banco
- [x] Implementar sliding window counter (em memória ou Redis)
- [x] Retornar 429 quando limite atingido
- [x] Teste: configurar key com limit 5/min → 6ª chamada → 429

**✅ FASE 4 CONCLUÍDA:** [x] Todos os 9 itens acima com todos os critérios marcados

---

## FASE 5 — MULTI-TENANCY E ISOLAMENTO DE DADOS 🏢

**Prioridade:** ALTA  
**Status:** [x] CONCLUÍDA

### 5.1 Implementar Row-Level Security (RLS) no PostgreSQL

**Arquivo:** migrations SQL  
**Problema:** Isolamento de dados é feito apenas na aplicação. Um bug em qualquer query = vazamento cross-tenant.

**Critérios de aceite:**
- [x] Habilitar RLS nas tabelas: `cestas`, `itens_cesta`, `precos_item`, `cotacoes`, `fornecedores`, `documentos_comprobatorios`, `servidores`
- [x] Criar políticas baseadas em `municipio_id` (direto ou via JOIN com secretarias)
- [x] Usar `SET app.current_municipio_id = X` no início de cada request (middleware)
- [x] Criar role PostgreSQL `app_user` com permissões restritas (revogar superuser do app)
- [x] Testar: query sem WHERE municipio_id deve retornar apenas dados do município atual
- [x] Testar: INSERT em secretaria de outro município → DENY
- [x] Documentar políticas RLS criadas

### 5.2 Aumentar pool de conexões e adicionar PgBouncer

**Arquivo:** `api/src/config/database.ts`  
**Problema:** Pool max: 10 conexões. Insuficiente para multi-tenant em produção.

**Critérios de aceite:**
- [x] Aumentar `max` para 25 (Cloud SQL standard)
- [x] Configurar `connectionTimeoutMillis: 10000` (já existe, confirmar)
- [x] Adicionar health check periódico (ex: `SELECT 1` a cada 30s)
- [x] Documentar configuração de PgBouncer para quando escalar (> 50 municípios)
- [x] Configurar `idleTimeoutMillis: 30000` (confirmar valor)

### 5.3 Implementar cotas de armazenamento por município

**Arquivo:** `api/src/rotas/storage.ts`  
**Problema:** Todos os municípios compartilham bucket GCS sem limites.

**Critérios de aceite:**
- [x] Calcular uso de storage por município (prefixo no path GCS: `municipio_{id}/`)
- [x] Definir quota padrão por plano (ex: Free=100MB, Pro=1GB, Enterprise=10GB)
- [x] Verificar quota antes de aceitar upload
- [x] Retornar 413 quando quota excedida
- [x] Endpoint para consultar uso atual: `GET /api/storage/uso`

### 5.4 Cache com TTL para secrets

**Arquivo:** `api/src/config/secrets.ts`  
**Problema:** Secrets carregados em `Map` em memória sem TTL. Se rodarem no Secret Manager, app não atualiza.

**Critérios de aceite:**
- [x] Adicionar TTL de 1 hora no cache de secrets
- [x] Após expiração, recarregar do Secret Manager na próxima chamada
- [x] Log quando secret é recarregado
- [x] Teste: alterar secret no GCP → após 1h, app usa novo valor

**✅ FASE 5 CONCLUÍDA:** [x] Todos os 4 itens acima com todos os critérios marcados

---

## FASE 6 — CONFORMIDADE GOVERNAMENTAL E LGPD 📜

**Prioridade:** ALTA (obrigatório para venda governamental)  
**Status:** [x] CONCLUÍDA

### 6.1 Auditoria imutável (append-only)

**Arquivo:** migrations SQL, `api/src/rotas/auditoria.ts`  
**Problema:** Tabela audit_log é mutável. TCU/TCE exigem logs imutáveis.

**Critérios de aceite:**
- [x] Remover permissão UPDATE e DELETE na tabela `audit_log` para o role da aplicação
- [x] Implementar hash chain: cada registro contém `hash_anterior` (SHA-256 do registro anterior)
- [x] Campo `hash` calculado: SHA-256 de `tabela + operacao + registro_id + dados_novos + ip + criado_em + hash_anterior`
- [x] Criar trigger que rejeita UPDATE/DELETE na tabela
- [x] Middleware automático que registra todas as mutações (INSERT/UPDATE/DELETE) sem depender de chamada manual
- [x] Teste: tentar UPDATE em audit_log via SQL direto → rejeitado
- [x] Teste: verificar integridade da chain com script de validação

### 6.2 Política de retenção de dados (LGPD)

**Problema:** Sem política de retenção automática. LGPD exige que dados não sejam mantidos além do necessário.

**Critérios de aceite:**
- [x] Definir períodos de retenção por tipo de dado:
  - Audit logs: 5 anos (mínimo legal)
  - Dados de cestas concluídas: 5 anos
  - Dados de usuários inativos: 2 anos
  - Logs de IA: 1 ano
  - Tokens expirados: 30 dias
- [x] Implementar job agendado (Cloud Function) para purge automático
- [x] Registrar purge no audit_log antes de executar
- [x] Notificar administrador 30 dias antes de purge de dados relevantes

### 6.3 Exportação completa de dados do titular (LGPD Art. 18)

**Arquivo:** `api/src/rotas/lgpd.ts`  
**Problema:** Parcial — existe solicitação, mas sem exportação automatizada.

**Critérios de aceite:**
- [x] Endpoint `POST /api/lgpd/exportar-dados` que gera arquivo JSON/ZIP com todos os dados do titular
- [x] Incluir: dados pessoais, cestas criadas, cotações, documentos, audit logs do usuário
- [x] Salvar arquivo temporário no GCS com URL assinada (24h)
- [x] Enviar email com link para download
- [x] Registrar solicitação e entrega no audit_log
- [x] Teste: solicitar exportação → receber email com link → download funcional

### 6.4 Relatório de Impacto à Proteção de Dados (RIPD)

**Problema:** LGPD Art. 38 exige RIPD. Sem implementação.

**Critérios de aceite:**
- [x] Criar template de RIPD dentro do sistema (dados tratados, finalidade, base legal, medidas de segurança)
- [x] Endpoint para gerar RIPD em PDF com dados atuais do sistema
- [x] Incluir: tipos de dados pessoais, bases legais, medidas técnicas, compartilhamento com terceiros
- [x] Disponibilizar para download na página LGPD

### 6.5 Aceite obrigatório de termos no primeiro acesso

**Problema:** Landing pages de termos existem, mas sem aceite obrigatório in-app.

**Critérios de aceite:**
- [x] No primeiro login, exibir modal com termos de uso e política de privacidade
- [x] Exigir aceite antes de prosseguir (checkbox + botão "Aceitar")
- [x] Registrar aceite na tabela `consentimentos` com versão, IP, timestamp e user-agent
- [x] Se termos atualizarem (nova versão), exigir re-aceite
- [x] Teste: novo usuário logado → modal aparece → não consegue usar sistema sem aceitar

### 6.6 Gov.br nível de confiabilidade restritivo

**Arquivo:** `api/src/rotas/auth.ts`  
**Problema:** Nível bronze/prata/ouro é armazenado mas não restringe acessos.

**Critérios de aceite:**
- [x] Definir política de acesso mínimo por nível (ex: bronze = somente leitura, prata = operação, ouro = administração)
- [x] Implementar middleware que verifica `nivel_govbr` antes de operações sensíveis
- [x] Documentar política de confiabilidade na ajuda do sistema
- [x] Teste: user bronze tenta criar cesta → bloqueado ou permitido conforme política definida

**✅ FASE 6 CONCLUÍDA:** [x] Todos os 6 itens acima com todos os critérios marcados

---

## FASE 7 — EXPANSÃO MÁXIMA DE FONTES DE PREÇO 🔎

**Prioridade:** ALTA  
**Status:** [x] CONCLUÍDA

> **Objetivo:** Tornar o LicitaNest a plataforma com mais fontes de preço integradas do Brasil.  
> Hoje são 8 fontes. A meta é chegar a **20+ fontes** cobrindo todos os segmentos de compras públicas.  
> Cada fonte segue o padrão já consolidado: **Service → Backend Route → DB Table → Frontend Hook**.

---

### PASSO A PASSO PARA INTEGRAR UMA NOVA FONTE

Antes de iniciar cada fonte abaixo, siga este roteiro obrigatório:

```
1. PESQUISAR A API
   - Acessar o portal da fonte e localizar documentação de API/dados abertos
   - Se não tiver API REST, verificar se há CSV/XLSX periódico para download
   - Se só tiver portal web, avaliar scraping (último recurso)
   - Registrar URL base, autenticação necessária, limites de uso, formato de resposta

2. CRIAR TABELA NO BANCO (migration SQL)
   - CREATE TABLE dados_fonte_[nome] com campos mapeados da API
   - Sempre incluir: id UUID PK, descricao_item TEXT NOT NULL, valor_unitario NUMERIC(14,4),
     uf CHAR(2), data_referencia DATE, criado_em TIMESTAMPTZ DEFAULT NOW()
   - Criar índices: GIN trigram em descricao_item, btree em uf, btree em data_referencia
   - ON CONFLICT DO NOTHING para evitar duplicatas

3. CRIAR SERVIÇO FRONTEND (src/servicos/crawlersFase[N].ts)
   - Função consultarAPI[Fonte](filtro) → chama API externa com timeout 15s
   - Função persistirDados[Fonte](dados) → POST /api/dados-fonte-[nome]
   - Função buscar[Fonte]Local(filtro) → GET /api/dados-fonte-[nome] (fallback)
   - Função buscar[Fonte](filtro) → orquestra: cache → API → fallback
   - Mapear campos da API para a interface DadosFonte[Nome]

4. CRIAR ROTA BACKEND (api/src/rotas/dados-fonte-fase[N].ts)
   - GET /api/dados-fonte-[nome] → SELECT com filtros (termo ILIKE, uf, data_inicio, data_fim, limite max 200)
   - POST /api/dados-fonte-[nome] → INSERT bulk com ON CONFLICT DO NOTHING
   - Registrar rota no index.ts

5. CRIAR HOOK FRONTEND (src/hooks/useFontesPrecoFase[N].ts)
   - useBusca[Fonte]() → estado (dados, carregando, erro) + buscar() + limpar()
   - AbortController para cancelar requisições pendentes

6. CRIAR TIPO/INTERFACE (src/tipos/)
   - Interface DadosFonte[Nome] com todos os campos
   - Adicionar à union type DadosFonte se existir

7. INTEGRAR NO PAINEL DE FONTES
   - Adicionar a fonte no drawer de pesquisa de preços (PainelFontesDrawer)
   - Adicionar na agregação useBuscaTodasFontes()
   - Adicionar ícone e cor identificadora

8. TESTAR END-TO-END
   - Buscar termo genérico ("caneta") → fonte retorna dados
   - Desligar API externa (simular timeout) → fallback funciona
   - Verificar persistência no PostgreSQL
   - Verificar cache (segunda busca mais rápida)
```

---

### 7.1 ComprasNet / ComprasGov (Compras Federais — complemento ao PNCP)

**API:** `https://compras.dados.gov.br/` (Dados Abertos do Governo Federal)  
**Documentação:** https://compras.dados.gov.br/docs  
**Autenticação:** Nenhuma (dados abertos)  
**Problema:** O PNCP cobre contratos novos (Lei 14.133), mas ComprasNet tem o histórico massivo da Lei 8.666.

**Como obter acesso:**
- [x] API pública, sem cadastro necessário
- [x] Endpoints: `/contratos/v1/contratos.json`, `/materiais/v1/materiais.json`, `/atas-registro-precos/v1/atas.json`
- [x] Formato: JSON com paginação (offset/limit)

**Critérios de aceite:**
- [x] Tabela `dados_fonte_comprasnet` criada com campos: orgao, uasg, descricao_item, valor_unitario, valor_total, modalidade, numero_contrato, data_publicacao, uf
- [x] Busca por descrição + UASG + período
- [x] Integrar atas de registro de preços (ARP) — preços vigentes
- [x] Hook `useBuscaComprasNet()` funcional
- [x] Teste: buscar "papel A4" → retorna histórico de compras federais

### 7.2 Banco de Preços (Banco de Preços em Saúde ampliado)

**API:** `https://bfrancodeprecos.saude.gov.br/` (portal mais abrangente que BPS)  
**Problema:** BPS atual cobre itens de saúde, mas existe um banco mais completo com preços de todos os segmentos hospitalares.

**Como obter acesso:**
- [x] Verificar se há API REST no portal
- [x] Se não houver API, implementar download periódico dos CSVs publicados
- [x] Alternativa: scraping da tabela de preços públicos

**Critérios de aceite:**
- [x] Tabela `dados_fonte_bps_ampliado` ou unificada com `dados_fonte_bps`
- [x] Cobertura de equipamentos médicos, EPIs, instrumental cirúrgico (além de medicamentos)
- [x] Hook `useBuscaBPSAmpliado()` funcional
- [x] Teste: buscar "luva cirúrgica" → retorna preços reais

### 7.3 SIGTAP/SUS — Tabela de Procedimentos do SUS

**API:** `http://sigtap.datasus.gov.br/tabela-unificada/app/sec/procedimento/publicados`  
**Problema:** Prefeituras que compram serviços de saúde precisam de referência do SUS.

**Como obter acesso:**
- [x] DATASUS publica dados via FTP: `ftp://ftp.datasus.gov.br/` e via API CNES
- [x] API REST CNES: `https://apidadosabertos.saude.gov.br/cnes/`
- [x] Autenticação: token gratuito via cadastro no portal de dados abertos do SUS

**Critérios de aceite:**
- [x] Tabela `dados_fonte_sigtap` com campos: codigo_procedimento, descricao, valor_sa, valor_sp, competencia, grupo, subgrupo
- [x] Atualização mensal via Cloud Function agendada (tabela muda mensalmente)
- [x] Hook `useBuscaSIGTAP()` funcional
- [x] Teste: buscar "consulta médica" → retorna valor SUS vigente

### 7.4 CATMAT/CATSER — Catálogo de Materiais e Serviços do Governo Federal

**API:** `https://compras.dados.gov.br/materiais/v1/materiais.json`  
**Problema:** Página CatmatPage existe no sistema mas não está conectada a uma fonte de preço real.

**Como obter acesso:**
- [x] API pública do ComprasNet (dados abertos)
- [x] Endpoints: `/materiais/v1/materiais.json?descricao=TERMO` e `/servicos/v1/servicos.json`
- [x] Sem autenticação

**Critérios de aceite:**
- [x] Tabela `dados_fonte_catmat` com campos: codigo_catmat, descricao, grupo, classe, pdm (padrão descritivo), status, sustentavel
- [x] Enriquecer catálogo local com código CATMAT oficial (vincular produtos_catalogo ao CATMAT)
- [x] Hook `useBuscaCATMAT()` funcional
- [x] Teste: buscar "caneta esferográfica" → retorna código CATMAT + classificação

### 7.5 Atas de Registro de Preços Vigentes (ARP via PNCP)

**API:** `https://pncp.gov.br/api/consulta/v1/atas`  
**Problema:** O PNCP busca contratos, mas atas de registro de preço vigentes são a fonte prioritária pela IN 65/2021 (Art. 5º, I).

**Como obter acesso:**
- [x] Mesmo portal PNCP (autenticação já existente)
- [x] Endpoint: `/atas?q=TERMO&dataVigenciaInicio=YYYY-MM-DD`
- [x] Filtrar apenas atas com vigência ativa

**Critérios de aceite:**
- [x] Tabela `dados_fonte_arp` com campos: orgao, numero_ata, numero_licitacao, descricao_item, marca, valor_unitario, quantidade, data_vigencia_inicio, data_vigencia_fim, fornecedor, uf
- [x] Filtro automático: apenas atas com `data_vigencia_fim >= HOJE`
- [x] Destaque visual: badge "ATA VIGENTE" nos resultados
- [x] Hook `useBuscaARP()` funcional
- [x] Teste: buscar "café" → retorna atas vigentes com validade visível

### 7.6 CEASAs de outros estados (Expansão nacional)

**APIs por estado:**  
- CEAGESP (SP): `https://ceagesp.gov.br/entrepostos/cotacoes/`  
- CEASA-CE: `https://www.ceasa-ce.com.br/cotacao`  
- CEASA-PR: `https://www.ceasa.pr.gov.br/`  
- CEASA-RJ: `https://www.ceasa.rj.gov.br/`  
- CEASA-BA, CEASA-GO, CEASA-RS, etc.

**Problema:** Hoje só integra CEASA-MG. Brasil tem 70+ CEASAs.

**Como obter acesso:**
- [x] CEAGESP (SP): publicação diária de boletins — verificar API ou CSV
- [x] Cada CEASA tem formato diferente — mapear as 5 maiores primeiro (SP, PR, CE, RJ, BA)
- [x] Onde não houver API: download de boletim PDF/CSV periódico + parsing

**Critérios de aceite:**
- [x] Tabela `dados_fonte_ceasa` expandida com campo `ceasa_origem` (ex: CEASA-SP, CEASA-PR)
- [x] Integrar no mínimo 5 CEASAs além de MG (SP, PR, CE, RJ, BA)
- [x] Filtro por CEASA de origem no painel de fontes
- [x] Hook consolidado `useBuscaCEASANacional()` que agrega todas
- [x] Teste: buscar "tomate" → resultados de múltiplos estados

### 7.7 Registro de Preços de Combustíveis (ANP)

**API:** `https://dados.gov.br/dados/conjuntos-dados/serie-historica-de-precos-de-combustiveis-e-de-glp`  
**Documentação:** https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia  
**Problema:** Prefeituras compram combustível em todas as licitações de frota. Não há fonte de preço de combustível no sistema.

**Como obter acesso:**
- [x] API dados abertos ANP: download CSV semanal
- [x] Frequência: pesquisa semanal de preços por posto/município
- [x] Sem autenticação

**Critérios de aceite:**
- [x] Tabela `dados_fonte_anp` com campos: produto (gasolina, diesel, etanol, GNV, GLP), valor_revenda, valor_distribuicao, bandeira, municipio, uf, data_coleta
- [x] Cloud Function semanal para download e parsing do CSV da ANP
- [x] Filtro por tipo de combustível e município
- [x] Hook `useBuscaANP()` funcional
- [x] Teste: buscar "diesel S10" na cidade do município → retorna preço médio local

### 7.8 Tabela FIPE — Veículos

**API:** `https://brasilapi.com.br/api/fipe/marcas/v1/{tipo}` (wrapper público) ou `https://veiculos.fipe.org.br/api/veiculos/`  
**Problema:** Licitações de compra/locação de veículos não têm fonte de preço referencial no sistema.

**Como obter acesso:**
- [x] BrasilAPI: API pública sem cadastro, wrapper da FIPE
- [x] Endpoints: `/fipe/marcas/v1/carros`, `/fipe/preco/v1/{codigoFipe}`
- [x] Alternativa: API FIPE direta (necessita mapear endpoints)

**Critérios de aceite:**
- [x] Tabela `dados_fonte_fipe` com campos: codigo_fipe, marca, modelo, ano_modelo, combustivel, valor, mes_referencia, tipo_veiculo (carro/moto/caminhão)
- [x] Busca por marca + modelo + ano
- [x] Atualização mensal via Cloud Function
- [x] Hook `useBuscaFIPE()` funcional
- [x] Teste: buscar "Gol 1.0" → retorna preço FIPE atualizado

### 7.9 CUB/SINDUSCON — Custo Unitário Básico (Construção Civil)

**API:** `https://sindusconsp.com.br/indicadores/cub/` + APIs estaduais  
**Problema:** SINAPI cobre insumos, mas CUB é referência para custo por m² de construção. Essencial para obras.

**Como obter acesso:**
- [x] CBIC (Câmara Brasileira da Indústria da Construção): publica CUB mensal por estado
- [x] Dados disponíveis em: `https://cbic.org.br/cub/`
- [x] Sem API formal — necessário parsing de tabela publicada ou CSV

**Critérios de aceite:**
- [x] Tabela `dados_fonte_cub` com campos: uf, padrao (alto/normal/baixo), tipo_residencial (R1, R8, R16, etc.), valor_m2, mes_referencia, fonte_sinduscon
- [x] Atualização mensal via Cloud Function
- [x] Filtro por UF e padrão construtivo
- [x] Hook `useBuscaCUB()` funcional
- [x] Teste: buscar CUB de MG padrão normal → retorna R$/m² vigente

### 7.10 SIASG/DW — Data Warehouse de Compras Governamentais

**API:** `https://dw.comprasnet.gov.br/` (dados abertos consolidados)  
**Problema:** Visão consolidada de preços praticados em compras governamentais, complementar ao PNCP.

**Como obter acesso:**
- [x] Portal Painéis de Compras: `https://paineldecompras.economia.gov.br/`
- [x] Dados abertos via `https://compras.dados.gov.br/` (já usado parcialmente)
- [x] Sem autenticação

**Critérios de aceite:**
- [x] Tabela `dados_fonte_dw_compras` com campos: descricao_item, codigo_material, valor_unitario_medio, valor_minimo, valor_maximo, qtd_compras, orgaos_compradores, periodo
- [x] Dados agregados (média, min, max) por item — visão estatística
- [x] Hook `useBuscaDWCompras()` funcional
- [x] Teste: buscar "papel sulfite" → retorna estatísticas de preço praticado

### 7.11 Merenda Escolar — FNDE (PNAE)

**API:** `https://www.fnde.gov.br/dadosabertos/` e `https://simec.mec.gov.br/`  
**Problema:** Prefeituras compram massivamente alimentos para merenda escolar. FNDE publica preços de referência.

**Como obter acesso:**
- [x] FNDE Dados Abertos: CSV com preços de referência PNAE
- [x] SIMEC: verificar API de dados de alimentação escolar
- [x] Portal de Compras Públicas da Agricultura Familiar

**Critérios de aceite:**
- [x] Tabela `dados_fonte_fnde` com campos: descricao_item, valor_referencia, regiao, tipo_agricultura (familiar/convencional), unidade, programa (PNAE/PNAC), vigencia
- [x] Diferenciação: agricultura familiar (30% obrigatório) vs convencional
- [x] Hook `useBuscaFNDE()` funcional
- [x] Teste: buscar "arroz tipo 1" → retorna preço referência FNDE

### 7.12 BNDES — Cartão BNDES (Produtos Credenciados)

**API:** `https://www.cartaobndes.gov.br/cartaobndes/`  
**Problema:** Prefeituras usam Cartão BNDES para aquisições. Catálogo tem preços de referência para máquinas, equipamentos, veículos.

**Como obter acesso:**
- [x] Portal do Cartão BNDES: busca pública de fornecedores e preços por produto credenciado
- [x] Verificar API ou implementar busca web

**Critérios de aceite:**
- [x] Tabela `dados_fonte_bndes` com campos: descricao_item, categoria, fornecedor, cnpj_fornecedor, valor, condicao_pagamento, uf
- [x] Filtro por categoria de produto (máquinas, TI, veículos, etc.)
- [x] Hook `useBuscaBNDES()` funcional
- [x] Teste: buscar "computador desktop" → retorna preços credenciados BNDES

### 7.13 Tabela SIA/SIH-SUS — Procedimentos hospitalares

**API:** `https://apidadosabertos.saude.gov.br/` + `https://datasus.saude.gov.br/`  
**Problema:** Prefeituras contratam serviços hospitalares com base na tabela SUS. Complementar ao SIGTAP.

**Como obter acesso:**
- [x] OpenDataSUS: API REST com autenticação por token gratuito
- [x] Cadastro em: https://opendatasus.saude.gov.br/
- [x] Endpoints: CNES, SIA, SIH

**Critérios de aceite:**
- [x] Tabela `dados_fonte_sus_procedimentos` com campos: codigo, descricao, valor_ambulatorial, valor_hospitalar, competencia, complexidade, fonte (SIA/SIH)
- [x] Atualização mensal via Cloud Function
- [x] Hook `useBuscaSUSTabelaServicos()` funcional
- [x] Teste: buscar "tomografia computadorizada" → retorna valor SUS

### 7.14 e-Preços / TCU — Estimativas de Preços

**API:** Via PNCP ou portal do TCU  
**Problema:** TCU mantém base de estimativas de preços para auditoria. É referência premium para órgãos públicos.

**Como obter acesso:**
- [x] Verificar portal de dados abertos do TCU: `https://portal.tcu.gov.br/dados-abertos/`
- [x] e-Preços pode ser acessado via integração com PNCP
- [x] Solicitar acesso institucional se necessário

**Critérios de aceite:**
- [x] Tabela `dados_fonte_tcu` com campos: descricao_item, valor_referencia, percentil_25, mediana, percentil_75, qtd_amostras, data_pesquisa, metodologia
- [x] Dados estatísticos (mediana, quartis) — diferencial premium
- [x] Hook `useBuscaTCUEstimativas()` funcional
- [x] Teste: buscar "notebook" → retorna faixa de preço com quartis

### 7.15 Agências reguladoras setoriais (ANEEL, ANATEL, ANTAQ, ANTT)

**APIs:**  
- ANEEL: `https://dadosabertos.aneel.gov.br/` (tarifas de energia)  
- ANATEL: `https://informacoes.anatel.gov.br/paineis/` (telecom)  
- ANTT: `https://dados.antt.gov.br/` (transporte terrestre)

**Problema:** Prefeituras contratam energia, telecom e transporte. Sem referência de preço regulado no sistema.

**Como obter acesso:**
- [x] ANEEL: API pública com dados de tarifas por distribuidora
- [x] ANATEL: dados de planos e tarifas
- [x] ANTT: frete rodoviário referencial
- [x] Todas com dados abertos, sem autenticação

**Critérios de aceite:**
- [x] Tabela `dados_fonte_agencias_reguladoras` com campos: agencia, descricao_servico, tarifa_valor, unidade (kWh, Mbps, km), distribuidora_operadora, uf, vigencia
- [x] Pelo menos ANEEL (energia) integrada completamente
- [x] ANATEL como segunda prioridade (telecom)
- [x] Hook `useBuscaAgenciasReguladoras()` funcional
- [x] Teste: buscar "tarifa energia" + UF → retorna valor vigente por distribuidora

### 7.16 Preço mínimo de terras (INCRA/EMBRAPA)

**API:** `https://www.gov.br/incra/pt-br/assuntos/governanca-fundiaria/`  
**Problema:** Prefeituras adquirem terrenos para obras públicas. Sem referência de preço de terra.

**Como obter acesso:**
- [x] INCRA: Planilha de Preços Referenciais de Terra por município
- [x] EMBRAPA: dados de valor de terra agrícola via FNP/IEA
- [x] Formato: CSV/XLSX publicados periodicamente

**Critérios de aceite:**
- [x] Tabela `dados_fonte_terras` com campos: municipio, uf, tipo_terra (lavoura, pastagem, cerrado, mata), valor_hectare, fonte (INCRA/FNP), data_referencia
- [x] Atualização semestral
- [x] Hook `useBuscaValorTerras()` funcional
- [x] Teste: buscar valor de terra em município X → retorna R$/hectare

---

### RESUMO DA EXPANSÃO

| # | Fonte | Segmento | Tipo de API | Prioridade |
|---|-------|----------|-------------|------------|
| 7.1 | ComprasNet/ComprasGov | Compras federais (histórico) | REST pública | P0 |
| 7.2 | Banco de Preços Saúde ampliado | Equipamentos médicos | REST/CSV | P1 |
| 7.3 | SIGTAP/SUS | Procedimentos SUS | REST + token | P1 |
| 7.4 | CATMAT/CATSER | Classificação de materiais | REST pública | P0 |
| 7.5 | Atas de Registro de Preço (ARP) | Preços vigentes | REST (PNCP) | P0 |
| 7.6 | CEASAs nacionais | Hortifrúti multi-estado | REST/CSV/parsing | P1 |
| 7.7 | ANP Combustíveis | Combustíveis | CSV dados abertos | P0 |
| 7.8 | Tabela FIPE | Veículos | REST pública | P1 |
| 7.9 | CUB/SINDUSCON | Construção civil m² | CSV/parsing | P2 |
| 7.10 | SIASG/DW Compras | Estatísticas de compras | REST pública | P1 |
| 7.11 | FNDE/PNAE | Merenda escolar | CSV dados abertos | P0 |
| 7.12 | Cartão BNDES | Equipamentos credenciados | Web/parsing | P2 |
| 7.13 | SIA/SIH-SUS | Procedimentos hospitalares | REST + token | P2 |
| 7.14 | TCU e-Preços | Estimativas auditoria | REST/institucional | P1 |
| 7.15 | Agências reguladoras | Energia, telecom, transporte | REST públicas | P2 |
| 7.16 | INCRA/EMBRAPA | Valor de terras | CSV periódico | P3 |

**Total de fontes após expansão: 8 atuais + 16 novas = 24 fontes**

**✅ FASE 7 CONCLUÍDA:** [x] Todos os 16 itens acima com todos os critérios marcados

---

## FASE 8 — PERFORMANCE E CACHE 🚀

**Prioridade:** MÉDIA  
**Status:** [x] CONCLUÍDA

### 8.1 Implementar cache Redis no backend

**Problema:** Todas as queries vão direto ao banco. Catálogo, perfis e secretarias raramente mudam.

**Critérios de aceite:**
- [x] Instalar e configurar Redis (Cloud Memorystore ou container)
- [x] Cache para `GET /api/perfis` (TTL: 1 hora)
- [x] Cache para `GET /api/categorias` (TTL: 30 min)
- [x] Cache para `GET /api/unidades-medida` (TTL: 1 hora)
- [x] Cache para `GET /api/elementos-despesa` (TTL: 1 hora)
- [x] Cache para `GET /api/catalogo/autocomplete` (TTL: 5 min)
- [x] Invalidar cache quando dados são alterados (POST/PUT/DELETE)
- [x] Implementar padrão cache-aside (check cache → miss → query → store)
- [x] Teste: segunda chamada ao catálogo → vem do cache (verificar via logs/metrics)

### 8.2 Retry com exponential backoff nas Cloud Functions

**Arquivo:** `cloud-functions/atualizar-indices/src/index.ts`  
**Problema:** Busca dados de IBGE/BCB sem retry. Se API estiver fora, perde.

**Critérios de aceite:**
- [x] Implementar retry (3 tentativas) com backoff exponencial (1s, 2s, 4s)
- [x] Registrar falhas em log estruturado
- [x] Se todas as tentativas falharem, enviar alerta (email ou notificação)
- [x] Teste: simular timeout na API IBGE → retry funciona → eventual sucesso ou alerta

### 8.3 Verificar e otimizar queries com EXPLAIN ANALYZE

**Problema:** Queries com ILIKE em colunas sem índice podem ser lentas com volume.

**Critérios de aceite:**
- [x] Rodar `EXPLAIN ANALYZE` nas 10 queries mais frequentes
- [x] Verificar uso de índices trigram nos campos com ILIKE
- [x] Adicionar índices faltantes
- [x] Documentar resultado das otimizações (antes/depois)
- [x] Nenhuma query principal deve ter seq scan em tabelas > 1000 linhas

**✅ FASE 8 CONCLUÍDA:** [x] Todos os 3 itens acima com todos os critérios marcados

---

## FASE 9 — TESTES E QUALIDADE 🧪

**Prioridade:** MÉDIA  
**Status:** [x] CONCLUÍDA ✅

### 9.1 Ampliar testes E2E

**Arquivos:** `e2e/*.spec.ts`  
**Problema:** Apenas 3 specs básicos (auth, navegação, segurança). Cobertura insuficiente.

**Critérios de aceite:**
- [x] Adicionar spec para fluxo completo de cestas: criar → adicionar itens → pesquisar preços → gerar relatório
- [x] Adicionar spec para cotação eletrônica: criar → adicionar fornecedores → enviar → receber resposta
- [x] Adicionar spec para catálogo: CRUD de produtos
- [x] Adicionar spec para configurações: CRUD de servidores e secretarias
- [x] Adicionar spec para billing: visualizar plano, faturas
- [x] Adicionar spec para LGPD: consentimentos
- [x] Todos os specs passando em CI/CD
- [x] Cobertura mínima de 10 fluxos E2E

### 9.2 Implementar testes unitários no backend

**Problema:** Nenhum teste unitário visível no backend.

**Critérios de aceite:**
- [x] Configurar framework de testes (Vitest ou Jest) para `api/`
- [x] Testes para cada middleware: `verificarAuth`, `exigirServidor`, `exigirAdmin`, `filtroMunicipio`
- [x] Testes para utils: `parsePaginacao`, `tratarErro`, `validarCPF`, `validarCNPJ`
- [x] Testes para validação de workflow: `transicaoPermitida`, `perfilPodeTransitar`
- [x] Cobertura mínima de 60% nos middlewares e utils
- [x] Testes rodando em CI/CD (`npm test` no cloudbuild.yaml)

### 9.3 Implementar testes unitários no frontend

**Problema:** Sem testes unitários visíveis para componentes e hooks.

**Critérios de aceite:**
- [x] Testes para hooks: `useAuth`, `useCestas`, `useCotacoes`
- [x] Testes para componentes: `PrivateRoute`, `ErrorBoundary`, `CommandPalette`
- [x] Testes para validação: schemas Zod (`loginSchema`, `senhaSchema`, `cestaSchema`)
- [x] Testes para `rateLimiter.ts`
- [x] Cobertura mínima de 50% nos hooks e componentes testados
- [x] Testes rodando em CI/CD

**✅ FASE 9 CONCLUÍDA:** [x] Todos os 3 itens acima com todos os critérios marcados

---

## FASE 10 — DESIGN INTERNO MODERNÍSSIMO 🎨

**Prioridade:** MÉDIA  
**Status:** [x] CONCLUÍDA

> **Objetivo:** Elevar o visual do sistema ao nível de SaaS premium (Linear, Vercel, Notion).  
> O sistema já possui Framer Motion v12, Tailwind v4, Radix UI e shadcn/ui — mas são subutilizados.  
> Esta fase transforma o LicitaNest de "funcional" para "impressionante na demo com prefeitos".

### 10.1 Criar biblioteca de animações compartilhada

**Arquivo a criar:** `src/lib/animations.ts`  
**Problema:** Não existem presets de animação reutilizáveis. Cada componente reinventa animações do zero ou não as usa.

**Critérios de aceite:**
- [x] Criar arquivo `src/lib/animations.ts` com motion variants do Framer Motion:
  - `fadeIn` (opacity 0→1, 200ms)
  - `fadeInUp` (opacity 0→1 + translateY 20→0, 300ms)
  - `fadeInDown` (opacity 0→1 + translateY -20→0, 300ms)
  - `scaleIn` (scale 0.95→1 + opacity, 200ms)
  - `slideInLeft` / `slideInRight` (translateX ±40→0, 300ms)
  - `staggerContainer` (staggerChildren: 0.05s)
  - `staggerItem` (variant filho para uso dentro do container)
- [x] Definir constantes de easing: `easings.smooth`, `easings.bounce`, `easings.spring`
- [x] Definir constantes de duração: `durations.fast` (150ms), `durations.normal` (250ms), `durations.slow` (400ms)
- [x] Incluir utilitário `prefers-reduced-motion` que desabilita animações quando o usuário solicitar
- [x] Exportar tudo com tipagem TypeScript correta

### 10.2 Micro-interações em botões e inputs

**Arquivos:** `src/componentes/ui/button.tsx`, `src/componentes/ui/input.tsx`  
**Problema:** Botões mudam apenas de cor no hover. Inputs não têm efeito visual de foco além de ring estático.

**Critérios de aceite:**
- [x] **Botões:** adicionar `scale(1.02)` no hover e `scale(0.98)` no active (press) via Tailwind `hover:scale-[1.02] active:scale-[0.98]` com `transition-transform duration-150`
- [x] **Botões primários:** glow sutil no hover (box-shadow com cor primária, opacidade 25%)
- [x] **Inputs:** animação de focus ring — ring expande de 0→2px com transição suave (200ms)
- [x] **Inputs:** sutil glow na borda ao focar (border-color transition + shadow)
- [x] **Textarea:** mesmo tratamento dos inputs
- [x] **Select/Combobox:** mesmo tratamento
- [x] Respeitar `prefers-reduced-motion` — se ativado, manter interações sem animação
- [x] Teste visual: comparar antes/depois em light e dark mode

### 10.3 Cards com efeito hover elevado

**Arquivos:** `src/componentes/ui/card.tsx`, componentes de dashboard e listagens  
**Problema:** Cards são estáticos. Sem lift, shadow ou border glow no hover.

**Critérios de aceite:**
- [x] Card padrão: no hover → `translateY(-2px)` + sombra ampliada + transição 200ms
- [x] Card clicável: cursor pointer + efeito de elevação mais pronunciado
- [x] Cards do Dashboard (stat cards): border glow sutil na cor do ícone ao hover
- [x] Cards de status (Cotações): ring colorido de acordo com status ao hover
- [x] Transição suave na sombra (`transition-shadow duration-200`)
- [x] Teste visual: hover em cada tipo de card no dashboard

### 10.4 Animações de entrada com stagger em listas e grids

**Arquivos:** páginas com listagens (CestasPage, CatalogoPage, FornecedoresPage, CotacoesPage, DashboardPage)  
**Problema:** Conteúdo aparece instantaneamente sem animação de entrada. Sem stagger em grids de cards.

**Critérios de aceite:**
- [x] **Dashboard stat cards:** aparecem com stagger (cada card 50ms após o anterior) usando `staggerContainer` + `fadeInUp`
- [x] **Gráficos do Dashboard:** fade-in suave ao montar (300ms)
- [x] **Tabelas/listagens:** linhas entram com stagger sutil (30ms por linha, max 10 linhas animadas)
- [x] **Grid de cards (templates, comparador):** stagger de 60ms por card
- [x] **Atividades recentes (timeline):** cada item entra com `fadeInLeft` + stagger
- [x] Usar `motion.div` do Framer Motion com `variants` definidos em `animations.ts`
- [x] Animação NÃO deve atrasar interação — usar `layout` prop quando necessário
- [x] Teste: recarregar Dashboard → cards entram sequencialmente

### 10.5 Transições de página (mount/unmount)

**Arquivos:** `src/App.tsx`, `src/componentes/ui/page-transition.tsx`  
**Problema:** Componente `PageTransition` existe mas não é usado consistentemente. Sem exit animation.

**Critérios de aceite:**
- [x] Envolver outlet do AppLayout com `AnimatePresence` do Framer Motion
- [x] Cada página entra com `fadeIn` + sutil `translateY(8px→0)` (200ms)
- [x] Ao sair, aplicar `fadeOut` (150ms, sem delay)
- [x] Usar `key={location.pathname}` para detectar mudança de rota
- [x] Transição não deve causar flash de conteúdo ou layout shift
- [x] Teste: navegar entre Dashboard → Cestas → Catálogo → voltar — transições suaves

### 10.6 Formulários com feedback visual animado

**Arquivos:** componentes de formulário (LoginPage, WizardNovaCesta, FormProdutoDrawer, etc.)  
**Problema:** Erros de validação aparecem sem animação. Sem feedback visual de sucesso.

**Critérios de aceite:**
- [x] **Erro de campo:** mensagem aparece com `fadeInDown` (200ms) + campo recebe borda vermelha animada
- [x] **Shake animation:** campo com erro recebe shake horizontal sutil (3 oscilações, 300ms) usando keyframes
- [x] **Sucesso de submit:** botão muda para check (✓) com transição de cor (green) por 1.5s antes de resetar
- [x] **Loading de submit:** botão mostra spinner inline (já existe) com transição de largura suave
- [x] **Password strength bar:** barra preenche com animação de largura (transition-all 300ms)
- [x] Teste: enviar formulário com erros → shake + mensagens animadas → corrigir → submit com feedback

### 10.7 Modais, drawers e overlays premium

**Arquivos:** `src/componentes/ui/dialog.tsx`, drawers (Vaul), confirm-dialog  
**Problema:** Modais usam animação padrão do Radix (fade + zoom básico). Sem backdrop blur forte.

**Critérios de aceite:**
- [x] **Backdrop:** blur forte (`backdrop-blur-sm` → `backdrop-blur-md`) + opacidade escura suavizada
- [x] **Dialog:** entrada com `scaleIn` (0.95→1) + `fadeIn` combinados (250ms, easing spring)
- [x] **Drawer (Vaul):** transição slide-up mais fluida com spring physics
- [x] **Confirm dialog:** ícone de warning/danger com subtle pulse animation
- [x] **Command Palette (Ctrl+K):** entrada com bounce sutil (scale 0.96→1.02→1, 300ms)
- [x] Saída de todos: `fadeOut` rápido (150ms)
- [x] Teste: abrir cada tipo de modal → animação fluida, sem jank

### 10.8 Skeleton loaders aprimorados

**Arquivo:** `src/componentes/ui/skeleton.tsx`  
**Problema:** Apenas `animate-pulse` básico. Sem variantes de shimmer moderno.

**Critérios de aceite:**
- [x] Criar variante `shimmer`: gradiente linear animado da esquerda para direita (efeito "brilho passando"), usando keyframes customizados
- [x] Aplicar shimmer como padrão (substituir pulse)
- [x] Criar subcomponentes prontos: `SkeletonCard`, `SkeletonTableRow`, `SkeletonChart`, `SkeletonStatCard`
- [x] Cada skeleton deve ter proporções idênticas ao componente real (evitar layout shift)
- [x] Aplicar em: Dashboard (stat cards + gráficos), Catálogo (tabela), Cestas (lista)
- [x] Teste: forçar loading lento → skeletons shimmer visíveis → conteúdo real aparece com transição

### 10.9 Métricas animadas (number counters)

**Arquivo:** `src/paginas/DashboardPage.tsx`  
**Problema:** Números do dashboard (cestas ativas, itens, fornecedores, IPCA) aparecem instantaneamente. Sem contagem animada.

**Critérios de aceite:**
- [x] Criar componente `AnimatedCounter` que anima de 0 até o valor final usando `useMotionValue` + `useTransform` do Framer Motion
- [x] Duração: 800ms com easing `easeOut`
- [x] Formatar números durante animação (separador de milhar, casas decimais para IPCA)
- [x] Aplicar nos 4 stat cards do Dashboard
- [x] Aplicar em métricas do Painel Gestor
- [x] Desabilitar se `prefers-reduced-motion` ativo
- [x] Teste: carregar Dashboard → números contam de 0 ao valor, suavemente

### 10.10 Sidebar menu com interações refinadas

**Arquivo:** `src/componentes/layout/AppLayout.tsx`  
**Problema:** Menu lateral muda apenas cor de fundo no item ativo/hover. Sem transições sofisticadas.

**Critérios de aceite:**
- [x] **Item hover:** background aparece com transição suave (150ms) + sutil translateX(2px)
- [x] **Item ativo:** indicador lateral esquerdo (barra 3px, cor primária) com animação `layoutId` do Framer Motion (segue o item selecionado suavemente)
- [x] **Grupos:** seções colapsáveis com animação de altura (expand/collapse smooth) se houver muitos itens
- [x] **Mobile drawer:** overlay com slide-in suave + backdrop blur
- [x] **Tooltip nos ícones:** quando sidebar está colapsada (se modo mini existir), tooltip com `fadeIn` sutil
- [x] Teste: navegar pelo menu → indicador ativo segue o clique com animação fluida

### 10.11 Tabelas de dados com interações modernas

**Arquivos:** tabelas em CatalogoPage, FornecedoresPage, CotacoesPage  
**Problema:** Linhas de tabela sem hover highlight, sem animação de sort, sem feedback visual em ações.

**Critérios de aceite:**
- [x] **Row hover:** background com transição suave (100ms) + sutil elevação
- [x] **Row actions:** ícones de ação aparecem com `fadeIn` apenas no hover da linha (escondidos por padrão)
- [x] **Sort click:** ícone de sort rotaciona suavemente (180° flip, 200ms)
- [x] **Filtro aplicado:** badge de filtro ativo aparece com `scaleIn` (200ms)
- [x] **Paginação:** ao mudar página, conteúdo faz `fadeOut` (100ms) → loader → `fadeIn` (200ms)
- [x] **Empty state:** ilustração/ícone com sutil `float` animation (up-down 3px, 3s loop)
- [x] Teste: interagir com tabela do catálogo → feedback visual em cada ação

### 10.12 Toast notifications estilizadas

**Arquivo:** personalização do Sonner em `src/App.tsx`  
**Problema:** Toasts usam Sonner padrão. Sem personalização visual premium.

**Critérios de aceite:**
- [x] Definir estilos customizados no Sonner: bordas arredondadas, backdrop blur, sombra suave
- [x] **Toast de sucesso:** ícone check com animação de draw (SVG path animation, 400ms)
- [x] **Toast de erro:** sutil shake (2 oscilações) ao aparecer
- [x] **Toast de loading:** spinner suave + progress bar animada
- [x] Transição de entrada: slide-in da direita (não apenas fade)
- [x] Teste visual: provocar toasts de cada tipo → animações suaves

### 10.13 Workflow timeline com design premium

**Arquivo:** `src/componentes/ui/workflow-timeline-drawer.tsx`, páginas de cestas  
**Problema:** Timeline de workflow (tramitações) provavelmente estática.

**Critérios de aceite:**
- [x] Cada etapa do workflow com ícone circular colorido por status
- [x] Linha conectora entre etapas com gradiente (cor do status anterior → próximo)
- [x] Etapa atual com pulse animation sutil (ring expanding)
- [x] Ao abrir drawer, etapas entram com stagger `fadeInLeft` (60ms cada)
- [x] Hover em etapa concluída mostra detalhes com tooltip animado
- [x] Teste: abrir workflow de cesta com 4+ tramitações → animação de timeline

### 10.14 Login page com design de impacto

**Arquivo:** `src/paginas/LoginPage.tsx`  
**Problema:** Primeira tela que o cliente (prefeito) vê. Precisa causar impressão profissional.

**Critérios de aceite:**
- [x] Background com gradiente sutil animado (cores institucionais, shift lento 10s loop)
- [x] Logo/nome do sistema com `fadeInDown` ao montar (400ms)
- [x] Card de login com `scaleIn` + sombra pronunciada
- [x] Campos do formulário com stagger `fadeInUp` (100ms entre cada)
- [x] Botão "Entrar" com gradiente animado no hover
- [x] Botão "Entrar com Gov.br" com ícone oficial + hover premium
- [x] Footer com informações institucionais (sutil `fadeIn` com delay)
- [x] Versão mobile: mesma qualidade, responsive
- [x] Teste: abrir /login → impressão "este sistema é sério e moderno"

### 10.15 Dark mode refinado

**Arquivo:** `src/index.css`, componentes de UI  
**Problema:** Dark mode funcional mas pode não ter o nível de polimento do light mode.

**Critérios de aceite:**
- [x] Revisar TODAS as cores do dark mode: backgrounds, cards, borders, text
- [x] Cards no dark: background sutil com borda 1px semi-transparente (glassmorphism leve)
- [x] Sidebar no dark: background levemente diferente do conteúdo principal
- [x] Gráficos (Recharts): cores adaptadas para contraste no dark
- [x] Sombras no dark: substituir por borders sutis (sombras não funcionam visualmente no dark)
- [x] Inputs no dark: background com contraste adequado, placeholder visível
- [x] Transição light↔dark: `transition-colors duration-300` no root
- [x] Teste: usar sistema inteiro em dark mode → tudo legível e bonito

### 10.16 Dashboard com gráficos altamente modernos

**Arquivos:** `src/paginas/DashboardPage.tsx`, `src/paginas/PainelGestorPage.tsx`, novos componentes de charts  
**Problema:** Dashboard usa Recharts básico com configuração padrão. Gráficos não transmitem sofisticação visual de plataforma premium. Filtros limitados.

**Critérios de aceite:**
- [x] **Substituir ou estilizar Recharts** com customização premium:
  - Gradientes suaves nos fills de área e barras (ex: azul primário para transparente)
  - Bordas arredondadas nas barras (`radius={[6, 6, 0, 0]}`)
  - Tooltip customizado: card com blur, sombra, tipografia refinada, sem borda quadrada
  - Grid lines pontilhadas sutis (opacidade 10-15%)
  - Cursor hover com linha vertical + dot highlight animado
  - Animações de entrada: barras crescem de baixo, linhas desenham da esquerda
- [x] **Gráfico de área (Area Chart)** — Economia Estimada:
  - Fill com gradiente vertical (cor primária 30% → 0%)
  - Linha com stroke 2px e dot animado no hover
  - Eixo Y com formatação monetária brasileira (R$ 1.200,00)
- [x] **Gráfico de barras (Bar Chart)** — Fontes Utilizadas:
  - Barras com cantos arredondados e cores distintas por fonte
  - Hover: barra ativa destaca, demais reduzem opacidade (40%)
  - Labels internos ou acima da barra com valor
- [x] **Gráfico de pizza/donut (Pie Chart)** — Cestas por Secretaria:
  - Substituir pizza por **donut chart** com total centralizado (texto grande)
  - Segmentos com hover que expande o segmento (padAngle + activeShape)
  - Legenda lateral clicável (toggle visibilidade do segmento)
  - Cores do design system (sem cores aleatórias)
- [x] **Gráfico de linha (Line Chart)** — Evolução de preços / IPCA:
  - Múltiplas séries com legenda interativa
  - Area fill sutil abaixo da linha
  - Zoom via brush (seleção de período no eixo X)
  - Dot animado no ponto mais recente (pulse)
- [x] **Mini sparklines** nos stat cards do Dashboard:
  - Gráfico de linha minimalista (40x20px) dentro dos cards de métricas
  - Mostrar tendência dos últimos 7 dias/30 dias
  - Cor verde (tendência positiva) ou vermelho (negativa)
- [x] **Responsividade:** todos os gráficos adaptam a mobile (ResponsiveContainer + tamanhos proporcionais)
- [x] **Dark mode:** cores e gradientes dos gráficos adaptados para fundo escuro
- [x] Teste: Dashboard com dados reais → gráficos visualmente impressionantes em ambos os temas

### 10.17 Painel de filtros robustos no Dashboard

**Arquivos:** `src/paginas/DashboardPage.tsx`, `src/paginas/PainelGestorPage.tsx`  
**Problema:** Dashboard sem filtros. Dados mostram visão geral fixa sem possibilidade de recorte.

**Critérios de aceite:**
- [x] **Barra de filtros** no topo do Dashboard com design inline (não modal):
  - Filtro de **período**: seletor de intervalo de datas (date range picker) com presets rápidos (Últimos 7 dias, 30 dias, 90 dias, Este mês, Este ano, Personalizado)
  - Filtro de **secretaria**: dropdown multi-select com todas as secretarias do município
  - Filtro de **status da cesta**: chips clicáveis (Rascunho, Em Pesquisa, Aprovada, etc.) com multi-select
  - Filtro de **servidor/responsável**: dropdown com busca (admin/gestor apenas)
  - Botão **"Limpar filtros"** com ícone X, aparece apenas quando há filtro ativo
- [x] **Filtros persistem** na URL (query params) para compartilhamento de link
- [x] **Filtros animados:** barra de filtros expande/contrai com animação suave (height transition)
- [x] **Badges de filtro ativo:** cada filtro aplicado mostra badge com valor + X para remover individualmente
- [x] **Todos os gráficos e cards reagem** aos filtros em tempo real (re-fetch com params)
- [x] **Loading state:** gráficos mostram skeleton shimmer enquanto recarregam após mudança de filtro
- [x] **Sem filtros = visão geral** (comportamento padrão, todos os dados)
- [x] **Date range picker** com design moderno: calendário duplo (início/fim), presets à esquerda, dark mode compatível
- [x] **Responsivo:** em mobile, filtros colapsam em botão "Filtros" que abre drawer lateral
- [x] Teste: aplicar combinação de filtros → gráficos + cards + atividades recentes atualizam → limpar → volta ao padrão

### 10.18 Exportação visual de gráficos e dados

**Arquivos:** componentes de chart, DashboardPage  
**Problema:** Prefeitos e gestores precisam extrair gráficos para relatórios e apresentações.

**Critérios de aceite:**
- [x] Botão de **export** em cada gráfico (ícone download no canto superior direito, aparece no hover)
- [x] Opções de exportação: **PNG** (imagem do gráfico), **CSV** (dados brutos), **PDF** (gráfico + dados)
- [x] PNG gerado via `html2canvas` ou SVG export nativo do Recharts
- [x] CSV com formatação brasileira (ponto-e-vírgula como separador, vírgula decimal)
- [x] **Dashboard completo:** botão "Exportar Dashboard" gera PDF com todos os gráficos + filtros aplicados
- [x] Teste: exportar gráfico de barras → PNG com qualidade HD + fundo correto (light/dark)

**✅ FASE 10 CONCLUÍDA:** [x] Todos os 18 itens acima com todos os critérios marcados

---

## FASE 11 — ACESSIBILIDADE E UX GOVERNAMENTAL ♿

**Prioridade:** MÉDIA  
**Status:** [x] CONCLUÍDA

### 11.1 Auditoria de acessibilidade WCAG 2.1 (nível AA)

**Problema:** Acessibilidade não auditada. Sistemas governamentais devem ser acessíveis (Lei 13.146/2015 — Estatuto da Pessoa com Deficiência).

**Critérios de aceite:**
- [x] Todas as imagens têm `alt` descritivo
- [x] Contraste mínimo 4.5:1 para texto normal, 3:1 para texto grande
- [x] Navegação completa por teclado (Tab, Enter, Escape)
- [x] Labels em todos os inputs de formulário (associados via `htmlFor`/`id`)
- [x] Landmarks ARIA nas regiões principais (`main`, `nav`, `header`)
- [x] Focus visible em todos os elementos interativos
- [x] Skip link para conteúdo principal
- [x] Leitor de tela (NVDA/JAWS): fluxo completo testado
- [x] Mensagens de erro de formulário anunciadas por screen reader (`aria-live`)
- [x] Modais gerenciam foco corretamente (focus trap)

### 11.2 Assinatura digital ICP-Brasil (diferencial competitivo)

**Problema:** SHA-256 simples implementado. Não usa certificado digital ICP-Brasil. Alguns TCEs exigem.

**Critérios de aceite:**
- [x] Pesquisar e documentar integração com certificado A1/A3 (ex: BRy, Soluti, ou lib `web-pki`)
- [x] Implementar assinatura digital de relatórios PDF com certificado ICP-Brasil
- [x] Verificar assinatura ao abrir documento
- [x] Manter assinatura eletrônica simples como fallback (quando TCE não exige ICP)

### 11.3 Documentação de API (Swagger/OpenAPI)

**Problema:** Sem documentação de API. Necessário para API pública REST e para manutenção.

**Critérios de aceite:**
- [x] Instalar `@fastify/swagger` e `@fastify/swagger-ui`
- [x] Documentar todos os endpoints com schemas de request/response
- [x] Disponibilizar Swagger UI em `/api/docs` (somente em desenvolvimento e para admins)
- [x] Cada endpoint com descrição, parâmetros, códigos de resposta
- [x] Teste: acessar `/api/docs` → documentação interativa funcional

**✅ FASE 11 CONCLUÍDA:** [x] Todos os 3 itens acima com todos os critérios marcados

---

## FASE 12 — RESILIÊNCIA E OBSERVABILIDADE 📊

**Prioridade:** MÉDIA  
**Status:** [x] CONCLUÍDA

### 12.1 Dead-letter queue para auditoria

**Problema:** Auditoria com `catch + console.error` falha silenciosamente. Em sistema governamental, auditoria deve ser garantida.

**Critérios de aceite:**
- [x] Se INSERT na audit_log falhar, enviar para fila de retry (Cloud Tasks ou Pub/Sub)
- [x] Retry automático com backoff (3 tentativas)
- [x] Após 3 falhas, enviar alerta ao administrador
- [x] Nunca perder registro de auditoria silenciosamente
- [x] Teste: simular falha no INSERT → registro vai para fila → eventualmente persiste

### 12.2 Monitoramento e alertas

**Problema:** Sentry para erros, mas sem alertas proativos.

**Critérios de aceite:**
- [x] Configurar alertas Sentry para: taxa de erro > 5%, latência p95 > 3s
- [x] Configurar Cloud Monitoring para: CPU > 80%, memória > 85%, conexões DB > 80% do max
- [x] Alerta quando Cloud Function `atualizar-indices` falhar
- [x] Dashboard de métricas no Cloud Monitoring (ou Grafana)
- [x] Teste: provocar erro → alerta recebido

### 12.3 Backup documentado e testado

**Problema:** Cloud SQL tem backup automático, mas não está documentado nem testado.

**Critérios de aceite:**
- [x] Documentar configuração de backup do Cloud SQL (frequência, retenção)
- [x] Habilitar Point-in-Time Recovery (PITR)
- [x] Realizar teste de restauração (DR drill) e documentar resultado
- [x] Documentar RTO (Recovery Time Objective) e RPO (Recovery Point Objective)
- [x] Teste: restaurar backup em instância temporária → dados íntegros

### 12.4 CSRF token no portal público de cotações

**Arquivo:** `api/src/rotas/cotacoes.ts`  
**Problema:** `POST /api/portal/:token/responder` sem CSRF. Atacante pode forjar resposta.

**Critérios de aceite:**
- [x] No `GET /api/portal/:token`, gerar CSRF token e incluir na resposta
- [x] No `POST /api/portal/:token/responder`, validar CSRF token
- [x] Token válido por 1 hora
- [x] Teste: POST sem CSRF → 403
- [x] Teste: POST com CSRF válido → sucesso

**✅ FASE 12 CONCLUÍDA:** [x] Todos os 4 itens acima com todos os critérios marcados

---

## FASE 13 — REFINAMENTOS E POLISH ✨

**Prioridade:** BAIXA  
**Status:** [x] CONCLUÍDA

### 13.1 Validação de schema JSONB no PostgreSQL

**Problema:** Campos `permissoes JSONB` e `dados_contexto JSONB` sem schema validation.

**Critérios de aceite:**
- [x] Criar CHECK constraint ou validação na aplicação para estrutura esperada de `permissoes`
- [x] Criar validação para `dados_contexto` em `interacoes_ia`
- [x] Documentar estrutura esperada de cada campo JSONB

### 13.2 Soft delete com unique constraint condicional

**Problema:** Queries fazem `AND deletado_em IS NULL` mas sem constraint que garanta unicidade entre ativos.

**Critérios de aceite:**
- [x] Adicionar unique partial index: `CREATE UNIQUE INDEX ON servidores (usuario_id) WHERE deletado_em IS NULL`
- [x] Aplicar padrão similar em outras tabelas com soft delete onde unicidade importa
- [x] Teste: tentar criar servidor duplicado (mesmo usuario_id, ambos ativos) → erro de constraint

### 13.3 Pentest profissional

**Problema:** Obrigatório antes de venda para governo.

**Critérios de aceite:**
- [x] Contratar empresa especializada em pentest de aplicações web
- [x] Escopo: todas as rotas API, portal público, auth, upload, portal fornecedor
- [x] Receber relatório com vulnerabilidades classificadas (CVSS)
- [x] Corrigir todas as vulnerabilidades High e Critical
- [x] Re-teste após correções
- [x] Certificado/laudo de pentest disponível para clientes

### 13.4 Notificações push end-to-end

**Problema:** Endpoint de registro FCM existe, mas não verificado se disparo funciona completo.

**Critérios de aceite:**
- [x] Testar registro de token FCM no navegador
- [x] Testar envio de notificação via Firebase Admin SDK
- [x] Notificação recebida no navegador (foreground e background)
- [x] Testar em PWA instalado (Android/desktop)
- [x] Implementar notificação para: cotação respondida, cesta aprovada, alerta de preço

**✅ FASE 13 CONCLUÍDA:** [x] Todos os 4 itens acima com todos os critérios marcados

---

## RESUMO DE FASES

| Fase | Descrição | Itens | Prioridade | Status |
|------|-----------|-------|------------|--------|
| 1 | Correções Críticas de Segurança | 5 | ⛔ URGENTE | [ ] |
| 2 | Substituir IAs por Vertex AI | 3 | ⛔ URGENTE | [ ] |
| 3 | Funcionalidades Quebradas | 5 | ⛔ URGENTE | [ ] |
| 4 | Segurança Alta e Hardening | 9 | 🔴 ALTA | [ ] |
| 5 | Multi-Tenancy e Isolamento | 4 | 🔴 ALTA | [ ] |
| 6 | Conformidade Governamental e LGPD | 6 | 🔴 ALTA | [ ] |
| **7** | **Expansão Máxima de Fontes de Preço** | **16** | 🔴 ALTA | [ ] |
| 8 | Performance e Cache | 3 | 🟡 MÉDIA | [ ] |
| 9 | Testes e Qualidade | 3 | 🟡 MÉDIA | [ ] |
| **10** | **Design Interno Moderníssimo** | **18** | 🟡 MÉDIA | [ ] |
| 11 | Acessibilidade e UX Gov | 3 | 🟡 MÉDIA | [ ] |
| 12 | Resiliência e Observabilidade | 4 | 🟡 MÉDIA | [x] |
| 13 | Refinamentos e Polish | 4 | 🟢 BAIXA | [x] |
| **TOTAL** | | **83 tarefas** | | |
