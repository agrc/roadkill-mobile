FROM postgis/postgis:13-3.1

RUN mkdir -p /docker-entrypoint-initdb.d

COPY ./sql/*.sql /docker-entrypoint-initdb.d/
