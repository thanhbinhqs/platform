# Docker Development Scripts

.PHONY: help infra up down build restart logs clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

infra: ## Start infrastructure services (PostgreSQL + Valkey + MinIO)
	docker compose -f docker/docker-compose.infra.yml up -d

infra-down: ## Stop infrastructure services
	docker compose -f docker/docker-compose.infra.yml down

infra-logs: ## View infrastructure logs
	docker compose -f docker/docker-compose.infra.yml logs -f

infra-tools: ## Start infrastructure + dev tools (pgAdmin, RedisInsight)
	docker compose -f docker/docker-compose.infra.yml --profile devtools up -d

up: ## Start full stack (build images first)
	docker compose -f docker/docker-compose.yml up -d

build: ## Build all Docker images
	docker compose -f docker/docker-compose.yml build

build-api: ## Build only API image
	docker build -f docker/Dockerfile.api -t platform-api:latest .

build-admin: ## Build only Admin Web image
	docker build -f docker/Dockerfile.admin-web -t platform-admin-web:latest .

down: ## Stop full stack
	docker compose -f docker/docker-compose.yml down

restart: down up ## Restart full stack

logs: ## View all logs
	docker compose -f docker/docker-compose.yml logs -f

logs-api: ## View API logs
	docker compose -f docker/docker-compose.yml logs -f api

clean: ## Remove all containers, volumes, and images
	docker compose -f docker/docker-compose.yml down -v
	docker compose -f docker/docker-compose.infra.yml down -v
	docker system prune -f

ps: ## List running containers
	docker compose -f docker/docker-compose.infra.yml ps

db-shell: ## Open PostgreSQL shell
	docker exec -it platform-postgres psql -U postgres -d platform

valkey-cli: ## Open Valkey CLI
	docker exec -it platform-valkey valkey-cli

prod-build: ## Build production images
	docker compose -f docker/docker-compose.yml build --no-cache

prod-up: ## Start production stack
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml up -d
