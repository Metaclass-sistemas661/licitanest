# FICHA TÉCNICA DO PRODUTO

---

## SISTEMA DE FORMAÇÃO E ELABORAÇÃO DE CESTAS DE PREÇOS PARA COMPRAS PÚBLICAS

**Versão:** 1.0  
**Data:** Março/2026  
**Classificação:** Software como Serviço (SaaS) — Cessão de Uso

---

## 1. IDENTIFICAÇÃO DO PRODUTO

| Campo | Descrição |
|---|---|
| **Nome do Software** | *(a definir)* |
| **Tipo** | Sistema web para formação e elaboração de cestas de preços de compras públicas |
| **Modalidade** | Cessão de uso (SaaS) — acesso via navegador web |
| **Público-alvo** | Prefeituras, autarquias, fundações e demais órgãos da Administração Pública |
| **Finalidade** | Auxiliar servidores públicos na pesquisa de preços, formação de cestas e elaboração de mapas de apuração, em conformidade com o Art. 23 da Lei Federal nº 14.133/2021 |
| **Base Legal** | Lei 14.133/2021 (Nova Lei de Licitações), Decreto 11.462/2023, IN SEGES 65/2021 |

---

## 2. REQUISITOS DE ACESSO

| Requisito | Especificação |
|---|---|
| **Plataforma** | 100% Web (Cloud) — sem instalação local |
| **Navegadores compatíveis** | Google Chrome 90+, Mozilla Firefox 90+, Microsoft Edge 90+, Safari 15+ |
| **Dispositivos** | Desktop, notebook, tablet (responsivo) |
| **Conexão** | Internet banda larga (mínimo 2 Mbps) |
| **Sistema operacional** | Qualquer (Windows, macOS, Linux, ChromeOS) |
| **Instalação local** | Não requerida |

---

## 3. INFRAESTRUTURA E SEGURANÇA

| Item | Especificação |
|---|---|
| **Hospedagem** | Servidores em nuvem (AWS/Supabase) com data centers no Brasil |
| **Disponibilidade** | 99,5% de uptime (SLA) |
| **Backup** | Diário, automático, com retenção de 30 dias |
| **Criptografia** | TLS 1.3 (dados em trânsito) + AES-256 (dados em repouso) |
| **Autenticação** | Login individual por servidor público (e-mail + senha) |
| **Controle de acesso** | Baseado em perfis (RBAC) — administrador, gestor, operador |
| **LGPD** | Em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018) |
| **Logs de auditoria** | Registro completo de ações dos usuários com data, hora e IP |
| **Responsabilidade** | Hospedagem, segurança e proteção do banco de dados são de inteira responsabilidade da contratada |

---

## 4. MÓDULOS E FUNCIONALIDADES

### 4.1. MÓDULO DE ACESSO E ADMINISTRAÇÃO

| Funcionalidade | Descrição |
|---|---|
| Autenticação individual | Login e senha por servidor, sem limite de usuários simultâneos |
| Cadastro de unidades gestoras | Registro de secretarias municipais e departamentos |
| Cadastro de servidores | Registro de funcionários com lotação por secretaria |
| Controle de acesso por lotação | Cada servidor visualiza apenas cestas de preços da(s) secretaria(s) em que está lotado |
| Cadastro de cidades da região | Para fins de pesquisas regionais de preços |
| Perfis de acesso | Administrador, gestor de compras, pesquisador |

### 4.2. CATÁLOGO PADRONIZADO DE PRODUTOS E SERVIÇOS

| Funcionalidade | Descrição |
|---|---|
| Base de produtos/serviços | Catálogo padronizado com descrições, unidades de medida e classificações dentro dos padrões exigidos pelos Tribunais de Contas e demais órgãos fiscalizadores |
| Filtro por elemento de despesa | Pesquisa por elemento de despesa/objeto |
| Categorias abrangidas | Gêneros alimentícios, materiais de higiene e limpeza, copa e cozinha, utensílios domésticos, embalagens, expediente, materiais didáticos/pedagógicos, informática, materiais esportivos, construção, elétricos/eletrônicos, hidráulicos, medicamentos, materiais farmacológicos, hospitalares, odontológicos, laboratoriais, veterinários, combustíveis, lubrificantes, pneus, baterias automotivas, entre outros |
| Tratamento de duplicidades | Gestão automatizada para evitar registros duplicados |
| Solicitação de inclusão | Usuários podem solicitar inclusão de itens não catalogados, com resposta em até 24 horas (aceite ou recusa justificada com indicação de item substituto) |
| Rastreamento de solicitações | Tela com histórico de solicitações (data, descrição, status) |

### 4.3. CADASTRO E PESQUISA DE FORNECEDORES

| Funcionalidade | Descrição |
|---|---|
| Cadastro de fornecedores | CPF/CNPJ, razão social, endereço completo (rua, número, bairro, CEP, cidade) — sem campos obrigatórios além dos listados |
| Listagem por objeto de licitação | Fornecedores com itens homologados/contratados, filtro por região |
| Pesquisa por produto/serviço | Fornecedores com propostas homologadas e/ou contratadas por item específico, com filtro regional |
| Resultados abundantes | Base de dados alimentada continuamente com dados de contratações públicas |

### 4.4. FORMAÇÃO DE CESTAS DE PREÇOS

| Funcionalidade | Descrição |
|---|---|
| Cadastro da cesta | Descrição do objeto, data, tipo de cálculo, tipo de correção monetária, índice de correção |
| Tipos de cálculo | Média aritmética, mediana e menor preço (mínimo 3 tipos) |
| Formação da lista de itens | Seleção de itens do catálogo padronizado |
| Agrupamento em lotes | Opção para organizar itens em lotes |
| Preços automáticos (objetos comuns) | Para itens do catálogo padronizado, o sistema apresenta automaticamente: menor preço, maior preço, média e mediana — com base em contratações dos últimos 12 meses da região, sem necessidade de busca manual |
| Formação por item e por lote | Valor individual por item e total do lote (menor, maior, média, mediana) em cada fonte — total do lote exibido apenas quando todos os itens possuírem preço na fonte |
| Documentos comprobatórios | Apresentação dos documentos-fonte de cada preço utilizado |
| Duplicação de cestas | Com todas as informações (incluindo fontes) ou apenas itens (sem fontes) |
| Histórico de cestas anteriores | Exibição da média obtida em cestas anteriores do próprio município, com descrição, unidade, quantidade, valor médio e data |

### 4.5. PESQUISA RÁPIDA DE PREÇOS

| Funcionalidade | Descrição |
|---|---|
| Consulta sem cadastro de cesta | Seleção direta do produto/serviço no catálogo |
| Resultados automáticos | Preços de diversas fontes/portais exibidos automaticamente, sem necessidade de pesquisa por descrição |
| Resultados precisos | Apenas contratações similares/compatíveis ao produto escolhido |
| Pesquisa por palavra-chave | Para itens não comuns, com filtros de data, região e UF |

### 4.6. CORREÇÃO MONETÁRIA

| Funcionalidade | Descrição |
|---|---|
| Índices disponíveis | IPCA (IBGE) e IGP-M (FGV) — no mínimo |
| Correção nos itens | Valor original + valor corrigido, com base na data de homologação/contratação da fonte até data-base final informada pelo usuário |
| Correção na cesta | Atualização global dos valores da cesta, com data-base inicial = data de conclusão da cesta |
| Relatório de correção | Item, descrição, fonte de preços, valor original, valor da correção, valor corrigido |
| Aplicação flexível | No ato da pesquisa ou na cesta concluída |

### 4.7. COTAÇÃO ELETRÔNICA COM FORNECEDORES

| Funcionalidade | Descrição |
|---|---|
| Envio de cotação | Disparo de e-mail com link para acesso ao sistema de cotação (sem ferramentas externas) |
| Acesso do fornecedor | Via login/senha no sistema de cotação |
| Informações exibidas | Entidade solicitante, data, objeto, lista de itens (item, descrição, unidade, quantidade) |
| Registro pelo fornecedor | Endereço, CEP, cidade, prazo de validade, nome/CPF do responsável, local, data, observações |
| Detalhamento por item | Marca ofertada, valor unitário, valor total (automático), observações, Registro ANVISA (quando medicamentos) |
| Entrega digital | PDF com assinatura eletrônica (autenticação própria ou certificado digital) |
| Transmissão para cesta | Dados do fornecedor migram para a cesta a critério do servidor municipal |
| Lançamento manual | Registro de cotações obtidas fora do módulo eletrônico |
| Suporte aos fornecedores | Assistência para cadastro e uso do sistema de cotação |

### 4.8. ANÁLISE CRÍTICA E ALERTAS

| Funcionalidade | Descrição |
|---|---|
| Alerta de valores destoantes | Percentual configurável para identificar divergências entre fontes e em relação à média |
| Análise crítica da cesta | Visualização de todas as fontes por item, com percentual de divergência |
| Exclusão do cálculo | Possibilidade de remover preço do cálculo da média, mantendo-o visível na tabela |

### 4.9. RELATÓRIOS E EXPORTAÇÕES

| Funcionalidade | Descrição |
|---|---|
| Mapa de apuração de preços | Descrição dos itens, unidade de fornecimento, quantidade, valores unitários por fonte, preços de cotações diretas, destaque em itens excluídos na análise crítica, média por item, valor total do item, valor total da cesta |
| Relatório de fontes de preços | Detalhamento das fontes utilizadas em cada pesquisa |
| Relatório de correção monetária | Item, fonte, valor original, valor da correção, valor corrigido |
| Exportação Excel | Formato XLS/XLSX |
| Exportação PDF | Relatórios prontos para instrução processual |
| Documentos comprobatórios | Contratos, atas de registro de preços, termos de homologação extraídos dos portais e anexados à cesta (arquivos reais, não apenas links) |

---

## 5. INTEGRAÇÕES COM FONTES DE PREÇOS

### 5.1. Portais e Bases de Dados Integrados

| Nº | Fonte | Tipo de Dados | Atualização |
|---|---|---|---|
| 1 | **PNCP** — Portal Nacional de Contratações Públicas | Contratos, atas, preços de todos os órgãos | Diária |
| 2 | **Painel de Preços do Governo Federal** | Preços praticados pela administração federal | Diária |
| 3 | **TCE/MG** — Tribunal de Contas do Estado de Minas Gerais | Contratos e atas de municípios de MG | Diária |
| 4 | **BPS** — Banco de Preços em Saúde | Preços de medicamentos e insumos de saúde, com média ponderada por Código BR | Diária |
| 5 | **SINAPI** — Sistema Nacional de Pesquisa de Custos e Índices da Construção Civil | Custos de construção civil | Mensal (conforme CEF) |
| 6 | **CONAB** — Tabela de Preços do Estado de Minas Gerais | Preços de gêneros alimentícios | Periódica |
| 7 | **CEASA-MG** — Central de Abastecimento de Minas Gerais | Cotações de hortifrúti e alimentos | Diária/Semanal |
| 8 | **CMED/ANVISA** — Câmara de Regulação do Mercado de Medicamentos | Preços máximos de medicamentos | Conforme publicação ANVISA |
| 9 | **Portais de Transparência** — Municípios de MG e estados vizinhos | Contratos e atas de registro de preços | Contínua |
| 10 | **Diários Oficiais** — Extratos de contratos | Valores contratados publicados em DO | Contínua |

### 5.2. Abrangência Geográfica da Base de Dados

| Cobertura | Descrição |
|---|---|
| **Região do município** | Dados prioritários de órgãos públicos sediados na região do contratante |
| **Estado de Minas Gerais** | Cobertura ampla de prefeituras e órgãos estaduais de MG |
| **Estados circunvizinhos** | São Paulo, Rio de Janeiro, Espírito Santo — dados complementares |
| **Nacional** | Dados do PNCP e Painel de Preços abrangem todo o território nacional |

### 5.3. Visualização das Fontes

| Funcionalidade | Descrição |
|---|---|
| Exibição organizada | Cada portal/fonte exibido em aba ou coluna individual, identificada pelo nome |
| Seleção de preços | Possibilidade de selecionar preços de cada portal para composição da cesta |
| Filtro regional | Opção de filtrar resultados por região do município contratante |

---

## 6. BANCO DE PREÇOS EM SAÚDE (BPS) — DETALHAMENTO

| Funcionalidade | Descrição |
|---|---|
| Consulta por Código BR | Pesquisa direta pelo código do produto |
| Média ponderada | Cálculo automático dentro da própria ferramenta (sem redirecionamento externo) |
| Equivalência | Resultados equivalentes aos obtidos na plataforma oficial do Governo Federal |
| Filtros | Mesmas opções de filtro da plataforma BPS oficial |
| Integridade | Não permite seleção parcial de preços para manipulação da média |

---

## 7. TABELA CMED/ANVISA — DETALHAMENTO

| Funcionalidade | Descrição |
|---|---|
| Base completa | Todas as informações constantes na tabela CMED publicada pela ANVISA |
| Atualização | Mantida atualizada pela contratada conforme publicações da ANVISA |
| Pesquisa por | Número de registro do produto, princípio ativo, descrição do produto, descrição da apresentação |
| Fonte oficial | https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos |

---

## 8. IMPLANTAÇÃO E TREINAMENTO

| Item | Especificação |
|---|---|
| **Prazo de implantação** | Até 5 (cinco) dias úteis após assinatura do contrato |
| **Treinamento inicial** | Presencial, em horário de expediente, com técnico especializado |
| **Público do treinamento** | Servidores indicados pela contratante que farão uso do software |
| **Material de apoio** | Manual do usuário digital + vídeos tutoriais |
| **Treinamentos adicionais** | Sob demanda, durante a vigência contratual, sem custos adicionais |

---

## 9. SUPORTE TÉCNICO

| Item | Especificação |
|---|---|
| **Horário** | 7h às 17h (dias úteis) |
| **Canais** | Central de atendimento (telefone), e-mail, WhatsApp, chat |
| **Prazo de resolução** | Até 2 (dois) dias úteis por requisição/incidente |
| **Acesso remoto** | Disponível quando solicitado, mediante autorização do órgão |
| **Suporte a fornecedores** | Assistência para cadastro e uso do módulo de cotação eletrônica |
| **Auxílio em pesquisas** | Quando solicitado pela contratante, conclusão em até 7 dias úteis, com mínimo 3 fontes por item, sem limite de processos/itens durante a vigência |
| **Manutenções programadas** | Comunicadas com 5 dias úteis de antecedência |
| **Manutenções emergenciais** | Comunicadas com justificativa para avaliação da contratante |

---

## 10. MANUTENÇÃO E ATUALIZAÇÕES

| Tipo | Cobertura | Custo Adicional |
|---|---|---|
| **Corretiva** | Correção de defeitos e falhas | Incluso |
| **Preventiva** | Otimizações de desempenho e segurança | Incluso |
| **Evolutiva** | Novas funcionalidades e melhorias | Incluso |
| **Adaptativa** | Adequação a novas legislações e normas | Incluso |
| **Atualizações de versão** | Disponibilizadas no mesmo momento da conclusão | Incluso |

---

## 11. CONFORMIDADE LEGAL

| Norma/Lei | Conformidade |
|---|---|
| Lei Federal nº 14.133/2021 (NLL) | Art. 23, §1º — todos os parâmetros de pesquisa de preços |
| Decreto Federal 11.462/2023 | Regulamentação de pesquisa de preços |
| IN SEGES 65/2021 | Procedimentos de pesquisa de preços |
| Lei 13.709/2018 (LGPD) | Proteção de dados pessoais |
| Orientações TCU | Acórdãos 713/2019, 2102/2019, 1548/2018 (múltiplas fontes de preço) |
| Orientações TCE/MG | Padrões de descrição e documentação comprobatória |
| CF/88, Art. 37 | Princípios da Administração Pública |

---

## 12. ESPECIFICAÇÕES TÉCNICAS (STACK TECNOLÓGICO)

| Componente | Tecnologia |
|---|---|
| **Frontend** | React 18+ com TypeScript |
| **UI Framework** | Tailwind CSS + Shadcn/UI |
| **Backend** | Supabase (PostgreSQL + Edge Functions) |
| **Autenticação** | Supabase Auth (JWT) |
| **Banco de dados** | PostgreSQL 15+ |
| **API** | RESTful + Real-time subscriptions |
| **Relatórios PDF** | Geração server-side |
| **Relatórios Excel** | Exportação nativa XLS/XLSX |
| **E-mail** | Serviço transacional (Resend/SendGrid) |
| **Crawlers** | Scripts automatizados para coleta de dados em fontes públicas |
| **Hospedagem** | Cloud (AWS/Supabase/Vercel) — data centers no Brasil |
| **Versionamento** | Git |
| **CI/CD** | Deploy automatizado |

---

## 13. NÍVEIS DE SERVIÇO (SLA)

| Indicador | Meta |
|---|---|
| Disponibilidade do sistema | ≥ 99,5% ao mês |
| Tempo de resposta do suporte | ≤ 4 horas (horário comercial) |
| Resolução de incidentes | ≤ 2 dias úteis |
| Atualização da base de dados | Diária (fontes automáticas) / Mensal (tabelas periódicas) |
| Backup dos dados | Diário, com retenção de 30 dias |
| Tempo de recuperação (RTO) | ≤ 4 horas |

---

## 14. MODELO COMERCIAL

| Item | Descrição |
|---|---|
| **Modalidade** | Cessão de uso mensal (SaaS) |
| **Implantação** | Parcela única |
| **Mensalidade** | Fixa, sem limite de usuários, consultas ou processos |
| **Vigência** | 12 meses, prorrogável por até 10 anos (Art. 107 da Lei 14.133/2021) |
| **Reajuste** | Anual pelo IPCA-IBGE, após 12 meses da proposta |

---

## 15. DIFERENCIAS COMPETITIVOS

| Diferencial | Descrição |
|---|---|
| Usuários ilimitados | Sem restrição de logins simultâneos |
| Consultas ilimitadas | Sem limite de pesquisas, cestas ou processos |
| 10+ fontes de preços integradas | PNCP, Painel de Preços, TCE/MG, BPS, SINAPI, CONAB, CEASA, CMED, Portais de Transparência, Diários Oficiais |
| Resultados automáticos | Para objetos comuns, preços aparecem sem busca manual |
| Cotação eletrônica embutida | Módulo próprio com assinatura digital, sem ferramentas externas |
| Documentos comprobatórios | Arquivos reais extraídos e anexados (não apenas links) |
| Auxílio em pesquisas | Equipe de suporte auxilia na elaboração de cestas quando solicitado |
| Interface moderna | Design intuitivo, responsivo, sem necessidade de treinamento extenso |
| Conformidade total | Lei 14.133/2021, TCU, TCE/MG, LGPD |

---

## 16. CONTATOS

| Campo | Informação |
|---|---|
| **Empresa** | *(a definir)* |
| **CNPJ** | *(a definir)* |
| **Endereço** | *(a definir)* |
| **Telefone** | *(a definir)* |
| **E-mail** | *(a definir)* |
| **Website** | *(a definir)* |

---

*Documento elaborado em conformidade com as exigências da Lei Federal nº 14.133/2021 e orientações dos Tribunais de Contas.*

*Março/2026*
