# ═══════════════════════════════════════════════════════════════
# LicitaNest — Docker Multi-Stage Build
# Otimizado para Google Cloud Run
# ═══════════════════════════════════════════════════════════════

# ── Stage 1: Build ──────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Instalar dependências (cache layer)
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Copiar source e buildar
COPY . .
RUN npm run build

# ── Stage 2: Serve ──────────────────────────────────────────
FROM nginx:1.27-alpine AS production

# Criar diretórios necessários com permissões adequadas para non-root
RUN chown -R nginx:nginx /var/cache/nginx /var/log/nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && chown nginx:nginx /var/run/nginx.pid

# Configuração nginx otimizada para SPA
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf

# Rodar como non-root (hardening)
USER nginx

# Security headers via nginx config
# Porta padrão Cloud Run
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/ || exit 1

# Nginx já roda como daemon off por padrão no container
CMD ["nginx", "-g", "daemon off;"]
