# Multi-stage build for Emergency Request Service
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
    adduser --system --uid 1001 emergencyuser

COPY --from=deps --chown=emergencyuser:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=emergencyuser:nodejs /app/package*.json ./

COPY --chown=emergencyuser:nodejs ./src ./src
COPY --chown=emergencyuser:nodejs ./prisma ./prisma
COPY --chown=emergencyuser:nodejs ./entrypoint.sh ./entrypoint.sh

# Make entrypoint executable
USER root
RUN chmod +x ./entrypoint.sh
USER emergencyuser

ENV NODE_ENV=production
ENV PORT=3004

EXPOSE 3004

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3004/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["sh", "./entrypoint.sh"]
