# --- Build Stage ---
FROM oven/bun:1-alpine AS builder

# Accept build-time arguments
ARG NODE_ENV

# Convert build args to environment variables
ENV NODE_ENV=$NODE_ENV
ENV HOSTNAME="0.0.0.0"

WORKDIR /app

COPY package.json bun.lock* ./

RUN bun install


COPY . .

RUN bun run build --webpack

# --- Production Stage ---
FROM oven/bun:1-alpine AS runner
ARG NODE_ENV

WORKDIR /app

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Expose the port the app runs on
EXPOSE 3000

CMD ["bun", "server.js"]
