# Multi-stage build for Validation Service
FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production && \
    npm cache clean --force

FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 validationuser

COPY --from=deps --chown=validationuser:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=validationuser:nodejs /app/package*.json ./

COPY --chown=validationuser:nodejs ./src ./src

ENV NODE_ENV=production
ENV PORT=3003

USER validationuser

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3003/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "src/server.js"]
