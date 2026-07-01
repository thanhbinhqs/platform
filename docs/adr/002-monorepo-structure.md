# ADR-002: Monorepo Structure with PNPM + Turborepo

## Status

Accepted

## Context

We need a monorepo structure that supports:
- Multiple deployable apps (NestJS backends, React frontends)
- ~20 shared packages with complex dependency graph
- Parallel build/test/lint across all packages
- Strict dependency isolation between packages
- Future migration to microservices

## Decision

We chose **PNPM Workspace** as package manager and **Turborepo v2** as task orchestrator.

### PNPM over npm/yarn
- **Strict dependency isolation**: PNPM's node_modules structure prevents packages from importing undeclared dependencies
- **Disk efficiency**: Hard links between workspaces save significant disk space
- **Performance**: Faster install than npm and yarn
- **Workspace protocol**: `workspace:*` simplifies cross-package references

### Turborepo over Nx/Bazel
- **Simpler setup**: One `turbo.json` file, no code generation overhead
- **Parallel execution**: Automatic topological ordering + parallel task execution
- **Caching**: Local + remote caching of build/test outputs
- **Filtering**: `--filter` for selective execution
- **Lighter weight**: Fewer concepts to learn than Nx

### TypeScript Config Package
- Centralized `config-typescript` package with `base.json`, `backend.json`, `frontend.json`
- Every package extends the appropriate config → single source of truth for TS settings
- `backend.json` includes `emitDecoratorMetadata`, `experimentalDecorators` for NestJS
- `frontend.json` includes `jsx: react-jsx`, DOM libs

### Dependency Rules
1. **No circular dependencies**: Turborepo detects cycles at build time
2. **Apps import packages only**: Apps never import other apps
3. **Packages import by layer**: `shared-types` → `platform-core` → `iam` → `workflow`
4. **PeerDependencies for framework packages**: NestJS/React packages are peer deps, not direct

## Consequences

### Positive
- Clear separation of concerns by package boundary
- Easy to extract any package as a standalone microservice
- Unified tooling (lint, format, test, build) across all projects
- Fast CI with Turborepo caching

### Negative
- Initial setup complexity (version alignment across 30 packages)
- PNMP's strict mode requires explicit dependency declarations
- Need to maintain consistent version ranges across workspaces

## Alternatives Considered

- **Nx**: More powerful but heavier; overkill for current stage
- **npm workspaces**: Simpler but lacks strict isolation
- **single package**: Would prevent microservice extraction later
- **Yarn PnP**: Better performance but less ecosystem compatibility

## Related

- ADR-001: Technology Stack Decision (planned)
- Phase 3: Docker & Deployment
