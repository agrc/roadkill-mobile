# TODO: add client id and secret as environment variables
FROM node:14

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --production

COPY . .

EXPOSE 3000

CMD [ "node", "index.js" ]
