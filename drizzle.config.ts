import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

loadEnvConfig(process.cwd());

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    // Use an unpooled Neon connection for migrations when available.
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "postgresql://placeholder:placeholder@localhost:5432/brandarmor",
  },
});
