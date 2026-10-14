FROM node:22 AS build

RUN npm install -g pnpm@12

WORKDIR /usr/src/repo
COPY . .
RUN pnpm install --frozen-lockfile --filter roadkill-reporter-api...
RUN pnpm --filter roadkill-reporter-api deploy --prod /usr/src/back

FROM node:22

ENV NODE_ENV=production

WORKDIR /usr/src/back
COPY --from=build /usr/src/back .

EXPOSE 3000

CMD [ "node", "--trace-warnings", "server.js" ]
