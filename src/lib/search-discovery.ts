import { envValue } from "@/lib/env";

export interface DiscoveryCandidate {
  title: string;
  url: string;
  snippet: string;
  marketplace: string;
  source: "mock" | "perplexity";
  sourceConfidence: number;
}

export async function discoverCandidates(query: string): Promise<DiscoveryCandidate[]> {
  const apiKey = envValue("PERPLEXITY_API_KEY");
  if (!apiKey) return mockCandidates(query);

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
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
          content: "Find public web candidate listings related to counterfeit or suspicious marketplace products. Return compact JSON only.",
        },
        {
          role: "user",
          content: `Find up to 5 public candidate listing URLs for: ${query}. Return JSON array with title,url,snippet,marketplace.`,
        },
      ],
    }),
  });
  const raw = await response.json().catch(() => null);
  if (!response.ok) return mockCandidates(query, raw?.error?.message ?? `Perplexity HTTP ${response.status}`);
  const content = raw?.choices?.[0]?.message?.content ?? "[]";
  try {
    const parsed = JSON.parse(content.replace(/^```json\s*/i, "").replace(/```$/i, ""));
    if (Array.isArray(parsed)) {
      return parsed.slice(0, 5).map((item: any) => ({
        title: String(item.title ?? query),
        url: String(item.url ?? ""),
        snippet: String(item.snippet ?? ""),
        marketplace: String(item.marketplace ?? inferMarketplace(String(item.url ?? ""))),
        source: "perplexity" as const,
        sourceConfidence: 0.55,
      })).filter((c) => c.url);
    }
  } catch {
    // Fall through to transparent mock-style candidate preserving raw answer.
  }
  return [{
    title: `Search result for ${query}`,
    url: "https://example.com/search-result-needs-confirmation",
    snippet: content.slice(0, 500),
    marketplace: "web",
    source: "perplexity",
    sourceConfidence: 0.35,
  }];
}

function inferMarketplace(url: string): string {
  const lower = url.toLowerCase();
  for (const mp of ["shopee", "tokopedia", "bukalapak", "blibli", "lazada"]) {
    if (lower.includes(mp)) return mp;
  }
  return "web";
}

function mockCandidates(query: string, note?: string): DiscoveryCandidate[] {
  const slug = query.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "brandarmor-candidate";
  return [
    {
      title: `${query} KW Super Grade AAA murah`,
      url: `https://example.com/${slug}-kw-super`,
      snippet: note ?? "Demo candidate: suspicious terms visible in search result. Needs browser capture or user evidence.",
      marketplace: "shopee",
      source: "mock",
      sourceConfidence: 0.45,
    },
    {
      title: `${query} official discount verified seller`,
      url: `https://example.com/${slug}-official-discount`,
      snippet: "Demo candidate: likely legitimate authorized seller discount.",
      marketplace: "tokopedia",
      source: "mock",
      sourceConfidence: 0.45,
    },
  ];
}
