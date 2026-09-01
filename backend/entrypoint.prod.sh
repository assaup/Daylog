#!/bin/sh
set -e

echo "Applying database migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Starting gunicorn..."
# PaaS platforms (Render, Fly, etc.) inject the port via $PORT; fall back to 8000
# for the self-hosted docker-compose stack.
exec gunicorn config.wsgi:application --bind "0.0.0.0:${PORT:-8000}" --workers 3 --timeout 60
