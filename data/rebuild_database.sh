#!/usr/bin/env bash
set -e

# this is meant to be run from the project root
docker compose down --volumes && docker compose up --build
