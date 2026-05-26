import { NextResponse } from "next/server";
import { getBrands, createBrand, seedDemoData } from "@/persistence/store";
import { insertBrandSchema } from "@/domain/schemas";

export async function GET() {
  try {
    const brands = getBrands();
    return NextResponse.json(brands);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = insertBrandSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    const brand = createBrand(parsed.data);
    return NextResponse.json(brand, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
