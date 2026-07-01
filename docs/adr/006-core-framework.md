# ADR-006: Core Framework and Bootstrap

## Status

Accepted

## Context

The platform needs a standardized application wiring layer that:
- Validates and injects typed environment configuration
- Provides structured logging with correlation IDs
- Exposes health check endpoints for Kubernetes probes
- Configures Swagger/OpenAPI documentation
- Applies security middleware (helmet, CORS, rate limiting)
- Sets up OpenTelemetry for observability

Each app (API, Worker, WebSocket, MQTT Gateway, Scheduler) should share the same
core framework to ensure consistency.

## Decision

We create two layers:

### 1. `@platform/platform-core` Infrastructure Modules

| Module | Responsibility | Dependencies |
|---|---|---|
| **ConfigModule** | Zod-validated `.env` loading, typed `ConfigService` | `@nestjs/config`, `zod` |
| **LoggerModule** | Wraps NestJS Logger with context support | Built-in |
| **HealthModule** | `/health` (liveness) + `/health/readiness` (readiness) | `@nestjs/terminus` |
| **Telemetry** | `initTelemetry()` called before `NestFactory.create()` | Optional (`@opentelemetry/*`) |

### 2. `apps/api/` Application Wiring (`main.ts`)

The bootstrap order:
1. `initTelemetry(serviceName)` — starts OpenTelemetry SDK
2. `NestFactory.create(AppModule)` — creates NestJS app
3. `app.use(helmet())` — security headers
4. `app.enableCors(...)` — CORS from env config
5. `app.setGlobalPrefix(apiPrefix)` — `/api/v1/...`
6. `app.useGlobalPipes(ValidationPipe)` — whitelist + transform
7. `SwaggerModule.setup(...)` — OpenAPI at `/api/v1/docs`
8. `app.listen(port, host)` — start HTTP server

### Config Schema (Zod)

All env vars are validated at startup with descriptive error messages:

```
Required: DATABASE_URL (url), JWT_SECRET (min 32 chars)
Optional: PORT (3000), HOST (0.0.0.0), NODE_ENV (development),
          LOG_LEVEL (info), OTLP_ENDPOINT, CORS_ORIGINS (*),
          STORAGE_PROVIDER (local), ...
```

### Health Probes

| Endpoint | Method | Purpose |
|---|---|---|
| `GET /api/v1/health` | Liveness | Is the service alive? |
| `GET /api/v1/health/readiness` | Readiness | Is the service ready for traffic? |

Health checks include memory heap and can be extended with Prisma/Redis checks.

### Swagger Configuration

- Bearer token auth (`access-token`)
- API Key header auth (`api-key`)
- Title: "Platform API"
- Mounted at `/api/v1/docs`

## Consequences

**Positive:**
- Every app follows the same bootstrap pattern
- Config validation fails fast at startup, not at runtime
- Health endpoints enable K8s auto-healing
- Swagger docs are built-in, not an afterthought
- Security middleware is applied consistently

**Negative:**
- Zod config schema must be kept in sync with `.env.example`
- `@nestjs/terminus` adds ~50KB to the bundle
- Telmetry startup adds ~100ms when OTLP is enabled
