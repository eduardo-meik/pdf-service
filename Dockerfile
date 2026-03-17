FROM node:20-slim

# Install only the shared libraries Chrome needs (not the full browser).
# Puppeteer downloads its own compatible Chrome at npm install time.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ca-certificates fonts-freefont-ttf libx11-xcb1 libxcomposite1 \
       libxdamage1 libxrandr2 libgbm1 libasound2 libatk1.0-0 \
       libatk-bridge2.0-0 libcups2 libdrm2 libnss3 libxss1 libxtst6 \
       libpango-1.0-0 libcairo2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

ENV PUPPETEER_CACHE_DIR=/usr/src/app/puppeteer-cache

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 10000

CMD [ "node", "index.js" ]
