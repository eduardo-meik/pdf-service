FROM node:20-slim

# Install only the shared libraries Chrome needs (not the full browser).
# Puppeteer downloads its own compatible Chrome at npm install time.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ca-certificates fonts-freefont-ttf \
       libasound2 libatk1.0-0 libatk-bridge2.0-0 libcairo2 libcups2 \
       libdbus-1-3 libdrm2 libexpat1 libgbm1 libglib2.0-0 libnspr4 \
       libnss3 libpango-1.0-0 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 \
       libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 \
       libxss1 libxtst6 libxkbcommon0 libxshmfence1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

ENV PUPPETEER_CACHE_DIR=/usr/src/app/puppeteer-cache

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 10000

CMD [ "node", "index.js" ]
