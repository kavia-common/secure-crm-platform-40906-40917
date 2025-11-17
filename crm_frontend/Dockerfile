# PUBLIC_INTERFACE
# Dockerfile for CRM Frontend (Vite + React + Tailwind)
# - Builds the app and serves the production bundle via `vite preview`
# - Exposes port 3000

FROM node:18-alpine

WORKDIR /app

# Install deps first (leverage layer caching)
COPY package*.json ./
RUN npm install --silent --no-progress --no-audit --fund=false

# Copy source and build
COPY . .
RUN npm run build

EXPOSE 3000

# Start production preview server
CMD ["npm", "run", "start"]
