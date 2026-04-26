# 1. Imagen base con Node.js
FROM node:20-slim

# 2. Instalar Python, Pip y herramientas de compilación
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# 3. Directorio de trabajo
WORKDIR /app

# 4. Copiar archivos de dependencias
COPY package.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/
COPY server/requirements.txt ./server/

# 5. Instalar dependencias de Node
RUN npm install
RUN cd server && npm install
RUN cd client && npm install

# 6. Instalar dependencias de Python (Globalmente)
RUN pip3 install --no-cache-dir --break-system-packages -r server/requirements.txt

# 7. Copiar el resto del código
COPY . .

# 8. Construir el Frontend
RUN cd client && npm run build

# 9. Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=5000

# 10. Exponer puerto
EXPOSE 5000

# 11. Comando de arranque
CMD ["node", "server/index.js"]
