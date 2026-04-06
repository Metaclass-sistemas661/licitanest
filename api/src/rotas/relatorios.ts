import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { exigirServidor } from "../middleware/autorizacao.js";
import { tratarErro } from "../utils/erros.js";

export async function rotasRelatorios(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  // GET /api/relatorios
  app.get("/api/relatorios", async (req, reply) => {
    try {
      const { cesta_id } = req.query as { cesta_id?: string };
      const params: unknown[] = [];
      let where = `1=1`;
      if (cesta_id) { params.push(cesta_id); where += ` AND rg.cesta_id = $${params.length}`; }
      const { rows } = await getPool().query(
        `SELECT rg.*, srv.nome AS gerado_por_nome
         FROM relatorios_gerados rg
         LEFT JOIN servidores srv ON rg.gerado_por = srv.id
         WHERE ${where} ORDER BY rg.criado_em DESC`,
        params,
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/relatorios
  app.post("/api/relatorios", async (req, reply) => {
    try {
      const b = req.body as {
        cesta_id: string; tipo: string; formato: string;
        gerado_por: string; nome_arquivo: string;
      };
      const { rows } = await getPool().query(
        `INSERT INTO relatorios_gerados (cesta_id, tipo, formato, gerado_por, nome_arquivo)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [b.cesta_id, b.tipo, b.formato, b.gerado_por, b.nome_arquivo],
      );
      reply.status(201).send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });
}

export async function rotasHistorico(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  // GET /api/precos/historico/:produtoId
  app.get("/api/precos/historico/:produtoId", async (req, reply) => {
    try {
      const { produtoId } = req.params as { produtoId: string };
      const { meses = "12" } = req.query as { meses?: string };
      const { rows } = await getPool().query(
        `SELECT pi.*, f.nome AS fonte_nome, f.tipo AS fonte_tipo,
                ic.cesta_id, pc.descricao AS produto_descricao
         FROM precos_item pi
         JOIN itens_cesta ic ON pi.item_cesta_id = ic.id
         JOIN cestas c ON c.id = ic.cesta_id
         JOIN secretarias sec ON sec.id = c.secretaria_id
         JOIN produtos_catalogo pc ON ic.produto_id = pc.id
         LEFT JOIN fontes f ON pi.fonte_id = f.id
         WHERE ic.produto_id = $1
           AND sec.municipio_id = $3
           AND pi.data_coleta >= NOW() - INTERVAL '1 month' * $2
         ORDER BY pi.data_coleta DESC`,
        [produtoId, parseInt(meses), req.usuario!.servidor!.municipio_id],
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });
}
