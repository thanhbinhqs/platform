# Enterprise Full-Stack Application Platform

A production-ready, cloud-native enterprise application platform built with **NestJS**, **React**, **PostgreSQL**, **Valkey**, and **BullMQ**.

## Architecture

- **Monorepo** managed by PNPM + Turborepo
- **Modular Monolith** — microservice-ready packages
- **Clean Architecture + DDD** — domain-driven design
- **Event-Driven** — Outbox/Inbox pattern with BullMQ
- **Zero Trust Security** — OWASP ASVS compliant

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development
pnpm dev

# Build all packages and apps
pnpm build

# Run tests
pnpm test

# Lint
pnpm lint
```

## Project Structure

```
apps/             # Deployable applications
  api             # REST + GraphQL API Gateway (NestJS)
  worker          # BullMQ Worker processes
  websocket       # Socket.IO Gateway
  mqtt-gateway    # MQTT Broker Service
  scheduler       # Cron/Schedule Dispatcher
  admin-web       # Admin SPA (React + Vite)
  portal-web      # User Portal SPA (React + Vite)

packages/         # Shared libraries
  platform-kernel # Core kernel (DI, lifecycle, plugin loader)
  platform-core   # Base classes, interfaces, abstractions
  iam             # Identity & Access Management
  workflow        # Workflow engine
  rule-engine     # Business rule engine
  notification    # Multi-channel notification
  audit           # Audit trail engine
  storage         # S3/MinIO abstraction
  integration     # External system integration
  cache           # Multi-tier cache
  encryption      # Encryption/decryption
  logging         # Structured logging (nestjs-pino)
  monitoring      # OpenTelemetry instrumentation
  metadata        # Dynamic metadata management
  scheduler       # Schedule definitions
  dynamic-form    # JSON Schema → Form renderer
  ui              # Shared UI components
  api-client      # Generated API client
  hooks           # Shared React hooks
  shared-types    # TypeScript types (BE + FE)
  shared-utils    # Utility functions
```

## Technology Stack

| Layer | Technology |
|---|---|
| Backend | NestJS, Prisma, PostgreSQL, Valkey, BullMQ |
| Frontend | React, Vite, TypeScript, Tailwind, TanStack Query |
| Event | Socket.IO, MQTT |
| Observability | OpenTelemetry, Prometheus, Grafana |
| Logging | nestjs-pino |
| Security | CASL, JWT, MFA, OAuth2/OIDC/SAML |
| Deployment | Docker, Docker Compose, Kubernetes |

## Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add IAM permission delegation
fix: resolve audit pagination overflow
chore: update dependencies
docs: add API authentication guide
```

## License

Proprietary — All rights reserved.
