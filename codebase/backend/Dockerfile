FROM node:22-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
COPY tests ./tests
RUN npm run build

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    API_HOST=0.0.0.0 \
    API_PORT=8080 \
    CHROME_PATH=/usr/bin/chromium \
    PIPELINE_CODE_DIRECTORY=/app

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
      chromium \
      ffmpeg \
      fonts-dejavu-core \
      fonts-liberation \
      fonts-noto-core \
      fonts-noto-cjk \
    && ffmpeg -version >/dev/null \
    && chromium --version >/dev/null \
    && fc-match "Noto Sans" | grep -qi "NotoSans" \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY src ./src
RUN mkdir -p backend-data/jobs backend-data/uploads runs outputs \
    && chown -R node:node /app

USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "dist/src/server/index.js"]
