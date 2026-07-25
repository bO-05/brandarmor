import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const createdAt = timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => sql`clock_timestamp()`);

export const workspaceRole = pgEnum("workspace_role", ["admin", "reviewer"]);
export const investigationStatus = pgEnum("investigation_status", [
  "queued",
  "running",
  "waiting_for_human",
  "completed",
  "completed_partial",
  "failed_terminal",
  "cancelled",
]);
export const investigationStage = pgEnum("investigation_stage", [
  "intake",
  "ocr",
  "regulatory",
  "visual",
  "scoring",
  "judge",
  "human_review",
  "report",
]);
export const investigationStageStatus = pgEnum("investigation_stage_status", [
  "pending",
  "running",
  "succeeded",
  "partial",
  "failed",
  "skipped",
]);
export const providerMode = pgEnum("provider_mode", ["live", "mock", "unavailable"]);
export const providerOutcome = pgEnum("provider_outcome", [
  "matched",
  "no_match",
  "partial",
  "failed",
  "skipped",
]);
export const evidenceCollectionStatus = pgEnum("evidence_collection_status", [
  "collected",
  "unavailable",
  "failed",
  "not_requested",
]);
export const scoreConfidence = pgEnum("score_confidence", ["low", "medium", "high"]);
export const reportLifecycleStatus = pgEnum("report_lifecycle_status", ["active", "deleted"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  externalSubject: text("external_subject").notNull().unique(),
  displayName: text("display_name"),
  createdAt,
  updatedAt,
});

export const workspaces = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  externalOrganizationId: text("external_organization_id").notNull().unique(),
  name: text("name").notNull(),
  createdAt,
  updatedAt,
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: workspaceRole("role").notNull().default("reviewer"),
    createdAt,
  },
  (table) => [primaryKey({ columns: [table.workspaceId, table.userId] })],
);

export const brands = pgTable(
  "brands",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    websiteUrl: text("website_url"),
    logoUrl: text("logo_url"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("brands_id_workspace_unique").on(table.id, table.workspaceId),
    uniqueIndex("brands_workspace_name_unique").on(table.workspaceId, table.name),
    index("brands_workspace_idx").on(table.workspaceId),
  ],
);

export const productBaselines = pgTable(
  "product_baselines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    brandId: uuid("brand_id").notNull(),
    version: integer("version").notNull().default(1),
    name: text("name").notNull(),
    sku: text("sku"),
    msrp: integer("msrp"),
    msrpCurrency: varchar("msrp_currency", { length: 3 }).notNull().default("IDR"),
    msrpMin: integer("msrp_min"),
    msrpMax: integer("msrp_max"),
    description: text("description"),
    officialUrls: jsonb("official_urls").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    officialImageUrls: jsonb("official_image_urls").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    requiredKeywords: jsonb("required_keywords").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    suspiciousTerms: jsonb("suspicious_terms").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    counterfeitTerms: jsonb("counterfeit_terms").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    authorizedSellers: jsonb("authorized_sellers").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    packagingNotes: text("packaging_notes"),
    labelNotes: text("label_notes"),
    referenceImageNotes: text("reference_image_notes"),
    category: text("category").notNull().default("skincare_cosmetics"),
    variant: text("variant"),
    sizeLabel: text("size_label"),
    bpomNie: text("bpom_nie"),
    ingredientsHighlights: jsonb("ingredients_highlights").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    packagingClaims: jsonb("packaging_claims").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("product_baselines_id_workspace_unique").on(table.id, table.workspaceId),
    uniqueIndex("product_baselines_workspace_brand_name_version_unique").on(table.workspaceId, table.brandId, table.name, table.version),
    index("product_baselines_workspace_idx").on(table.workspaceId),
    index("product_baselines_brand_idx").on(table.brandId),
    foreignKey({
      columns: [table.brandId, table.workspaceId],
      foreignColumns: [brands.id, brands.workspaceId],
      name: "product_baselines_brand_workspace_fk",
    }).onDelete("restrict"),
  ],
);

export const listings = pgTable(
  "listings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    productBaselineId: uuid("product_baseline_id"),
    title: text("title").notNull(),
    description: text("description"),
    price: integer("price"),
    currency: varchar("currency", { length: 3 }).notNull().default("IDR"),
    sellerName: text("seller_name"),
    marketplace: text("marketplace"),
    listingUrl: text("listing_url"),
    normalizedListingUrl: text("normalized_listing_url"),
    imageUrls: jsonb("image_urls").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    sourceConfidence: integer("source_confidence_basis_points").notNull().default(6000),
    rightsStatus: text("rights_status").notNull().default("unknown"),
    limitations: jsonb("limitations").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
    rawSource: jsonb("raw_source"),
    sourceType: text("source_type").notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("listings_id_workspace_unique").on(table.id, table.workspaceId),
    uniqueIndex("listings_workspace_normalized_url_unique").on(table.workspaceId, table.normalizedListingUrl),
    index("listings_workspace_idx").on(table.workspaceId),
    index("listings_product_baseline_idx").on(table.productBaselineId),
    foreignKey({
      columns: [table.productBaselineId, table.workspaceId],
      foreignColumns: [productBaselines.id, productBaselines.workspaceId],
      name: "listings_product_baseline_workspace_fk",
    }).onDelete("restrict"),
  ],
);

export const caseAssets = pgTable(
  "case_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id").notNull(),
    objectKey: text("object_key").notNull().unique(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: text("sha256").notNull(),
    provenance: text("provenance").notNull(),
    retentionUntil: timestamp("retention_until", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt,
  },
  (table) => [
    index("case_assets_listing_idx").on(table.listingId),
    index("case_assets_workspace_idx").on(table.workspaceId),
    foreignKey({
      columns: [table.listingId, table.workspaceId],
      foreignColumns: [listings.id, listings.workspaceId],
      name: "case_assets_listing_workspace_fk",
    }).onDelete("cascade"),
  ],
);

export const investigations = pgTable(
  "investigations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id").notNull(),
    productBaselineId: uuid("product_baseline_id"),
    listingSnapshot: jsonb("listing_snapshot").notNull(),
    baselineSnapshot: jsonb("baseline_snapshot"),
    status: investigationStatus("status").notNull().default("queued"),
    inputFingerprint: text("input_fingerprint").notNull(),
    requestedByUserId: uuid("requested_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt,
    updatedAt,
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("investigations_id_workspace_unique").on(table.id, table.workspaceId),
    uniqueIndex("investigations_workspace_fingerprint_unique").on(table.workspaceId, table.inputFingerprint),
    index("investigations_listing_idx").on(table.listingId),
    index("investigations_workspace_status_idx").on(table.workspaceId, table.status),
    foreignKey({
      columns: [table.listingId, table.workspaceId],
      foreignColumns: [listings.id, listings.workspaceId],
      name: "investigations_listing_workspace_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.productBaselineId, table.workspaceId],
      foreignColumns: [productBaselines.id, productBaselines.workspaceId],
      name: "investigations_product_baseline_workspace_fk",
    }).onDelete("restrict"),
  ],
);

export const investigationStages = pgTable(
  "investigation_stages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    investigationId: uuid("investigation_id").notNull(),
    stage: investigationStage("stage").notNull(),
    status: investigationStageStatus("status").notNull().default("pending"),
    attempt: integer("attempt").notNull().default(0),
    inputFingerprint: text("input_fingerprint").notNull(),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    safeError: text("safe_error"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("investigation_stages_id_workspace_unique").on(table.id, table.workspaceId),
    uniqueIndex("investigation_stages_stage_fingerprint_unique").on(table.investigationId, table.stage, table.inputFingerprint),
    index("investigation_stages_claim_idx").on(table.status, table.leaseExpiresAt),
    foreignKey({
      columns: [table.investigationId, table.workspaceId],
      foreignColumns: [investigations.id, investigations.workspaceId],
      name: "investigation_stages_investigation_workspace_fk",
    }).onDelete("cascade"),
  ],
);

export const providerRuns = pgTable(
  "provider_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    investigationStageId: uuid("investigation_stage_id").notNull(),
    provider: text("provider").notNull(),
    providerVersion: text("provider_version"),
    mode: providerMode("mode").notNull(),
    outcome: providerOutcome("outcome").notNull(),
    requestFingerprint: text("request_fingerprint").notNull(),
    safeError: text("safe_error"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt,
  },
  (table) => [
    uniqueIndex("provider_runs_id_workspace_unique").on(table.id, table.workspaceId),
    uniqueIndex("provider_runs_stage_request_fingerprint_unique").on(table.investigationStageId, table.requestFingerprint),
    index("provider_runs_workspace_idx").on(table.workspaceId),
    foreignKey({
      columns: [table.investigationStageId, table.workspaceId],
      foreignColumns: [investigationStages.id, investigationStages.workspaceId],
      name: "provider_runs_stage_workspace_fk",
    }).onDelete("cascade"),
  ],
);

export const evidenceItems = pgTable(
  "evidence_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    investigationId: uuid("investigation_id").notNull(),
    providerRunId: uuid("provider_run_id"),
    evidenceType: text("evidence_type").notNull(),
    fieldName: text("field_name").notNull(),
    extractedValue: text("extracted_value"),
    rawObjectKey: text("raw_object_key"),
    confidenceBasisPoints: integer("confidence_basis_points"),
    collectionStatus: evidenceCollectionStatus("collection_status").notNull(),
    provenance: text("provenance").notNull(),
    notes: text("notes"),
    createdAt,
  },
  (table) => [
    uniqueIndex("evidence_items_investigation_provider_field_unique").on(table.investigationId, table.providerRunId, table.fieldName),
    index("evidence_items_investigation_idx").on(table.investigationId),
    foreignKey({
      columns: [table.investigationId, table.workspaceId],
      foreignColumns: [investigations.id, investigations.workspaceId],
      name: "evidence_items_investigation_workspace_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.providerRunId, table.workspaceId],
      foreignColumns: [providerRuns.id, providerRuns.workspaceId],
      name: "evidence_items_provider_run_workspace_fk",
    }).onDelete("restrict"),
    check(
      "evidence_items_no_evaluation_labels",
      sql`regexp_replace(lower(${table.fieldName}), '[^a-z0-9]+', '', 'g') not in ('groundtruth', 'evaluationlabel')`,
    ),
  ],
);

export const scoreSnapshots = pgTable(
  "score_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    investigationId: uuid("investigation_id").notNull(),
    evidenceSetHash: text("evidence_set_hash").notNull(),
    scoringVersion: text("scoring_version").notNull(),
    riskScore: integer("risk_score").notNull(),
    evidenceCompletenessBasisPoints: integer("evidence_completeness_basis_points").notNull(),
    confidence: scoreConfidence("confidence").notNull(),
    riskLevel: text("risk_level").notNull(),
    recommendedAction: text("recommended_action").notNull(),
    reasons: jsonb("reasons").notNull(),
    createdAt,
  },
  (table) => [
    uniqueIndex("score_snapshots_id_workspace_unique").on(table.id, table.workspaceId),
    uniqueIndex("score_snapshots_investigation_evidence_hash_unique").on(table.investigationId, table.evidenceSetHash),
    index("score_snapshots_workspace_idx").on(table.workspaceId),
    foreignKey({
      columns: [table.investigationId, table.workspaceId],
      foreignColumns: [investigations.id, investigations.workspaceId],
      name: "score_snapshots_investigation_workspace_fk",
    }).onDelete("cascade"),
  ],
);

export const reviewDecisions = pgTable(
  "review_decisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    investigationId: uuid("investigation_id").notNull(),
    scoreSnapshotId: uuid("score_snapshot_id"),
    status: text("status").notNull(),
    reviewerUserId: uuid("reviewer_user_id").references(() => users.id, { onDelete: "set null" }),
    notes: text("notes"),
    revision: integer("revision").notNull().default(1),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("review_decisions_id_workspace_unique").on(table.id, table.workspaceId),
    uniqueIndex("review_decisions_investigation_unique").on(table.investigationId),
    index("review_decisions_investigation_idx").on(table.investigationId),
    index("review_decisions_workspace_idx").on(table.workspaceId),
    foreignKey({
      columns: [table.investigationId, table.workspaceId],
      foreignColumns: [investigations.id, investigations.workspaceId],
      name: "review_decisions_investigation_workspace_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.scoreSnapshotId, table.workspaceId],
      foreignColumns: [scoreSnapshots.id, scoreSnapshots.workspaceId],
      name: "review_decisions_score_snapshot_workspace_fk",
    }).onDelete("restrict"),
  ],
);

export const reportVersions = pgTable(
  "report_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    investigationId: uuid("investigation_id").notNull(),
    scoreSnapshotId: uuid("score_snapshot_id"),
    reviewDecisionId: uuid("review_decision_id"),
    version: integer("version").notNull(),
    reportJson: jsonb("report_json").notNull(),
    reportObjectKey: text("report_object_key"),
    contentHash: text("content_hash").notNull(),
    lifecycleStatus: reportLifecycleStatus("lifecycle_status").notNull().default("active"),
    retentionUntil: timestamp("retention_until", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt,
  },
  (table) => [
    uniqueIndex("report_versions_investigation_version_unique").on(table.investigationId, table.version),
    uniqueIndex("report_versions_investigation_content_hash_unique").on(table.investigationId, table.contentHash),
    index("report_versions_workspace_idx").on(table.workspaceId),
    foreignKey({
      columns: [table.investigationId, table.workspaceId],
      foreignColumns: [investigations.id, investigations.workspaceId],
      name: "report_versions_investigation_workspace_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.scoreSnapshotId, table.workspaceId],
      foreignColumns: [scoreSnapshots.id, scoreSnapshots.workspaceId],
      name: "report_versions_score_snapshot_workspace_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.reviewDecisionId, table.workspaceId],
      foreignColumns: [reviewDecisions.id, reviewDecisions.workspaceId],
      name: "report_versions_review_decision_workspace_fk",
    }).onDelete("restrict"),
  ],
);

export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    key: text("key").notNull(),
    requestHash: text("request_hash").notNull(),
    responseStatus: integer("response_status"),
    responseBody: jsonb("response_body"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt,
  },
  (table) => [uniqueIndex("idempotency_keys_workspace_endpoint_key_unique").on(table.workspaceId, table.endpoint, table.key)],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    correlationId: text("correlation_id").notNull(),
    safeMetadata: jsonb("safe_metadata").notNull().default(sql`'{}'::jsonb`),
    createdAt,
  },
  (table) => [index("audit_events_workspace_created_idx").on(table.workspaceId, table.createdAt)],
);

export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    topic: text("topic").notNull(),
    payload: jsonb("payload").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt,
  },
  (table) => [index("outbox_events_unpublished_idx").on(table.publishedAt, table.createdAt)],
);
