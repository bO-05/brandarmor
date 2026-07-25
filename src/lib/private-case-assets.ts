import { get } from "@vercel/blob";

export class PrivateCaseAssetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrivateCaseAssetError";
  }
}

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function privateImageDataUrl({
  objectKey,
  contentType,
  maxBytes = 10 * 1024 * 1024,
}: {
  objectKey: string;
  contentType: string;
  maxBytes?: number;
}): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) throw new PrivateCaseAssetError("Private asset has an unsupported image type.");
  let result: Awaited<ReturnType<typeof get>>;
  try {
    result = await get(objectKey, { access: "private" });
  } catch {
    throw new PrivateCaseAssetError("Private screenshot is unavailable.");
  }
  if (!result || result.statusCode !== 200) throw new PrivateCaseAssetError("Private screenshot is unavailable.");
  const contentLength = Number(result.blob?.size ?? 0);
  if (contentLength > maxBytes) throw new PrivateCaseAssetError("Private screenshot exceeds the provider-safe size limit.");
  const bytes = Buffer.from(await new Response(result.stream).arrayBuffer());
  if (!bytes.length || bytes.length > maxBytes) {
    throw new PrivateCaseAssetError("Private screenshot exceeds the provider-safe size limit.");
  }
  return `data:${contentType};base64,${bytes.toString("base64")}`;
}
