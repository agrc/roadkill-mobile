FROM node:14

ENV NODE_ENV=production

WORKDIR /usr/src/common
COPY ./common/package*.json ./
RUN npm ci --production
COPY ./common .

WORKDIR /usr/src/back
COPY ./back/package*.json ./
RUN npm ci --production
COPY ./back .

EXPOSE 3000

CMD [ "node", "back/server.js" ]
