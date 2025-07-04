FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    bash \
    util-linux \
    shadow

COPY package*.json ./

RUN npm install --omit=dev

COPY src/ ./src/
COPY public/ ./public/

RUN addgroup -g 1001 -S nodejs
RUN adduser -S terminal -u 1001

RUN chown -R terminal:nodejs /app
USER terminal

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "http.get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["node", "src/server.js"]