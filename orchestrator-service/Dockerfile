# Multi-stage build for Orchestrator Service
FROM node:20-alpine AS deps
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 orchestratoruser

COPY --from=deps --chown=orchestratoruser:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=orchestratoruser:nodejs /app/package*.json ./
COPY --chown=orchestratoruser:nodejs ./src ./src

USER orchestratoruser

EXPOSE 3005

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3005/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "src/server.js"]
