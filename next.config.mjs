import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";
/** @type {import("next").NextConfig} */
export default function nextConfig(phase) {
  return {
    // Windows can leave .next/trace locked after a killed or hung build.
    // Keep dev on its own cache so `npm run dev` stays recoverable.
    distDir: process.env.NEXT_DIST_DIR || (phase === PHASE_DEVELOPMENT_SERVER ? ".next-local" : ".next"),
  };
}
