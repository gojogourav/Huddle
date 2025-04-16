# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json turbo.json ./
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/backend/package.json ./apps/backend/
RUN npm install -g turbo
RUN turbo install --force
COPY . .
RUN turbo build --filter=frontend

# Production stage
FROM nginx:alpine
COPY --from=builder /app/apps/frontend/.next /usr/share/nginx/html
COPY --from=builder /app/apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]