# Stage 1: Build Stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

# Stage 2: Production Stage
FROM node:18-alpine

WORKDIR /app

COPY . .

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules

# Create health.txt with value 'ok'
RUN echo "ok" > /tmp/health.txt

EXPOSE 3000
