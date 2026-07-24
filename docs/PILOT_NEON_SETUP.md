# BrandArmor Pilot Database Setup

This document prepares the approved pilot foundation. It does not turn the current hosted app into a pilot until the database, private storage, authentication, and durable-job acceptance tests are complete.

## Current safe posture

Keep the deployed app in controlled demo mode until cutover:

```text
BRANDARMOR_RUNTIME_MODE=controlled_demo
```

This keeps seeded evidence readable while blocking all API mutations and provider-backed runs.

## 1. Connect Neon securely

Use the Neon connection card in the agent workspace rather than posting a connection string in chat.

Create or select a Neon project and create these branches:

- `main` for the eventual production/pilot database
- `preview` for pull-request validation

Create a clean pilot database. Do not import the existing `/tmp` demo records, synthetic listing labels, or evaluation fixtures.

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

Run the migration only against the clean Neon pilot database:

```text
npm run db:migrate
```

## 4. Private screenshot and report storage

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

## 5. Durable investigation jobs

Create an Inngest app after Neon is connected. Its durable function will receive an investigation ID, persist each stage outcome, use idempotency and provider fingerprints, and terminalize provider failures as `completed_partial` rather than leaving a browser request open.

The browser will create or reuse an investigation and poll a status endpoint. It will not wait for OCR plus a judge call in one request.

## 6. Before enabling pilot writes

Do not switch `BRANDARMOR_RUNTIME_MODE` away from `controlled_demo` until all of these pass:

1. authenticated user can create a listing with one private screenshot
2. a fresh session reads the same listing, evidence, score, review, and report
3. duplicate Run Pipeline submissions create one logical investigation
4. provider timeout yields a clear persisted partial result
5. an evaluation label cannot appear in operational rows, judge payloads, or reports
6. missing evidence lowers confidence without adding counterfeit risk
7. workspace A cannot read or mutate workspace B data
8. report version, retention, and deletion behavior are verified
