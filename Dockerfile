# Same reviewed Node image and digest as the sibling backend. Keep both explicit.
FROM node:24.22.1-bookworm-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205 AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN chown node:node /app

FROM base AS dependencies
COPY --chown=node:node package.json package-lock.json ./
USER node
RUN --mount=type=cache,id=blogpost-web-npm,target=/home/node/.npm,uid=1000,gid=1000,sharing=locked npm ci --no-audit

FROM dependencies AS development
ENV NODE_ENV=development APP_ENV=development BUILT_APP_ENV=development PORT=3000 HOSTNAME=0.0.0.0
COPY --chown=node:node . .
EXPOSE 3000
CMD ["./node_modules/.bin/next", "dev", "--hostname", "0.0.0.0", "--port", "3000"]

FROM dependencies AS build
ARG APP_ENV=development
ARG SOURCE_SHA=local-development
ENV NODE_ENV=production APP_ENV=${APP_ENV} BUILT_APP_ENV=${APP_ENV} SOURCE_SHA=${SOURCE_SHA}
COPY --chown=node:node . .
# All public reads are dynamic. Compilation uses only the committed contract;
# no backend, identity provider, credential, or external font is needed.
RUN mkdir -p public && npm run contract:check && npm run build

FROM base AS runtime
ARG APP_ENV=development
ARG SOURCE_SHA=local-development
ENV NODE_ENV=production APP_ENV=${APP_ENV} BUILT_APP_ENV=${APP_ENV} SOURCE_SHA=${SOURCE_SHA} PORT=8080 HOSTNAME=0.0.0.0 WEB_LOGIN_ENABLED=false
LABEL org.opencontainers.image.title="Blogpost web" org.opencontainers.image.revision=${SOURCE_SHA}
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 8080
CMD ["node", "server.js"]
