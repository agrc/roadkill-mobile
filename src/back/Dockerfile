FROM node:14

ARG DATABASE_PASSWORD
ARG DATABASE_HOST

ENV NODE_ENV=production

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --production

COPY . .

EXPOSE 3000

CMD [ "node", "server.js" ]
