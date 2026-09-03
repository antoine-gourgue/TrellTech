FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN npm ci --ignore-scripts
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN npm run build -w @trelltech/api

FROM node:20-alpine AS prod-deps
WORKDIR /app/apps/api
COPY apps/api/package.json ./package.json
# Install isolé des seules deps runtime de l'API : le bundle tsup inline déjà
# @trelltech/shared, et prisma (CLI) est ajouté pour `migrate deploy` au démarrage.
RUN npm pkg delete dependencies.@trelltech/shared scripts.postinstall \
 && npm install --omit=dev --no-audit --no-fund prisma@^6.3.1
COPY apps/api/prisma ./prisma
RUN npx prisma generate

FROM node:20-alpine AS runner
ENV NODE_ENV=production
RUN apk add --no-cache openssl \
 && addgroup -S nodejs && adduser -S nodejs -G nodejs
WORKDIR /app/apps/api
COPY --from=prod-deps /app/apps/api/node_modules ./node_modules
COPY --from=prod-deps /app/apps/api/prisma ./prisma
COPY --from=build /app/apps/api/dist ./dist
COPY apps/api/package.json ./package.json
COPY docker/api-entrypoint.sh /usr/local/bin/api-entrypoint.sh
RUN chmod +x /usr/local/bin/api-entrypoint.sh && chown -R nodejs:nodejs /app
USER nodejs
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/usr/local/bin/api-entrypoint.sh"]
