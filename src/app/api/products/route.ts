import { NextResponse } from "next/server";
import { getProducts, createProduct } from "@/persistence/store";
import { insertProductSchema } from "@/domain/schemas";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get("brandId");
    const products = getProducts(brandId ?? undefined);
    return NextResponse.json(products);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = insertProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    const product = createProduct(parsed.data);
    return NextResponse.json(product, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
