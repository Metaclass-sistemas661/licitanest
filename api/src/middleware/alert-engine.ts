import { getPool } from "../config/database.js";

interface RegraAlerta {
  id: string;
  nome: string;
  condicao: string;
  parametros: Record<string, unknown>;
  ativo: boolean;
}

/**
 * Motor de alertas — avalia regras periodicamente e cria alertas no banco.
 */
export function iniciarMotorAlertas(intervaloMs = 300_000): ReturnType<typeof setInterval> {
  const timer = setInterval(async () => {
    try {
      await avaliarRegras();
    } catch (err) {
      console.error("[alert-engine] Falha ao avaliar regras:", err);
    }
  }, intervaloMs);

  // Primeira execução após 30s (esperar sistema estabilizar)
  setTimeout(() => avaliarRegras().catch(() => {}), 30_000);

  return timer;
}

async function avaliarRegras(): Promise<void> {
  const pool = getPool();
  const { rows: regras } = await pool.query<RegraAlerta>(
    `SELECT id, nome, condicao, parametros, ativo FROM superadmin.regras_alerta WHERE ativo = true`,
  );

  for (const regra of regras) {
    try {
      const alerta = await avaliarRegra(regra);
      if (alerta) {
        // Verificar se já existe alerta recente (últimas 2h) para a mesma regra
        const { rows: existente } = await pool.query(
          `SELECT 1 FROM superadmin.alertas
           WHERE regra_id = $1 AND created_at > now() - INTERVAL '2 hours'
           LIMIT 1`,
          [regra.id],
        );
        if (existente.length > 0) continue; // Não duplicar

        await pool.query(
          `INSERT INTO superadmin.alertas (regra_id, severidade, titulo, descricao, referencia_tipo, referencia_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            regra.id,
            alerta.severidade,
            alerta.titulo,
            alerta.descricao,
            alerta.referencia_tipo ?? null,
            alerta.referencia_id ?? null,
          ],
        );
      }
    } catch (err) {
      console.error(`[alert-engine] Erro ao avaliar regra "${regra.nome}":`, err);
    }
  }
}

interface AlertaGerado {
  severidade: string;
  titulo: string;
  descricao: string;
  referencia_tipo?: string;
  referencia_id?: string;
}

async function avaliarRegra(regra: RegraAlerta): Promise<AlertaGerado | null> {
  const pool = getPool();
  const params = regra.parametros;

  switch (regra.condicao) {
    case "erros_criticos_hora": {
      const limite = (params.limite as number) ?? 5;
      const { rows } = await pool.query(
        `SELECT COUNT(*) as c FROM superadmin.erros_sistema
         WHERE severidade = 'critical' AND resolvido = false
           AND ultima_ocorrencia > now() - INTERVAL '1 hour'`,
      );
      const total = parseInt(rows[0].c);
      if (total >= limite) {
        return {
          severidade: "critical",
          titulo: `${total} erros críticos na última hora`,
          descricao: `Detectados ${total} erros críticos não resolvidos na última hora (limite: ${limite}).`,
          referencia_tipo: "erros",
        };
      }
      break;
    }

    case "health_down": {
      const minutos = (params.minutos as number) ?? 5;
      const { rows } = await pool.query(
        `SELECT servico, COUNT(*) as downs FROM superadmin.health_checks
         WHERE status = 'down' AND verificado_em > now() - ($1 || ' minutes')::INTERVAL
         GROUP BY servico HAVING COUNT(*) >= 2`,
        [minutos],
      );
      if (rows.length > 0) {
        const servicos = rows.map((r: { servico: string }) => r.servico).join(", ");
        return {
          severidade: "critical",
          titulo: `Serviço(s) down: ${servicos}`,
          descricao: `Os serviços ${servicos} estão down há mais de ${minutos} minutos.`,
          referencia_tipo: "saude",
        };
      }
      break;
    }

    case "latencia_alta": {
      const limiteMs = (params.limite_ms as number) ?? 2000;
      const { rows } = await pool.query(
        `SELECT valor, labels FROM superadmin.metricas_sistema
         WHERE tipo = 'api_latencia_media' AND timestamp > now() - INTERVAL '10 minutes'
         ORDER BY timestamp DESC LIMIT 1`,
      );
      if (rows.length > 0 && rows[0].valor > limiteMs) {
        return {
          severidade: "warning",
          titulo: `Latência alta: ${Math.round(rows[0].valor)}ms`,
          descricao: `A latência média da API está em ${Math.round(rows[0].valor)}ms (limite: ${limiteMs}ms).`,
          referencia_tipo: "metricas",
        };
      }
      break;
    }

    case "memoria_alta": {
      const limiteMb = (params.limite_mb as number) ?? 512;
      const { rows } = await pool.query(
        `SELECT valor FROM superadmin.metricas_sistema
         WHERE tipo = 'memoria_rss' AND timestamp > now() - INTERVAL '10 minutes'
         ORDER BY timestamp DESC LIMIT 1`,
      );
      if (rows.length > 0 && rows[0].valor > limiteMb) {
        return {
          severidade: "warning",
          titulo: `Memória alta: ${Math.round(rows[0].valor)}MB`,
          descricao: `O uso de memória RSS está em ${Math.round(rows[0].valor)}MB (limite: ${limiteMb}MB).`,
          referencia_tipo: "metricas",
        };
      }
      break;
    }

    case "pool_esgotado": {
      const limiteWaiting = (params.limite_waiting as number) ?? 5;
      const { rows } = await pool.query(
        `SELECT valor, labels FROM superadmin.metricas_sistema
         WHERE tipo = 'db_pool_total' AND timestamp > now() - INTERVAL '10 minutes'
         ORDER BY timestamp DESC LIMIT 1`,
      );
      if (rows.length > 0) {
        const waiting = (rows[0].labels as { waiting?: number })?.waiting ?? 0;
        if (waiting >= limiteWaiting) {
          return {
            severidade: "critical",
            titulo: `Pool DB saturado: ${waiting} esperando`,
            descricao: `Há ${waiting} queries aguardando conexão no pool (limite: ${limiteWaiting}).`,
            referencia_tipo: "metricas",
          };
        }
      }
      break;
    }

    case "erros_totais_hora": {
      const limite = (params.limite as number) ?? 50;
      const { rows } = await pool.query(
        `SELECT COUNT(*) as c FROM superadmin.erros_sistema
         WHERE resolvido = false AND ultima_ocorrencia > now() - INTERVAL '1 hour'`,
      );
      const total = parseInt(rows[0].c);
      if (total >= limite) {
        return {
          severidade: "warning",
          titulo: `${total} erros não resolvidos na última hora`,
          descricao: `Detectados ${total} erros não resolvidos na última hora (limite: ${limite}).`,
          referencia_tipo: "erros",
        };
      }
      break;
    }

    default:
      // Regra desconhecida — ignorar silenciosamente
      break;
  }

  return null;
}
