import admin from "firebase-admin";

let app: admin.app.App;

export function inicializarFirebase(): admin.app.App {
  if (app) return app;
  app = admin.initializeApp({
    projectId: process.env.GCP_PROJECT || "sistema-de-gestao-16e15",
  });
  return app;
}

export function getAuth(): admin.auth.Auth {
  return admin.auth(app);
}
