import { getBrands, getListings, isDataDirWritable, seedDemoData } from "@/persistence/store";
import { beginDeterministicIds, endDeterministicIds } from "@/lib/utils";

// Demo auto-seed
// ---------------
// On Vercel / serverless the data directory is /tmp, which is ephemeral and
// per-instance: any seeded demo data disappears when the instance recycles,
// leaving visitors (and hackathon judges) an empty workspace.
//
// ensureDemoSeeded() repopulates the idempotent demo dataset whenever the store
// is empty. seedDemoData() upserts brands/products and skips listings that already
// exist, so calling this repeatedly is safe.
//
// IMPORTANT: seeding runs inside beginDeterministicIds()/endDeterministicIds() so
// every instance generates IDENTICAL ids for the seeded brands/products/listings.
// Without that, each instance would seed with different random ids and deep links
// like /listings/<id> would intermittently 404 ("Listing not found") depending on
// which serverless instance served the request.
//
// Behaviour:
//   - BRANDARMOR_AUTO_SEED=1  -> always enabled (e.g. local testing)
//   - BRANDARMOR_AUTO_SEED=0  -> always disabled (e.g. a real production tenant)
//   - unset                   -> enabled automatically on serverless (Vercel/Lambda)

let _inFlight = false;

function autoSeedEnabled(): boolean {
  const flag = process.env.BRANDARMOR_AUTO_SEED;
  if (flag === "1") return true;
  if (flag === "0") return false;
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

export function isStoreEmpty(): boolean {
  return getBrands().length === 0 && getListings().length === 0;
}

export function ensureDemoSeeded(): { seeded: boolean; reason?: string } {
  if (!autoSeedEnabled()) return { seeded: false, reason: "disabled" };
  if (_inFlight) return { seeded: false, reason: "in_flight" };
  if (!isDataDirWritable()) return { seeded: false, reason: "data_dir_not_writable" };
  if (!isStoreEmpty()) return { seeded: false, reason: "already_populated" };
  try {
    _inFlight = true;
    // Deterministic ids -> every instance seeds the same ids -> deep links resolve everywhere.
    beginDeterministicIds();
    try {
      seedDemoData();
    } finally {
      endDeterministicIds();
    }
    return { seeded: true };
  } catch (err) {
    return { seeded: false, reason: err instanceof Error ? err.message : "seed_failed" };
  } finally {
    _inFlight = false;
  }
}
