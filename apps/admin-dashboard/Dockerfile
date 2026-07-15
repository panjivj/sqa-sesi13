FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/public-web/package.json apps/public-web/package.json
COPY apps/admin-dashboard/package.json apps/admin-dashboard/package.json
COPY apps/e2e-tests/package.json apps/e2e-tests/package.json

RUN npm ci --workspace @run-event/admin-dashboard

COPY apps/admin-dashboard apps/admin-dashboard

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build --workspace @run-event/admin-dashboard

FROM nginx:alpine

COPY apps/admin-dashboard/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/admin-dashboard/dist /usr/share/nginx/html

EXPOSE 80
