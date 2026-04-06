# ── Build ──────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

# ── Runtime ────────────────────────────────────
FROM node:22-alpine
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app/package.json /app/package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=builder /app/dist ./dist
USER appuser
EXPOSE 8080
ENV NODE_ENV=production PORT=8080
CMD ["node", "dist/index.js"]
