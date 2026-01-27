# Multi-stage build for Hospital Service
# Stage 1: Dependencies
FROM node:20-alpine AS deps

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Generate Prisma Client
RUN npx prisma generate

# Stage 2: Production image
FROM node:20-alpine AS runner

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Add non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 hospitaluser

# Copy dependencies and generated Prisma Client
COPY --from=deps --chown=hospitaluser:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=hospitaluser:nodejs /app/package*.json ./

# Copy application code
COPY --chown=hospitaluser:nodejs ./src ./src
COPY --chown=hospitaluser:nodejs ./prisma ./prisma

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Switch to non-root user
USER hospitaluser

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "src/server.js"]
