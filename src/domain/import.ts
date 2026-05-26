import type { InsertListing } from "./schemas";

export interface ImportResult {
  listings: InsertListing[];
  errors: ImportError[];
  total: number;
  success: number;
  failed: number;
}

export interface ImportError {
  line: number;
  field: string;
  message: string;
  raw?: unknown;
}

interface RawRecord {
  title?: string; description?: string; price?: number | string; currency?: string;
  sellerName?: string; seller_name?: string; marketplace?: string;
  listingUrl?: string; listing_url?: string;
  imageUrls?: string[]; image_urls?: string[];
  screenshotUrl?: string; screenshot_url?: string;
  sourceConfidence?: number; source_confidence?: number;
  rightsStatus?: string; rights_status?: string;
  limitations?: string[] | string;
  groundTruth?: string; ground_truth?: string;
  observedAt?: string; observed_at?: string;
  productId?: string; product_id?: string;
}

export function parseJsonImport(jsonInput: string): ImportResult {
  let parsed: unknown;
  try { parsed = JSON.parse(jsonInput); }
  catch (e) {
    return { listings: [], errors: [{ line: 0, field: "root", message: `Invalid JSON: ${(e as Error).message}` }], total: 0, success: 0, failed: 0 };
  }
  const records: RawRecord[] = Array.isArray(parsed) ? parsed : [parsed];
  const listings: InsertListing[] = [];
  const errors: ImportError[] = [];
  for (let i = 0; i < records.length; i++) {
    const raw = records[i];
    if (!raw || typeof raw !== "object") {
      errors.push({ line: i + 1, field: "root", message: "Record is not an object", raw });
      continue;
    }
    const price = parsePrice(raw.price);
    const listing: InsertListing = {
      title: raw.title ?? null,
      description: raw.description ?? null,
      price: price ?? null,
      currency: (raw.currency ?? "IDR").toUpperCase(),
      sellerName: raw.sellerName ?? raw.seller_name ?? null,
      marketplace: raw.marketplace ?? null,
      listingUrl: raw.listingUrl ?? raw.listing_url ?? null,
      imageUrls: raw.imageUrls ?? raw.image_urls ?? [],
      screenshotUrl: raw.screenshotUrl ?? raw.screenshot_url ?? null,
      sourceConfidence: raw.sourceConfidence ?? raw.source_confidence ?? 0.6,
      rightsStatus: (raw.rightsStatus ?? raw.rights_status ?? "unknown") as any,
      limitations: Array.isArray(raw.limitations) ? raw.limitations : raw.limitations ? [raw.limitations] : [],
      groundTruth: (raw.groundTruth ?? raw.ground_truth ?? null) as any,
      observedAt: raw.observedAt ?? raw.observed_at ?? new Date().toISOString(),
      rawSource: raw,
      sourceType: "json_import",
      productId: raw.productId ?? raw.product_id ?? null,
    };
    const validationErrors = validateImportRecord(listing, i + 1);
    if (validationErrors.length > 0) {
      errors.push(...validationErrors);
      continue;
    }
    listings.push(listing);
  }
  return { listings, errors, total: records.length, success: listings.length, failed: errors.length };
}

function parsePrice(price: unknown): number | null {
  if (price == null) return null;
  if (typeof price === "number") return price > 0 ? price : null;
  if (typeof price === "string") {
    const cleaned = price.replace(/[^0-9,.-]/g, "").replace(/\./g, "").replace(",", ".");
    const num = parseFloat(cleaned);
    return isNaN(num) || num <= 0 ? null : num;
  }
  return null;
}

function validateImportRecord(listing: InsertListing, line: number): ImportError[] {
  const errs: ImportError[] = [];
  if (!listing.title && !listing.sellerName && !listing.listingUrl) {
    errs.push({ line, field: "general", message: "Record must have at least title, sellerName, or listingUrl" });
  }
  if (listing.listingUrl && !isUrl(listing.listingUrl)) {
    errs.push({ line, field: "listingUrl", message: "Invalid URL format" });
  }
  if (listing.price !== null && listing.price !== undefined && listing.price <= 0) {
    errs.push({ line, field: "price", message: "Price must be positive" });
  }
  return errs;
}

function isUrl(s: string): boolean {
  try { new URL(s); return true; } catch { return false; }
}

export function getImportTemplate(): RawRecord[] {
  return [{
    title: "Example Product Title",
    description: "Example description",
    price: 100000,
    currency: "IDR",
    sellerName: "Example Seller",
    marketplace: "tokopedia",
    listingUrl: "https://tokopedia.com/example",
    imageUrls: ["https://example.com/image.jpg"],
    screenshotUrl: "https://example.com/listing-screenshot.jpg",
    sourceConfidence: 0.75,
    rightsStatus: "user_submitted",
    limitations: ["example template row"],
    observedAt: new Date().toISOString(),
  }];
}
