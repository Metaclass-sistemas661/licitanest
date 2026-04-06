import { Storage } from "@google-cloud/storage";

const storage = new Storage({
  projectId: process.env.GCP_PROJECT || "sistema-de-gestao-16e15",
});

export const bucketDocs = storage.bucket("licitanest-docs-gov");
export const bucketRelatorios = storage.bucket("licitanest-relatorios");

export { storage };
