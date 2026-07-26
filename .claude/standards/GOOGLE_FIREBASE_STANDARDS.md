# GOOGLE_FIREBASE_STANDARDS

> Applies to projects using Firebase (Firestore / Storage / Analytics / Auth). Inherits from base standards (NAMING, AUTHORIZATION_STANDARDS, etc.). ---------- client-side ban ----------

```meta
version: 1
last_updated: 2026-07-11T00:00:00Z
```

## client_side

- `rule`: ZERO client-side Firebase SDK
- `banned`:
  - loading Firebase Client SDK in the browser
  - calling Firebase APIs (Auth, Firestore, Storage) from client code
- `enforcement`: all Firebase operations via server-side Firebase Admin SDK ONLY
- `enforced_by`: scripts/verify/verify-boundaries.mjs --check firebase-boundary _(pnpm verify chain; client SDK imports, banned files, NEXT_PUBLIC_FIREBASE_*/secrets, email allowlists fail)_
- `reason`: aligns with server-side-only auth memory + agent-operability bar

## auth_flow_firebase

- `applies_when`: project uses Firebase Auth (alternative path is custom PASETO + Drizzle; see AUTHORIZATION_STANDARDS.md)
- `library`: NextAuth v5 (Auth.js) Google provider
- `flow_type`: authorization-code (NOT popup)
- `steps`: 1: browser hits sign-in page → POSTs to NextAuth signin endpoint 2: NextAuth redirects browser to Google
  OAuth URL 3: user authenticates on Google 4: Google redirects to /api/auth/callback/google 5: NextAuth exchanges
  code for ID token + profile 6: server verifies token + provisions user via Firebase Admin SDK 7: server checks
  authorization via the permission-slug catalog (see AUTHORIZATION_STANDARDS.md; NOT a parallel email allowlist) 8:
  NextAuth issues session cookie (httpOnly, secure in prod, sameSite=lax, path=/) 9: subsequent requests carry the
  session cookie; identity resolved via NextAuth + Firebase Admin SDK
- `banned`: parallel auth cookies; popup-based OAuth

## env_vars

- `public`:
  - NEXT_PUBLIC_FIREBASE_PROJECT_ID
  - NEXT_PUBLIC_GA_MEASUREMENT_ID _(Google Analytics)_
  - NEXT_PUBLIC_ENV_PREFIX _(collection namespacing)_
- `server_only`:
  - FIREBASE_ADMIN_SERVICE_ACCOUNT
  - GOOGLE_APPLICATION_CREDENTIALS
  - GOOGLE_CLIENT_ID _(only when using NextAuth + Google provider)_
  - GOOGLE_CLIENT_SECRET _(same)_
  - NEXTAUTH_SECRET _(same)_
  - NEXTAUTH_URL _(same)_
- `banned`:
  - "NEXT_PUBLIC_ prefix on any server-only secret"
  - "echo-piped multi-line env vars on Vercel — use `printf '%s'`"

## file_layout

- `required`:
  - src/db/firebase-admin.ts _(server-side Admin SDK init)_
  - src/features/auth/ _(contains components/, services/, db/, actions/, __specs__/ per SOURCE_FOLDERS#per-feature-structure)_
  - src/app/api/auth/[...nextauth]/route.ts _(when NextAuth is the auth path)_
- `banned`:
  - src/lib/firebase-client.ts _(no client-side Firebase)_

## cookies

- `set_locations`: ["Server Action", "Route Handler"]
- `banned_set_locations`: ["Server Component"]
- `rule`: NextAuth's session cookie is the ONLY auth cookie; never mint a parallel cookie

## route_protection

- `file`: src/proxy.ts _(Next.js 16+ convention)_
- `banned_file`: src/middleware.ts _(legacy; never use)_
- `function_name`: proxy
- `public_routes`:
  - /
  - /api/auth/*
  - /_next/*
  - /favicon
- `default_for_other_routes`: require session
- `banned`: broadening the public allowlist beyond /api/auth/* for API routes

## authorization

- `rule`: use permission-slug catalog from AUTHORIZATION_STANDARDS.md
- `banned`:
  - env-based email allowlists (NEXT_PUBLIC_ADMIN_EMAILS)
  - Firestore-collection-based allowlists ({prefix}users.email)
- `reason`: permissions are the source of truth; allowlists drift, slugs don't

## project_setup

- `per_project`: each project gets its own Firebase project (never shared)
- `steps`: 1: Firebase Console → Add project; name `{domain}-{app}` 2: Enable Google Analytics if needed 3: Create
  Firestore database (production mode) 4: Generate service account key → save as `.firebase-admin-key.json` at project
  root → add to .gitignore 5: Configure Google Cloud OAuth consent + create OAuth client credentials (only when
  NextAuth path is used) 6: Authorized redirect URIs include production domain + local-dev domain at
  /api/auth/callback/google 7: Capture project name + dashboard URL + OAuth client info in project memory +
  reference.md

## forbidden

- Firebase Client SDK usage in browser code
- cookieStore.set() in Server Components
- NEXT_PUBLIC_ prefix on any server-only secret
- broadening proxy public allowlist beyond /api/auth/* for API routes
- committing service-account JSON
- echo-piped Vercel env vars
- parallel auth cookies
- popup-based OAuth
- email-allowlist authorization (use permission-slug catalog instead)

Last updated: 2026-07-11T00:00:00Z