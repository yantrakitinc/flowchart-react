# GOOGLE_FIREBASE_STANDARDS — detail

Why each rule in `GOOGLE_FIREBASE_STANDARDS.md` exists. Read when changing a rule.

## Why this standard exists at all

Firebase is the default cloud platform for NoSQL document storage (Firestore), file storage (Cloud Storage), analytics, and auth. Projects on this machine that use any of those services follow this standard. Projects that use Postgres + custom auth follow the Postgres + AUTHORIZATION_STANDARDS path instead.

The two paths coexist. A project doesn't mix them: it's a Firebase project OR a Postgres project, not both. The decision is made at project setup; the standard documents the Firebase path.

## ZERO client-side Firebase — why server-side only

Three reasons no client-side Firebase ever ships:

1. **Credentials leak.** A Firebase Client SDK in the browser carries the project's web API key. That key isn't a "secret" per Firebase docs, but it gates Firestore Security Rules at the network edge. Any logic that lives in the client is bypassable by an attacker editing the JS. Auth bypass + Firestore Rule bypass = data exposure.

2. **Server-side authorization can't apply.** The bar is server-side authorization (AUTHORIZATION_STANDARDS Layer A + Layer B). Client-side Firestore reads bypass Layer A entirely. The principal-scoping check the server performs disappears.

3. **Chat-agent operability.** A chat agent driving the site from outside (Chrome extension, future CLI) needs every operation to be a server endpoint it can call. Client-side Firebase calls are invisible to a non-browser agent; they vanish from the surface the agent can reach.

The rule: ALL Firebase operations go through the server-side Firebase Admin SDK. The browser never sees a Firebase SDK.

## Auth flow — NextAuth+Firebase or PASETO+Drizzle

Projects using Firebase Auth get NextAuth v5 (Auth.js) with the Google provider. Authorization-code flow specifically — never popup, because popup-blocked browsers + agents can't drive popup windows reliably.

For projects on Postgres without Firebase Auth: use the custom PASETO + Drizzle path documented in AUTHORIZATION_STANDARDS.md. Don't mix the two. A project that uses Firebase Auth doesn't get to also use PASETO; a project on PASETO doesn't get to half-import NextAuth.

The 9-step flow ends with a server-issued HttpOnly cookie. Same property as the PASETO path: the token never reaches JS-readable storage. The Chrome-extension agent can't read it; the client can call APIs but never sees the token.

## Env vars — strict separation of public + server-only

The `NEXT_PUBLIC_` prefix in Next.js INCLUDES the variable in the client bundle. Anything with that prefix is shipped to the browser. So `NEXT_PUBLIC_` only goes on values that are safe to expose (project ID, GA measurement ID, env prefix — all public by design).

`FIREBASE_ADMIN_SERVICE_ACCOUNT`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET` — all server-only. Prefixing any of these with `NEXT_PUBLIC_` ships them to the browser; that's a credential leak.

The `echo` ban for Vercel env vars: `echo` adds a trailing newline + may interpret backslashes. Multi-line values (service account JSON, RSA keys) get corrupted. `printf '%s'` preserves the byte-for-byte input. Same advice carries to any host's env-var entry tool.

## File layout — Firebase Admin at the DB layer

`src/db/firebase-admin.ts` is the server-side Admin SDK initializer. It holds the credentials, validates the service account on first call, exposes a typed client.

The banned `src/lib/firebase-client.ts` is the conventional entry point for the client SDK. Banning the file name catches the regression — a future contributor who forgets the rule and adds `src/lib/firebase-client.ts` triggers the convention review.

## Cookies — Server Action / Route Handler only

Next.js's `cookieStore.set()` works in Server Actions + Route Handlers but is a no-op in Server Components. Setting a cookie in a Server Component silently fails — the browser never receives it. Banning `cookieStore.set()` in Server Components catches the foot-gun before it ships.

The single-cookie rule (NextAuth's session cookie is the ONLY auth cookie) exists because parallel cookies drift. Two cookies that claim to track the same session WILL get out of sync; whichever one the server consults first wins, and the other one's value becomes a phantom. Don't have two.

## Proxy — Next.js 16+ convention

`src/proxy.ts` with an exported `proxy` function is the convention (`middleware.ts` is not used). Don't use middleware.ts in Next.js 16+; the runtime treats them differently, and `proxy.ts` is the canonical name going forward.

Public routes are deliberately tiny:
- `/` — landing page (usually a sign-in pitch or marketing surface).
- `/api/auth/*` — NextAuth callbacks must be public so OAuth can hit them.
- `/_next/*` — Next.js framework assets.
- `/favicon` — browser's automatic request.

EVERY OTHER ROUTE requires a session. The proxy redirects unauthenticated requests to the sign-in page. Broadening the allowlist (e.g., adding `/api/public-thing/*`) is banned for API routes because it normalizes the "this one's safe" carve-out that eventually becomes a security incident.

## Authorization — permission slugs, not email allowlists

Authorization is permission-slug-based via AUTHORIZATION_STANDARDS — never an email allowlist (no `NEXT_PUBLIC_ADMIN_EMAILS` env-var, no `isEmailAllowed(email)` check). The flow:

- A user authenticates (via NextAuth+Firebase or PASETO+Drizzle).
- Their identity gets a principal in the same `users` table that any Postgres project would have.
- Their roles + permissions live in the same tables (`user_roles`, `role_permissions`, `permissions`).
- Layer A + Layer B enforce.

Why kill the allowlist? Two reasons:
1. **Drift.** The env var lists initial admins. The Firestore collection lists invited users. They get out of sync; an "ex-admin" stays in the env var; a new admin gets added to Firestore but forgotten in env. Permission slugs centralize the source of truth.
2. **Granularity.** "Admin" is binary; the email is in or out. Permission slugs are per-operation. The user with `users:read` but not `users:delete` is impossible to express as an allowlist; trivial as slugs.

## Per-project Firebase setup

Each project gets its own Firebase project. Never shared. Two reasons:

1. **Blast radius.** A Firestore Security Rule mistake affects one project, not all. A leaked service account compromises one project, not all.
2. **Quota separation.** Firebase quotas (reads/writes per day, storage GB) are per-project. Shared projects hit limits unpredictably.

The 7-step setup is the minimum to get a Firebase project usable + recorded. Step 7 (capture project name + dashboard URL + OAuth client info in memory + `reference.md`) is the audit anchor — future sessions know where to look.

The service-account JSON commit ban is sharp: that file is the keys-to-the-kingdom for the Firebase project. Committing it = full compromise. `.firebase-admin-key.json` lives in `.gitignore`; the value reaches the server via `FIREBASE_ADMIN_SERVICE_ACCOUNT` env var.

Last updated: 2026-05-20T04:06:03Z
