CREATE TABLE IF NOT EXISTS "evaluation_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dataset_version" text NOT NULL,
	"external_case_id" text NOT NULL,
	"listing_snapshot" jsonb NOT NULL,
	"baseline_snapshot" jsonb,
	"reviewed_label" text NOT NULL,
	"reviewer_evidence_ref" text NOT NULL,
	"provenance" jsonb NOT NULL,
	"ambiguous" integer DEFAULT 0 NOT NULL,
	"reviewed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "evaluation_cases_dataset_external_case_unique" ON "evaluation_cases" USING btree ("dataset_version","external_case_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "evaluation_cases_dataset_idx" ON "evaluation_cases" USING btree ("dataset_version");