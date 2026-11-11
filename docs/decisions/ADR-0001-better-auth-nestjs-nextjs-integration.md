# ADR-0001: Better Auth Integration Architecture Between Next.js and NestJS

## Status
Approved (Phase 0)

## Context
Workflow AI requires authentication supporting email passwordless/magic links and OAuth (GitHub, Google), multi-tenancy, and secure session management. The monorepo has two distinct tiers:
- `apps/web`: Next.js 16 (React 19) frontend.
- `apps/api`: NestJS 12 backend owning business logic and database access.

We need a clear session validation architecture that satisfies:
1. No duplicated business logic or auth code.
2. Protection against CSRF, session hijacking, and unauthorized access.
3. Fast API guard verification without unnecessary network overhead.

## Decision
1. **Engine Host:** Better Auth is instantiated inside **`apps/api` (NestJS)** using the official Prisma adapter, mounting its handlers under `/api/v1/auth/*`.
2. **Session Transport:**
   - Web clients exchange HTTP-only, `SameSite=Lax`, `Secure` cookies.
   - Cross-origin development utilizes explicit CORS with `credentials: true`.
3. **Session Verification in NestJS:**
   - A custom NestJS `SessionAuthGuard` parses the incoming session cookie using Better Auth's `auth.api.getSession({ headers })`.
   - The verified session and user record are attached to the `Request` object as `req.user`.
4. **Next.js Client Integration:**
   - `apps/web` utilizes `createAuthClient` from `@better-auth/client` configured with `baseURL = process.env.NEXT_PUBLIC_API_URL`.
   - Next.js Server Components and client hooks read the session directly from the client SDK or via an internal API proxy.

## Consequences
- **Positive:** Centralized auth logic in NestJS with zero schema duplication. Secure cookies prevent client-side token leakage.
- **Negative:** Requires precise CORS and cookie domain configuration in staging and production environments.
