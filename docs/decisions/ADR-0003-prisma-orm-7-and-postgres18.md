# ADR-0003: Database Persistence with Prisma ORM 7 and PostgreSQL 18

## Status
Approved (Phase 0)

## Context
We need a robust, type-safe data access layer that supports complex relational queries, migrations, transactions, and future vector embeddings.
- Prisma 8 is currently in pre-release/RC status.
- Drizzle ORM was considered, but mixing ORMs adds unnecessary complexity and maintenance overhead.
- Local environment analysis detected PostgreSQL 18 installed and active as a Windows Service (`postgresql-x64-18`).

## Decision
1. **Prisma ORM 7:** Adopt Prisma 7 as the default production ORM for stability, mature migration tooling (`prisma migrate dev/deploy`), and end-to-end TypeScript type generation.
2. **PostgreSQL Driver Adapter:** Use the official `@prisma/adapter-pg` driver adapter with native connection pooling.
3. **Selective Raw SQL:** Where Prisma does not provide expressive semantics (such as atomic counter increments and recursive CTEs for dependency cycle detection), use `prisma.$queryRaw` or `prisma.$executeRaw` within explicit transactions.

## Consequences
- **Positive:** Battle-tested ORM with rock-solid type-safety, automatic migration history, and seamless schema synchronization.
- **Negative:** Cold start query compilation overhead in serverless (not an issue here since NestJS runs as a persistent containerized Node.js service).
