-- BrandArmor PR #8 Production schema hotfix
-- Run this only in the Neon PRODUCTION branch/database selected by Vercel Production DATABASE_URL.
-- It is idempotent for the PR #8 additions and does not copy Preview QA data.

BEGIN;

-- One durable review decision per investigation.
CREATE UNIQUE INDEX IF NOT EXISTS review_decisions_investigation_unique
  ON review_decisions USING btree (investigation_id);

-- Isolated reviewed-holdout evaluation cases. This table remains separate from
-- operational listings, evidence, scoring, judges, and reports.
CREATE TABLE IF NOT EXISTS evaluation_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  dataset_version text NOT NULL,
  external_case_id text NOT NULL,
  listing_snapshot jsonb NOT NULL,
  baseline_snapshot jsonb,
  reviewed_label text NOT NULL,
  reviewer_evidence_ref text NOT NULL,
  provenance jsonb NOT NULL,
  ambiguous integer DEFAULT 0 NOT NULL,
  reviewed_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS evaluation_cases_workspace_dataset_external_case_unique
  ON evaluation_cases (workspace_id, dataset_version, external_case_id);
CREATE INDEX IF NOT EXISTS evaluation_cases_workspace_dataset_idx
  ON evaluation_cases (workspace_id, dataset_version);

-- Deduplicate private asset retries by file hash.
CREATE UNIQUE INDEX IF NOT EXISTS case_assets_workspace_listing_sha_unique
  ON case_assets (workspace_id, listing_id, sha256);

-- Atomic pilot rate-limit buckets.
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope text NOT NULL,
  window_start timestamp with time zone NOT NULL,
  count integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (workspace_id, user_id, scope, window_start)
);

-- Lease prevents concurrent provider execution.
ALTER TABLE investigations
  ADD COLUMN IF NOT EXISTS lease_expires_at timestamp with time zone;

COMMIT;

-- Smoke check: all five rows should return true.
SELECT
  to_regclass('public.evaluation_cases') IS NOT NULL AS evaluation_cases_ready,
  to_regclass('public.rate_limit_buckets') IS NOT NULL AS rate_limit_buckets_ready,
  EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'review_decisions_investigation_unique') AS review_index_ready,
  EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'case_assets_workspace_listing_sha_unique') AS asset_index_ready,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'investigations' AND column_name = 'lease_expires_at'
  ) AS investigation_lease_ready;
