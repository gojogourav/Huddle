FROM node:18-alpine
WORKDIR /app
COPY package.json turbo.json ./
COPY apps/backend/package.json ./apps/backend/
RUN npm install -g turbo
RUN turbo install --force
COPY . .
RUN turbo build --filter=backend
EXPOSE 5000
CMD ["node", "apps/backend/dist/index.js"]