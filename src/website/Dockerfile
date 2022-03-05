FROM node:14

ENV NODE_ENV=production

WORKDIR /usr/src/common
COPY ./common/package*.json ./
RUN npm ci --production
COPY ./common .

WORKDIR /usr/src/website
COPY ./website/package*.json ./
RUN npm ci
COPY ./website .
RUN npm run build

EXPOSE 3000

WORKDIR /usr/src/website
CMD [ "npm", "run", "serve" ]
