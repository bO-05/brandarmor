ALTER TABLE "evidence_items" DROP CONSTRAINT "evidence_items_no_evaluation_labels";--> statement-breakpoint
ALTER TABLE "case_assets" DROP CONSTRAINT "case_assets_listing_id_listings_id_fk";
--> statement-breakpoint
ALTER TABLE "evidence_items" DROP CONSTRAINT "evidence_items_investigation_id_investigations_id_fk";
--> statement-breakpoint
ALTER TABLE "evidence_items" DROP CONSTRAINT "evidence_items_provider_run_id_provider_runs_id_fk";
--> statement-breakpoint
ALTER TABLE "investigation_stages" DROP CONSTRAINT "investigation_stages_investigation_id_investigations_id_fk";
--> statement-breakpoint
ALTER TABLE "investigations" DROP CONSTRAINT "investigations_listing_id_listings_id_fk";
--> statement-breakpoint
ALTER TABLE "investigations" DROP CONSTRAINT "investigations_product_baseline_id_product_baselines_id_fk";
--> statement-breakpoint
ALTER TABLE "listings" DROP CONSTRAINT "listings_product_baseline_id_product_baselines_id_fk";
--> statement-breakpoint
ALTER TABLE "product_baselines" DROP CONSTRAINT "product_baselines_brand_id_brands_id_fk";
--> statement-breakpoint
ALTER TABLE "provider_runs" DROP CONSTRAINT "provider_runs_investigation_stage_id_investigation_stages_id_fk";
--> statement-breakpoint
ALTER TABLE "report_versions" DROP CONSTRAINT "report_versions_investigation_id_investigations_id_fk";
--> statement-breakpoint
ALTER TABLE "report_versions" DROP CONSTRAINT "report_versions_score_snapshot_id_score_snapshots_id_fk";
--> statement-breakpoint
ALTER TABLE "report_versions" DROP CONSTRAINT "report_versions_review_decision_id_review_decisions_id_fk";
--> statement-breakpoint
ALTER TABLE "review_decisions" DROP CONSTRAINT "review_decisions_investigation_id_investigations_id_fk";
--> statement-breakpoint
ALTER TABLE "review_decisions" DROP CONSTRAINT "review_decisions_score_snapshot_id_score_snapshots_id_fk";
--> statement-breakpoint
ALTER TABLE "score_snapshots" DROP CONSTRAINT "score_snapshots_investigation_id_investigations_id_fk";
--> statement-breakpoint
ALTER TABLE "investigation_stages" ADD COLUMN "workspace_id" uuid NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "brands_id_workspace_unique" ON "brands" USING btree ("id","workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "investigation_stages_id_workspace_unique" ON "investigation_stages" USING btree ("id","workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "investigations_id_workspace_unique" ON "investigations" USING btree ("id","workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "listings_id_workspace_unique" ON "listings" USING btree ("id","workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_baselines_id_workspace_unique" ON "product_baselines" USING btree ("id","workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_runs_id_workspace_unique" ON "provider_runs" USING btree ("id","workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "review_decisions_id_workspace_unique" ON "review_decisions" USING btree ("id","workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "score_snapshots_id_workspace_unique" ON "score_snapshots" USING btree ("id","workspace_id");--> statement-breakpoint
ALTER TABLE "case_assets" ADD CONSTRAINT "case_assets_listing_workspace_fk" FOREIGN KEY ("listing_id","workspace_id") REFERENCES "public"."listings"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_items" ADD CONSTRAINT "evidence_items_investigation_workspace_fk" FOREIGN KEY ("investigation_id","workspace_id") REFERENCES "public"."investigations"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_items" ADD CONSTRAINT "evidence_items_provider_run_workspace_fk" FOREIGN KEY ("provider_run_id","workspace_id") REFERENCES "public"."provider_runs"("id","workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investigation_stages" ADD CONSTRAINT "investigation_stages_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investigation_stages" ADD CONSTRAINT "investigation_stages_investigation_workspace_fk" FOREIGN KEY ("investigation_id","workspace_id") REFERENCES "public"."investigations"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_listing_workspace_fk" FOREIGN KEY ("listing_id","workspace_id") REFERENCES "public"."listings"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_product_baseline_workspace_fk" FOREIGN KEY ("product_baseline_id","workspace_id") REFERENCES "public"."product_baselines"("id","workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_product_baseline_workspace_fk" FOREIGN KEY ("product_baseline_id","workspace_id") REFERENCES "public"."product_baselines"("id","workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_baselines" ADD CONSTRAINT "product_baselines_brand_workspace_fk" FOREIGN KEY ("brand_id","workspace_id") REFERENCES "public"."brands"("id","workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_runs" ADD CONSTRAINT "provider_runs_stage_workspace_fk" FOREIGN KEY ("investigation_stage_id","workspace_id") REFERENCES "public"."investigation_stages"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_versions" ADD CONSTRAINT "report_versions_investigation_workspace_fk" FOREIGN KEY ("investigation_id","workspace_id") REFERENCES "public"."investigations"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_versions" ADD CONSTRAINT "report_versions_score_snapshot_workspace_fk" FOREIGN KEY ("score_snapshot_id","workspace_id") REFERENCES "public"."score_snapshots"("id","workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_versions" ADD CONSTRAINT "report_versions_review_decision_workspace_fk" FOREIGN KEY ("review_decision_id","workspace_id") REFERENCES "public"."review_decisions"("id","workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_decisions" ADD CONSTRAINT "review_decisions_investigation_workspace_fk" FOREIGN KEY ("investigation_id","workspace_id") REFERENCES "public"."investigations"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_decisions" ADD CONSTRAINT "review_decisions_score_snapshot_workspace_fk" FOREIGN KEY ("score_snapshot_id","workspace_id") REFERENCES "public"."score_snapshots"("id","workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_snapshots" ADD CONSTRAINT "score_snapshots_investigation_workspace_fk" FOREIGN KEY ("investigation_id","workspace_id") REFERENCES "public"."investigations"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_items" ADD CONSTRAINT "evidence_items_no_evaluation_labels" CHECK (regexp_replace(lower("evidence_items"."field_name"), '[^a-z0-9]+', '', 'g') not in ('groundtruth', 'evaluationlabel'));--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."brandarmor_set_updated_at"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = clock_timestamp();
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "users_set_updated_at" BEFORE UPDATE ON "users" FOR EACH ROW EXECUTE FUNCTION "public"."brandarmor_set_updated_at"();--> statement-breakpoint
CREATE TRIGGER "workspaces_set_updated_at" BEFORE UPDATE ON "workspaces" FOR EACH ROW EXECUTE FUNCTION "public"."brandarmor_set_updated_at"();--> statement-breakpoint
CREATE TRIGGER "brands_set_updated_at" BEFORE UPDATE ON "brands" FOR EACH ROW EXECUTE FUNCTION "public"."brandarmor_set_updated_at"();--> statement-breakpoint
CREATE TRIGGER "product_baselines_set_updated_at" BEFORE UPDATE ON "product_baselines" FOR EACH ROW EXECUTE FUNCTION "public"."brandarmor_set_updated_at"();--> statement-breakpoint
CREATE TRIGGER "listings_set_updated_at" BEFORE UPDATE ON "listings" FOR EACH ROW EXECUTE FUNCTION "public"."brandarmor_set_updated_at"();--> statement-breakpoint
CREATE TRIGGER "investigations_set_updated_at" BEFORE UPDATE ON "investigations" FOR EACH ROW EXECUTE FUNCTION "public"."brandarmor_set_updated_at"();--> statement-breakpoint
CREATE TRIGGER "investigation_stages_set_updated_at" BEFORE UPDATE ON "investigation_stages" FOR EACH ROW EXECUTE FUNCTION "public"."brandarmor_set_updated_at"();--> statement-breakpoint
CREATE TRIGGER "review_decisions_set_updated_at" BEFORE UPDATE ON "review_decisions" FOR EACH ROW EXECUTE FUNCTION "public"."brandarmor_set_updated_at"();--> statement-breakpoint
