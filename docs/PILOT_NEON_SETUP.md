# BrandArmor Pilot Database Setup

This document prepares the approved pilot foundation. It does not turn the current hosted app into a pilot until the database, private storage, authentication, and durable-job acceptance tests are complete.

## Current safe posture

Keep the deployed app in controlled demo mode until cutover:

```text
BRANDARMOR_RUNTIME_MODE=controlled_demo
```

This keeps seeded evidence readable while blocking all API mutations and provider-backed runs.

## 1. Neon pilot project status

The clean Neon project `brandarmor` is connected in AWS ap-southeast-1. It has a protected default production branch and a `preview` branch for pull-request validation.

The tracked migrations have been applied to both clean branches. No existing `/tmp` demo records, synthetic listing labels, or evaluation fixtures were imported.

## 2. Configure database variables

Use Neon connection details to configure two environment variables in the deployment environment:

```text
DATABASE_URL=<pooled Neon runtime connection string>
DATABASE_URL_UNPOOLED=<direct Neon connection string for migrations>
```

Use the pooled URL at runtime. Use the direct URL only for tracked schema migrations.

The repository intentionally does not provide a fallback database URL. Running `npm run db:migrate` without one fails clearly instead of silently using local JSON data.

## 3. Apply the initial migration

The tracked schema lives in:

```text
src/db/schema.ts
drizzle/0000_loud_kylun.sql
drizzle/0001_fine_chimera.sql
```

It creates workspace-scoped operational tables for:

- users and workspace membership
- brands and versioned product baselines
- listings and private case assets
- investigations, stages, provider runs, and evidence items
- immutable score snapshots
- review decisions and report versions
- idempotency keys, audit events, and outbox events

Evaluation labels are deliberately absent from this operational schema. The `evidence_items` table also has a database check constraint rejecting known evaluation-label field names.

The initial migrations have already been verified on the clean Neon production and preview branches. Future tracked migrations use:

```text
npm run db:migrate
```

## 4. Application authentication and workspace roles

The Neon Managed Better Auth service remains provisioned but unused. Security research found that the currently published Neon SDK is beta, pins an older Better Auth line, and does not offer a safe, supported override path for all current advisories.

BrandArmor uses Clerk for application authentication and organization-scoped roles instead:

- Clerk Organization maps to a BrandArmor workspace through `workspaces.external_organization_id`.
- Clerk `org:admin` maps to BrandArmor admin; other approved organization members map to reviewer.
- Every pilot write must be protected in the route handler itself, then checked again against the matching Neon workspace membership. Proxy is only a session/context helper, not the authorization boundary.
- Do not set `BRANDARMOR_RUNTIME_MODE=pilot` until Clerk credentials, an organization, and server-side workspace membership synchronization are configured.

Required deployment variables are:

```text
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
```

## 5. Private screenshot and report storage

Create a **private** Vercel Blob store attached to the BrandArmor project. Do not use publicly hosted screenshot URLs.

The follow-on upload slice must:

- authenticate and authorize before issuing any upload token
- restrict image MIME types and maximum size
- store only object keys, hashes, metadata, and retention data in Postgres
- stream private files through an authorized route or short-lived signed URL
- set a pilot retention policy before inviting users

Recommended initial policy, pending user confirmation:

- screenshots and report files: 30 days
- audit-event metadata: 90 days
- authenticated deletion marks metadata deleted and removes the private object

## 6. Durable investigation jobs

Create an Inngest app after Neon is connected. Its durable function will receive an investigation ID, persist each stage outcome, use idempotency and provider fingerprints, and terminalize provider failures as `completed_partial` rather than leaving a browser request open.

The browser will create or reuse an investigation and poll a status endpoint. It will not wait for OCR plus a judge call in one request.

## 7. Before enabling pilot writes

Do not switch `BRANDARMOR_RUNTIME_MODE` away from `controlled_demo` until all of these pass:

1. Clerk-authenticated user with an active Organization maps to the correct Neon workspace role
2. authenticated user can create a listing with one private screenshot
3. a fresh session reads the same listing, evidence, score, review, and report
4. duplicate Run Pipeline submissions create one logical investigation
5. provider timeout yields a clear persisted partial result
6. an evaluation label cannot appear in operational rows, judge payloads, or reports
7. missing evidence lowers confidence without adding counterfeit risk
8. workspace A cannot read or mutate workspace B data
9. report version, retention, and deletion behavior are verified
