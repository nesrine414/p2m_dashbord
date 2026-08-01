# --- Stage 1: Build the React application ---
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies
RUN npm install
# Copy source files
COPY . .

# Build production artifacts
RUN npm run build

# --- Stage 2: Serve static files with Nginx ---
FROM nginx:alpine

# Copy built static assets from Stage 1 into Nginx HTML directory
COPY --from=build /app/build /usr/share/nginx/html

# Expose HTTP port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]