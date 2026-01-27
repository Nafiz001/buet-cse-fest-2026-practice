# Multi-stage build for Ambulance Service
FROM node:20-alpine AS deps

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production && \
    npm cache clean --force

RUN npx prisma generate

FROM node:20-alpine AS runner

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 ambulanceuser

COPY --from=deps --chown=ambulanceuser:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=ambulanceuser:nodejs /app/package*.json ./

COPY --chown=ambulanceuser:nodejs ./src ./src
COPY --chown=ambulanceuser:nodejs ./prisma ./prisma

ENV NODE_ENV=production
ENV PORT=3002

USER ambulanceuser

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "src/server.js"]
