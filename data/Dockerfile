# this is a temporary image until they get full support for arm64
# ref: https://github.com/postgis/docker-postgis/issues/216
FROM imresamu/postgis-arm64:13-3.4-ver20240928-0cd66e4-2024w41

RUN mkdir -p /docker-entrypoint-initdb.d

COPY ./sql/*.sql /docker-entrypoint-initdb.d/
RUN chown -R postgres:postgres /docker-entrypoint-initdb.d/
