# Use Node.js LTS with Debian for better Puppeteer support
FROM node:20-bullseye-slim

# Install Chromium and dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-sandbox \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    libxss1 \
    libxtst6 \
    libnss3 \
    libnspr4 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libpango-1.0-0 \
    libx11-xcb1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set Puppeteer to use installed Chromium and disable crash reporting
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    CHROME_DEVEL_SANDBOX=/usr/lib/chromium/chrome-sandbox \
    CHROME_NO_SANDBOX=true

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Remove devDependencies after build
RUN npm prune --production

# Run as non-root user for security
RUN groupadd -r scraper && useradd -r -g scraper scraper

# Create data, temp, and Chromium config directories for scraper user
RUN mkdir -p /app/data /tmp/chromium /home/scraper/.config/google-chrome/Crashpad
RUN chown -R scraper:scraper /app /tmp/chromium /home/scraper

USER scraper

# Set temp directory for Chromium
ENV TMPDIR=/tmp/chromium

# Run discovery engine automatically
CMD ["node", "dist/discovery-engine.js"]
