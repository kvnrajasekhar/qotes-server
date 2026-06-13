# Qotes Server Architecture

## Requirements coverage

- ✅ Project folder structure
- ✅ Services / modules list
- ✅ Tech stack
- ✅ Database(s)
- ✅ External APIs / third-party services
- ✅ Deployment environment assumptions
- ✅ Service-to-service communication flow
- ✅ Authentication flow
- ✅ Infrastructure components (cache, Kafka, mailer, media)

> Notes:
>
> - No Dockerfile, docker-compose, or Kubernetes manifests exist in the current repository.
> - Deployment environment is therefore documented as a Node.js Express service using environment variables, with optional external infra.
> - The diagram includes current app components, async workers, cache, event processing, and external integrations.

## Current architecture summary

- **Main app**: `src/app.js` and `src/server.js`
- **API router modules**:
  - `modules/auth`
  - `modules/users`
  - `modules/quotes`
  - `modules/reactions`
  - `modules/feeds`
  - `modules/search`
  - `modules/comments`
  - `modules/collections`
  - `modules/preferences`
  - `modules/safety`
  - `modules/admin`
- **Shared middleware**:
  - `shared/middlewares/auth.middleware.js` (JWT validation)
  - `shared/middlewares/logger.middleware.js`
  - `shared/middlewares/rateLimiter.middleware.js`
  - `shared/middlewares/upload.middleware.js`
- **Persistence**:
  - MongoDB via `mongoose`
  - Redis cache via `ioredis`
- **Async messaging**:
  - Kafka using `kafkajs`
  - Topics: `auth-events`, `reaction-events`
- **Workers**:
  - `src/workers/reaction.worker.js`
  - `src/workers/loginFollowerCache.worker.js`
  - `src/infrastructure/kafka/dlq/universal.dlq.js`
- **Third-party services**:
  - Cloudinary image upload
  - Gmail SMTP via Nodemailer
- **Observability**:
  - `/metrics` Prometheus text endpoint
  - `/health`, `/ready` readiness probes

## Mermaid architecture diagram

- check ./Mermaid_Architecture.md

## Additional recommendation

- Add deployment manifests or containerization config if you want the architecture to explicitly include Docker / Kubernetes / AWS.
- Track environment variables in a single schema file if you want to keep config sources part of the architecture.
- Capture message topic semantics and cache keys in a later diagram update if you want deeper operational detail.

## Conclusion

The list of requirements is sufficient for a high-level architecture diagram. The current diagram includes all existing runtime components in this repo and notes the missing container/orchestration config, so it can be updated later as the project evolves.
