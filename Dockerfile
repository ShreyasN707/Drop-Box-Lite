# Use official LTS Node.js alpine image for a small, secure footprint
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package manifests first for efficient layer caching
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy the rest of the application files
COPY . .

# Ensure uploads directory exists with write permissions
RUN mkdir -p uploads && chown -R node:node /app

# Run as non-root user for security
USER node

# Expose server port
EXPOSE 3000

# Start application
CMD ["node", "server.js"]
