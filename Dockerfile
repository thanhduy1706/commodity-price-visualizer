# --- Build Stage ---
FROM oven/bun:1-alpine AS builder

# Accept build-time arguments
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG CLERK_SECRET_KEY
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_CHATBOT_API_URL
ARG NEXT_PUBLIC_NOTIFICATION_BASE_URL
ARG NODE_ENV

# Convert build args to environment variables
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV CLERK_SECRET_KEY=$CLERK_SECRET_KEY
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_CHATBOT_API_URL=$NEXT_PUBLIC_CHATBOT_API_URL
ENV NEXT_PUBLIC_NOTIFICATION_BASE_URL=$NEXT_PUBLIC_NOTIFICATION_BASE_URL
ENV NODE_ENV=$NODE_ENV

WORKDIR /app

COPY package.json bun.lock* ./

RUN bun install --frozen-lockfile

COPY . .

RUN bun run build

# --- Production Stage ---
FROM oven/bun:1-alpine AS runner
ARG NODE_ENV

# Database Environment Variables
ENV DATABASE_HOST=100.105.169.18
ENV DATABASE_PORT=5432
ENV DATABASE_USERNAME=libadmin
ENV DATABASE_PASSWORD=Jentle1706
ENV DATABASE_NAME=commodity_data

WORKDIR /app

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Expose the port the app runs on
EXPOSE 3000

CMD ["bun", "server.js"]
