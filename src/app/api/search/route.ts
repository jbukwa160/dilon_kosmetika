import { NextResponse, type NextRequest } from "next/server";
import { suggest } from "@/lib/catalog";

export function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 80);
  return NextResponse.json(suggest(q), { headers: { "Cache-Control": "public, max-age=60" } });
}
