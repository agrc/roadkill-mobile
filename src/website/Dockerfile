FROM node:22 AS build

RUN npm install -g pnpm@12

WORKDIR /usr/src/repo
COPY . .
RUN pnpm install --frozen-lockfile --filter roadkill-reporter-website
RUN pnpm --filter roadkill-reporter-website run build
RUN pnpm --filter roadkill-reporter-website deploy --prod /usr/src/website
# build output is gitignored so deploy does not copy it
RUN cp -r src/website/build /usr/src/website/build && cp -r src/website/public/build /usr/src/website/public/build

FROM node:22

ENV NODE_ENV=production

RUN npm install -g pnpm@12

WORKDIR /usr/src/website
COPY --from=build /usr/src/website .

EXPOSE 3000

CMD [ "pnpm", "run", "serve" ]
