CREATE TYPE "public"."evidence_collection_status" AS ENUM('collected', 'unavailable', 'failed', 'not_requested');--> statement-breakpoint
CREATE TYPE "public"."investigation_stage" AS ENUM('intake', 'ocr', 'regulatory', 'visual', 'scoring', 'judge', 'human_review', 'report');--> statement-breakpoint
CREATE TYPE "public"."investigation_stage_status" AS ENUM('pending', 'running', 'succeeded', 'partial', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."investigation_status" AS ENUM('queued', 'running', 'waiting_for_human', 'completed', 'completed_partial', 'failed_terminal', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."provider_mode" AS ENUM('live', 'mock', 'unavailable');--> statement-breakpoint
CREATE TYPE "public"."provider_outcome" AS ENUM('matched', 'no_match', 'partial', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."report_lifecycle_status" AS ENUM('active', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."score_confidence" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."workspace_role" AS ENUM('admin', 'reviewer');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"correlation_id" text NOT NULL,
	"safe_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"website_url" text,
	"logo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"provenance" text NOT NULL,
	"retention_until" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "case_assets_object_key_unique" UNIQUE("object_key")
);
--> statement-breakpoint
CREATE TABLE "evidence_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"investigation_id" uuid NOT NULL,
	"provider_run_id" uuid,
	"evidence_type" text NOT NULL,
	"field_name" text NOT NULL,
	"extracted_value" text,
	"raw_object_key" text,
	"confidence_basis_points" integer,
	"collection_status" "evidence_collection_status" NOT NULL,
	"provenance" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evidence_items_no_evaluation_labels" CHECK (lower("evidence_items"."field_name") not in ('groundtruth', 'ground_truth', 'evaluationlabel', 'evaluation_label'))
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"key" text NOT NULL,
	"request_hash" text NOT NULL,
	"response_status" integer,
	"response_body" jsonb,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investigation_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"investigation_id" uuid NOT NULL,
	"stage" "investigation_stage" NOT NULL,
	"status" "investigation_stage_status" DEFAULT 'pending' NOT NULL,
	"attempt" integer DEFAULT 0 NOT NULL,
	"input_fingerprint" text NOT NULL,
	"lease_expires_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"safe_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investigations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"product_baseline_id" uuid,
	"listing_snapshot" jsonb NOT NULL,
	"baseline_snapshot" jsonb,
	"status" "investigation_status" DEFAULT 'queued' NOT NULL,
	"input_fingerprint" text NOT NULL,
	"requested_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"product_baseline_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"price" integer,
	"currency" varchar(3) DEFAULT 'IDR' NOT NULL,
	"seller_name" text,
	"marketplace" text,
	"listing_url" text,
	"normalized_listing_url" text,
	"image_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_confidence_basis_points" integer DEFAULT 6000 NOT NULL,
	"rights_status" text DEFAULT 'unknown' NOT NULL,
	"limitations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"raw_source" jsonb,
	"source_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"topic" text NOT NULL,
	"payload" jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_baselines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"brand_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"sku" text,
	"msrp" integer,
	"msrp_currency" varchar(3) DEFAULT 'IDR' NOT NULL,
	"msrp_min" integer,
	"msrp_max" integer,
	"description" text,
	"official_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"official_image_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"required_keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"suspicious_terms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"counterfeit_terms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"authorized_sellers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"packaging_notes" text,
	"label_notes" text,
	"reference_image_notes" text,
	"category" text DEFAULT 'skincare_cosmetics' NOT NULL,
	"variant" text,
	"size_label" text,
	"bpom_nie" text,
	"ingredients_highlights" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"packaging_claims" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"investigation_stage_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_version" text,
	"mode" "provider_mode" NOT NULL,
	"outcome" "provider_outcome" NOT NULL,
	"request_fingerprint" text NOT NULL,
	"safe_error" text,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"investigation_id" uuid NOT NULL,
	"score_snapshot_id" uuid,
	"review_decision_id" uuid,
	"version" integer NOT NULL,
	"report_json" jsonb NOT NULL,
	"report_object_key" text,
	"content_hash" text NOT NULL,
	"lifecycle_status" "report_lifecycle_status" DEFAULT 'active' NOT NULL,
	"retention_until" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"investigation_id" uuid NOT NULL,
	"score_snapshot_id" uuid,
	"status" text NOT NULL,
	"reviewer_user_id" uuid,
	"notes" text,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "score_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"investigation_id" uuid NOT NULL,
	"evidence_set_hash" text NOT NULL,
	"scoring_version" text NOT NULL,
	"risk_score" integer NOT NULL,
	"evidence_completeness_basis_points" integer NOT NULL,
	"confidence" "score_confidence" NOT NULL,
	"risk_level" text NOT NULL,
	"recommended_action" text NOT NULL,
	"reasons" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_subject" text NOT NULL,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_external_subject_unique" UNIQUE("external_subject")
);
--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "workspace_role" DEFAULT 'reviewer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_members_workspace_id_user_id_pk" PRIMARY KEY("workspace_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brands" ADD CONSTRAINT "brands_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_assets" ADD CONSTRAINT "case_assets_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_assets" ADD CONSTRAINT "case_assets_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_items" ADD CONSTRAINT "evidence_items_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_items" ADD CONSTRAINT "evidence_items_investigation_id_investigations_id_fk" FOREIGN KEY ("investigation_id") REFERENCES "public"."investigations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_items" ADD CONSTRAINT "evidence_items_provider_run_id_provider_runs_id_fk" FOREIGN KEY ("provider_run_id") REFERENCES "public"."provider_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investigation_stages" ADD CONSTRAINT "investigation_stages_investigation_id_investigations_id_fk" FOREIGN KEY ("investigation_id") REFERENCES "public"."investigations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_product_baseline_id_product_baselines_id_fk" FOREIGN KEY ("product_baseline_id") REFERENCES "public"."product_baselines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_product_baseline_id_product_baselines_id_fk" FOREIGN KEY ("product_baseline_id") REFERENCES "public"."product_baselines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_baselines" ADD CONSTRAINT "product_baselines_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_baselines" ADD CONSTRAINT "product_baselines_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_runs" ADD CONSTRAINT "provider_runs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_runs" ADD CONSTRAINT "provider_runs_investigation_stage_id_investigation_stages_id_fk" FOREIGN KEY ("investigation_stage_id") REFERENCES "public"."investigation_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_versions" ADD CONSTRAINT "report_versions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_versions" ADD CONSTRAINT "report_versions_investigation_id_investigations_id_fk" FOREIGN KEY ("investigation_id") REFERENCES "public"."investigations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_versions" ADD CONSTRAINT "report_versions_score_snapshot_id_score_snapshots_id_fk" FOREIGN KEY ("score_snapshot_id") REFERENCES "public"."score_snapshots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_versions" ADD CONSTRAINT "report_versions_review_decision_id_review_decisions_id_fk" FOREIGN KEY ("review_decision_id") REFERENCES "public"."review_decisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_decisions" ADD CONSTRAINT "review_decisions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_decisions" ADD CONSTRAINT "review_decisions_investigation_id_investigations_id_fk" FOREIGN KEY ("investigation_id") REFERENCES "public"."investigations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_decisions" ADD CONSTRAINT "review_decisions_score_snapshot_id_score_snapshots_id_fk" FOREIGN KEY ("score_snapshot_id") REFERENCES "public"."score_snapshots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_decisions" ADD CONSTRAINT "review_decisions_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_snapshots" ADD CONSTRAINT "score_snapshots_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_snapshots" ADD CONSTRAINT "score_snapshots_investigation_id_investigations_id_fk" FOREIGN KEY ("investigation_id") REFERENCES "public"."investigations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_workspace_created_idx" ON "audit_events" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "brands_workspace_name_unique" ON "brands" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE INDEX "brands_workspace_idx" ON "brands" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "case_assets_listing_idx" ON "case_assets" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "case_assets_workspace_idx" ON "case_assets" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "evidence_items_investigation_provider_field_unique" ON "evidence_items" USING btree ("investigation_id","provider_run_id","field_name");--> statement-breakpoint
CREATE INDEX "evidence_items_investigation_idx" ON "evidence_items" USING btree ("investigation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_keys_workspace_endpoint_key_unique" ON "idempotency_keys" USING btree ("workspace_id","endpoint","key");--> statement-breakpoint
CREATE UNIQUE INDEX "investigation_stages_stage_fingerprint_unique" ON "investigation_stages" USING btree ("investigation_id","stage","input_fingerprint");--> statement-breakpoint
CREATE INDEX "investigation_stages_claim_idx" ON "investigation_stages" USING btree ("status","lease_expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "investigations_workspace_fingerprint_unique" ON "investigations" USING btree ("workspace_id","input_fingerprint");--> statement-breakpoint
CREATE INDEX "investigations_listing_idx" ON "investigations" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "investigations_workspace_status_idx" ON "investigations" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "listings_workspace_normalized_url_unique" ON "listings" USING btree ("workspace_id","normalized_listing_url");--> statement-breakpoint
CREATE INDEX "listings_workspace_idx" ON "listings" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "listings_product_baseline_idx" ON "listings" USING btree ("product_baseline_id");--> statement-breakpoint
CREATE INDEX "outbox_events_unpublished_idx" ON "outbox_events" USING btree ("published_at","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "product_baselines_workspace_brand_name_version_unique" ON "product_baselines" USING btree ("workspace_id","brand_id","name","version");--> statement-breakpoint
CREATE INDEX "product_baselines_workspace_idx" ON "product_baselines" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "product_baselines_brand_idx" ON "product_baselines" USING btree ("brand_id");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_runs_stage_request_fingerprint_unique" ON "provider_runs" USING btree ("investigation_stage_id","request_fingerprint");--> statement-breakpoint
CREATE INDEX "provider_runs_workspace_idx" ON "provider_runs" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "report_versions_investigation_version_unique" ON "report_versions" USING btree ("investigation_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "report_versions_investigation_content_hash_unique" ON "report_versions" USING btree ("investigation_id","content_hash");--> statement-breakpoint
CREATE INDEX "report_versions_workspace_idx" ON "report_versions" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "review_decisions_investigation_idx" ON "review_decisions" USING btree ("investigation_id");--> statement-breakpoint
CREATE INDEX "review_decisions_workspace_idx" ON "review_decisions" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "score_snapshots_investigation_evidence_hash_unique" ON "score_snapshots" USING btree ("investigation_id","evidence_set_hash");--> statement-breakpoint
CREATE INDEX "score_snapshots_workspace_idx" ON "score_snapshots" USING btree ("workspace_id");