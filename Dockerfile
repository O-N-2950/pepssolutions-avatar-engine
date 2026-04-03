FROM node:20-alpine AS builder
WORKDIR /app

# 1. Copier TOUT le monorepo
COPY . .

# 2. Installer les devDeps de l'engine (tsup pour build)
WORKDIR /app/packages/avatar-engine
RUN npm install --ignore-scripts 2>/dev/null || true
RUN npx tsup src/index.ts --format esm --dts --no-splitting --out-dir dist 2>/dev/null || true

# 3. Installer les devDeps du bridge
WORKDIR /app/packages/voice-avatar-bridge
RUN npm install --ignore-scripts 2>/dev/null || true
RUN npx tsup src/index.ts --format esm --dts --no-splitting --out-dir dist 2>/dev/null || true

# 4. Build demo-app avec Vite (utilise les aliases => sources directement)
WORKDIR /app/packages/demo-app
RUN npm install
RUN npx vite build

# ── Image finale légère ──────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/packages/demo-app/dist ./dist
EXPOSE 3000
CMD ["serve", "dist", "-p", "3000", "-s"]
