FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY server.js ./

ENV BACKEND_URL=https://backend-734852757342.us-central1.run.app

EXPOSE 1234

CMD ["node", "server.js"]
