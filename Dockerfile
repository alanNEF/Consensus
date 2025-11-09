# Use Node.js 20 LTS
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci

# Install Python dependencies
FROM base AS python-deps
WORKDIR /app/python
COPY python/requirements.txt ./
RUN apk add --no-cache python3 py3-pip g++ make && \
    python3 -m venv venv && \
    ./venv/bin/pip install --no-cache-dir --upgrade pip && \
    ./venv/bin/pip install --no-cache-dir -r requirements.txt

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set Python path for build
ENV PYTHON_PATH=/app/python/venv/bin/python3
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Python virtual environment and source files
COPY --from=python-deps --chown=nextjs:nodejs /app/python/venv ./python/venv
COPY --from=builder --chown=nextjs:nodejs /app/python/src ./python/src
COPY --from=builder --chown=nextjs:nodejs /app/python/pyproject.toml ./python/pyproject.toml

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

