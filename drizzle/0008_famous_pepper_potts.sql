CREATE TABLE IF NOT EXISTS "rate_limit_buckets" (
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"scope" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rate_limit_buckets_workspace_id_user_id_scope_window_start_pk" PRIMARY KEY("workspace_id","user_id","scope","window_start")
);
--> statement-breakpoint
ALTER TABLE "rate_limit_buckets" DROP CONSTRAINT IF EXISTS "rate_limit_buckets_workspace_id_workspaces_id_fk";--> statement-breakpoint
ALTER TABLE "rate_limit_buckets" ADD CONSTRAINT "rate_limit_buckets_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_limit_buckets" DROP CONSTRAINT IF EXISTS "rate_limit_buckets_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "rate_limit_buckets" ADD CONSTRAINT "rate_limit_buckets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;