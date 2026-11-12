FROM node:20-alpine AS builder
WORKDIR /app
COPY packages/demo-app/package.json packages/demo-app/package-lock.json ./packages/demo-app/
RUN npm ci --prefix packages/demo-app --ignore-scripts
COPY packages ./packages
# Vite aliases resolve engine, SDK and voice bridge directly from source.
RUN npm run build --prefix packages/demo-app

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY scripts/serve.mjs ./scripts/serve.mjs
COPY --from=builder /app/packages/demo-app/dist ./packages/demo-app/dist
USER node
EXPOSE 3000
CMD ["node", "scripts/serve.mjs"]
