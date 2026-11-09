import { cronAuthorized } from "@/lib/auth";
import { runCheck } from "@/lib/checker";

export const maxDuration = 60;

async function handle(request: Request) {
  if (!cronAuthorized(request.headers.get("authorization"))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const trigger = request.headers.get("user-agent")?.startsWith("vercel-cron")
    ? "vercel-schedule"
    : (request.headers.get("x-trigger") ?? "api").slice(0, 40);
  const force = new URL(request.url).searchParams.get("force") === "1";
  const result = await runCheck(trigger, { force });
  return Response.json(result, { status: result.error ? 500 : 200 });
}

export const GET = handle;
export const POST = handle;
