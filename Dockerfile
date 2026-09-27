# ============================================
# Stage 1: Build
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ============================================
# Stage 2: Production
# ============================================
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy compiled application from builder
COPY --from=builder /app/dist ./dist

# Copy root-level runtime directories
COPY certs ./certs
RUN mkdir -p uploads logs

EXPOSE 3000

CMD ["node", "dist/main.js"]