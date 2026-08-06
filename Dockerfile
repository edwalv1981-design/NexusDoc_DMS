# 1. Imagen base con Node.js 20
FROM node:20-slim

# 2. Instalar Python, Pip y herramientas de compilación + Chromium/Puppeteer
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    gcc \
    python3-dev \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# 3. Directorio de trabajo
WORKDIR /app

# 4. Copiar package.json y package-lock.json
COPY package.json package-lock.json* ./
COPY server/package.json server/package-lock.json* ./server/
COPY client/package.json client/package-lock.json* ./client/
COPY server/requirements.txt ./server/

# 5. Instalar dependencias de Node de forma resiliente
RUN npm install --legacy-peer-deps
RUN cd server && npm install --legacy-peer-deps
RUN cd client && npm install --legacy-peer-deps

# 6. Instalar dependencias de Python
RUN pip3 install --no-cache-dir --break-system-packages -r server/requirements.txt || true

# 7. Copiar el resto del código
COPY . .

# 8. Construir el Frontend Vite SPA
RUN cd client && npm run build

# 9. Variables de entorno por defecto
ENV NODE_ENV=production

# 10. Comando de arranque
WORKDIR /app/server
CMD ["npm", "start"]
