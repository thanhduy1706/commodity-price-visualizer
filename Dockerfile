# --- Build Stage ---
FROM node:20-alpine AS builder

# Accept build-time arguments
ARG NODE_ENV
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_BASE_URL

# Convert build args to environment variables
ENV NODE_ENV=$NODE_ENV
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL

WORKDIR /app

COPY package.json yarn.lock* ./

# Enable corepack for modern yarn
RUN corepack enable && corepack prepare yarn@stable --activate

COPY . .

RUN yarn install

RUN yarn build

# --- Production Stage ---
FROM node:20-alpine AS runner
ARG NODE_ENV

WORKDIR /app

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Expose the port the app runs on
EXPOSE 3000

CMD ["node", "server.js"]
