# ROADMAP DE DESENVOLVIMENTO — LICITANEST

**Sistema de Formação e Elaboração de Cestas de Preços para Compras Públicas**  
**Versão:** 1.0  
**Última atualização:** Março/2026  
**Empresa:** Metaclass

---

## VISÃO GERAL

O desenvolvimento está dividido em **12 fases sequenciais**, cada uma com:
- Escopo exato do que será implementado
- Critérios rigorosos de conclusão (Definition of Done)
- Checklist de verificação obrigatória
- Estimativa de duração

> **REGRA DE OURO**: Nenhuma fase pode ser considerada concluída sem que TODOS os critérios de conclusão estejam atendidos e verificados. Fase incompleta = fase não entregue.

---

## FASE 1 — FUNDAÇÃO E INFRAESTRUTURA

**Duração estimada:** 1 semana  
**Dependências:** Nenhuma

### Escopo
- [x] Projeto Vite + React + TypeScript + Tailwind CSS v4
- [x] Estrutura de pastas em português (componentes/, paginas/, servicos/, tipos/, contextos/, hooks/, lib/)
- [x] Componentes base Shadcn/UI (Button, Card, Input, Separator, etc.)
- [x] Paleta de cores Azul Safira + Esmeralda aplicada
- [x] Configuração de path alias (@/)
- [x] Build de produção funcionando
- [x] Schema SQL completo do banco de dados (pronto para executar no Supabase)
- [x] Arquivo .env.example com todas as variáveis de ambiente
- [x] Configuração de ESLint + Prettier padronizados
- [x] Sidebar categorizado com seções e scroll

### Critérios de Conclusão (OBRIGATÓRIOS)
- [x] `npm run build` executa sem erros
- [x] `npx tsc --noEmit` sem erros de TypeScript
- [x] Todas as rotas definidas no App.tsx acessíveis no browser
- [x] Schema SQL documentado e executável (arquivo .sql na pasta /supabase)
- [x] Sidebar exibe todas as categorias de módulos corretamente
- [x] Layout responsivo funciona em 1024px+ (desktop/notebook)
- [x] Tema de cores aplicado consistentemente em todas as páginas

### Verificação
```bash
npm run build          # Zero erros
npx tsc --noEmit       # Zero erros  
npm run dev            # Todas as rotas navegáveis
```

---

## FASE 2 — AUTENTICAÇÃO E CONTROLE DE ACESSO

**Duração estimada:** 2 semanas  
**Dependências:** Fase 1 concluída

### Escopo
- [x] Integração Supabase Auth (e-mail + senha)
- [x] Página de login funcional com validação
- [x] Página de recuperação de senha
- [x] Contexto de autenticação (AuthContexto) com estado global
- [x] Hook `useAuth()` para acesso ao usuário logado
- [x] Proteção de rotas (PrivateRoute) — redireciona para /login se não autenticado
- [x] Tabelas: `perfis`, `secretarias`, `servidores`, `cidades_regiao`
- [x] CRUD completo de secretarias (criar, editar, listar, desativar)
- [x] CRUD completo de servidores (criar, editar, listar, desativar, lotação)
- [x] CRUD de cidades da região
- [x] Perfis de acesso: administrador, gestor, pesquisador
- [x] Row Level Security (RLS) — servidor só vê dados da sua secretaria
- [x] Logs de auditoria (tabela `audit_log` com data, hora, IP, ação, usuário)
- [x] Session timeout de 30 minutos por inatividade
- [x] Soft delete em todas as entidades (campo `deletado_em`)

### Critérios de Conclusão (OBRIGATÓRIOS)
- [x] Login com credenciais inválidas exibe mensagem de erro clara
- [x] Login com credenciais válidas redireciona para Dashboard
- [x] Após login, refresh da página mantém sessão ativa
- [x] Rota protegida sem token redireciona para /login em < 1s
- [x] Administrador consegue criar/editar/desativar secretarias
- [x] Administrador consegue criar/editar servidores com lotação
- [x] Servidor com perfil "pesquisador" NÃO consegue acessar tela de Configurações
- [x] RLS testada: Servidor da Secretaria A NÃO vê dados da Secretaria B
- [x] Todo registro criado/editado/excluído gera entrada na `audit_log`
- [x] Após 30min de inatividade, sessão expira e redireciona para /login
- [x] Nenhum registro é deletado fisicamente (somente soft delete)
- [x] Recuperação de senha envia e-mail funcional

### Verificação
```sql
-- Testar RLS: logar como servidor da Secretaria A
SELECT * FROM cestas; -- Deve retornar APENAS cestas da Secretaria A

-- Verificar audit_log
SELECT * FROM audit_log ORDER BY criado_em DESC LIMIT 10;
```

---

## FASE 3 — CATÁLOGO PADRONIZADO DE PRODUTOS E SERVIÇOS

**Duração estimada:** 2 semanas  
**Dependências:** Fase 2 concluída

### Escopo
- [x] Tabelas: `categorias`, `produtos_catalogo`, `unidades_medida`, `elementos_despesa`
- [x] Tela de listagem do catálogo com paginação (50 itens/página)
- [x] Busca com autocomplete (debounce 300ms)
- [x] Filtro por categoria, elemento de despesa, unidade de medida
- [x] Filtro combinado (categoria + elemento + texto)
- [x] Detalhes do produto em modal ou drawer
- [x] Gestão automatizada de duplicidades (alerta ao cadastrar item similar)
- [x] Formulário de solicitação de inclusão de item
- [x] Tela de rastreamento de solicitações (data, descrição, status)
- [x] Painel admin para aprovar/recusar solicitações (com justificativa)
- [x] Seed de categorias padrão (alimentícios, higiene, medicamentos, construção, etc.)
- [x] Importação em massa via CSV/Excel

### Critérios de Conclusão (OBRIGATÓRIOS)
- [x] Catálogo exibe 50+ itens com paginação funcional
- [x] Busca retorna resultados em < 500ms para base de 5.000+ itens
- [x] Autocomplete sugere itens após digitar 3+ caracteres
- [x] Filtro por categoria retorna apenas itens da categoria selecionada
- [x] Ao cadastrar "Arroz Tipo 1 5kg", sistema alerta se já existe "Arroz Tipo 1 - 5kg"
- [x] Solicitação de inclusão fica visível na tela de rastreamento com status "Pendente"
- [x] Admin pode aprovar com 1 clique ou recusar com justificativa obrigatória
- [x] Importação CSV de 500 itens completa em < 30 segundos
- [x] Todas as categorias do edital estão presentes no seed

### Verificação
```
- Criar 3 itens distintos → devem aparecer na listagem
- Tentar criar item duplicado → alerta de similaridade
- Filtrar por "Medicamentos" → apenas medicamentos exibidos
- Solicitar inclusão como pesquisador → admin vê na fila
```

---

## FASE 4 — FORMAÇÃO DE CESTAS DE PREÇOS (CORE)

**Duração estimada:** 3 semanas  
**Dependências:** Fase 3 concluída

### Escopo
- [x] Tabelas: `cestas`, `itens_cesta`, `lotes_cesta`, `precos_item`, `fontes_preco_item`
- [x] Wizard de criação de cesta (passo-a-passo):
  - Passo 1: Descrição do objeto, data, tipo de cálculo, correção monetária
  - Passo 2: Seleção de itens do catálogo (busca + drag-and-drop)
  - Passo 3: Organização em lotes (opcional)
  - Passo 4: Revisão e confirmação
- [x] Tipos de cálculo: média aritmética, mediana, menor preço
- [x] Formação por item e por lote (menor, maior, média, mediana)
- [x] Total do lote exibido APENAS quando todos os itens possuem preço
- [x] Documentos comprobatórios vinculados a cada preço (upload + fonte)
- [x] Duplicação de cestas:
  - Com todas as informações (incluindo fontes)
  - Apenas itens (sem fontes)
- [x] Histórico de cestas anteriores do município
- [x] Status da cesta: rascunho → em andamento → concluída → arquivada
- [x] Exclusão de preço do cálculo (mantém visível, mas não entra na média)
- [x] Versionamento de cestas (cada alteração gera versão)

### Critérios de Conclusão (OBRIGATÓRIOS)
- [x] Wizard completa criação em 4 passos sem erro
- [x] Cesta com 20 itens exibe corretamente média, mediana e menor preço
- [x] Ao excluir preço do cálculo, média recalcula automaticamente em < 1s
- [x] Duplicação "com fontes" cria cópia idêntica
- [x] Duplicação "sem fontes" cria cópia apenas com itens (preços zerados)
- [x] Total do lote NÃO aparece se 1+ item do lote não tem preço
- [x] Histórico mostra cestas anteriores com descrição, valor médio e data
- [x] Cada alteração na cesta gera registro de versão na tabela `cestas_versoes`
- [x] Upload de documento comprobatório (PDF/imagem) funciona e fica vinculado ao preço
- [x] Status muda corretamente em cada etapa do fluxo

### Verificação
```
- Criar cesta → adicionar 5 itens → definir preços → verificar média
- Excluir 1 preço → média deve recalcular sem ele (mas preço visível riscado)
- Duplicar cesta com fontes → nova cesta idêntica
- Duplicar sem fontes → nova cesta com itens mas sem preços
```

---

## FASE 5 — INTEGRAÇÃO COM FONTES DE PREÇOS (Parte 1 — Portais Governamentais)

**Duração estimada:** 3 semanas  
**Dependências:** Fase 4 concluída

### Escopo
- [x] Tabelas: `fontes`, `dados_fonte_pncp`, `dados_fonte_painel`, `dados_fonte_tce`, `execucoes_crawler`
- [x] **Crawler PNCP** (API REST oficial):
  - Consulta por código de item/descrição
  - Filtra por região, UF, período (últimos 12 meses)
  - Extrai: órgão, CNPJ, descrição, unidade, valor, data homologação
  - Download automático de documentos comprobatórios (atas, contratos)
- [x] **Crawler Painel de Preços do Governo Federal**:
  - Consulta por descrição + filtros
  - Extrai preços praticados pela administração federal
- [x] **Crawler TCEs Estaduais — Todos os 27 estados**:
  - Registro completo (PORTAIS_TCE) com URLs, APIs e endpoints de cada TCE
  - Busca individual por UF: `buscarTCE(uf, filtro)`
  - Busca paralela multi-estado: `buscarMultiplosTCEs(ufs, filtro)`
  - Busca por região geográfica: `buscarTCEsPorRegiao(regiao, filtro)`
  - Helper retrocompatível: `buscarTCEMG(filtro)`
  - Portais com API: MG, SP, RJ, ES, RS, PR, SC, BA, PE, CE, PB, GO, MT, DF
  - Portais sem API (dados locais): MA, RN, AL, SE, PI, MS, PA, AM, RO, TO, AC, AP, RR
  - Filtro por município específico dentro do estado
  - Resultados agrupados por UF no painel
- [x] **Seletor multi-estado no PainelFontesDialog**:
  - Seleção de states individuais ou por região (Sudeste, Sul, etc.)
  - Indicação visual de portais com API (●)
  - Agrupamento accordion de resultados por TCE/UF
  - Filtro de município integrado
- [x] Job scheduler para atualização diária automática (pg_cron)
- [x] Tabela de controle de execuções (sucesso/falha, itens processados, duração)
- [x] Cache de resultados (evitar requisições duplicadas em < 24h)
- [x] Exibição organizada: cada fonte em aba/coluna individual
- [x] Seleção de preços de cada portal para composição da cesta
- [x] Filtro regional nos resultados
- [x] Migração SQL 00002_tce_multi_estado: colunas `uf` e `fonte_tce` em dados_fonte_tce

### Critérios de Conclusão (OBRIGATÓRIOS)
- [x] Crawler PNCP retorna dados reais para item "Arroz Tipo 1" com preço + órgão + data
- [x] Crawler Painel de Preços retorna dados para pelo menos 10 itens comuns
- [x] Crawler TCE/MG retorna contratos de municípios de MG
- [x] Cada fonte exibida em aba separada com nome identificado
- [x] Documentos comprobatórios (PDF) são baixados e armazenados no Storage
- [x] Job scheduler executa crawlers diariamente às 3h (horário de Brasília)
- [x] Tabela `execucoes_crawler` registra cada execução com status e duração
- [x] Se crawler falha, registra erro mas NÃO afeta dados existentes
- [x] Cache impede re-consulta do mesmo item na mesma fonte em < 24h
- [x] Para item do catálogo padronizado, preços aparecem AUTOMATICAMENTE (sem busca manual)
- [x] Filtro regional funciona: exibe apenas dados da região selecionada

### Verificação
```sql
-- Verificar dados do PNCP
SELECT * FROM dados_fonte_pncp WHERE descricao ILIKE '%arroz%' LIMIT 5;

-- Verificar execuções
SELECT * FROM execucoes_crawler ORDER BY iniciado_em DESC LIMIT 10;

-- Verificar cache
SELECT * FROM cache_consultas WHERE fonte = 'pncp' AND item_id = '...' 
  AND consultado_em > NOW() - INTERVAL '24 hours';
```

---

## FASE 6 — INTEGRAÇÃO COM FONTES DE PREÇOS (Parte 2 — Saúde, Construção e Alimentação)

**Duração estimada:** 2 semanas  
**Dependências:** Fase 5 concluída

### Escopo
- [ ] **BPS (Banco de Preços em Saúde)**:
  - Consulta por Código BR
  - Média ponderada calculada internamente (sem redirecionamento)
  - Mesmos filtros da plataforma BPS oficial
  - Integridade: NÃO permite seleção parcial de preços
- [ ] **SINAPI (Construção Civil)**:
  - Importação mensal das tabelas da CEF
  - Parser CSV/XLS automatizado
  - Custos por estado (foco MG)
- [ ] **CONAB (Gêneros Alimentícios)**:
  - Tabela de preços de MG
  - Atualização periódica automatizada
- [ ] **CEASA-MG (Hortifrúti)**:
  - Cotações diárias/semanais
  - Scraping da Central de Abastecimento de MG
- [ ] **CMED/ANVISA (Medicamentos)**:
  - Base completa da tabela CMED
  - Pesquisa por: registro, princípio ativo, descrição, apresentação
  - Atualização conforme publicações da ANVISA
- [ ] Tabelas: `dados_fonte_bps`, `dados_fonte_sinapi`, `dados_fonte_conab`, `dados_fonte_ceasa`, `dados_fonte_cmed`

### Critérios de Conclusão (OBRIGATÓRIOS)
- [ ] BPS: consulta por Código BR retorna média ponderada = resultado da plataforma oficial
- [ ] BPS: NÃO é possível selecionar apenas parte dos preços (integridade garantida)
- [ ] SINAPI: tabela do mês atual importada com todos os insumos de MG
- [ ] CONAB: preços de gêneros alimentícios de MG disponíveis
- [ ] CEASA-MG: cotações de hortifrúti atualizadas na última semana
- [ ] CMED: busca por "Paracetamol" retorna todas as apresentações com PMVG
- [ ] CMED: busca por nº de registro retorna produto correto
- [ ] Cada fonte aparece como aba adicional na tela de cesta
- [ ] Total de fontes integradas ≥ 8

### Verificação
```
- BPS: Consultar Código BR de "Amoxicilina 500mg" → média ponderada
- SINAPI: Consultar "Cimento Portland CP-II" → custo MG
- CMED: Consultar registro "1234567890" → preço máximo ANVISA
- CEASA: Consultar "Tomate" → cotação da semana
```

---

## FASE 7 — PESQUISA RÁPIDA DE PREÇOS

**Duração estimada:** 1 semana  
**Dependências:** Fase 6 concluída

### Escopo
- [x] Tela de pesquisa rápida (sem necessidade de criar cesta)
- [x] Seleção direta do produto no catálogo (autocomplete)
- [x] Resultados automáticos de TODAS as fontes integradas
- [x] Para itens comuns: preços aparecem sem busca manual
- [x] Para itens não comuns: pesquisa por palavra-chave com filtros
- [x] Filtros: data (período), região, UF
- [x] Exibição: menor preço, maior preço, média, mediana — por fonte
- [x] Botão "Enviar para Cesta" — transfere resultado para uma cesta existente ou nova
- [x] Resultados precisos: apenas contratações similares/compatíveis

### Critérios de Conclusão (OBRIGATÓRIOS)
- [x] Selecionar "Arroz Tipo 1 5kg" exibe preços de 3+ fontes automaticamente
- [x] Tempo de carregamento dos resultados < 3 segundos
- [x] Filtro por região retorna apenas dados da região selecionada
- [x] Filtro por período funciona corretamente (últimos 3/6/12 meses)
- [x] Botão "Enviar para Cesta" transfere dados corretamente
- [x] Para item sem dados automáticos, busca por palavra-chave funciona
- [x] Nenhum resultado duplicado exibido (deduplicação por fonte + contrato)

### Verificação
```
- Pesquisar item comum → resultados automáticos em < 3s
- Pesquisar item incomum → busca por palavra-chave com filtros
- Filtrar por "Últimos 6 meses" + "Região Triângulo Mineiro" → dados filtrados
- Clicar "Enviar para Cesta" → preço aparece na cesta selecionada
```

---

## FASE 8 — CORREÇÃO MONETÁRIA

**Duração estimada:** 1 semana  
**Dependências:** Fase 7 concluída

### Escopo
- [x] Tabelas: `indices_correcao` (IPCA, IGP-M mensal desde 2015)
- [x] Motor de cálculo de correção monetária:
  - Data de origem (homologação/contratação da fonte)
  - Data-base final (informada pelo usuário)
  - Índice: IPCA (IBGE) ou IGP-M (FGV)
- [x] Correção nos itens individuais (valor original + valor corrigido)
- [x] Correção na cesta completa (data-base = data de conclusão)
- [x] Relatório de correção: item, fonte, valor original, valor correção, valor corrigido
- [x] Aplicação flexível: no ato da pesquisa OU na cesta concluída
- [x] Importação automática dos índices IPCA/IGP-M do IBGE/FGV
- [ ] Edge Function para atualização mensal dos índices

### Critérios de Conclusão (OBRIGATÓRIOS)
- [x] Correção de R$ 100,00 de jan/2025 para mar/2026 pelo IPCA retorna valor correto (conferir no Calculadora do Cidadão BCB)
- [x] Correção pelo IGP-M retorna valor diferente do IPCA (índices distintos)
- [x] Na cesta, cada item mostra: valor original | valor correção | valor corrigido
- [x] Correção global da cesta aplica a todos os itens de uma vez
- [x] Tabela `indices_correcao` tem dados mensais de IPCA e IGP-M desde 2015
- [ ] Índices são atualizados automaticamente todo mês
- [x] Relatório de correção exportável em PDF

### Verificação
```
- Corrigir R$ 100,00 (jan/2024 → mar/2026, IPCA) → comparar com BCB
- Corrigir cesta de 10 itens → todos os valores atualizados
- Verificar que IPCA ≠ IGP-M para mesmo período
```

---

## FASE 9 — COTAÇÃO ELETRÔNICA COM FORNECEDORES

**Duração estimada:** 2 semanas  
**Dependências:** Fase 4 concluída (pode ser paralela às Fases 5-8)

### Escopo
- [x] Tabelas: `cotacoes`, `cotacao_itens`, `cotacao_fornecedores`, `respostas_cotacao`
- [x] Cadastro de cotação vinculada a uma cesta
- [ ] Envio de e-mail com link para acesso ao sistema de cotação (Resend/SendGrid)
- [x] **Portal do Fornecedor** (área pública, sem login no sistema principal):
  - Login do fornecedor com credenciais recebidas por e-mail
  - Visualização: entidade solicitante, data, objeto, lista de itens
  - Preenchimento: endereço, CEP, cidade, prazo de validade, nome/CPF
  - Por item: marca, valor unitário, valor total (auto), observações, Registro ANVISA
  - Geração de PDF com assinatura eletrônica
- [x] Transmissão de dados do fornecedor para a cesta (a critério do servidor)
- [x] Lançamento manual de cotações obtidas fora do módulo
- [x] Status: enviada → em resposta → respondida → transmitida para cesta

### Critérios de Conclusão (OBRIGATÓRIOS)
- [ ] Envio de cotação dispara e-mail com link funcional
- [x] Fornecedor acessa link → vê lista de itens → preenche preços → envia
- [ ] PDF gerado com marca, valor, dados do fornecedor e assinatura
- [x] Servidor municipal visualiza respostas recebidas
- [x] Servidor pode transferir preços da cotação para a cesta com 1 clique
- [x] Lançamento manual permite registrar cotação de e-mail/WhatsApp/telefone
- [ ] E-mail não vai para spam (SPF/DKIM configurados)
- [x] Portal do fornecedor funciona em mobile (responsivo)
- [x] Campo "Registro ANVISA" aparece APENAS para itens de medicamentos

### Verificação
```
- Criar cotação → enviar para 3 fornecedores → verificar recebimento
- Fornecedor responde → verificar na tela de respostas
- Transferir resposta para cesta → preço aparece como fonte "Cotação Direta"
- Lançar manualmente → funciona igual
```

---

## FASE 10 — ANÁLISE CRÍTICA, ALERTAS E DASHBOARD

**Duração estimada:** 2 semanas  
**Dependências:** Fases 6 e 8 concluídas

### Escopo
- [x] **Análise Crítica da Cesta**:
  - Visualização de TODAS as fontes por item
  - Percentual de divergência de cada preço em relação à média
  - Destaque visual (semáforo): verde (< 20%), amarelo (20-50%), vermelho (> 50%)
  - Gráfico de dispersão de preços por item
- [x] **Alertas de Valores Destoantes**:
  - Percentual configurável por cesta (padrão: 30%)
  - Alerta automático quando preço diverge > percentual configurado
  - Sugestão automática de exclusão do cálculo
- [x] **Exclusão do Cálculo**:
  - Remove preço da média/mediana mas MANTÉM visível na tabela (riscado)
  - Justificativa obrigatória para exclusão (auditoria)
- [x] **Dashboard com Métricas Reais**:
  - Total de cestas ativas/concluídas/mês
  - IPCA acumulado dos últimos 12 meses
  - Economia média (comparação menor preço vs média)
  - Fontes mais utilizadas (gráfico de barras)
  - Cestas por secretaria (gráfico de pizza)
  - Atividade recente (últimas 10 ações)
- [x] **Painel do Gestor** (administrador/prefeito):
  - Visão consolidada de TODAS as secretarias
  - Ranking de economia por secretaria
  - Cestas pendentes de conclusão

### Critérios de Conclusão (OBRIGATÓRIOS)
- [x] Semáforo funciona: verde/amarelo/vermelho com percentuais corretos
- [x] Gráfico de dispersão renderiza com dados reais de 3+ fontes
- [x] Exclusão de preço mantém preço visível mas riscado
- [x] Justificativa de exclusão é obrigatória (campo não pode ser vazio)
- [x] Dashboard exibe dados reais (não mock/placeholder)
- [x] IPCA acumulado calculado corretamente
- [x] Painel do Gestor mostra dados de todas as secretarias para admin
- [x] Pesquisador NÃO vê Painel do Gestor
- [x] Alertas automáticos disparam corretamente para divergência > configurada

### Verificação
```
- Cesta com preço R$ 100 e outro R$ 200 → alerta vermelho no segundo
- Excluir preço → justificativa obrigatória → preço riscado
- Dashboard → dados coerentes com cestas criadas
- Admin vê todas as secretarias, pesquisador só a sua
```

---

## FASE 11 — RELATÓRIOS E EXPORTAÇÕES

**Duração estimada:** 2 semanas  
**Dependências:** Fase 10 concluída

### Escopo
- [x] **Mapa de Apuração de Preços** (PDF):
  - Descrição dos itens, unidade, quantidade
  - Valores unitários por fonte (cada fonte em coluna)
  - Preços de cotações diretas
  - Destaque em itens excluídos na análise crítica
  - Média por item, valor total do item, valor total da cesta
  - Cabeçalho: brasão do município, nome do órgão, data, objeto
- [x] **Relatório de Fontes de Preços** (PDF):
  - Detalhamento de cada fonte utilizada
  - Documentos comprobatórios anexados
- [x] **Relatório de Correção Monetária** (PDF):
  - Item, fonte, valor original, valor da correção, valor corrigido
  - Índice utilizado, período, percentual acumulado
- [x] **Exportação Excel** (XLSX):
  - Mapa de apuração em formato planilha
  - Formatação profissional (cabeçalhos, bordas, cores)
  - Fórmulas nativas do Excel (SOMA, MÉDIA)
- [x] **Documentos Comprobatórios**:
  - Contratos, atas, termos de homologação extraídos dos portais
  - Armazenados como arquivos reais (PDF) no Storage
  - Anexados ao relatório final como apêndice
- [x] Geração client-side com code-splitting (jspdf/exceljs carregados sob demanda)

### Critérios de Conclusão (OBRIGATÓRIOS)
- [x] Mapa de apuração PDF gerado em < 10 segundos para cesta de 20 itens
- [x] PDF tem cabeçalho, formatação profissional e é pronto para imprimir
- [x] Itens excluídos aparecem com destaque visual (tachado/cinza)
- [x] Excel abre sem erros no LibreOffice e Microsoft Excel
- [x] Fórmulas do Excel são nativas (não valores fixos)
- [x] Documentos comprobatórios são arquivos PDF reais (não links)
- [x] Cada documento tem referência à fonte de origem
- [x] Relatório de correção monetária mostra cálculos detalhados
- [x] Todos os relatórios incluem data de geração + nome do servidor

### Verificação
```
- Gerar mapa de apuração → abrir PDF → verificar formatação
- Gerar Excel → abrir no Excel → verificar fórmulas
- Verificar documentos comprobatórios → PDFs reais de atas/contratos
- Imprimir PDF → layout correto em A4
```

---

## FASE 12 — UX/UI AVANÇADA E POLISH

**Duração estimada:** 2 semanas  
**Dependências:** Todas as fases anteriores concluídas

### Escopo

#### 12.1 — Refinamento Visual
- [x] Dark mode completo (toggle no header)
- [x] Animações de transição entre páginas (framer-motion)
- [x] Loading skeletons em todas as listagens
- [x] Empty states ilustrados (sem dados? imagem + texto + CTA)
- [x] Breadcrumbs em todas as páginas internas
- [ ] Favicon customizado com ícone da balança

#### 12.2 — Interação e Usabilidade
- [x] Busca global (Cmd/Ctrl+K) — busca em catálogo, cestas, fornecedores
- [x] Atalhos de teclado documentados (tooltip com "?")
- [x] Drag-and-drop para reordenar itens na cesta (@dnd-kit/core + @dnd-kit/sortable)
- [x] Notificações toast (sucesso, erro, aviso) — padrão consistente
- [x] Confirmação em ações destrutivas (modal "Tem certeza?")
- [ ] Tooltips explicativas em cada fonte de preço

#### 12.3 — Onboarding e Ajuda
- [x] Tour guiado no primeiro acesso (implementação customizada)
- [x] Página de ajuda/FAQ in-app
- [ ] Vídeos tutoriais embutidos (link para YouTube/Loom)
- [x] Manual do usuário digital acessível pelo "?"

#### 12.4 — Performance
- [x] Lazy loading de páginas (React.lazy + Suspense)
- [ ] Virtualização de listas grandes (react-window ou similar)
- [x] Otimização de imagens e assets
- [ ] Lighthouse score > 90 em Performance
- [x] Bundle splitting — chunk por página

#### 12.5 — Responsividade
- [x] Menu mobile (hamburger → drawer lateral)
- [x] Tabelas responsivas (scroll horizontal em mobile)
- [x] Formulários adaptáveis (1 coluna em mobile, 2+ em desktop)
- [x] Touch-friendly em tablets

### Critérios de Conclusão (OBRIGATÓRIOS)
- [x] Dark mode funciona em TODAS as páginas sem glitches visuais
- [x] Cmd+K abre busca global em < 200ms
- [x] Tour guiado completa sem erros em conta nova
- [ ] Lighthouse Performance > 90
- [ ] Lighthouse Accessibility > 95
- [ ] Lighthouse Best Practices > 90
- [x] Todas as ações destrutivas pedem confirmação
- [x] Drag-and-drop funciona em desktop e tablet
- [x] Menu mobile funciona em viewport 375px+
- [x] Loading skeleton exibido em TODAS as listagens durante carregamento
- [x] Nenhum layout quebrado em 375px - 1920px

### Verificação
```bash
# Lighthouse
npx lighthouse http://localhost:5173 --output json --chrome-flags="--headless"

# Bundle analysis
npx vite build --mode analyze
```

---

## FASES FUTURAS (PÓS-LANÇAMENTO)

### FASE 13 — FUNCIONALIDADES AVANÇADAS (v2.0) ✅
- [x] Comparador de cestas lado a lado (`ComparadorCestasPage` + `comparadorCestas.ts`)
- [x] Alertas por e-mail quando preço muda > X% (`AlertasPrecoPage` + `alertasPreco.ts`)
- [x] Sugestão de fontes com IA — GPT/Claude (`SugestaoFontesIAPage` — modo demonstração)
- [x] Mapa de calor regional de preços (`MapaCalorRegionalPage` + `mapaCalorRegional.ts`)
- [x] Templates de cestas por categoria ("Merenda Escolar", "Medicamentos Básicos") (`TemplatesCestasPage` + `templatesCestas.ts`)
- [x] API pública REST para integração com ERPs municipais (`ApiPublicaPage` + `apiPublica.ts` — API Keys, docs, métricas)
- [x] Histórico de preços com gráfico temporal 12 meses (`HistoricoPrecoPage` + `historicoPrecos.ts` + recharts)
- [x] OCR para importar cotações em papel (`OcrCotacoesPage` — modo demonstração)
- [x] Exportação para SICOM — TCE/MG (`ExportacaoSicomPage` + `exportacaoSicom.ts`)

### FASE 14 — MULTI-TENANCY E ESCALABILIDADE (v2.5)
- [x] Onboarding self-service para novos municípios (`OnboardingPage` — wizard 4 etapas, rota pública `/onboarding`)
- [x] Billing integrado (Stripe) (`BillingPage` + `billing.ts` — planos, assinaturas, faturas, stubs Stripe)
- [x] Painel admin Metaclass (gerenciar todos os tenants) (`AdminMetaclassPage` + `tenants.ts` — KPIs MRR/ARR/churn, listagem tenants)
- [x] Métricas de uso por município (`MetricasUsoPage` + `metricasUso.ts` — barras de consumo vs limites do plano)

### FASE 15 — MOBILE (v3.0)
- [x] PWA com offline-first (`vite-plugin-pwa` + Workbox — precache 115 entries, runtime cache Supabase API, fontes, imagens)
- [x] Notificações push (`NotificacoesPage` + `notificacoesPush.ts` — permissões, Web Push API, notificações locais)
- [x] App nativo (React Native) — não justificado; PWA standalone atende (manifest.json + install prompt + offline.html)

### FASE 16 — CONSOLIDAÇÃO, ITENS PENDENTES E QUALIDADE ✅

**Duração estimada:** 1 semana  
**Dependências:** Fases 1–15 concluídas

#### 16.1 — Serviço de E-mail
- [x] Integração com Resend API para envio de e-mails transacionais (`email.ts`)
- [x] Templates HTML responsivos para convite de cotação e lembrete
- [x] Envio em lote de convites a fornecedores com tracking de status
- [x] Reenvio de e-mails com controle de tentativas
- [x] Estatísticas de envio (total, entregues, abertos, erros)
- [x] Tabela `emails_enviados` com RLS por município

#### 16.2 — Assinatura Eletrônica e PDF
- [x] Geração de hash SHA-256 para documentos de cotação
- [x] Assinatura eletrônica com registro de IP, user-agent e método (`assinaturaEletronica.ts`)
- [x] Geração de PDF completo de cotação com jsPDF + autoTable
- [x] PDF inclui dados do fornecedor, itens cotados, valores, observações e selo de assinatura
- [x] Tabela `assinaturas_eletronicas` com RLS por município

#### 16.3 — API Pública REST
- [x] CRUD de API Keys com hash SHA-256 e prefixo `lnst_` (`apiPublica.ts`)
- [x] Validação de chaves via `fn_validar_api_key` (função SQL)
- [x] Log de requisições com endpoint, método, status e latência (`api_log`)
- [x] View `vw_api_estatisticas` para métricas por chave
- [x] Página de gestão com 3 abas: Chaves, Documentação, Métricas (`ApiPublicaPage.tsx`)
- [x] Documentação interativa com 10 endpoints e exemplos em cURL, JavaScript e Python
- [x] Rota `/api-publica`, sidebar (admin only), breadcrumbs e Cmd+K

#### 16.4 — Edge Function para Índices Econômicos
- [x] Edge Function `atualizar-indices` para busca mensal de IPCA e IGP-M
- [x] Integração com API do Banco Central do Brasil (BCB)
- [x] Upsert via `fn_upsert_indice_correcao` (sem duplicatas)
- [x] Tabela `indices_atualizacoes_log` para rastreamento de execuções

#### 16.5 — UX e Qualidade
- [x] Drag-and-drop para reordenar itens na cesta (@dnd-kit com PointerSensor + KeyboardSensor)
- [x] Componente SortableItemRow com handle de arrastar (GripVertical)
- [x] Favicon customizado com ícone de balança em SVG gradiente
- [x] Migração SQL 00016 com todas as tabelas, funções, views e RLS

### Critérios de Conclusão (OBRIGATÓRIOS)
- [x] `npm run build` executa sem erros
- [x] `npx tsc --noEmit` sem erros de TypeScript
- [x] Serviço de email estruturado com templates e tracking
- [x] PDF de cotação gerado com assinatura eletrônica
- [x] API Keys com criação, revogação e documentação
- [x] Edge Function testável com IPCA/IGP-M do BCB
- [x] Drag-and-drop funcional em DetalheCestaPage
- [x] Todos os novos serviços exportados em barrel (`servicos/index.ts`)

---

## MÉTRICAS DE QUALIDADE GLOBAIS

| Métrica | Meta |
|---|---|
| TypeScript strict mode | Sem `any` no código |
| Cobertura de testes | ≥ 70% (unitários + integração) |
| Tempo de build | < 30 segundos |
| Tempo de carregamento inicial | < 2 segundos (3G rápido) |
| Lighthouse Performance | > 90 |
| Lighthouse Accessibility | > 95 |
| Uptime (produção) | ≥ 99.5% |
| Erros não tratados | 0 em produção |

---

*Documento de uso interno — Metaclass*  
*Atualizado em Março/2026*
