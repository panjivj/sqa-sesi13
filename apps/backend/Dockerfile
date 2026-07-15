FROM node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/public-web/package.json apps/public-web/package.json
COPY apps/admin-dashboard/package.json apps/admin-dashboard/package.json
COPY apps/e2e-tests/package.json apps/e2e-tests/package.json

RUN npm ci --omit=dev --workspace @run-event/backend \
    && npm cache clean --force

COPY apps/backend/src apps/backend/src

EXPOSE 3000

CMD ["node", "apps/backend/src/server.js"]
