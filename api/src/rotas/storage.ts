import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { exigirServidor } from "../middleware/autorizacao.js";
import { tratarErro } from "../utils/erros.js";
import { bucketDocs } from "../config/storage.js";

const TIPOS_PERMITIDOS = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
  "application/vnd.ms-excel", // xls
  "text/csv",
]);
const EXTENSOES_PERMITIDAS = new Set([".pdf", ".jpg", ".jpeg", ".png", ".webp", ".xlsx", ".xls", ".csv"]);
const MAX_TAMANHO = 10 * 1024 * 1024; // 10 MB
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validarArquivo(mimetype: string, filename: string, tamanho: number): string | null {
  if (!TIPOS_PERMITIDOS.has(mimetype)) return `Tipo de arquivo não permitido: ${mimetype}`;
  const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();
  if (!EXTENSOES_PERMITIDAS.has(ext)) return `Extensão não permitida: ${ext}`;
  if (tamanho > MAX_TAMANHO) return `Arquivo muito grande (máx ${MAX_TAMANHO / 1024 / 1024}MB)`;
  // Bloquear path traversal no nome do arquivo
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) return "Nome de arquivo inválido";
  return null;
}

export async function rotasStorage(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  // POST /api/documentos/upload
  app.post("/api/documentos/upload", async (req, reply) => {
    try {
      const data = await req.file();
      if (!data) return reply.status(400).send({ error: "Arquivo não enviado" });

      const { preco_item_id } = data.fields as unknown as { preco_item_id: { value: string } };
      const precoId = preco_item_id?.value;
      if (!precoId || !UUID_REGEX.test(precoId)) return reply.status(400).send({ error: "preco_item_id inválido" });

      const buffer = await data.toBuffer();
      const erroValidacao = validarArquivo(data.mimetype, data.filename, buffer.length);
      if (erroValidacao) return reply.status(400).send({ error: erroValidacao });

      // Verificar acesso ao município do preço
      const { rows: acesso } = await getPool().query(
        `SELECT 1 FROM precos_item pi2
         JOIN itens_cesta ic ON ic.id = pi2.item_cesta_id
         JOIN cestas c ON c.id = ic.cesta_id
         JOIN secretarias sec ON sec.id = c.secretaria_id
         WHERE pi2.id = $1 AND sec.municipio_id = $2`,
        [precoId, req.usuario!.servidor!.municipio_id],
      );
      if (!acesso[0]) return reply.status(403).send({ error: "Sem acesso a este recurso" });

      const safeFilename = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `documentos/${precoId}/${Date.now()}_${safeFilename}`;
      const file = bucketDocs.file(storagePath);
      await file.save(buffer, { contentType: data.mimetype });

      const { rows } = await getPool().query(
        `INSERT INTO documentos_comprobatorios (preco_item_id, nome_arquivo, tipo_arquivo, tamanho, storage_path)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [precoId, data.filename, data.mimetype, buffer.length, storagePath],
      );
      reply.status(201).send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // POST /api/precos/:precoItemId/documentos — alias de upload por preço
  app.post("/api/precos/:precoItemId/documentos", async (req, reply) => {
    try {
      const { precoItemId } = req.params as { precoItemId: string };
      if (!UUID_REGEX.test(precoItemId)) return reply.status(400).send({ error: "precoItemId inválido" });

      const fileData = await req.file();
      if (!fileData) return reply.status(400).send({ error: "Arquivo não enviado" });

      const buffer = await fileData.toBuffer();
      const erroValidacao = validarArquivo(fileData.mimetype, fileData.filename, buffer.length);
      if (erroValidacao) return reply.status(400).send({ error: erroValidacao });

      // Verificar acesso ao município do preço
      const { rows: acesso } = await getPool().query(
        `SELECT 1 FROM precos_item pi2
         JOIN itens_cesta ic ON ic.id = pi2.item_cesta_id
         JOIN cestas c ON c.id = ic.cesta_id
         JOIN secretarias sec ON sec.id = c.secretaria_id
         WHERE pi2.id = $1 AND sec.municipio_id = $2`,
        [precoItemId, req.usuario!.servidor!.municipio_id],
      );
      if (!acesso[0]) return reply.status(403).send({ error: "Sem acesso a este recurso" });

      const safeFilename = fileData.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `documentos/${precoItemId}/${Date.now()}_${safeFilename}`;
      const file = bucketDocs.file(storagePath);
      await file.save(buffer, { contentType: fileData.mimetype });

      const { rows } = await getPool().query(
        `INSERT INTO documentos_comprobatorios (preco_item_id, nome_arquivo, tipo_arquivo, tamanho, storage_path)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [precoItemId, fileData.filename, fileData.mimetype, buffer.length, storagePath],
      );
      reply.status(201).send({ data: rows[0] });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/documentos/:id/download
  app.get("/api/documentos/:id/download", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const { rows } = await getPool().query(
        `SELECT * FROM documentos_comprobatorios WHERE id = $1`, [id],
      );
      if (!rows[0]) return reply.status(404).send({ error: "Documento não encontrado" });

      const [url] = await bucketDocs.file(rows[0].storage_path).getSignedUrl({
        action: "read",
        expires: Date.now() + 15 * 60 * 1000, // 15 min
      });
      reply.send({ url });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/documentos/url?path=...&expiresIn=... — signed URL por storage_path
  app.get("/api/documentos/url", async (req, reply) => {
    try {
      const { path, expiresIn } = req.query as { path?: string; expiresIn?: string };
      if (!path) return reply.status(400).send({ error: "Parâmetro 'path' obrigatório" });

      const expireMs = parseInt(expiresIn || "3600") * 1000;
      const [signedUrl] = await bucketDocs.file(path).getSignedUrl({
        action: "read",
        expires: Date.now() + Math.min(expireMs, 7 * 24 * 60 * 60 * 1000), // max 7 dias
      });
      reply.send({ data: { signedUrl, url: signedUrl } });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/documentos/download?path=... — download URL por storage_path
  app.get("/api/documentos/download", async (req, reply) => {
    try {
      const { path } = req.query as { path?: string };
      if (!path) return reply.status(400).send({ error: "Parâmetro 'path' obrigatório" });

      const [downloadUrl] = await bucketDocs.file(path).getSignedUrl({
        action: "read",
        expires: Date.now() + 15 * 60 * 1000,
      });
      reply.send({ data: { downloadUrl } });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/documentos/preco/:precoItemId
  app.get("/api/documentos/preco/:precoItemId", async (req, reply) => {
    try {
      const { precoItemId } = req.params as { precoItemId: string };
      const { rows } = await getPool().query(
        `SELECT * FROM documentos_comprobatorios WHERE preco_item_id = $1 ORDER BY criado_em`, [precoItemId],
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/precos/:precoItemId/documentos — alias de listagem por preço
  app.get("/api/precos/:precoItemId/documentos", async (req, reply) => {
    try {
      const { precoItemId } = req.params as { precoItemId: string };
      const { rows } = await getPool().query(
        `SELECT * FROM documentos_comprobatorios WHERE preco_item_id = $1 ORDER BY criado_em`, [precoItemId],
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  // GET /api/documentos/cesta/:cestaId — listar documentos de toda a cesta
  app.get("/api/documentos/cesta/:cestaId", async (req, reply) => {
    try {
      const { cestaId } = req.params as { cestaId: string };
      const { rows } = await getPool().query(
        `SELECT dc.*, ic.descricao AS item_descricao, fp.nome AS fonte_nome
         FROM documentos_comprobatorios dc
         JOIN precos_item pi2 ON pi2.id = dc.preco_item_id
         JOIN itens_cesta ic ON ic.id = pi2.item_cesta_id
         LEFT JOIN fontes_preco fp ON fp.id = pi2.fonte_id
         WHERE ic.cesta_id = $1
         ORDER BY ic.ordem, dc.criado_em`,
        [cestaId],
      );
      reply.send({ data: rows });
    } catch (e) { tratarErro(e, reply); }
  });

  // DELETE /api/documentos/:id
  app.delete("/api/documentos/:id", async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const { rows } = await getPool().query(
        `SELECT storage_path FROM documentos_comprobatorios WHERE id = $1`, [id],
      );
      if (rows[0]) {
        await bucketDocs.file(rows[0].storage_path).delete().catch(() => {});
        await getPool().query(`DELETE FROM documentos_comprobatorios WHERE id = $1`, [id]);
      }
      reply.status(204).send();
    } catch (e) { tratarErro(e, reply); }
  });
}
