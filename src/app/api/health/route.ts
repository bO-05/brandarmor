import { NextResponse } from "next/server";
import packageJson from "../../../../package.json";

export async function GET() {
  return NextResponse.json({ status: "ok", app: packageJson.name, version: packageJson.version });
}
