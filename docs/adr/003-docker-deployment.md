# ADR-003: Docker & Deployment Strategy

## Status

Accepted

## Context

We need a containerization strategy for 7 deployable apps (5 NestJS + 2 React) that:
- Works for local development (hot reload, bind mounts)
- Works for CI (automated build & test)
- Works for production (multi-replica, health checks, resource limits)
- Integrates with PNPM monorepo dependency resolution

## Decision

### Dockerfile Strategy: Multi-stage Build with PNPM Deploy

Each backend app uses a 4-stage Dockerfile:

1. **base**: Node 22 Alpine + corepack/pnpm
2. **deps**: Copy only `package.json` files → `pnpm install --frozen-lockfile` (cached unless lockfile changes)
3. **build**: Copy source → `pnpm --filter @platform/<app> build`
4. **runner**: Minimal image with `dist/` + `node_modules` (production only)

Frontend apps follow a 2-stage pattern:
1. **builder**: Install + build Vite output
2. **runner**: nginx:alpine serving static files with SPA fallback

### Multi-stage Benefits
- **Layer caching**: Deps stage only invalidates when package.json changes
- **Small images**: Runner stage ~200MB (Node) / ~25MB (nginx)
- **No devDependencies in prod**: PNPM deploy ensures only production deps

### Docker Compose Files

| File | Purpose | Usage |
|---|---|---|
| `docker/docker-compose.yml` | Full stack (infra + apps) | CI, production-like local |
| `docker/docker-compose.infra.yml` | Infra only (PostgreSQL, Valkey, MinIO) | Daily dev (`pnpm dev` on host) |
| `docker/docker-compose.prod.yml` | Production overrides (replicas, limits) | Production deployment |

### Network Architecture

```
platform-net (bridge)
  ├── postgres:5432
  ├── valkey:6379
  ├── minio:9000
  ├── nginx:80/443
  │   ├── api.conf → api:3000
  │   ├── admin.conf → admin-web:80
  │   └── portal.conf → portal-web:80
  ├── api:3000
  ├── worker:3004
  ├── websocket:3001
  ├── mqtt-gateway:1883
  └── scheduler:3003
```

### Development Workflow

```bash
# Terminal 1: Start infrastructure
docker compose -f docker/docker-compose.infra.yml up -d

# Terminal 2: Start apps with hot reload
source docker/dev-env.sh
pnpm dev
```

## Consequences

### Positive
- Consistent build process across all apps
- Layer caching reduces CI build time by ~60%
- Infra-only compose enables fast local development
- PNPM deploy ensures production images don't include unnecessary dev tools (TypeScript, test runners, etc.)

### Negative
- Each backend Dockerfile is ~50 lines due to per-app dependency lists
- Build context is the entire monorepo root (~1GB with node_modules in CI)
- `.dockerignore` must exclude node_modules, .turbo, dist

## Security

- Containers run as non-root `USER node` (except nginx)
- `NODE_ENV=production` disables debug endpoints
- `server_tokens off` in nginx hides version
- Rate limiting (30r/s) on API endpoints
- Login endpoint at 5r/m
- Secrets via environment variables (never baked into images)
- Health checks prevent routing to unhealthy containers

## Related

- ADR-002: Monorepo Structure with PNPM + Turborepo
- Phase 4: Database (PostgreSQL init scripts depend on this)
- Phase 18: CI/CD (GitHub Actions will use these Dockerfiles)
