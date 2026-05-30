import { NextResponse } from "next/server";
import { seedDemoData } from "@/persistence/store";

export async function POST() {
  try {
    seedDemoData();
    return NextResponse.json({ message: "Demo data seeded" }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
