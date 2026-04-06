// Firebase Messaging Service Worker
// Este arquivo deve estar em /public/ para ser registrado pelo navegador

/* eslint-env serviceworker */
/* global importScripts, firebase */

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// Configuração Firebase (será substituída em build via env)
firebase.initializeApp({
  apiKey: "VITE_FIREBASE_API_KEY",
  authDomain: "VITE_FIREBASE_AUTH_DOMAIN",
  projectId: "VITE_FIREBASE_PROJECT_ID",
  storageBucket: "VITE_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "VITE_FIREBASE_MESSAGING_SENDER_ID",
  appId: "VITE_FIREBASE_APP_ID",
});

const messaging = firebase.messaging();

// Handler para mensagens em background
messaging.onBackgroundMessage(function (payload) {
  const title = payload.notification?.title || "LicitaNest";
  const options = {
    body: payload.notification?.body || "",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    data: payload.data,
    tag: payload.data?.tag || "licitanest-notification",
  };

  self.registration.showNotification(title, options);
});

// Click handler — abrir a URL da notificação
self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
