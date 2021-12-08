#!/usr/bin/env bash
set -e

cloud_sql_proxy -instances=ut-dts-agrc-roadkill-dev:us-central1:app=tcp:5432
