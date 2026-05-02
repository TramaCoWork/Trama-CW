# --- Dev stage ---
FROM node:20-alpine AS dev

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install --legacy-peer-deps

COPY . .

RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "run", "start:dev"]

# --- Build stage ---
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --legacy-peer-deps

COPY . .

RUN npm run build

# --- Production stage ---
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production --legacy-peer-deps

COPY --from=builder /app/dist ./dist

RUN npx prisma generate

EXPOSE 3000

CMD ["node", "dist/src/main"]
