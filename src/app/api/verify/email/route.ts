import { NextResponse, type NextRequest } from "next/server";
import { verifyEmailToken } from "@/lib/subscribers";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const sub = await verifyEmailToken(token);
  const target = sub ? `/manage/${sub.manageToken}?verified=email` : "/?verify=expired";
  return NextResponse.redirect(new URL(target, request.url));
}
