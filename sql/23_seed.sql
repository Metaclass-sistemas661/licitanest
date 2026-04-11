-- =============================================================================
-- LICITANEST — 23. Dados Iniciais (Seed)
-- =============================================================================

-- Perfis padrão
INSERT INTO perfis (nome, descricao, permissoes) VALUES
    ('administrador', 'Acesso total ao sistema', '{"admin": true, "cestas": "crud", "catalogo": "crud", "fornecedores": "crud", "cotacoes": "crud", "relatorios": "crud", "configuracoes": "crud"}'),
    ('gestor', 'Gestor de compras', '{"admin": false, "cestas": "crud", "catalogo": "read", "fornecedores": "crud", "cotacoes": "crud", "relatorios": "crud", "configuracoes": "read"}'),
    ('pesquisador', 'Pesquisador de preços', '{"admin": false, "cestas": "crud", "catalogo": "read", "fornecedores": "read", "cotacoes": "read", "relatorios": "read", "configuracoes": "none"}');

-- Fontes de preço
INSERT INTO fontes (nome, sigla, tipo, url_base, descricao) VALUES
    ('Portal Nacional de Contratações Públicas', 'PNCP', 'pncp', 'https://pncp.gov.br', 'Contratos, atas e preços de todos os órgãos públicos'),
    ('Painel de Preços do Governo Federal', 'PAINEL', 'painel_precos', 'https://paineldeprecos.planejamento.gov.br', 'Preços praticados pela administração federal'),
    ('TCE/MG — Tribunal de Contas de Minas Gerais', 'TCE-MG', 'tce_mg', 'https://www.tce.mg.gov.br', 'Contratos e atas de municípios de MG'),
    ('Banco de Preços em Saúde', 'BPS', 'bps', 'https://bps.saude.gov.br', 'Preços de medicamentos e insumos de saúde'),
    ('SINAPI — Sistema Nacional de Pesquisa de Custos', 'SINAPI', 'sinapi', 'https://www.caixa.gov.br/poder-publico/modernizacao-gestao/sinapi', 'Custos de construção civil'),
    ('CONAB — Tabela de Preços MG', 'CONAB', 'conab', 'https://www.conab.gov.br', 'Preços de gêneros alimentícios'),
    ('CEASA-MG — Central de Abastecimento', 'CEASA-MG', 'ceasa', 'https://www.ceasaminas.com.br', 'Cotações de hortifrúti e alimentos'),
    ('CMED/ANVISA — Preços de Medicamentos', 'CMED', 'cmed', 'https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos', 'Preços máximos de medicamentos (tabela CMED)'),
    ('Portais de Transparência', 'TRANSPARENCIA', 'transparencia', NULL, 'Contratos e atas de registro de preços de portais de transparência'),
    ('Diários Oficiais', 'DO', 'diario_oficial', NULL, 'Extratos de contratos publicados em Diários Oficiais'),
    ('Cotação Direta com Fornecedores', 'COTACAO', 'cotacao_direta', NULL, 'Cotações obtidas diretamente com fornecedores via módulo eletrônico');

-- Categorias
INSERT INTO categorias (nome, descricao, ordem) VALUES
    ('Gêneros Alimentícios', 'Arroz, feijão, açúcar, leite, carnes, óleos e demais gêneros', 1),
    ('Materiais de Higiene e Limpeza', 'Sabão, detergente, desinfetante, papel higiênico e afins', 2),
    ('Copa e Cozinha', 'Utensílios de copa, cozinha e refeitório', 3),
    ('Utensílios Domésticos', 'Vassoura, balde, pano de chão e similares', 4),
    ('Embalagens', 'Sacos, sacolas, bobinas, filme plástico', 5),
    ('Material de Expediente', 'Papel, caneta, lápis, grampo, envelope e demais', 6),
    ('Material Didático e Pedagógico', 'Livros, cadernos, materiais para sala de aula', 7),
    ('Material de Informática', 'Toner, cartuchos, periféricos, cabos e acessórios', 8),
    ('Material Esportivo', 'Bolas, redes, uniformes esportivos, equipamentos', 9),
    ('Material de Construção', 'Cimento, areia, brita, tijolo, telha e afins', 10),
    ('Material Elétrico e Eletrônico', 'Fios, cabos, lâmpadas, disjuntores, tomadas', 11),
    ('Material Hidráulico', 'Canos, conexões, válvulas, registros', 12),
    ('Medicamentos', 'Medicamentos de uso geral e especializado', 13),
    ('Materiais Farmacológicos', 'Insumos farmacêuticos e materiais de farmácia', 14),
    ('Material Hospitalar', 'Seringas, luvas, máscaras, equipamentos médicos', 15),
    ('Material Odontológico', 'Resinas, instrumentais, materiais de consumo odontológico', 16),
    ('Material Laboratorial', 'Reagentes, vidrarias, equipamentos de laboratório', 17),
    ('Material Veterinário', 'Medicamentos e insumos veterinários', 18),
    ('Combustíveis e Lubrificantes', 'Gasolina, diesel, etanol, óleos lubrificantes', 19),
    ('Pneus e Baterias Automotivas', 'Pneus, câmaras de ar, baterias para veículos', 20);

-- Unidades de medida
INSERT INTO unidades_medida (sigla, descricao) VALUES
    ('UN', 'Unidade'), ('KG', 'Quilograma'), ('G', 'Grama'), ('MG', 'Miligrama'),
    ('L', 'Litro'), ('ML', 'Mililitro'), ('M', 'Metro'), ('M²', 'Metro Quadrado'),
    ('M³', 'Metro Cúbico'), ('CM', 'Centímetro'), ('MM', 'Milímetro'),
    ('CX', 'Caixa'), ('PCT', 'Pacote'), ('FD', 'Fardo'), ('SC', 'Saco'),
    ('DZ', 'Dúzia'), ('RL', 'Rolo'), ('FR', 'Frasco'), ('TB', 'Tubo'),
    ('GL', 'Galão'), ('BD', 'Balde'), ('CT', 'Cartela'), ('BL', 'Blister'),
    ('AMP', 'Ampola'), ('CP', 'Comprimido'), ('CAP', 'Cápsula'), ('PAR', 'Par'),
    ('JG', 'Jogo'), ('KIT', 'Kit'), ('TN', 'Tonelada'), ('LT', 'Lata'),
    ('PT', 'Pote'), ('BB', 'Bobina'), ('RS', 'Resma'), ('FL', 'Folha'),
    ('VD', 'Vidro'), ('HR', 'Hora'), ('DIA', 'Diária'), ('MES', 'Mensal'),
    ('SV', 'Serviço');

-- Planos padrão (billing Asaas)
INSERT INTO planos (nome, titulo, descricao, preco_mensal, preco_anual, limite_usuarios, limite_cestas, limite_cotacoes_mes, funcionalidades) VALUES
    ('gratuito', 'Gratuito', 'Ideal para conhecer a plataforma', 0, 0, 3, 5, 10,
     '["catalogo","cestas_basico","pesquisa_rapida"]'),
    ('basico', 'Básico', 'Para municípios de pequeno porte', 14900, 149000, 10, 30, 50,
     '["catalogo","cestas_basico","pesquisa_rapida","cotacoes","fornecedores","relatorios"]'),
    ('profissional', 'Profissional', 'Para municípios de médio porte', 29900, 299000, 30, 100, 200,
     '["catalogo","cestas_basico","pesquisa_rapida","cotacoes","fornecedores","relatorios","comparador","templates","historico","mapa_calor","alertas","sicom","ia","ocr"]'),
    ('enterprise', 'Enterprise', 'Para grandes municípios e consórcios', 59900, 599000, 999, 999, 999,
     '["catalogo","cestas_basico","pesquisa_rapida","cotacoes","fornecedores","relatorios","comparador","templates","historico","mapa_calor","alertas","sicom","ia","ocr","api_rest","suporte_prioritario","sla_99_9"]');
