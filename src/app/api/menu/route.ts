import { NextResponse } from "next/server";
import { getStoreData } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getStoreData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load menu" },
      { status: 500 }
    );
  }
}
