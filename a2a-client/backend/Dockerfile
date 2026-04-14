FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
EXPOSE 3001
ENV NODE_ENV=production
CMD ["node", "--no-warnings", "src/server.js"]
