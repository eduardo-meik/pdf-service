FROM node:22-slim

# Install dependencies for Puppeteer
# We install google-chrome-stable to get all necessary shared libraries, 
# but we will use the Chrome version downloaded by Puppeteer to ensure compatibility.
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && sh -c 'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
# This will also run the postinstall script (install-chrome.js) which downloads the correct Chrome version
RUN npm ci

# Copy app source
COPY . .

# Expose the port the app runs on
EXPOSE 10000

# Start the application
CMD [ "node", "index.js" ]
