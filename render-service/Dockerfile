FROM ghcr.io/puppeteer/puppeteer:22.12.1

# Instalar app
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias limpias
RUN npm ci

# Copiar código del proyecto
COPY --chown=pptruser:pptruser . .

# Usar el puerto de Railway o por defecto 3001
ENV PORT=3001
EXPOSE 3001

# Ejecutar como usuario no root pptruser (incluido en la imagen base)
USER pptruser

CMD ["node", "server.js"]
