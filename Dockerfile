# Stage 1: Build the React application
FROM node:20-alpine AS build
WORKDIR /app

# Copy dependency files first
COPY package*.json ./

# Install dependencies (ignoring lockfile mismatches)
RUN npm install

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Serve using Nginx
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
