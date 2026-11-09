import type { NextRequest } from "next/server";
import { parseBoardQuery, queryBoard } from "@/lib/board";
import { getBoard } from "@/lib/checker";

export async function GET(request: NextRequest) {
  const result = queryBoard(await getBoard(), parseBoardQuery(request.nextUrl.searchParams));
  return Response.json(result, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
