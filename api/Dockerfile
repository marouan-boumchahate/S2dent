FROM node:20-bookworm-slim AS base
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
COPY package*.json ./

FROM base AS production
ENV NODE_ENV=production
RUN npm ci --only=production

# Copy source and the specifically whitelisted entrypoint
COPY src/ ./src/
COPY certs/ ./certs/
COPY seeds/ ./seeds/
COPY server.js ./
COPY entrypoint.sh ./

RUN chmod +x entrypoint.sh && chown -R node:node /app
USER node

EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
