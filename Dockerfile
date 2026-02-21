FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/

# Install dependencies
RUN npm ci

# Copy source
COPY shared/ shared/
COPY server/ server/
COPY client/ client/

# Build client
RUN npm run build -w client

# Expose port
ENV PORT=3001
EXPOSE 3001

# Start server with tsx
CMD ["npx", "tsx", "server/src/index.ts"]
