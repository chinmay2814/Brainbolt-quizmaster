# ============================================
# BrainBolt Backend - Dockerfile
# ============================================

FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create data directory for SQLite
RUN mkdir -p /app/data

# Expose port
EXPOSE 3001

# Run seed then start server
CMD ["sh", "-c", "npm run seed && npm start"]
