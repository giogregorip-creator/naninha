FROM node:18-alpine

WORKDIR /app

COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

COPY backend/package*.json ./backend/
RUN cd backend && npm install

COPY . .

RUN cd frontend && npm run build

EXPOSE 3000

CMD ["node", "backend/server.js"]
