# Multi-stage build for Next.js
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --production=false

FROM node:20-alpine AS builder
WORKDIR /app

# Accept build arguments for Next.js environment variables
ARG NEXT_PUBLIC_HOSPITAL_API_URL
ARG NEXT_PUBLIC_AMBULANCE_API_URL
ARG NEXT_PUBLIC_REQUEST_API_URL

# Set as environment variables for Next.js build
ENV NEXT_PUBLIC_HOSPITAL_API_URL=$NEXT_PUBLIC_HOSPITAL_API_URL
ENV NEXT_PUBLIC_AMBULANCE_API_URL=$NEXT_PUBLIC_AMBULANCE_API_URL
ENV NEXT_PUBLIC_REQUEST_API_URL=$NEXT_PUBLIC_REQUEST_API_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
