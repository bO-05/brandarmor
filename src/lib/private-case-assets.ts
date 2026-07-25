import { get } from "@vercel/blob";

export class PrivateCaseAssetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrivateCaseAssetError";
  }
}

export async function privateImageDataUrl({
  objectKey,
  contentType,
  maxBytes = 10 * 1024 * 1024,
}: {
  objectKey: string;
  contentType: string;
  maxBytes?: number;
}): Promise<string> {
  const result = await get(objectKey, { access: "private" });
  if (!result || result.statusCode !== 200) throw new PrivateCaseAssetError("Private screenshot is unavailable.");
  const bytes = Buffer.from(await new Response(result.stream).arrayBuffer());
  if (!bytes.length || bytes.length > maxBytes) {
    throw new PrivateCaseAssetError("Private screenshot exceeds the provider-safe size limit.");
  }
  return `data:${contentType};base64,${bytes.toString("base64")}`;
}
