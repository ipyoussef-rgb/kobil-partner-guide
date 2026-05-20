import { NextResponse } from "next/server";
import { Trace } from "../../../../lib/trace";

export const dynamic = "force-dynamic";

export async function GET() {
  const trace = new Trace("api/smartdashboard/health");
  trace.push("received");
  const hasUsername = !!process.env.SMARTDASHBOARD_USERNAME;
  const hasPassword = !!process.env.SMARTDASHBOARD_PASSWORD;
  trace.push("env-check", {
    note: `username=${hasUsername ? "set" : "missing"} password=${hasPassword ? "set" : "missing"}`,
  });
  return NextResponse.json({
    ok: hasUsername && hasPassword,
    env: {
      SMARTDASHBOARD_USERNAME: hasUsername ? "set" : "missing",
      SMARTDASHBOARD_PASSWORD: hasPassword ? "set" : "missing",
    },
    runtime: process.env.VERCEL ? "vercel" : "local",
    region: process.env.VERCEL_REGION ?? null,
    deploymentUrl: process.env.VERCEL_URL ?? null,
    trace: trace.toArray(),
  });
}
