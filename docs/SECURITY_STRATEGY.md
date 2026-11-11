# Workflow AI — Security Strategy & OWASP Top 10 Enforcement

## 1. Core Threat Model & Security Principles
Workflow AI hosts proprietary product roadmaps, source-code references, technical briefs, and team metrics.
Tenant isolation must be mathematically provable and architecturally enforced across all requests, background workers, and AI pipelines.

---

## 2. OWASP Top 10 (2021) Mitigation Matrix

| OWASP Top 10 Vulnerability | Primary Threat in Workflow AI | Mitigation Strategy |
| :--- | :--- | :--- |
| **A01: Broken Access Control (BOLA/IDOR)** | User modifies issue or reads roadmap belonging to another workspace by guessing UUIDs. | **WorkspaceAccessGuard & Scoped Queries:** Every NestJS handler extracts tenant context from verified session memberships, appending `workspaceId` to all database read/write queries. Route-level IDs are checked against tenant ownership. |
| **A02: Cryptographic Failures** | Exposed database credentials, plaintext OAuth tokens, or unencrypted webhooks. | **AES-256-GCM** encryption at rest for third-party OAuth access tokens and integration secrets. TLS 1.3 in transit. Zero plaintext secrets in code or git. |
| **A03: Injection (SQL, XSS, Command)** | Malicious SQL inputs or stored XSS in rich markdown descriptions. | **Prisma Parameterized Queries:** Zero raw string concatenation in SQL queries. Frontend uses strict markdown sanitization (`rehype-sanitize`) to prevent XSS. |
| **A04: Insecure Design** | Circular dependency deadlocks, race conditions in issue numbering, unconstrained AI mutations. | Atomic counter transactions for issue numbering; depth-first cycle detection on dependencies; mandatory human confirmation for AI write actions. |
| **A05: Security Misconfiguration** | Permissive CORS (`*`), default passwords, verbose stack traces in production. | Strict CORS allowlist matching frontend domain; production error masking via `GlobalExceptionFilter` (RFC 7807); hardened HTTP security headers via `helmet`. |
| **A06: Vulnerable and Outdated Components** | Outdated packages in monorepo with known CVEs. | Automated Dependabot & `npm audit` gating in CI/CD pipeline. Pinned package versions. |
| **A07: Identification and Authentication Failures** | Session hijacking, weak passwords, brute-force attacks. | Better Auth with secure, `HttpOnly`, `SameSite=Lax` cookies; rate limiting on auth endpoints (5 attempts per minute); session revocation on sign-out. |
| **A08: Software and Data Integrity Failures** | Untrusted webhook payloads (GitHub/GitLab) or deserialization exploits. | **HMAC-SHA256 signature verification** on all inbound webhooks before parsing. Zod schema validation on all inputs. |
| **A09: Security Logging and Monitoring Failures** | Undetected unauthorized access attempts or privilege escalation. | Structured JSON audit logging (`Winston`/`Pino`) recording user ID, tenant ID, IP, action, and timestamp for all mutating operations. |
| **A10: Server-Side Request Forgery (SSRF)** | User specifies arbitrary webhook URLs or image proxy endpoints. | Strict validation of outbound webhook destination URLs; block RFC 1918 private IP ranges (`127.0.0.1`, `10.0.0.0/8`, `192.168.0.0/16`, AWS metadata `169.254.169.254`). |

---

## 3. OWASP Top 10 for Large Language Models (LLM Security)

| LLM Vulnerability | Application Context in Workflow AI | Mitigation Strategy |
| :--- | :--- | :--- |
| **LLM01: Prompt Injection** | Malicious text in imported meeting notes or customer tickets overriding system instructions. | **Strict Input Boundary Isolation:** Untrusted user input is enclosed in demarcated XML delimiters (`<user_content>...</user_content>`). System instructions explicitly forbid tool execution based on instructions inside user tags. |
| **LLM02: Insecure Output Handling** | Model emits executable scripts or malformed Markdown that executes in client browsers. | **Zod Schema Validation:** Output must parse into structured JSON matching strict Zod schemas. Rendered output is sanitized before display. |
| **LLM06: Sensitive Information Disclosure** | Model training or cross-tenant data leakage via prompt context. | Zero tenant data sharing across workspaces; queries to LLM contain only the current workspace's authorized context; zero-retention agreements enabled with model providers. |
| **LLM08: Excessive Agency** | Model given autonomous write privileges to create or delete issues without approval. | **Zero Autonomous Mutations:** All state-modifying actions require explicit two-phase commit: the model generates an actionable plan, and the user must click "Confirm & Apply". |

---

## 4. RBAC Permission Matrix

| Role | Manage Workspace | Invite/Remove Users | Create/Edit Projects | Create/Edit Issues | Move Issues / Comment | View Only |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Owner** | Yes | Yes | Yes | Yes | Yes | Yes |
| **Admin** | No | Yes (Non-Owners) | Yes | Yes | Yes | Yes |
| **Member** | No | No | Yes | Yes | Yes | Yes |
| **Viewer** | No | No | No | No | Yes (Comments only) | Yes |
