# --- Stage 1: Base Image ---
FROM node:20-alpine AS base

# --- Stage 2: Dependencies & Builder Image ---
FROM base AS builder
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy the rest of the code
COPY . .

# Next.js telemetry disable during build
ENV NEXT_TELEMETRY_DISABLED=1

# Build the app
RUN npm run build

# --- Stage 3: Production Image ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
# Next.js telemetry disable during runtime
ENV NEXT_TELEMETRY_DISABLED=1

# Add non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy public dir from builder
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next && chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size (requires output: 'standalone' in next.config.js)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# server.js is created by next build from the standalone output
CMD ["node", "server.js"]
