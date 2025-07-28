FROM python:3.11-slim

# Allow statements and log messages to immediately appear in the Knative logs
ENV PYTHONUNBUFFERED=True

USER root
RUN useradd -s /bin/bash dummy

# Set the locale
RUN apt-get update && apt-get install -y locales && localedef -i en_US -c -f UTF-8 -A /usr/share/locale/locale.alias en_US.UTF-8 && apt-get install -y gcc && apt-get install -y libkrb5-dev && pip install requests-kerberos

COPY . /app
WORKDIR /app
RUN pip install .

USER dummy
ENTRYPOINT ["process"]
