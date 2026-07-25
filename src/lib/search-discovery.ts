import { envValue } from "@/lib/env";
import { fetchJsonWithProviderTimeout } from "@/lib/provider-safety";

const MARKETPLACES = [
  { name: "shopee", hosts: ["shopee.co.id", "shopee.com"] },
  { name: "tokopedia", hosts: ["tokopedia.com"] },
  { name: "bukalapak", hosts: ["bukalapak.com"] },
  { name: "blibli", hosts: ["blibli.com"] },
  { name: "lazada", hosts: ["lazada.co.id", "lazada.com"] },
] as const;

export interface DiscoveryCandidate {
  title: string;
  url: string;
  snippet: string;
  marketplace: string;
  source: "perplexity";
  sourceConfidence: number;
  verifiedMarketplaceDomain: true;
}

export function verifiedMarketplaceForUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.pathname === "/") return null;
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    for (const marketplace of MARKETPLACES) {
      if (marketplace.hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))) return marketplace.name;
    }
  } catch {
    // Invalid URLs are never candidates.
  }
  return null;
}

export async function discoverCandidates(query: string): Promise<DiscoveryCandidate[]> {
  const apiKey = envValue("PERPLEXITY_API_KEY");
  if (!apiKey) return [];

  try {
    const result = await fetchJsonWithProviderTimeout<any>("Perplexity discovery", "https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "system",
            content: "Find only public product-listing URLs on Shopee, Tokopedia, Bukalapak, Blibli, or Lazada. Exclude news, social, documents, category pages, and unknown domains. Return compact JSON only.",
          },
          {
            role: "user",
            content: `Find up to 5 verified marketplace listing URLs for: ${query}. Return JSON array with title,url,snippet.`,
          },
        ],
      }),
    }, 10_000);
    if (!result.response.ok) return [];
    const content = result.json?.choices?.[0]?.message?.content ?? "[]";
    const parsed = JSON.parse(content.replace(/^```json\s*/i, "").replace(/```$/i, ""));
    if (!Array.isArray(parsed)) return [];

    return parsed.slice(0, 10).flatMap((item: unknown) => {
      const record = item as Record<string, unknown>;
      const url = typeof record.url === "string" ? record.url : "";
      const marketplace = verifiedMarketplaceForUrl(url);
      if (!marketplace) return [];
      return [{
        title: typeof record.title === "string" ? record.title : query,
        url,
        snippet: typeof record.snippet === "string" ? record.snippet : "",
        marketplace,
        source: "perplexity" as const,
        sourceConfidence: 0.55,
        verifiedMarketplaceDomain: true as const,
      }];
    });
  } catch {
    return [];
  }
}
