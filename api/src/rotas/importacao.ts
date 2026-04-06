import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { exigirServidor } from "../middleware/autorizacao.js";
import { tratarErro } from "../utils/erros.js";

export async function rotasImportacao(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  // POST /api/importacao/precos
  app.post("/api/importacao/precos", async (req, reply) => {
    try {
      const { cesta_id, linhas, servidor_id } = req.body as {
        cesta_id: string; servidor_id: string;
        linhas: { item_descricao: string; fonte_tipo: string; valor: number; data_coleta: string; referencia?: string }[];
      };

      const pool = getPool();
      const { rows: [importacao] } = await pool.query(
        `INSERT INTO importacoes_lote (tipo, status, total_registros, servidor_id, dados_originais)
         VALUES ('precos', 'processando', $1, $2, $3) RETURNING *`,
        [linhas.length, servidor_id, JSON.stringify({ cesta_id })],
      );

      let sucesso = 0;
      let erros = 0;
      for (const linha of linhas) {
        try {
          // Buscar item por descrição
          const { rows: itens } = await pool.query(
            `SELECT ic.id FROM itens_cesta ic
             JOIN produtos_catalogo pc ON ic.produto_id = pc.id
             WHERE ic.cesta_id = $1 AND pc.descricao ILIKE $2 LIMIT 1`,
            [cesta_id, `%${linha.item_descricao}%`],
          );
          if (!itens[0]) { erros++; continue; }

          // Buscar fonte
          const { rows: fontes } = await pool.query(
            `SELECT id FROM fontes WHERE tipo = $1 LIMIT 1`, [linha.fonte_tipo],
          );

          await pool.query(
            `INSERT INTO precos_item (item_cesta_id, fonte_id, valor, data_coleta, referencia)
             VALUES ($1, $2, $3, $4, $5)`,
            [itens[0].id, fontes[0]?.id, linha.valor, linha.data_coleta, linha.referencia],
          );
          sucesso++;
        } catch {
          erros++;
        }
      }

      await pool.query(
        `UPDATE importacoes_lote SET status = 'concluido', registros_sucesso = $1, registros_erro = $2 WHERE id = $3`,
        [sucesso, erros, importacao.id],
      );

      reply.send({ data: { id: importacao.id, sucesso, erros, total: linhas.length } });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/importacao/:id
  app.get("/api/importacao/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const { rows } = await getPool().query(`SELECT * FROM importacoes_lote WHERE id = $1`, [id]);
      if (!rows[0]) return reply.status(404).send({ error: "Importação não encontrada" });
      reply.send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/importacao/sicom/:cestaId/itens — itens formatados para exportação SICOM
  app.get("/api/importacao/sicom/:cestaId/itens", async (req, reply) => {
    try {
      const { cestaId } = req.params as { cestaId: string };

      const { rows } = await getPool().query(
        `SELECT ic.id, ic.quantidade, ic.produto_id,
                json_build_object(
                  'descricao', pc.descricao,
                  'codigo_catmat', pc.codigo_catmat,
                  'unidade', COALESCE(um.sigla, pc.unidade, 'UN')
                ) AS produtos_catalogo,
                COALESCE(
                  json_agg(
                    json_build_object(
                      'valor_unitario', pi.valor_unitario,
                      'fornecedor', json_build_object(
                        'cnpj', f.cnpj,
                        'razao_social', f.razao_social
                      ),
                      'cotacao', json_build_object(
                        'fonte_referencia', fo.nome
                      )
                    )
                  ) FILTER (WHERE pi.id IS NOT NULL),
                  '[]'
                ) AS cotacoes_item
         FROM itens_cesta ic
         JOIN produtos_catalogo pc ON ic.produto_id = pc.id
         LEFT JOIN unidades_medida um ON pc.unidade_medida_id = um.id
         LEFT JOIN precos_item pi ON pi.item_cesta_id = ic.id AND pi.excluido_calculo = false
         LEFT JOIN fornecedores f ON pi.fornecedor_id = f.id
         LEFT JOIN fontes fo ON pi.fonte_id = fo.id
         WHERE ic.cesta_id = $1
         GROUP BY ic.id, ic.quantidade, ic.produto_id, pc.descricao, pc.codigo_catmat, pc.unidade, um.sigla
         ORDER BY pc.descricao`,
        [cestaId],
      );

      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });
}
