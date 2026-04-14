-- ────────────────────────────────────────────────────────────
-- 33. Regras de alerta padrão do monitoramento
-- ────────────────────────────────────────────────────────────

INSERT INTO superadmin.regras_alerta (nome, condicao, parametros, ativo, canais)
VALUES
  ('Erros críticos por hora', 'erros_criticos_hora', '{"limite": 5}', true, '["in_app"]'),
  ('Serviço down', 'health_down', '{"minutos": 5}', true, '["in_app"]'),
  ('Latência alta da API', 'latencia_alta', '{"limite_ms": 2000}', true, '["in_app"]'),
  ('Memória alta', 'memoria_alta', '{"limite_mb": 512}', true, '["in_app"]'),
  ('Pool DB saturado', 'pool_esgotado', '{"limite_waiting": 5}', true, '["in_app"]'),
  ('Erros totais por hora', 'erros_totais_hora', '{"limite": 50}', true, '["in_app"]')
ON CONFLICT DO NOTHING;
