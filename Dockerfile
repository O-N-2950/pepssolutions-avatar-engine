FROM node:20-alpine AS builder
WORKDIR /app
COPY . .

WORKDIR /app/packages/avatar-engine
RUN npm install --ignore-scripts 2>/dev/null || true
RUN npx tsup src/index.ts --format esm --dts --no-splitting --out-dir dist 2>/dev/null || true

WORKDIR /app/packages/voice-avatar-bridge
RUN npm install --ignore-scripts 2>/dev/null || true
RUN npx tsup src/index.ts --format esm --dts --no-splitting --out-dir dist 2>/dev/null || true

WORKDIR /app/packages/demo-app
RUN npm install
RUN npx vite build

FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/packages/demo-app/dist ./dist
EXPOSE 3000
CMD sh -c "serve dist -p ${PORT:-3000} -s"
