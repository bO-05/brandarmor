DROP INDEX IF EXISTS "evaluation_cases_dataset_external_case_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "evaluation_cases_dataset_idx";--> statement-breakpoint
ALTER TABLE "evaluation_cases" ADD COLUMN IF NOT EXISTS "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "evaluation_cases" ALTER COLUMN "workspace_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "evaluation_cases" DROP CONSTRAINT IF EXISTS "evaluation_cases_workspace_id_workspaces_id_fk";--> statement-breakpoint
ALTER TABLE "evaluation_cases" ADD CONSTRAINT "evaluation_cases_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "evaluation_cases_workspace_dataset_external_case_unique" ON "evaluation_cases" USING btree ("workspace_id","dataset_version","external_case_id");--> statement-breakpoint
CREATE INDEX "evaluation_cases_workspace_dataset_idx" ON "evaluation_cases" USING btree ("workspace_id","dataset_version");