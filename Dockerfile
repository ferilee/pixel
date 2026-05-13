FROM oven/bun:1 AS builder
WORKDIR /app

# Copy package files and install dependencies
COPY package.json bun.lock ./
RUN bun install

# Copy source code and build frontend
COPY . .
RUN bun run build

FROM oven/bun:1
WORKDIR /app

# Copy dependencies and built files from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/api ./api
COPY --from=builder /app/package.json ./

# Expose ports for both frontend (3333) and backend (3334)
EXPOSE 3333 3334

# Default command can be the server, but docker-compose will override
CMD ["bun", "run", "server"]
