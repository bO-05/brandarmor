#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const apiKey = process.env.GEMINI_API_KEY;
const outDir = path.join(process.cwd(), "public", "scroll-world", "generated");
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not set in this process. Set it as an environment variable or secret before running this script.");
}

const endpoint = `https://generativelanguage.googleapis.com/v1beta/interactions?key=${apiKey}`;

const scenes = [
  {
    id: "marketplace-intake",
    title: "Lead intake",
    prompt: "A cinematic 16:9 scroll-world scene for a skincare marketplace risk review product. Camera is flying toward a floating marketplace listing card in a dark blue evidence operations room. Show cosmetics bottles as generic unbranded shapes, source metadata ribbons, and a soft path line into review. No real brand names, no accusations, no text except abstract UI marks, no watermark.",
  },
  {
    id: "product-baseline",
    title: "Product baseline",
    prompt: "A cinematic 16:9 scroll-world scene inside an official product baseline vault for cosmetics review. Generic skincare packaging, ingredient panels, trusted source metadata, and comparison guides glow in violet light. Emphasize official truth separate from marketplace claims. No real brands, no readable text, no counterfeit language, no watermark.",
  },
  {
    id: "evidence-lab",
    title: "Evidence lab",
    prompt: "A cinematic 16:9 scroll-world evidence lab for marketplace listing review. Abstract OCR strips, regulatory lookup nodes, visual comparison panels, routing score cards, and judge assessment notes orbit a generic skincare product image. Make it polished and high depth, no real brands, no readable text, no legal conclusions, no watermark.",
  },
  {
    id: "review-cockpit",
    title: "Review cockpit",
    prompt: "A cinematic 16:9 scroll-world review cockpit. A human reviewer workstation faces cited evidence tiles, missing proof indicators, and an internal decision panel for a cosmetics marketplace case. Warm amber lighting, accountable human-in-the-loop mood. No real person faces, no real brands, no readable text, no enforcement or takedown imagery, no watermark.",
  },
  {
    id: "decision-archive",
    title: "Decision archive",
    prompt: "A cinematic 16:9 scroll-world decision archive for evidence-backed marketplace review. Internal label cards, audit trail ledger, provenance links, and safe escalation folders settle into a green-lit archive. Convey accountable internal review, not automatic enforcement. No real brands, no readable text, no legal symbols, no watermark.",
  },
];

async function generateScene(scene) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.SCROLL_WORLD_IMAGE_MODEL || "gemini-3.1-flash-image",
      input: scene.prompt,
      response_format: { type: "image", image_size: "2K" },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini image generation failed for ${scene.id}: HTTP ${response.status} ${body.slice(0, 600)}`);
  }

  const json = await response.json();
  const image = json.output_image?.data ?? json.steps?.flatMap((step) => step.content ?? []).find((part) => part.type === "image")?.data;
  if (!image) {
    throw new Error(`Gemini response for ${scene.id} did not include output_image.data.`);
  }

  const file = path.join(outDir, `${scene.id}.png`);
  await writeFile(file, Buffer.from(image, "base64"));
  return { id: scene.id, title: scene.title, src: `/scroll-world/generated/${scene.id}.png`, alt: `${scene.title} generated cinematic scroll-world scene.` };
}

await mkdir(outDir, { recursive: true });
const generated = [];
for (const scene of scenes) {
  console.log(`Generating ${scene.id}...`);
  generated.push(await generateScene(scene));
}
await writeFile(path.join(process.cwd(), "public", "scroll-world", "manifest.json"), `${JSON.stringify({
  version: Date.now(),
  provider: process.env.SCROLL_WORLD_IMAGE_MODEL || "gemini-3.1-flash-image",
  aspectRatio: "16:9",
  desktopOnly: true,
  scenes: generated,
}, null, 2)}\n`);
console.log(`Generated ${generated.length} scenes in ${outDir}`);
