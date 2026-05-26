"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SAMPLE_LISTING_IMPORT_JSON } from "@/lib/ui-ux";

export default function ImportListingsPage() {
  const router = useRouter();
  const [jsonInput, setJsonInput] = useState("");
  const [syntaxError, setSyntaxError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Array<{ line: number; field: string; message: string }>>([]);
  const [loading, setLoading] = useState(false);

  function validateJsonInput(value: string): string | null {
    if (!value.trim()) return null;
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? null : "Import JSON must be an array of listing records.";
    } catch (e) {
      return (e as Error).message;
    }
  }

  async function handleImport() {
    const nextSyntaxError = validateJsonInput(jsonInput);
    setSyntaxError(nextSyntaxError);
    if (nextSyntaxError) return;
    setLoading(true);
    setErrors([]);
    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: jsonInput,
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.details) setErrors(data.details);
        throw new Error(data.error || "Import failed");
      }
      toast.success(`Imported ${data.imported ?? data.listings?.length} listings`);
      router.push("/listings");
    } catch (e) {
      if (!errors.length) toast.error((e as Error).message);
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Import Listings</h1>
      <p className="text-muted-foreground mb-4">
        Paste a JSON array of listing records. Include productId when you already know the product baseline; imported listings without a baseline must be linked before the evidence pipeline can run.
      </p>

      <div className="surface-card rounded-lg p-6">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold">JSON records</p>
          <button
            type="button"
            onClick={() => {
              setJsonInput(SAMPLE_LISTING_IMPORT_JSON);
              setSyntaxError(null);
              setErrors([]);
            }}
            className="inline-flex min-h-9 items-center justify-center rounded-md bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground"
          >
            Load sample JSON
          </button>
        </div>
        <textarea value={jsonInput} onChange={e => {
          setJsonInput(e.target.value);
          setSyntaxError(validateJsonInput(e.target.value));
          setErrors([]);
        }}
          className="w-full px-3 py-2 border border-border rounded-md bg-background font-mono text-sm" rows={15}
          placeholder={SAMPLE_LISTING_IMPORT_JSON} />

        {syntaxError && (
          <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3">
            <p className="text-sm font-medium text-destructive">JSON syntax needs attention</p>
            <p className="mt-1 text-xs text-destructive">{syntaxError}</p>
          </div>
        )}

        {errors.length > 0 && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md">
            <p className="text-sm font-medium text-destructive mb-2">Import Errors:</p>
            {errors.map((e, i) => (
              <p key={i} className="text-xs text-destructive">Line {e.line}: {e.field} - {e.message}</p>
            ))}
          </div>
        )}

        <button onClick={handleImport} disabled={loading || !jsonInput.trim() || Boolean(syntaxError)}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm disabled:opacity-50">
          {loading ? "Importing..." : "Import Listings"}
        </button>
      </div>
    </div>
  );
}
