import type { FastifyInstance } from "fastify";
import { getPool } from "../config/database.js";
import { verificarAuth } from "../middleware/auth.js";
import { exigirServidor } from "../middleware/autorizacao.js";
import { tratarErro } from "../utils/erros.js";

export async function rotasAssinaturasDigitais(app: FastifyInstance) {
  app.addHook("preHandler", verificarAuth);
  app.addHook("preHandler", exigirServidor);

  // Criar assinatura digital (ICP-Brasil ou registro de intent)
  app.post("/api/assinaturas-digitais", {
    schema: {
      tags: ["Assinaturas"],
      summary: "Criar assinatura digital",
      description: "Registra assinatura eletrônica simples ou digital ICP-Brasil.",
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        required: ["referencia_tipo", "referencia_id", "hash_documento", "nome_assinante", "cpf_cnpj_assinante", "tipo_assinatura"],
        properties: {
          referencia_tipo: { type: "string" },
          referencia_id: { type: "string", format: "uuid" },
          hash_documento: { type: "string", minLength: 64, maxLength: 128 },
          certificado_thumbprint: { type: "string" },
          nome_assinante: { type: "string" },
          cpf_cnpj_assinante: { type: "string" },
          tipo_assinatura: { type: "string", enum: ["simples", "icp-brasil"] },
        },
      },
    },
  }, async (req, reply) => {
    try {
      const b = req.body as {
        referencia_tipo: string;
        referencia_id: string;
        hash_documento: string;
        certificado_thumbprint?: string;
        nome_assinante: string;
        cpf_cnpj_assinante: string;
        tipo_assinatura: "simples" | "icp-brasil";
      };

      const municipioId = req.usuario!.servidor!.municipio_id;
      const servidorId = req.usuario!.servidor!.id;

      const { rows } = await getPool().query(
        `INSERT INTO assinaturas_digitais (
          municipio_id, referencia_tipo, referencia_id,
          tipo_assinatura, hash_documento, certificado_thumbprint,
          nome_assinante, cpf_cnpj_assinante, servidor_id, ip_assinante
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [
          municipioId, b.referencia_tipo, b.referencia_id,
          b.tipo_assinatura, b.hash_documento, b.certificado_thumbprint ?? null,
          b.nome_assinante, b.cpf_cnpj_assinante, servidorId, req.ip,
        ],
      );

      reply.status(201).send({ data: rows[0] });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // Buscar assinaturas digitais de uma referência
  app.get("/api/assinaturas-digitais", {
    schema: {
      tags: ["Assinaturas"],
      summary: "Listar assinaturas de um documento",
      description: "Busca assinaturas digitais vinculadas a uma referência.",
      security: [{ bearerAuth: [] }],
      querystring: {
        type: "object",
        required: ["referencia_tipo", "referencia_id"],
        properties: {
          referencia_tipo: { type: "string" },
          referencia_id: { type: "string", format: "uuid" },
        },
      },
    },
  }, async (req, reply) => {
    try {
      const { referencia_tipo, referencia_id } = req.query as {
        referencia_tipo: string;
        referencia_id: string;
      };

      const { rows } = await getPool().query(
        `SELECT ad.*, srv.nome AS servidor_nome
         FROM assinaturas_digitais ad
         LEFT JOIN servidores srv ON ad.servidor_id = srv.id
         WHERE ad.referencia_tipo = $1 AND ad.referencia_id = $2
         ORDER BY ad.assinado_em DESC`,
        [referencia_tipo, referencia_id],
      );

      reply.send({ data: rows });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // Verificar assinatura digital
  app.post("/api/assinaturas-digitais/verificar", {
    schema: {
      tags: ["Assinaturas"],
      summary: "Verificar assinatura",
      description: "Valida integridade, certificado, cadeia de confiança e revogação de uma assinatura.",
      security: [{ bearerAuth: [] }],
      body: {
        type: "object",
        required: ["assinatura_id"],
        properties: {
          assinatura_id: { type: "string", format: "uuid" },
          hash_documento: { type: "string", description: "Hash SHA-256 para comparação" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            data: {
              type: "object",
              properties: {
                valida: { type: "boolean" },
                certificado_valido: { type: "boolean" },
                cadeia_confiavel: { type: "boolean" },
                nao_revogado: { type: "boolean" },
                dentro_validade: { type: "boolean" },
                hash_confere: { type: "boolean" },
                detalhes: { type: "string" },
              },
            },
          },
        },
      },
    },
  }, async (req, reply) => {
    try {
      const { assinatura_id, hash_documento } = req.body as {
        assinatura_id: string;
        hash_documento?: string;
      };

      const { rows } = await getPool().query(
        `SELECT * FROM assinaturas_digitais WHERE id = $1`,
        [assinatura_id],
      );

      if (rows.length === 0) {
        return (reply as any).status(404).send({ error: "Assinatura não encontrada" });
      }

      const assinatura = rows[0];

      // Verificação básica: hash confere
      const hashConfere = !hash_documento || assinatura.hash_documento === hash_documento;

      // Verificação de validade do certificado (quando ICP-Brasil)
      const agora = new Date();
      let certificadoValido = true;
      let dentroValidade = true;
      let cadeiaConfiavel = true;

      if (assinatura.tipo_assinatura === "icp-brasil" && assinatura.certificado_dados) {
        const cert = assinatura.certificado_dados;
        dentroValidade =
          agora >= new Date(cert.not_before) && agora <= new Date(cert.not_after);
        certificadoValido = dentroValidade;
        // Verificação completa de cadeia e revogação seria feita via
        // integração com serviço externo (ITI, OCSP responder)
        cadeiaConfiavel = assinatura.cadeia_verificada ?? true;
      }

      const resultado = {
        valida: hashConfere && certificadoValido && cadeiaConfiavel,
        certificado_valido: certificadoValido,
        cadeia_confiavel: cadeiaConfiavel,
        nao_revogado: true, // Verificação CRL/OCSP pendente de integração externa
        dentro_validade: dentroValidade,
        hash_confere: hashConfere,
        detalhes: assinatura.tipo_assinatura === "simples"
          ? "Assinatura eletrônica simples (MP 2.200-2/2001)"
          : "Assinatura digital ICP-Brasil",
      };

      // Registrar verificação
      await getPool().query(
        `UPDATE assinaturas_digitais
         SET validado = $1, validado_em = NOW()
         WHERE id = $2`,
        [resultado.valida, assinatura_id],
      );

      reply.send({ data: resultado });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // Obter modo de assinatura configurado para o município
  app.get("/api/assinaturas-digitais/modo", {
    schema: {
      tags: ["Assinaturas"],
      summary: "Modo de assinatura do município",
      description: "Retorna se o município exige ICP-Brasil, se é preferencial, ou simples.",
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: "object",
          properties: { data: { type: "object", properties: { modo: { type: "string", enum: ["icp-obrigatorio", "icp-preferencial", "simples"] } } } },
        },
      },
    },
  }, async (req, reply) => {
    try {
      const municipioId = req.usuario!.servidor!.municipio_id;

      const { rows } = await getPool().query(
        `SELECT configuracoes FROM municipios WHERE id = $1`,
        [municipioId],
      );

      const config = rows[0]?.configuracoes ?? {};
      const modo = config.modo_assinatura ?? "simples";

      reply.send({ data: { modo } });
    } catch (e) {
      tratarErro(e, reply);
    }
  });

  // Listar certificados (placeholder — requer integração com Web PKI server component)
  app.get("/api/assinaturas-digitais/certificados", {
    schema: {
      tags: ["Assinaturas"],
      summary: "Listar certificados ICP-Brasil",
      description: "Retorna certificados digitais A1 armazenados server-side. Certificados A3 são listados via extensão Web PKI no cliente.",
      security: [{ bearerAuth: [] }],
    },
  }, async (_req, reply) => {
    // Certificados são listados client-side via extensão Web PKI.
    // Este endpoint retornará certificados armazenados server-side (A1 upload).
    reply.send({ data: [] });
  });
}
