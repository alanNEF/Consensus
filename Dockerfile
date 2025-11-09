# Use Node.js 20 LTS with Debian (better for Python/ML dependencies)
FROM node:20-slim AS base

# Install dependencies only when needed
FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci

# Install Python dependencies (using Debian base for better PyTorch support)
FROM python:3.11-slim AS python-deps
WORKDIR /app/python

# Install system dependencies for PyTorch
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY python/requirements.txt ./

# Install PyTorch CPU-only first (much smaller and faster to install)
# Then install other requirements (pip will skip torch if already installed with matching version)
RUN pip install --no-cache-dir --upgrade pip && \
    python3 -m venv venv && \
    ./venv/bin/pip install --no-cache-dir --upgrade pip && \
    ./venv/bin/pip install --no-cache-dir torch==2.9.0 --index-url https://download.pytorch.org/whl/cpu && \
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

# Install Python runtime for production
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Python virtual environment and source files
COPY --from=python-deps --chown=nextjs:nodejs /app/python/venv ./python/venv
COPY --from=builder --chown=nextjs:nodejs /app/python/src ./python/src
# Copy pyproject.toml if it exists (optional - wildcard handles missing file)
COPY --from=builder --chown=nextjs:nodejs /app/python/pyproject.toml* ./python/

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

