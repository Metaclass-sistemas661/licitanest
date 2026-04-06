import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { exigirServidor } from "../middleware/autorizacao.js";
import { tratarErro } from "../utils/erros.js";

export async function rotasComparador(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  // GET /api/comparador/cestas?cestaA=xxx&cestaB=yyy
  app.get("/api/comparador/cestas", async (req, reply) => {
    try {
      const { cestaA, cestaB } = req.query as { cestaA: string; cestaB: string };
      if (!cestaA || !cestaB) {
        return reply.status(400).send({ error: "Parâmetros cestaA e cestaB são obrigatórios" });
      }

      const pool = getPool();

      // Buscar dados das duas cestas
      const [resCestaA, resCestaB] = await Promise.all([
        pool.query(
          `SELECT c.id, c.descricao_objeto, c.data, c.status, c.secretaria_id,
                  s.nome AS secretaria_nome
           FROM cestas_precos c
           LEFT JOIN secretarias s ON c.secretaria_id = s.id
           WHERE c.id = $1`,
          [cestaA],
        ),
        pool.query(
          `SELECT c.id, c.descricao_objeto, c.data, c.status, c.secretaria_id,
                  s.nome AS secretaria_nome
           FROM cestas_precos c
           LEFT JOIN secretarias s ON c.secretaria_id = s.id
           WHERE c.id = $1`,
          [cestaB],
        ),
      ]);

      if (!resCestaA.rows[0] || !resCestaB.rows[0]) {
        return reply.status(404).send({ error: "Uma ou ambas as cestas não foram encontradas" });
      }

      // Buscar itens com produto e média de preços
      const [itensA, itensB] = await Promise.all([
        pool.query(
          `SELECT ic.id, ic.quantidade, ic.produto_id,
                  pc.descricao, pc.codigo_catmat, pc.unidade,
                  COALESCE(AVG(pi.valor_unitario), 0) AS preco_medio,
                  COUNT(pi.id) AS total_precos
           FROM itens_cesta ic
           JOIN produtos_catalogo pc ON ic.produto_id = pc.id
           LEFT JOIN precos_item pi ON pi.item_cesta_id = ic.id AND pi.excluido_calculo = false
           WHERE ic.cesta_id = $1
           GROUP BY ic.id, ic.quantidade, ic.produto_id, pc.descricao, pc.codigo_catmat, pc.unidade
           ORDER BY pc.descricao`,
          [cestaA],
        ),
        pool.query(
          `SELECT ic.id, ic.quantidade, ic.produto_id,
                  pc.descricao, pc.codigo_catmat, pc.unidade,
                  COALESCE(AVG(pi.valor_unitario), 0) AS preco_medio,
                  COUNT(pi.id) AS total_precos
           FROM itens_cesta ic
           JOIN produtos_catalogo pc ON ic.produto_id = pc.id
           LEFT JOIN precos_item pi ON pi.item_cesta_id = ic.id AND pi.excluido_calculo = false
           WHERE ic.cesta_id = $1
           GROUP BY ic.id, ic.quantidade, ic.produto_id, pc.descricao, pc.codigo_catmat, pc.unidade
           ORDER BY pc.descricao`,
          [cestaB],
        ),
      ]);

      // Comparar itens por produto_id
      const mapB = new Map(itensB.rows.map((i: any) => [i.produto_id, i]));
      const produtosA = new Set(itensA.rows.map((i: any) => i.produto_id));
      const produtosB = new Set(itensB.rows.map((i: any) => i.produto_id));

      const itensComparados = [];
      const produtosProcessados = new Set<string>();

      for (const itemA of itensA.rows) {
        const itemB = mapB.get(itemA.produto_id);
        produtosProcessados.add(itemA.produto_id);

        const precoA = Number(itemA.preco_medio);
        const precoB = itemB ? Number(itemB.preco_medio) : null;
        const diferenca = precoB !== null && precoA > 0
          ? ((precoB - precoA) / precoA) * 100
          : null;

        itensComparados.push({
          produto_id: itemA.produto_id,
          descricao: itemA.descricao,
          codigo_catmat: itemA.codigo_catmat,
          unidade: itemA.unidade,
          cestaA: { quantidade: itemA.quantidade, preco_medio: precoA, total_precos: Number(itemA.total_precos) },
          cestaB: itemB
            ? { quantidade: itemB.quantidade, preco_medio: precoB, total_precos: Number(itemB.total_precos) }
            : null,
          diferenca_percentual: diferenca !== null ? Math.round(diferenca * 100) / 100 : null,
          presente_em: itemB ? "ambas" : "apenas_a",
        });
      }

      // Itens exclusivos da cesta B
      for (const itemB of itensB.rows) {
        if (!produtosProcessados.has(itemB.produto_id)) {
          itensComparados.push({
            produto_id: itemB.produto_id,
            descricao: itemB.descricao,
            codigo_catmat: itemB.codigo_catmat,
            unidade: itemB.unidade,
            cestaA: null,
            cestaB: { quantidade: itemB.quantidade, preco_medio: Number(itemB.preco_medio), total_precos: Number(itemB.total_precos) },
            diferenca_percentual: null,
            presente_em: "apenas_b",
          });
        }
      }

      const itensComuns = itensComparados.filter((i) => i.presente_em === "ambas");
      const mediaA = itensA.rows.length > 0
        ? itensA.rows.reduce((s: number, i: any) => s + Number(i.preco_medio) * i.quantidade, 0)
        : 0;
      const mediaB = itensB.rows.length > 0
        ? itensB.rows.reduce((s: number, i: any) => s + Number(i.preco_medio) * i.quantidade, 0)
        : 0;

      reply.send({
        data: {
          cestaA: resCestaA.rows[0],
          cestaB: resCestaB.rows[0],
          itensComparados,
          resumo: {
            total_itens_a: itensA.rows.length,
            total_itens_b: itensB.rows.length,
            itens_comuns: itensComuns.length,
            itens_exclusivos_a: itensComparados.filter((i) => i.presente_em === "apenas_a").length,
            itens_exclusivos_b: itensComparados.filter((i) => i.presente_em === "apenas_b").length,
            diferenca_total_media: Math.round((mediaB - mediaA) * 100) / 100,
            diferenca_total_percentual: mediaA > 0 ? Math.round(((mediaB - mediaA) / mediaA) * 10000) / 100 : 0,
          },
        },
      });
    } catch (e) {
      tratarErro(e, reply);
    }
  });
}
