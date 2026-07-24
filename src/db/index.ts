import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

export class DatabaseConfigurationError extends Error {
  constructor() {
    super("DATABASE_URL is required for durable BrandArmor persistence.");
    this.name = "DatabaseConfigurationError";
  }
}

/**
 * Creates a serverless-safe Neon/Drizzle client lazily so the controlled demo
 * can build and remain explicitly read-only until Neon is configured.
 */
export function getDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new DatabaseConfigurationError();

  return drizzle(neon(connectionString), { schema });
}

export type BrandArmorDatabase = ReturnType<typeof getDatabase>;
