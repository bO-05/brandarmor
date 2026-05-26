import { resolve as resolvePath } from "node:path";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = resolvePath(fileURLToPath(import.meta.url), "..");
const srcDir = resolvePath(__dirname, "..", "src");

export function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    let target = resolvePath(srcDir, specifier.slice(2));
    if (!path.extname(target)) {
      target = target + ".ts";
    }
    return nextResolve(pathToFileURL(target).href, context);
  }
  return nextResolve(specifier, context);
}
