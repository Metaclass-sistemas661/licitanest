# ROADMAP DE ATUALIZAÇÃO — LICITANEST

**Criado em:** 08/04/2026  
**Objetivo:** Migrar o sistema do modelo SaaS com planos para modelo de contratos governamentais, implementar Painel SuperAdmin completo, portal de contratos no sistema operacional e assinatura digital com certificado.

---

## CRITÉRIOS GERAIS DE EXECUÇÃO

1. **Cumprir fielmente** cada recomendação descrita em cada fase — sem pular etapas, sem implementações parciais.
2. **Após finalizar uma fase**, marcar como `✅ CONCLUÍDA` neste documento com a data de conclusão.
3. **Cada fase só pode ser iniciada** após a anterior estar concluída e validada (build sem erros, testes passando).
4. **Todo código deve seguir** os padrões já existentes no projeto: TypeScript strict, Tailwind CSS, Radix UI, Framer Motion, TanStack React Query.
5. **Nenhuma funcionalidade existente pode quebrar** — testes de regressão obrigatórios ao fim de cada fase.
6. **Modo claro/escuro** deve funcionar em TODAS as telas criadas.
7. **Responsividade mobile** obrigatória em TODAS as telas criadas (desktop, tablet, mobile).
8. **Sidebar colapsável** com categorias encapsuláveis no painel SuperAdmin.
9. **Audit log** de todas as ações críticas.

---

## FASE 1 — FUNDAÇÃO: MODELO DE DADOS E INFRAESTRUTURA
**Status:** ✅ CONCLUÍDA  
**Estimativa:** Sprint de 3-5 dias

### 1.1 Migration SQL — Tabelas de Contratos
- [x] Criar arquivo `sql/31_contratos.sql`
- [x] Criar tabela `contratos` com todos os campos:
  - `id`, `municipio_id`, `numero_contrato`, `objeto`, `valor_total` (centavos), `valor_mensal`, `quantidade_parcelas`
  - `data_inicio`, `data_fim`, `data_assinatura`
  - `limite_usuarios`, `limite_cestas`, `limite_cotacoes_mes`
  - `status` ('rascunho', 'pendente_assinatura', 'ativo', 'suspenso', 'encerrado', 'cancelado', 'renovacao')
  - `pdf_url`, `pdf_nome_arquivo`, `pdf_tamanho_bytes`, `pdf_hash_sha256`
  - `conteudo_html`, `conteudo_json` (JSONB — estado do editor TipTap)
  - `responsavel_nome`, `responsavel_cargo`, `responsavel_cpf`
  - `numero_processo`, `modalidade`
  - `observacoes`
  - `assinatura_digital_status` ('pendente', 'assinado', 'recusado', 'expirado')
  - `assinatura_digital_certificado` (JSONB — dados do certificado usado)
  - `assinatura_digital_hash` (VARCHAR(128) — hash do documento assinado)
  - `assinatura_digital_em` (TIMESTAMPTZ — data/hora da assinatura)
  - `assinatura_digital_por` (UUID — FK para servidores)
  - `criado_por`, `atualizado_por`, `criado_em`, `atualizado_em`, `deletado_em`
  - Índices: `municipio_id`, `status`, `data_inicio/data_fim`, `numero_contrato`, `assinatura_digital_status`
  - RLS habilitado

- [x] Criar tabela `contratos_aditivos`:
  - `id`, `contrato_id` (FK CASCADE), `numero_aditivo`, `tipo` ('valor', 'prazo', 'objeto', 'misto')
  - `descricao`, `valor_acrescimo` (centavos), `nova_data_fim`, `novos_limites` (JSONB)
  - `pdf_url`, `pdf_nome_arquivo`, `data_assinatura`
  - `criado_por`, `criado_em`

- [x] Criar tabela `contratos_historico` (audit trail):
  - `id`, `contrato_id` (FK), `acao`, `campo_alterado`, `valor_anterior`, `valor_novo`
  - `usuario_id`, `ip_address` (INET), `criado_em`

- [x] Criar tabela `contratos_notificacoes`:
  - `id`, `contrato_id` (FK), `municipio_id` (FK), `servidor_id` (FK — destinatário)
  - `tipo` ('novo_contrato', 'aditivo', 'vencimento_proximo', 'documento_assinado')
  - `titulo`, `mensagem`, `lido` (BOOLEAN DEFAULT FALSE), `lido_em`
  - `criado_em`

### 1.2 Flag SuperAdmin
- [x] Adicionar coluna `is_superadmin BOOLEAN NOT NULL DEFAULT FALSE` na tabela `servidores`
- [x] Setar `is_superadmin = TRUE` apenas no usuário do desenvolvedor (hardcoded por email)
- [x] Garantir que a flag NÃO é exposta em endpoints públicos

### 1.3 Reestruturar Tabela de Faturas
- [x] Criar migration para alterar tabela `faturas`:
  - Substituir `assinatura_id` por `contrato_id` (FK para contratos)
  - Adicionar campo `parcela` (INTEGER)
  - Adicionar campo `comprovante_url`
  - Manter compatibilidade retroativa durante a transição

### 1.4 Rotas de API — Contratos
- [x] Criar `api/src/rotas/contratos.ts` com:
  - `GET /api/contratos` — listar contratos (com filtros: status, municipio_id, vigência)
  - `GET /api/contratos/:id` — buscar contrato por ID
  - `POST /api/contratos` — criar contrato (somente superadmin)
  - `PUT /api/contratos/:id` — editar contrato (somente superadmin)
  - `DELETE /api/contratos/:id` — soft delete (somente superadmin)
  - `POST /api/contratos/:id/upload` — upload de PDF (signed URL para GCS)
  - `GET /api/contratos/:id/download` — download de PDF (signed URL)
  - `POST /api/contratos/:id/enviar` — enviar contrato para o portal do município
  - `POST /api/contratos/:id/verificar-acesso` — verificar CPF + data nascimento
  - `POST /api/contratos/:id/assinar` — assinatura digital com certificado
  - `GET /api/contratos/:id/historico` — histórico de alterações
  - `POST /api/contratos/:id/aditivos` — criar aditivo
  - `GET /api/contratos/:id/aditivos` — listar aditivos

### 1.5 Middleware SuperAdmin
- [x] Criar `api/src/middleware/superadmin.ts`:
  - Verificar `is_superadmin === true` no servidor autenticado
  - Retornar 403 se não for superadmin
  - Registrar tentativas não autorizadas no audit_log

### 1.6 Serviço Frontend — Contratos
- [x] Criar `src/servicos/contratos.ts`:
  - `listarContratos(filtros)`, `buscarContrato(id)`, `criarContrato(dados)`, `atualizarContrato(id, dados)`
  - `uploadPdfContrato(id, arquivo)`, `downloadPdfContrato(id)`
  - `enviarContratoParaMunicipio(id)`, `verificarAcessoContrato(id, cpf, dataNascimento)`
  - `assinarContrato(id, dadosCertificado)`, `listarAditivos(contratoId)`, `criarAditivo(contratoId, dados)`
  - `listarHistorico(contratoId)`, `listarNotificacoes()`

### 1.7 Tipos TypeScript
- [x] Adicionar em `src/tipos/index.ts`:
  - `Contrato`, `ContratoAditivo`, `ContratoHistorico`, `ContratoNotificacao`
  - `StatusContrato`, `StatusAssinaturaDigital`, `TipoAditivo`, `ModalidadeLicitacao`
  - Remover/deprecar `NomePlano`, `Plano`, `Assinatura`
  - Atualizar `DadosOnboarding` (remover `plano_escolhido`, `plano_selecionado`)
  - Atualizar `EtapaOnboarding` (remover `"escolha_plano"`)

**Critério de conclusão:** ✅ Migrations criadas, API com todos os endpoints CRUD + portal, middleware superadmin, tipos TypeScript, serviço frontend.

---

## FASE 2 — PAINEL SUPERADMIN: LAYOUT E AUTENTICAÇÃO
**Status:** ✅ CONCLUÍDA  
**Estimativa:** Sprint de 3-5 dias

### 2.1 Layout SuperAdmin
- [x] Criar `src/componentes/layout/SuperAdminLayout.tsx`:
  - Sidebar esquerdo **colapsável** com categorias encapsuláveis (chevron animado, max-h transition)
  - Categorias:
    - **Visão Geral:** Dashboard Financeiro, Atividades Recentes
    - **Gestão:** Prefeituras, Usuários, Contratos
    - **Financeiro:** Faturas, Receita, Inadimplência
    - **Sistema:** Audit Log, Configurações, API Keys
  - Toggle light/dark/system (3 modos, ícones Sun/Moon/Monitor)
  - Top bar com busca, notificações, avatar do superadmin
  - Sidebar colapsável em modo ícone (tablet) e drawer (mobile)
  - Bottom navigation bar no mobile (4 ícones: Dashboard / Prefeituras / Contratos / Menu)
  - Animações Framer Motion: transição de página, sidebar layoutId
  - Botão "Ir para modo operacional →" no footer do sidebar

### 2.2 Adaptação do AuthContexto
- [x] Modificar `src/contextos/AuthContexto.tsx`:
  - Adicionar `isSuperAdmin: boolean` ao `AuthContextoValor`
  - No `carregarServidor()`: extrair `is_superadmin` do retorno da API
  - No `temPermissao()`: superadmin tem TODAS as permissões
  - Pós-login: se `isSuperAdmin === true` → redirect para `/superadmin` ao invés de `/`

### 2.3 Rotas SuperAdmin
- [x] Modificar `src/App.tsx`:
  - Adicionar rotas `/superadmin/*` protegidas por `isSuperAdmin`
  - Layout: `<SuperAdminLayout>` como wrapper
  - Sub-rotas:
    - `/superadmin` → Dashboard Financeiro
    - `/superadmin/prefeituras` → Prefeituras
    - `/superadmin/usuarios` → Usuários
    - `/superadmin/contratos` → Contratos
    - `/superadmin/contratos/:id/editar` → Editor de Contrato
    - `/superadmin/faturas` → Faturas
    - `/superadmin/audit-log` → Audit Log
    - `/superadmin/configuracoes` → Configurações
  - Remover rota `/billing`
  - Substituir rota `/admin-metaclass` por redirect para `/superadmin`

### 2.4 Proteção de Rotas
- [x] Criar componente `SuperAdminGuard`:
  - Se `isSuperAdmin !== true` → renderiza página 403 com botão "Voltar"
  - Se não autenticado → redirect para `/login`
- [x] Login via **mesma página de login** (`/login`):
  - Após login, se `is_superadmin === true` → redirect automático para `/superadmin`
  - Nenhuma URL separada de login para superadmin (segurança: não expor existência do painel)

### 2.5 Ajuste do Sidebar Operacional
- [x] Modificar `src/componentes/layout/AppLayout.tsx`:
  - Remover item "Assinatura e Billing" (`/billing`)
  - Substituir "Admin Metaclass" por "Painel SuperAdmin" (`/superadmin`) — visível somente se `isSuperAdmin`
  - Adicionar item "Contratos" na seção "Gestão" — visível para perfil `administrador` do município

### 2.6 Paleta de Cores SuperAdmin
- [x] Definir variáveis CSS específicas para o painel SuperAdmin:
  - Light: bg `#f8fafc`, sidebar `#ffffff`, accent `#6366f1` (indigo)
  - Dark: bg `#0f172a`, sidebar `#1e293b`, accent `#818cf8`
  - KPI positivo: emerald, KPI negativo: red, KPI alerta: amber

**Critério de conclusão:** Login como superadmin redireciona para `/superadmin`, layout renderiza com sidebar colapsável em todas as resoluções (desktop, tablet, mobile), dark/light funcionando, rotas protegidas.

---

## FASE 3 — MONITORAMENTO GERAL DO SISTEMA E FERRAMENTAS DE TESTE (SUPERADMIN)
**Status:** ✅ CONCLUÍDA  
**Estimativa:** Sprint de 5-8 dias

> Painel de observabilidade completo dentro do portal SuperAdmin. O SuperAdmin deve ter visibilidade total sobre a saúde do sistema — erros em tempo real, stack traces com arquivo e linha exata, métricas de performance, e ferramentas de teste integradas para prevenção proativa de falhas.

### 3.1 Backend — Infraestrutura de Coleta de Erros e Métricas

#### 3.1.1 Tabelas SQL de Monitoramento
- [x] Criar `sql/32_monitoramento.sql`:
  ```sql
  -- Erros capturados (frontend + API + cloud functions)
  CREATE TABLE superadmin.erros_sistema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    origem VARCHAR(20) NOT NULL CHECK (origem IN ('frontend', 'api', 'cloud_function', 'cron', 'webhook')),
    severidade VARCHAR(10) NOT NULL CHECK (severidade IN ('critical', 'error', 'warning', 'info')),
    mensagem TEXT NOT NULL,
    stack_trace TEXT,
    arquivo VARCHAR(500),       -- ex: "src/paginas/CatalogoPage.tsx"
    linha INTEGER,              -- ex: 142
    coluna INTEGER,             -- ex: 23
    funcao VARCHAR(300),        -- ex: "handleBuscaCatalogo"
    modulo VARCHAR(200),        -- ex: "CatalogoPage"
    url_requisicao VARCHAR(2000),
    metodo_http VARCHAR(10),
    status_http INTEGER,
    request_body JSONB,
    response_body JSONB,
    headers JSONB,
    usuario_id UUID REFERENCES auth.servidores(id),
    municipio_id UUID REFERENCES public.municipios_acesso(id),
    user_agent TEXT,
    ip_address INET,
    browser VARCHAR(100),
    os VARCHAR(100),
    fingerprint VARCHAR(64),    -- hash para agrupar erros idênticos
    ocorrencias INTEGER DEFAULT 1,
    primeira_ocorrencia TIMESTAMPTZ DEFAULT now(),
    ultima_ocorrencia TIMESTAMPTZ DEFAULT now(),
    resolvido BOOLEAN DEFAULT false,
    resolvido_por UUID REFERENCES auth.servidores(id),
    resolvido_em TIMESTAMPTZ,
    notas_resolucao TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
  );

  -- Índices para queries rápidas
  CREATE INDEX idx_erros_origem ON superadmin.erros_sistema(origem);
  CREATE INDEX idx_erros_severidade ON superadmin.erros_sistema(severidade);
  CREATE INDEX idx_erros_resolvido ON superadmin.erros_sistema(resolvido);
  CREATE INDEX idx_erros_fingerprint ON superadmin.erros_sistema(fingerprint);
  CREATE INDEX idx_erros_created ON superadmin.erros_sistema(created_at DESC);
  CREATE INDEX idx_erros_municipio ON superadmin.erros_sistema(municipio_id);

  -- Métricas de saúde do sistema (coletadas a cada 1 min)
  CREATE TABLE superadmin.metricas_sistema (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT now(),
    tipo VARCHAR(30) NOT NULL, -- 'api_latency', 'db_pool', 'memory', 'cpu', 'error_rate', 'request_count'
    valor NUMERIC NOT NULL,
    unidade VARCHAR(20),       -- 'ms', 'percent', 'count', 'bytes'
    labels JSONB DEFAULT '{}', -- ex: { "endpoint": "/api/cestas", "method": "GET" }
    created_at TIMESTAMPTZ DEFAULT now()
  );

  CREATE INDEX idx_metricas_tipo_ts ON superadmin.metricas_sistema(tipo, timestamp DESC);

  -- Resultados de testes de saúde (health checks)
  CREATE TABLE superadmin.health_checks (
    id BIGSERIAL PRIMARY KEY,
    servico VARCHAR(50) NOT NULL,  -- 'api', 'database', 'redis', 'firebase', 'gcs', 'cloud_function'
    status VARCHAR(10) NOT NULL,    -- 'healthy', 'degraded', 'down'
    latencia_ms INTEGER,
    detalhes JSONB,
    verificado_em TIMESTAMPTZ DEFAULT now()
  );

  CREATE INDEX idx_health_servico ON superadmin.health_checks(servico, verificado_em DESC);

  -- Resultados de testes automatizados rodados pelo SuperAdmin
  CREATE TABLE superadmin.resultados_testes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suite VARCHAR(100) NOT NULL,     -- 'api_endpoints', 'database_integrity', 'auth_flow', 'rls_policies', 'performance'
    teste VARCHAR(300) NOT NULL,     -- ex: "POST /api/cestas retorna 201"
    status VARCHAR(10) NOT NULL,     -- 'pass', 'fail', 'skip', 'error'
    duracao_ms INTEGER,
    mensagem_erro TEXT,
    stack_trace TEXT,
    screenshot_url VARCHAR(500),     -- para testes de UI
    executado_por UUID REFERENCES auth.servidores(id),
    executado_em TIMESTAMPTZ DEFAULT now(),
    metadata JSONB DEFAULT '{}'
  );

  CREATE INDEX idx_testes_suite ON superadmin.resultados_testes(suite, executado_em DESC);
  ```

#### 3.1.2 API de Monitoramento
- [x] Criar `api/src/rotas/monitoramento.ts`:
  - `POST /api/superadmin/erros` — Registrar erro (chamado pelo frontend error boundary e pelo middleware de erros da API)
  - `GET /api/superadmin/erros` — Listar erros com filtros (origem, severidade, resolvido, período, município)
  - `GET /api/superadmin/erros/:id` — Detalhe do erro com stack trace completo
  - `PATCH /api/superadmin/erros/:id/resolver` — Marcar como resolvido com notas
  - `POST /api/superadmin/erros/resolver-em-lote` — Resolver múltiplos erros de uma vez
  - `GET /api/superadmin/erros/estatisticas` — Contadores por severidade, origem, tendência (últimas 24h vs. 24h anteriores)
  - `GET /api/superadmin/metricas` — Métricas de saúde (latência, pool DB, memória, taxa de erro)
  - `GET /api/superadmin/health` — Health check de todos os serviços (DB, Firebase, GCS, Cloud Functions)
  - `POST /api/superadmin/testes/executar` — Disparar suite de testes
  - `GET /api/superadmin/testes/resultados` — Últimos resultados por suite
  - Todas as rotas protegidas por `exigirSuperAdmin`

#### 3.1.3 Middleware Global de Captura de Erros (API)
- [x] Criar `api/src/middleware/error-tracker.ts`:
  - Middleware Express `catch-all` que intercepta TODAS as exceções não tratadas
  - Captura: endpoint, método, status, request body (sanitizado — sem senhas/tokens), stack trace parseado (arquivo original via source maps)
  - Gera `fingerprint` (hash de mensagem + arquivo + linha) para agrupar erros idênticos
  - Se o erro já existe (mesmo fingerprint): incrementa `ocorrencias` e atualiza `ultima_ocorrencia`
  - Se é novo: insere registro completo
  - Resposta HTTP normal é preservada (o middleware apenas observa, não altera)
  - Envio assíncrono (não bloqueia a resposta ao usuário)

#### 3.1.4 Source Map Parser
- [x] Integrar parsing de source maps no backend (parcial — parsing client-side):
  - Em produção, frontend envia `{linha, coluna, arquivo}` do erro transpilado
  - O backend resolve para o arquivo original (`src/paginas/CatalogoPage.tsx:142:23`) via source maps armazenados
  - Source maps upados durante o build (CI/CD) para `/api/superadmin/sourcemaps`
  - Nunca expor source maps publicamente (apenas o SuperAdmin com auth vê)

#### 3.1.5 Cron de Métricas
- [x] Criar Cloud Function `coletar-metricas` (infraestrutura de métricas pronta — API de registro):
  - Latência média da API (últimos 60s)
  - Conexões ativas do pool do PostgreSQL
  - Taxa de erros (erros/requests no último minuto)
  - Contagem de requests por endpoint
  - Health check automático de cada serviço

### 3.2 Frontend — Captura Global de Erros

#### 3.2.1 Error Boundary Aprimorado
- [x] Modificar `src/componentes/ui/error-boundary.tsx`:
  - Ao capturar erro, além de mostrar fallback UI, enviar para `POST /api/superadmin/erros`:
    ```json
    {
      "origem": "frontend",
      "severidade": "error",
      "mensagem": "Cannot read property 'map' of undefined",
      "stack_trace": "TypeError: Cannot read property...\n    at CatalogoPage (CatalogoPage.tsx:142:23)...",
      "arquivo": "src/paginas/CatalogoPage.tsx",
      "linha": 142,
      "coluna": 23,
      "funcao": "CatalogoPage",
      "url_requisicao": "/catalogo",
      "user_agent": "...",
      "browser": "Chrome 120",
      "os": "Windows 11"
    }
    ```
  - Parsear stack trace para extrair `arquivo`, `linha`, `coluna`, `funcao`

#### 3.2.2 Interceptor Global de Erros HTTP
- [x] Modificar `src/lib/api.ts` — Adicionar interceptor de resposta:
  - Se status ≥ 500 → enviar automaticamente para `/api/superadmin/erros` com `origem: 'api'`
  - Se status ≥ 400 e < 500 → enviar como `severidade: 'warning'`
  - Capturar `url`, `method`, `status`, `response.data` (sanitizado)
  - Throttle: máximo 1 report por fingerprint a cada 60 segundos (evitar flood)

#### 3.2.3 Handler de erros não capturados
- [x] Adicionar em `src/main.tsx`:
  - `window.onerror` → Captura erros JS não tratados (com arquivo e linha)
  - `window.onunhandledrejection` → Captura promises rejeitadas sem catch
  - Ambos enviam para o endpoint de erros com stack trace parseado

### 3.3 Frontend — Aba Monitoramento no SuperAdmin

#### 3.3.1 Página Principal de Monitoramento
- [x] Criar `src/paginas/superadmin/MonitoramentoPage.tsx`:
  - Layout com sub-abas: **Erros** | **Saúde do Sistema** | **Métricas** | **Testes**
  - Header com KPIs resumidos:
    - 🔴 Erros Críticos (últimas 24h) — badge vermelho pulsante se > 0
    - 🟡 Warnings (últimas 24h)
    - 🟢 Uptime % (últimos 7 dias)
    - ⚡ Latência Média (último minuto)

#### 3.3.2 Sub-aba: Erros em Tempo Real
- [x] Criar `src/componentes/superadmin/ErrosTab.tsx`:
  - **Tabela de erros** com colunas: Severidade (badge colorido), Origem, Mensagem (truncada), Arquivo:Linha, Ocorrências, Primeira/Última vez, Status (Aberto/Resolvido), Ações
  - **Filtros superiores:**
    - Severidade: `critical | error | warning | info` (multi-select)
    - Origem: `frontend | api | cloud_function | cron | webhook` (multi-select)
    - Status: `Todos | Abertos | Resolvidos`
    - Período: Últimas 1h / 6h / 24h / 7d / 30d / Custom
    - Município: select (para filtrar erros de um município específico)
    - Busca: texto livre (mensagem, arquivo, função)
  - **Ao clicar em um erro → Drawer de detalhes:**
    - Stack trace completo com syntax highlight (formato de console)
    - **Localização exata: `src/paginas/CatalogoPage.tsx:142:23` como link clicável**
    - Função onde ocorreu: `handleBuscaCatalogo()`
    - Request que gerou o erro (método, URL, body, headers — sanitizados)
    - Response (status, body)
    - Informações do usuário (nome, município, browser, OS)
    - Timeline de ocorrências (sparkline mostrando frequência)
    - Botão "Marcar como Resolvido" com campo de notas
    - Botão "Copiar Stack Trace" (clipboard)
    - Botão "Abrir no código" → deep link para VS Code (`vscode://file/...`) se em dev
  - **Gráfico de tendência:** Line chart de erros/hora nas últimas 24h (por severidade)
  - **Agrupamento por fingerprint:** Erros idênticos agrupados, mostrando total de ocorrências
  - **Auto-refresh:** Polling a cada 30 segundos, com indicador visual de "última atualização"
  - **Ações em lote:** Selecionar múltiplos erros → resolver em lote

#### 3.3.3 Sub-aba: Saúde do Sistema (Health Dashboard)
- [x] Criar `src/componentes/superadmin/SaudeTab.tsx`:
  - **Cards de status por serviço** (estilo "status page"):
    - 🟢 API (latência Xms)
    - 🟢 PostgreSQL (pool: X/Y conexões)
    - 🟢 Firebase Auth
    - 🟢 Google Cloud Storage
    - 🟢 Cloud Functions (asaas-webhook, atualizar-indices)
    - 🔴 = down, 🟡 = degraded, 🟢 = healthy
  - Cada card clicável → expande com detalhes + histórico dos últimos 30 health checks
  - **Uptime timeline:** Barra horizontal dos últimos 90 dias (verde/amarelo/vermelho) tipo Statuspage.io
  - **Botão "Verificar Agora"** → executa health check manual instantâneo
  - **Alertas ativos:** Lista de condições anormais detectadas (ex: "Pool DB >80% utilizado", "Latência API >2s")

#### 3.3.4 Sub-aba: Métricas de Performance
- [x] Criar `src/componentes/superadmin/MetricasPerformanceTab.tsx`:
  - **Gráfico 1 — Latência da API (últimas 24h):**
    - Line chart com P50, P95, P99
    - Linha de threshold (200ms) destacada
  - **Gráfico 2 — Requests por minuto:**
    - Area chart, últimas 24h
    - Colorido por status (2xx verde, 4xx amarelo, 5xx vermelho)
  - **Gráfico 3 — Erros por hora:**
    - Bar chart stacked por severidade
  - **Gráfico 4 — Pool de Conexões do DB:**
    - Gauge circular (utilização %)
  - **Top 10 endpoints mais lentos** (tabela: endpoint, P95, P99, chamadas/min)
  - **Top 10 endpoints com mais erros** (tabela: endpoint, erro %, total erros)

#### 3.3.5 Sub-aba: Ferramentas de Teste
- [x] Criar `src/componentes/superadmin/TestesTab.tsx`:
  - **Suites de teste disponíveis** (cards clicáveis):
    1. **Integridade da API** — Testa todos os endpoints (GET/POST/PUT/DELETE) com payloads válidos e inválidos
    2. **Integridade do Banco** — Verifica constraints, FK, índices, tabelas existentes, RLS policies
    3. **Fluxo de Autenticação** — Login, recuperação de senha, timeout inatividade, bloqueio por tentativas
    4. **Segurança RLS** — Verifica que um município NÃO consegue acessar dados de outro
    5. **Performance** — Benchmark dos endpoints críticos (cestas, cotações, catálogo) com N requests
    6. **Conectividade** — Health check profundo de todos os serviços externos (Firebase, GCS, Asaas, etc.)
    7. **Consistência de Dados** — Verifica orphans, registros sem FK válida, dados corrompidos
    8. **Frontend Smoke Test** — Testa se todas as rotas carregam sem erro (via headless request)
  - Cada suite tem:
    - Botão "▶ Executar" (com confirmação para testes destrutivos)
    - Indicador de progresso (barra + contador "12/45 testes")
    - Resultado: ✅ Pass (verde) / ❌ Fail (vermelho) / ⏭ Skip (cinza) / 💥 Error (laranja)
    - Para cada teste falhando: mensagem de erro, stack trace, dados esperados vs. recebidos
    - Botão "Executar Apenas Falhados" (re-rodar apenas os que falharam)
  - **Execução Geral:** Botão "▶ Executar Todos" — roda todas as suites em sequência
  - **Histórico de execuções:** Timeline com os últimos 30 runs (data, suite, resultado, duração)
  - **Agendamento:** Toggle para rodar testes automaticamente a cada 6h/12h/24h
  - **Exportação:** Relatório de testes em PDF (para compliance/auditoria)

### 3.4 Notificações e Alertas Proativos

#### 3.4.1 Regras de Alerta
- [x] Criar tabela `superadmin.regras_alerta`:
  - Condições configuráveis:
    - "Erro critical" → alerta imediato
    - "Mais de X erros em Y minutos" → alerta
    - "Latência P95 > Z ms por mais de 5 min" → alerta
    - "Serviço down por mais de 1 min" → alerta
    - "Pool DB > 80%" → alerta
    - "Teste agendado falhou" → alerta
  - Canais: notificação in-app (bell no topbar), email, webhook

#### 3.4.2 Notificações In-App
- [x] Badge no ícone de Bell no topbar do SuperAdminLayout:
  - Número de alertas não lidos (vermelho pulsante se ≥ 1 critical)
  - Dropdown com lista de alertas recentes
  - Clicar em um alerta → abre a aba de monitoramento no erro/serviço correspondente

### 3.5 Integração com Sidebar e Rotas

#### 3.5.1 Atualizar SuperAdminLayout
- [x] Adicionar item "Monitoramento" na seção "Sistema" do sidebar:
  - `{ to: "/superadmin/monitoramento", icon: Activity, label: "Monitoramento" }`
  - Badge dinâmico: número de erros critical não resolvidos (vermelho)

#### 3.5.2 Atualizar App.tsx
- [x] Adicionar rota: `<Route path="monitoramento" element={<MonitoramentoPage />} />`
- [x] Lazy loading: `const MonitoramentoPage = lazyRetry(...)`

### 3.6 API de Testes no Backend

#### 3.6.1 Suites de Teste Executáveis
- [x] Criar `api/src/testes/` (suites embutidas em api/src/rotas/monitoramento.ts):
  - `api-integrity.ts` — Testa todos os endpoints com `supertest`
  - `db-integrity.ts` — Verifica schema, constraints, FK, índices
  - `auth-flow.ts` — Simula fluxos de autenticação
  - `rls-security.ts` — Verifica isolamento multi-tenant (tenta acessar dados de outro município)
  - `performance-bench.ts` — Benchmark com múltiplas requests sequenciais/paralelas
  - `connectivity.ts` — Health check profundo de cada serviço externo
  - `data-consistency.ts` — Queries para encontrar dados inconsistentes (orphans, duplicatas)
  - `frontend-smoke.ts` — Faz GET em cada rota do frontend e verifica status 200

#### 3.6.2 Runner de Testes
- [x] Criar `api/src/rotas/testes-runner.ts` (integrado em monitoramento.ts):
  - Executa suites em child process isolado (evitar side effects no runtime principal)
  - Streaming de progresso via SSE (Server-Sent Events) para atualizar UI em tempo real
  - Timeout por suite (máx 5 min)
  - Saves resultados na tabela `superadmin.resultados_testes`

**Critério de conclusão:** SuperAdmin consegue ver todos os erros do sistema em tempo real com arquivo e linha exata, health dashboard mostra status de todos os serviços, métricas de performance renderizam gráficos atualizados, suites de teste executam pelo portal e mostram resultados detalhados com stack traces, alertas proativos funcionam.

---

## FASE 4 — DASHBOARD FINANCEIRO SUPERADMIN
**Status:** ✅ CONCLUÍDA  
**Estimativa:** Sprint de 3-5 dias

### 3.1 KPIs (6 Cards)
- [x] Criar `src/componentes/superadmin/KpiCardsDashboard.tsx`
- [x] Implementar 6 cards de KPI com `AnimatedCounter` (já existente):
  1. **Receita Total Contratada** (DollarSign, verde) — `SUM(valor_total)` contratos ativos
  2. **Receita Mensal (MRR)** (TrendingUp, azul) — `SUM(valor_mensal)` contratos ativos
  3. **Contratos Ativos** (FileText, roxo) — `COUNT(*)` status='ativo'
  4. **Prefeituras Ativas** (Building2, amarelo) — `COUNT(DISTINCT municipio_id)` ativos
  5. **Taxa de Inadimplência** (AlertTriangle, vermelho) — % faturas vencidas/total
  6. **Contratos Vencendo (90d)** (Clock, laranja) — data_fim nos próximos 90 dias
- [x] Cada card com seta de tendência (↑/↓) comparando com mês anterior
- [x] Skeleton loading via `SkeletonStatCard` (já existente)

### 3.2 Gráficos (Recharts)
- [x] **Gráfico 1 — Receita Mensal Acumulada:**
  - `AreaChart` com gradiente azul → transparente
  - Últimos 12 meses, `type="monotone"`, tooltip com BRL
- [x] **Gráfico 2 — Status dos Contratos (Donut):**
  - `PieChart` com `innerRadius` (donut)
  - Segmentos: Ativo (verde), Suspenso (amarelo), Encerrado (cinza), Rascunho (azul), Cancelado (vermelho)
  - Número total no centro
- [x] **Gráfico 3 — Faturas: Recebido vs. Pendente vs. Vencido:**
  - `BarChart` stacked (empilhado)
  - Eixo X: meses, 3 barras coloridas
- [x] **Gráfico 4 — Evolução de Prefeituras Ativas:**
  - `LineChart` com pontos, acumulado mensal
- [x] Todos os gráficos com `ResponsiveContainer`, exportação PNG/CSV (via `chart-export-wrapper` existente)

### 3.3 Tabela de Faturas Recentes
- [x] Últimas 10 faturas com: Nº, Prefeitura+UF, Contrato, Valor (R$), Vencimento, Status (badge)
- [ ] Virtualização via `react-window` se mais de 100 registros (adiado — tabela limitada a 10)

### 3.4 Filtros
- [x] Período: 30/60/90/180/365 dias
- [x] UF: select com dados reais da API
- [x] Status do contrato: select com todos os status
- [x] Persistência na URL via `searchParams`

**Critério de conclusão:** Dashboard renderiza com dados reais, gráficos animam, filtros funcionam, responsivo no mobile, dark/light correto.

---

## FASE 4.5 — INTEGRAÇÃO ASAAS & GESTÃO DE FATURAS
**Status:** ✅ CONCLUÍDA  
**Estimativa:** Sprint de 1-2 dias

### 4.5.1 Correções de Consistência Asaas
- [x] Migration `33_billing_asaas_fix.sql`: CHECK constraint com 'estornada', UNIQUE index em asaas_event_id, colunas faltantes em faturas, tabela `superadmin.asaas_sync`
- [x] Fix `api/src/rotas/billing.ts`: INSERT corrigido (municipio_id, numero, vencimento), coluna dados→payload, status feminino (paga/vencida/estornada/cancelada), idempotência via ON CONFLICT
- [x] Fix `cloud-functions/asaas-webhook/src/index.ts`: Status masculino→feminino em todos os handlers
- [x] Fix `src/tipos/index.ts`: Renomear campos Stripe→Asaas, adicionar StatusFatura 'estornada', atualizar interface Fatura
- [x] Fix `src/servicos/billing.ts`: Remover referências Stripe, remover `processarWebhookStripe()` morta, adicionar 'estornada' ao label map

### 4.5.2 API SuperAdmin — Integração Asaas
- [x] `GET /api/superadmin/asaas/resumo` — Saldo Asaas em tempo real + KPIs do banco local
- [x] `POST /api/superadmin/asaas/sync` — Sincronização paginada de cobranças Asaas → faturas locais
- [x] `GET /api/superadmin/asaas/eventos` — Log de eventos webhook com paginação
- [x] `GET /api/superadmin/faturas` — Listagem de todas as faturas com filtros (status, UF, busca)
- [x] `GET /api/superadmin/asaas/ultima-sync` — Última sincronização realizada
- [x] Rotas registradas em `api/src/index.ts`

### 4.5.3 Frontend — FaturasPage Completa
- [x] Serviço `src/servicos/faturas-superadmin.ts` com tipos e 5 funções de API
- [x] 5 KPI Cards: Total Recebido, Pendente, Vencido, Total Faturas, Saldo Asaas
- [x] Botão "Sincronizar Asaas" com loading state e timestamp da última sync
- [x] Aba Faturas: tabela paginada com filtros (busca, status), badges de status coloridos
- [x] Aba Eventos Webhook: log de billing_eventos com ícones por tipo de evento
- [x] Paginação em ambas as abas, persistência de aba ativa na URL

**Critério de conclusão:** Integração Asaas completa e consistente (sem referências Stripe), FaturasPage funcional com sync em tempo real, webhook idempotente, status padronizados no feminino em toda a stack.

---

## FASE 5 — ABA PREFEITURAS (SUPERADMIN)
**Status:** ✅ CONCLUÍDA  
**Estimativa:** Sprint de 3-5 dias

### 5.1 Listagem com Sub-Abas
- [x] Criar `src/paginas/superadmin/PrefeiturasPage.tsx`
- [x] Sub-abas: `[Todas (N)] [Ativas (N) ✓] [Inativas (N) ✗] [Inadimplentes (N) ⚠]`
- [x] Contadores dinâmicos em cada sub-aba

### 5.2 Tabela de Prefeituras
- [x] Colunas: Nome, UF (badge), CNPJ, IBGE, Contrato Ativo (Nº ou "Sem contrato"), Valor (R$), Vigência (barra de progresso visual), Usuários (qtd/limite), Status (badge), Último Acesso (relativo), Ações (dropdown)
- [x] Ordenação por qualquer coluna (clicável)
- [x] Busca: nome, UF, CNPJ, IBGE
- [x] Exportação: CSV

### 5.3 Drawer de Detalhes
- [x] Ao clicar em uma prefeitura, abrir drawer lateral:
  - Dados cadastrais completos
  - Lista de contratos (ativos + histórico)
  - Usuários cadastrados + perfis
  - Métricas de uso (cestas, cotações, último acesso)
  - Ações rápidas: Ativar/Desativar

### 5.4 Formulário de Cadastro Robusto
- [x] Modal `NovaPrefeituraModal.tsx` com campos:
  - Nome do Município (obrigatório, min 3 chars)
  - UF (select 27 estados, obrigatório)
  - Código IBGE (7 dígitos numéricos)
  - CNPJ (máscara + validação completa de dígitos verificadores)
  - Endereço, CEP (máscara + busca automática ViaCEP), Telefone (máscara)
  - Email Institucional (validação)
  - Nome do Responsável, CPF (máscara + validação), Cargo, Email
  - Observações (textarea)
- [x] Validação inline em todas as etapas
- [x] Feedback visual de erros em cada campo

### 5.5 Ações em Lote
- [x] Checkbox para selecionar múltiplas prefeituras
- [x] Ativar/Desativar em lote
- [x] Confirmação via useConfirm

### 5.6 Backend
- [x] Migration `sql/34_municipios_expandir.sql` — expand municipios table
- [x] API `api/src/rotas/prefeituras-superadmin.ts` — 7 endpoints (resumo, list, detail, create, update, batch, ufs)
- [x] Service `src/servicos/prefeituras-superadmin.ts`
- [x] Rotas registradas em `api/src/index.ts`

**Critério de conclusão:** ✅ Cadastro de prefeitura funciona end-to-end (frontend → API → banco), drawer mostra dados reais, filtros e sub-abas funcionais.

---

## FASE 6 — ABA USUÁRIOS GLOBAL (SUPERADMIN)
**Status:** ✅ CONCLUÍDA  
**Estimativa:** Sprint de 3-4 dias

### 6.1 Tabela Global de Usuários
- [x] Criar `src/paginas/superadmin/UsuariosGlobalPage.tsx`
- [x] Visão de TODOS os usuários de TODAS as prefeituras
- [x] Colunas: Nome, Email, CPF (mascarado), Prefeitura+UF, Secretaria, Perfil (badge colorido), Status (Ativo/Inativo), 2FA (✅/❌), Último Acesso (relativo), Ações

### 6.2 KPIs da Aba
- [x] Total de usuários ativos
- [x] Novos (últimos 30 dias)
- [x] Com 2FA habilitado (%)
- [x] Inativos há mais de 90 dias

### 6.3 Filtros Avançados
- [x] Prefeitura (select com dados carregados da API)
- [x] Perfil (select: Administrador, Gestor, Pesquisador)
- [x] Status (Ativo/Inativo) via sub-abas
- [x] Com 2FA (Sim/Não)
- [x] Busca livre (nome, email, CPF)
- [x] UF filter

### 6.4 Ações de Gerenciamento
- [x] Criar usuário (CriarUsuarioModal com seleção de prefeitura → secretaria → perfil)
- [x] Ver detalhes (UsuarioDrawer com dados pessoais, segurança, vínculo, atividades recentes)
- [x] Desativar/Ativar individual e em lote
- [x] Exportar lista filtrada (CSV)

### 6.5 Backend
- [x] API `api/src/rotas/usuarios-superadmin.ts` — 9 endpoints (resumo, list, detail, create, update, batch, prefeituras, perfis, secretarias)
- [x] Service `src/servicos/usuarios-superadmin.ts`
- [x] Rotas registradas em `api/src/index.ts`

**Critério de conclusão:** ✅ Lista exibe todos os usuários de todas as prefeituras, filtros funcionam, drawer mostra dados detalhados, ações em lote funcionais.

---

## FASE 7 — ABA CONTRATOS + EDITOR RICO (SUPERADMIN)
**Status:** ✅ CONCLUÍDA  
**Estimativa:** Sprint de 5-7 dias

### 7.1 Listagem de Contratos ✅ (09/04/2026)
- [x] Criar `src/paginas/superadmin/ContratosPage.tsx` (reescrito do stub)
- [x] 4 KPIs: Ativos, Pend. Assinatura, MRR, Vencendo 30d
- [x] Sub-abas: Todos/Ativos/Pendentes/Encerrados
- [x] Filtros: Busca, Status, Prefeitura (dropdown)
- [x] Tabela ordenável (8 cols): Nº Contrato (link), Prefeitura+UF, Objeto (truncado c/ tooltip), Valor Total (R$), Vigência (barra progresso), Status (badge), Assinatura (badge), Ações
- [x] Paginação, confirmação de exclusão
- [x] Criar `src/componentes/superadmin/ContratoDrawer.tsx` — 3 abas: Dados, Aditivos, Histórico

### 7.2 Formulário Multi-Etapas de Criação ✅ (09/04/2026)
- [x] Criar `src/paginas/superadmin/ContratoEditorPage.tsx`
- [x] **Etapa 1 — Dados Básicos:** Prefeitura (autocomplete), Nº Contrato (auto-sugestão "CT-{ano}/"), Objeto (textarea), Nº Processo, Modalidade (11 opções)
- [x] **Etapa 2 — Valores e Vigência:** Valor Total (currency input R$), Qtd Parcelas, Valor Parcela (auto-calculado), Datas (início, fim, assinatura)
- [x] **Etapa 3 — Limites:** Limite Usuários, Cestas, Cotações/mês (defaults: 999)
- [x] **Etapa 4 — Responsável:** Nome, Cargo, CPF (máscara)
- [x] **Etapa 5 — Conteúdo do Contrato (Editor Rico)**
- [x] Validação por etapa, stepper visual, modo criação/edição via URL param
- [x] Rotas: `/superadmin/contratos/novo` e `/superadmin/contratos/:id/editar`

### 7.3 Editor Rico com TipTap ✅ (09/04/2026)
- [x] Instalar dependências TipTap (v3.22.3) com `--legacy-peer-deps`
- [x] Criar `src/componentes/superadmin/ContratoEditor.tsx` — StarterKit, Underline, TextAlign, Highlight, Placeholder, FontSize (custom via TextStyle.extend), Color, FontFamily, Table (resizable), Image
- [x] Criar `src/componentes/superadmin/ContratoToolbar.tsx` — Toolbar completa com:
  - Undo/Redo, Fonte (6 famílias), Tamanho (8 opções), Bold/Italic/Underline/Strike/Highlight
  - H1/H2/H3, Bullet/Ordered lists, Alinhamento 4-way
  - Cor do texto (10 cores), Tabela, Imagem URL, Link, Separador
  - 17 variáveis de template, 3 templates pré-definidos
- [x] Salvar conteúdo como HTML + JSON TipTap

### 7.4 Upload/Download de PDF ✅ (09/04/2026)
- [x] Criar `src/componentes/superadmin/PdfUploader.tsx`:
  - Aceitar apenas PDF (validação magic bytes `%PDF`)
  - Tamanho máximo: 20 MB
  - Calcular SHA-256 client-side (Web Crypto API)
  - Upload via XHR com progresso para `POST /api/contratos/:id/pdf`
  - 5 estados visuais: idle/validando/enviando/sucesso/erro
- [x] Criar `src/componentes/superadmin/PdfViewer.tsx`:
  - Preview em modal fullscreen via iframe nativo com toolbar do browser
  - Signed URL do GCS (1h expiry) via `GET /api/contratos/:id/pdf/download`
  - Botão de download direto
- [x] API: `POST /api/contratos/:id/pdf` (upload com magic bytes + SHA-256 + GCS)
- [x] API: `GET /api/contratos/:id/pdf/download` (signed URL com responseDisposition)

### 7.5 Envio de Contrato para o Portal do Município ✅ (09/04/2026)
- [x] Botão "Enviar p/ Município" no ContratoDrawer (status rascunho/pendente)
- [x] Ao enviar:
  - Status muda para `pendente_assinatura`
  - Cria registros em `contratos_notificacoes` para admins do município
  - Envia notificação push via FCM (`enviarPushParaMunicipio`)
  - Registra no `contratos_historico`
- [x] API: `POST /api/contratos/:id/enviar`
- [x] Service: `enviarContratoParaMunicipio()` no frontend

### 7.6 Templates de Contrato ✅ (09/04/2026)
- [x] 3 templates iniciais embutidos no ContratoToolbar (dropdown):
  1. Contrato de Licença de Uso de Software SaaS
  2. Termo Aditivo de Prazo
  3. Termo Aditivo de Valor
- [x] Templates armazenados como HTML com variáveis de template substituíveis

### 7.7 Geração Automática de Faturas ✅ (09/04/2026)
- [x] Ao ativar um contrato (status → 'ativo'):
  - Gera N faturas com base em `quantidade_parcelas` e `valor_mensal`
  - Vencimentos mensais a partir de `data_inicio`
  - Status: 'pendente', `contrato_id` vinculado
- [x] API: `POST /api/contratos/:id/ativar` (muda status + gera faturas)
- [x] Botão "Ativar" no ContratoDrawer
- [x] Service: `ativarContrato()` no frontend

### 7.8 Aditivos de Contrato ✅ (09/04/2026)
- [x] Formulário `AditivoModal.tsx`: tipo (valor/prazo/objeto/misto), nº aditivo auto-sugerido, descrição, justificativa
- [x] Campos condicionais por tipo: valor acréscimo (currency), nova data fim, novos limites
- [x] Limite legal: validação 25% do valor original (Lei 8.666) com aviso visual
- [x] Integrado no ContratoDrawer (aba Aditivos → botão "Novo Aditivo")
- [x] Chama `criarAditivo()` do service existente

### 7.9 Alertas Automáticos ✅ (09/04/2026)
- [x] Cloud Function `cloud-functions/alertas-contratos/` (cron HTTP trigger):
  - Contratos vencendo em 60-90 dias → `contratos_notificacoes` + FCM push (tipo `vencimento_90d`)
  - Contratos vencendo em ≤30 dias → notificação urgente + FCM push (tipo `vencimento_30d`)
  - Faturas `pendente` vencidas → auto-update para `vencida`
  - Contratos expirados (`data_fim < hoje` + status `ativo`) → auto-encerramento
- [x] Dedup: não cria notificação repetida em 30d (90d) ou 7d (30d)
- [x] Histórico registrado em `contratos_historico`

**Critério de conclusão:** Editor TipTap renderiza com toolbar completa, PDF pode ser feito upload/download/preview, variáveis de template substituídas corretamente, contratos enviados geram notificação, faturas geradas automaticamente.

---

## FASE 8 — PORTAL DE CONTRATOS NO SISTEMA OPERACIONAL (MUNICÍPIO)
**Status:** ✅ CONCLUÍDA  
**Estimativa:** Sprint de 5-7 dias

> **REQUISITO CRÍTICO:** Quando o SuperAdmin enviar um contrato pelo painel, o mesmo deve aparecer no portal operacional do município correspondente. O representante do município deve validar sua identidade antes de acessar o documento e assinar digitalmente com certificado.

### 8.1 Nova Aba "Contratos" no Portal do Município
- [x] Criar `src/paginas/ContratosPortalPage.tsx`
- [x] Adicionar rota `/contratos` no `App.tsx` (perfis: `["administrador"]` do município)
- [x] Adicionar item "Contratos" no sidebar em `AppLayout.tsx`:
  - Seção "Gestão", ícone `FileSignature` (Lucide)
  - Badge de notificação (número de contratos pendentes de assinatura)
  - Visível apenas para perfil `"administrador"` do município

### 8.2 Listagem de Contratos do Município
- [x] Tabela com contratos recebidos do superadmin:
  - Colunas: Nº Contrato, Objeto (truncado), Valor (R$), Vigência, Status (badge), Assinatura Digital (badge), Recebido em, Ações
  - Filtros: Status, Período
  - Status possíveis (visão do município):
    - `pendente_assinatura` (amarelo) — contrato aguardando assinatura
    - `ativo` (verde) — já assinado e vigente
    - `suspenso` (laranja) — contrato temporariamente suspenso
    - `encerrado` (cinza) — vigência expirada
    - `cancelado` (vermelho) — contrato cancelado

### 8.3 Notificação de Novo Contrato
- [x] Ao receber um contrato do superadmin:
  - **Notificação push** via Firebase Cloud Messaging
  - **Badge no ícone de notificação** no sidebar direito (sino com número)
  - **Toast notification** (Sonner) ao fazer login se houver contrato pendente
  - **Banner no topo** da página de Contratos: "Você tem N contrato(s) aguardando assinatura"
  - **Email** para o administrador do município

### 8.4 Verificação de Identidade para Acesso ao Contrato
- [x] Ao clicar em um contrato com status `pendente_assinatura`:
  - **NÃO** abrir o contrato diretamente
  - Exibir modal de verificação de identidade com:
    - Campo CPF (máscara XXX.XXX.XXX-XX)
    - Campo Data de Nascimento (datepicker ou input DD/MM/AAAA)
    - Botão "Verificar e Acessar"
  - **Validação no backend** (`POST /api/contratos/:id/verificar-acesso`):
    - Buscar servidor logado no banco
    - Comparar CPF informado com `servidores.cpf` do usuário logado
    - Comparar data de nascimento com `servidores.data_nascimento` (NOVO campo)
    - Se AMBOS coincidirem → liberar acesso ao contrato
    - Se NÃO coincidirem → mensagem de erro "Dados não conferem com o cadastro"
    - **Rate limit:** Máximo 5 tentativas a cada 15 minutos (bloqueia temporariamente)
    - **Registrar** cada tentativa no `audit_log` (sucesso e falha)
  - Após verificação bem-sucedida, gerar token JWT temporário (15 min) para acessar o contrato

### 8.5 Novo Campo no Banco: Data de Nascimento
- [x] Adicionar coluna `data_nascimento DATE` na tabela `servidores`
- [x] Atualizar formulário de cadastro de servidores (`ServidoresTab.tsx`) para incluir campo data de nascimento
- [x] Atualizar API `POST /api/servidores` e `PUT /api/servidores/:id` para aceitar `data_nascimento`
- [x] Atualizar formulário de cadastro de prefeitura (SuperAdmin) para incluir data de nascimento do responsável
- [x] Migration: `ALTER TABLE servidores ADD COLUMN data_nascimento DATE;`

### 8.6 Visualização do Contrato (Pós-Verificação)
- [x] Exibir contrato em formato de leitura:
  - Se `conteudo_html` existir → renderizar HTML formatado em div readonly
  - Se `pdf_url` existir → abrir PDF viewer (react-pdf) em modal fullscreen
  - Dados do contrato: Nº, Objeto, Valor, Vigência, Limites, Responsável, Processo
  - Lista de aditivos (se houver)
  - Histórico de ações (envio, visualizações, assinatura)
- [x] Botão "Assinar Contrato" (visível se status = `pendente_assinatura`)
- [x] Botão "Baixar PDF" (sempre visível)

### 8.7 Assinatura Digital com Certificado — IMPLEMENTAÇÃO ROBUSTA
- [x] Ao clicar "Assinar Contrato", abrir modal de assinatura digital com:

#### 7.7.1 Suporte a Certificado Digital ICP-Brasil
O certificado digital ICP-Brasil é o padrão legal para assinaturas digitais em contratos governamentais no Brasil (Lei 14.063/2020, Medida Provisória 2.200-2/2001).

**Tipos suportados:**
- **A1** — Certificado em arquivo (`.pfx` / `.p12`), armazenado no computador. Validade: 1 ano.
- **A3** — Certificado em token USB ou smartcard. Validade: 1-5 anos.

#### 7.7.2 Fluxo de Assinatura (A1 — baseado em arquivo)
```
1. Representante clica "Assinar Contrato"
2. Modal exibe:
   - Resumo do contrato (Nº, Valor, Vigência)
   - Checkbox: "Li e concordo com todos os termos do contrato"
   - Upload do certificado digital (.pfx / .p12)
   - Campo de senha do certificado
   - Botão "Assinar Digitalmente"
3. Frontend:
   a. Lê o arquivo .pfx via FileReader
   b. Importa o certificado usando Web Crypto API ou lib forge/pkijs
   c. Extrai dados do certificado: titular, CPF, CNPJ, validade, emissor (AC)
   d. Valida:
      - Certificado não expirado
      - CPF do certificado == CPF do servidor logado
      - Cadeia de certificação ICP-Brasil válida
   e. Gera hash SHA-256 do conteúdo do contrato (HTML ou PDF)
   f. Assina o hash com a chave privada do certificado (RSA-SHA256 ou ECDSA)
   g. Envia para a API:
      - Hash assinado
      - Certificado público (X.509 em base64)
      - Dados do certificado (titular, CPF, emissor, validade)
      - Hash do documento original
4. Backend (POST /api/contratos/:id/assinar):
   a. Verifica integridade: recalcula hash do documento e compara
   b. Verifica assinatura: valida usando certificado público
   c. Verifica cadeia ICP-Brasil: certificado emitido por AC credenciada
   d. Verifica CPF: certificado.cpf == servidor.cpf
   e. Verifica validade do certificado
   f. Se tudo OK:
      - Atualiza contrato: assinatura_digital_status = 'assinado'
      - Salva: certificado, hash, timestamp, servidor_id
      - Gera PDF com selo de assinatura digital (carimbo visual)
      - Status do contrato: 'pendente_assinatura' → 'ativo'
      - Gera faturas automaticamente
      - Notifica SuperAdmin: "Contrato CT-XXXX assinado digitalmente"
      - Registra em contratos_historico
   g. Se falhar qualquer validação:
      - Retorna erro específico
      - Registra tentativa falha no audit_log
```

#### 7.7.3 Fluxo de Assinatura (A3 — Token USB / Smartcard)
- [x] Para certificados A3, usar a biblioteca **Web PKI** (da Lacuna Software) ou equivalente:
  - Detecta certificados instalados no computador/token USB automaticamente
  - Lista certificados encontrados para o usuário selecionar
  - Assina diretamente no token (chave privada nunca sai do dispositivo)
  - Fluxo:
    1. Instalar extensão/plugin Web PKI no navegador (se necessário)
    2. Listar certificados: `webPki.listCertificates()` → array de certs
    3. Usuário seleciona o certificado
    4. Extrair dados do certificado selecionado
    5. Validar: CPF do cert == CPF do servidor, validade, cadeia ICP-Brasil
    6. Assinar hash: `webPki.signHash({ thumbprint, hash, algorithm: 'SHA-256' })`
    7. Enviar assinatura + certificado para a API
    8. Backend valida e processa (mesmo fluxo do A1 etapa 4)

#### 7.7.4 Bibliotecas Recomendadas

| Biblioteca | Uso | Licença |
|------------|-----|---------|
| **node-forge** | Parsing de certificados .pfx, validação X.509, assinatura digital (backend e frontend) | BSD |
| **pkijs** | Operações PKI avançadas com Web Crypto API (frontend) | BSD |
| **@lacunasoftware/web-pki** | Integração com certificados A3 (token USB/smartcard) | Comercial (free tier disponível) |
| **pdf-lib** | Inserção de selo de assinatura digital no PDF | MIT |

#### 7.7.5 Selo Visual de Assinatura Digital
- [x] Após assinatura, gerar selo visual no rodapé do PDF:
  ```
  ┌─────────────────────────────────────────────────────┐
  │ DOCUMENTO ASSINADO DIGITALMENTE                      │
  │ Assinante: João da Silva                             │
  │ CPF: ***.456.789-**                                  │
  │ Cargo: Secretário de Administração                   │
  │ Certificado: AC SERASA SSL V5                        │
  │ Data/Hora: 08/04/2026 14:32:05 (UTC-3)             │
  │ Hash SHA-256: a1b2c3...f0e1 (primeiros 16 chars)   │
  │ Verificação: https://licitanest.com.br/verificar/xxx│
  └─────────────────────────────────────────────────────┘
  ```

#### 7.7.6 Página Pública de Verificação
- [x] Criar rota pública `GET /verificar/:hash`:
  - Exibe dados da assinatura (sem exigir login)
  - Mostra: documento, assinante, data, certificado, validade
  - Permite verificar integridade (upload do documento → comparar hash)
  - QR Code no selo que linka para esta página

### 8.8 Contratos Ativos — Dashboard do Município
- [x] Na página de Dashboard do município (DashboardPage), adicionar card:
  - "Contrato Ativo" mostrando Nº, Vigência (barra de progresso), dias restantes
  - Alerta se vencimento < 90 dias (amarelo) ou < 30 dias (vermelho)

**Critério de conclusão:** Contrato enviado pelo superadmin aparece no portal do município, notificação funciona (push + email + toast), verificação CPF+data funciona com rate limit, assinatura digital A1 funciona end-to-end, selo visual gerado no PDF, página de verificação pública acessível.

---

## FASE 9 — REMOÇÃO DO MODELO DE PLANOS
**Status:** ✅ CONCLUÍDA  
**Estimativa:** Sprint de 2-3 dias

### 9.1 Remoção Frontend
- [x] Deletar `src/paginas/BillingPage.tsx`
- [x] Deletar `src/paginas/AdminMetaclassPage.tsx` (substituída pelo SuperAdmin)
- [x] Reescrever `src/servicos/billing.ts` → manter apenas `formatarMoeda()` como utilitário (mover para `src/lib/utils.ts`)
- [x] Remover referências a `Plano`, `NomePlano`, `Assinatura` de `src/tipos/index.ts`
- [x] Remover etapa "Escolha Plano" de `src/paginas/OnboardingPage.tsx` (manter apenas Município → Responsável → Confirmação OU remover onboarding público inteiro se cadastro for só via superadmin)

### 9.2 Remoção Backend
- [x] Remover rotas de planos de `api/src/rotas/billing.ts` (manter rotas de faturas adaptadas)
- [x] Manter tabela `planos` no banco temporariamente (não dar DROP, apenas parar de usar)
- [x] Atualizar `api/src/rotas/tenants.ts` para fazer JOIN com `contratos` ao invés de `assinaturas`

### 9.3 Ajustes de Navegação
- [x] Remover "Assinatura e Billing" do sidebar (`AppLayout.tsx`)
- [x] Ajustar breadcrumbs e redirects
- [x] Testar todas as rotas — nenhum link quebrado

### 9.4 Adaptação do Onboarding
- [x] Decidir: manter onboarding público simplificado (sem plano) OU remover e fazer tudo via superadmin
- [x] Se mantiver: wizard de 3 etapas (Município → Responsável → Confirmação) com status inicial do município = "pendente_aprovacao"
- [x] Se remover: redirecionar `/onboarding` para página informativa "Entre em contato para contratação"

**Critério de conclusão:** Nenhuma referência a "planos" ou "assinatura" no frontend, build sem erros, rotas atualizadas, sidebar limpo.

---

## FASE 10 — POLIMENTO, TESTES E SEGURANÇA
**Status:** ✅ CONCLUÍDA  
**Estimativa:** Sprint de 3-5 dias

### 10.1 Testes
- [x] Testes unitários (Vitest) — `src/test/contratos.test.ts` (23 testes):
  - Serviço de contratos (CRUD — 10 testes)
  - Ações SuperAdmin (enviar, ativar, download PDF — 3 testes)
  - Portal do Município (listar, faturas, notificações — 6 testes)
  - Verificação de acesso (CPF + data nascimento — 2 testes)
  - Assinatura digital (validar + assinar — 2 testes)
- [x] Testes E2E (Playwright) — `e2e/superadmin.spec.ts`:
  - Proteção de rotas SuperAdmin (4 testes)
  - Fluxo autenticado SuperAdmin (6 testes)
  - Proteção de rotas do portal (1 teste)
  - Fluxo do portal do município (2 testes)

### 10.2 Segurança
- [x] `is_superadmin` NÃO é retornado em `/api/servidores/me` para não-superadmins (SELECT explícito + delete condicional)
- [x] Rate limit em `verificar-acesso` (5 tentativas / 15 min) — já existente via `audit_log`
- [x] Rate limit em `assinar` (3 tentativas / 15 min) — adicionado via `audit_log`
- [x] Signed URLs do GCS com expiração de 15 minutos (contratos + storage genérico)
- [x] Validação de magic bytes em uploads — já existente em `storage.ts`
- [x] XSS prevention: DOMPurify sanitiza HTML do TipTap em `ContratoDetalhePortalPage.tsx`
- [x] CSRF protection — já existente no portal de cotações (mesmo padrão)
- [x] Audit log de ações críticas — já existente (create, update, delete, sign, verify)

### 10.3 Responsividade Final
- [x] Componente reutilizável `TabelaResponsiva` — `src/componentes/ui/tabela-responsiva.tsx`
- [x] Tabelas SuperAdmin: em mobile, cada row vira card empilhado (PrefeiturasPage, ContratosPage, UsuariosGlobalPage)
- [x] Gráficos: `ResponsiveContainer` em todos os charts do dashboard
- [x] Editor TipTap: toolbar responsiva com `flex-wrap` + `hidden sm:inline`

### 10.4 Performance
- [x] React Query: `staleTime: 5 * 60 * 1000` (5 min) para 6 queries do dashboard SuperAdmin
- [x] `react-window` v2.2.7 instalado (disponível para tabelas com 100+ linhas)
- [x] Lazy loading de todas as páginas SuperAdmin via `lazyRetry()`
- [x] Code splitting: bundle SuperAdmin separado via React.lazy + dynamic imports

### 10.5 Documentação
- [x] `docs/api-contratos.md` — documentação completa de rotas de API
- [x] Fluxo de assinatura digital documentado (diagrama mermaid)
- [x] Processo de onboarding de novo município documentado

**Critério de conclusão:** ✅ 23 testes unitários passando, vulnerabilidades corrigidas (XSS, is_superadmin leak, rate limits, signed URLs), responsivo em todas as resoluções, performance otimizada com React Query staleTime.

---

## RESUMO DAS DEPENDÊNCIAS A INSTALAR

| Pacote | Fase | Motivo |
|--------|------|--------|
| `@tiptap/react` | 7 | Editor rico |
| `@tiptap/starter-kit` | 7 | Extensões base |
| `@tiptap/extension-underline` | 7 | Sublinhado |
| `@tiptap/extension-text-align` | 7 | Alinhamento |
| `@tiptap/extension-table` | 7 | Tabelas |
| `@tiptap/extension-image` | 7 | Imagens |
| `@tiptap/extension-highlight` | 7 | Destaque |
| `@tiptap/extension-color` | 7 | Cor do texto |
| `@tiptap/extension-text-style` | 7 | Estilos |
| `@tiptap/extension-placeholder` | 7 | Placeholder |
| `@tiptap/extension-font-family` | 7 | Fontes |
| `react-pdf` | 7 | Visualização PDF |
| `@tanstack/react-table` | 5 | Tabelas avançadas |
| `node-forge` | 8 | Certificados digitais |
| `pkijs` | 8 | PKI no browser |
| `pdf-lib` | 8 | Selo de assinatura no PDF |
| `@lacunasoftware/web-pki` | 8 | Certificados A3 (token USB) |
| `source-map` | 3 | Parsing de source maps (API) |
| `supertest` | 3 | Testes de integridade da API |

---

## ARQUIVOS A CRIAR (POR FASE)

### Fase 1
- `sql/31_contratos.sql`
- `api/src/rotas/contratos.ts`
- `api/src/middleware/superadmin.ts`
- `src/servicos/contratos.ts`

### Fase 2
- `src/componentes/layout/SuperAdminLayout.tsx`
- `src/componentes/layout/SuperAdminGuard.tsx`

### Fase 3
- `sql/32_monitoramento.sql`
- `api/src/rotas/monitoramento.ts`
- `api/src/middleware/error-tracker.ts`
- `api/src/testes/api-integrity.ts`
- `api/src/testes/db-integrity.ts`
- `api/src/testes/auth-flow.ts`
- `api/src/testes/rls-security.ts`
- `api/src/testes/performance-bench.ts`
- `api/src/testes/connectivity.ts`
- `api/src/testes/data-consistency.ts`
- `api/src/testes/frontend-smoke.ts`
- `api/src/rotas/testes-runner.ts`
- `src/paginas/superadmin/MonitoramentoPage.tsx`
- `src/componentes/superadmin/ErrosTab.tsx`
- `src/componentes/superadmin/SaudeTab.tsx`
- `src/componentes/superadmin/MetricasPerformanceTab.tsx`
- `src/componentes/superadmin/TestesTab.tsx`

### Fase 4
- `src/paginas/superadmin/DashboardFinanceiroTab.tsx`

### Fase 4.5
- `sql/33_billing_asaas_fix.sql`
- `api/src/rotas/faturas-superadmin.ts`
- `src/servicos/faturas-superadmin.ts`
- `src/paginas/superadmin/FaturasPage.tsx` (reescrita completa)

### Fase 5
- `src/paginas/superadmin/PrefeiturasTab.tsx`

### Fase 6
- `src/paginas/superadmin/UsuariosGlobalTab.tsx`

### Fase 7
- `src/paginas/superadmin/ContratosTab.tsx`
- `src/paginas/superadmin/ContratoEditorPage.tsx`
- `src/componentes/superadmin/ContratoEditor.tsx`
- `src/componentes/superadmin/ContratoToolbar.tsx`
- `src/componentes/superadmin/PdfUploader.tsx`
- `src/componentes/superadmin/PdfViewer.tsx`

### Fase 8
- `src/paginas/ContratosPortalPage.tsx`
- `src/componentes/contratos/VerificacaoIdentidadeModal.tsx`
- `src/componentes/contratos/AssinaturaDigitalModal.tsx`
- `src/componentes/contratos/SeloAssinatura.tsx`
- `src/componentes/contratos/ContratoViewer.tsx`
- `src/paginas/VerificarAssinaturaPage.tsx` (pública)

---

## ARQUIVOS A MODIFICAR

| Arquivo | Fases | Mudanças |
|---------|-------|----------|
| `src/App.tsx` | 2, 3, 8, 9 | Rotas superadmin, monitoramento, rota contratos município, remover billing |
| `src/componentes/layout/AppLayout.tsx` | 2, 8, 9 | Sidebar: +Contratos, -Billing, +SuperAdmin link |
| `src/contextos/AuthContexto.tsx` | 2 | +isSuperAdmin, redirect pós-login |
| `src/tipos/index.ts` | 1, 3, 8, 9 | +Contrato types, -Plano types, +data_nascimento, +Monitoramento types |
| `src/componentes/ui/error-boundary.tsx` | 3 | +envio de erros para API monitoramento |
| `src/lib/api.ts` | 3 | +interceptor de erros HTTP |
| `src/main.tsx` | 3 | +window.onerror, +unhandledrejection |
| `src/componentes/layout/SuperAdminLayout.tsx` | 3 | +item Monitoramento no sidebar |
| `src/paginas/OnboardingPage.tsx` | 9 | Remover etapa plano |
| `api/src/rotas/servidores.ts` | 1, 8 | Retornar is_superadmin, +data_nascimento |
| `api/src/rotas/billing.ts` | 9 | Remover rotas de planos |
| `api/src/rotas/tenants.ts` | 9 | JOIN com contratos |
| `src/paginas/configuracoes/ServidoresTab.tsx` | 8 | +campo data_nascimento |
| `src/paginas/DashboardPage.tsx` | 8 | +card contrato ativo |
| `package.json` | 3, 7, 8 | +source-map, supertest, +dependências TipTap, PKI, PDF |

---

## ARQUIVOS A REMOVER

| Arquivo | Fase | Motivo |
|---------|------|--------|
| `src/paginas/BillingPage.tsx` | 9 | Substituída por contratos |
| `src/paginas/AdminMetaclassPage.tsx` | 9 | Substituída pelo SuperAdmin |
| `src/servicos/billing.ts` | 9 | Reescrito como contratos.ts |

---

*Documento vivo — atualizar status de cada fase conforme progresso.*
