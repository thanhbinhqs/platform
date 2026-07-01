#!/bin/bash
# Docker development environment variables
# Source this file: source docker/dev-env.sh

export POSTGRES_USER=postgres
export POSTGRES_PASSWORD=CHANGE-ME
export POSTGRES_DB=platform
export DATABASE_URL="postgresql://${POSTGRES_USER}:***@localhost:5432/${POSTGRES_DB}?schema=public"
export VALKEY_URL="redis://localhost:***@localhost:5432/platform"
echo "⚡ VALKEY_URL: redis://localhost:6379"
echo "📁 MINIO: http://localhost:9000"
echo ""
echo "Run 'docker compose -f docker/docker-compose.infra.yml up -d' to start services."
echo "Then 'pnpm dev' to start apps."
