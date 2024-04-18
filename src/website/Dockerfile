FROM node:20

WORKDIR /usr/src/common
COPY ./common/package*.json ./
RUN npm ci --production
COPY ./common .

WORKDIR /usr/src/website
COPY ./website/package*.json ./
RUN npm i
COPY ./website .
RUN npm run build
RUN npm prune --production

EXPOSE 3000

WORKDIR /usr/src/website
CMD [ "npm", "run", "serve" ]
