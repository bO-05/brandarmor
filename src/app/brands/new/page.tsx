"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function NewBrandPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: description || null, websiteUrl: websiteUrl || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create brand");
      }
      toast.success("Brand created");
      router.push("/brands");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">New Brand</h1>
      <form onSubmit={handleSubmit} className="surface-card rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Brand Name *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
            className="w-full px-3 py-2 border border-border rounded-md bg-background" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md bg-background" rows={3} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Website URL</label>
          <input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md bg-background" />
        </div>
        <button type="submit" disabled={loading}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm disabled:opacity-50">
          {loading ? "Creating..." : "Create Brand"}
        </button>
      </form>
    </div>
  );
}
