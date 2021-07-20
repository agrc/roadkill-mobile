FROM postgis/postgis:12-3.0

COPY ./data/*.sql /docker-entrypoint-initdb.d/
