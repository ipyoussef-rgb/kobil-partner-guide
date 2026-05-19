import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const hasUsername = !!process.env.SMARTDASHBOARD_USERNAME;
  const hasPassword = !!process.env.SMARTDASHBOARD_PASSWORD;
  return NextResponse.json({
    ok: hasUsername && hasPassword,
    env: {
      SMARTDASHBOARD_USERNAME: hasUsername ? "set" : "missing",
      SMARTDASHBOARD_PASSWORD: hasPassword ? "set" : "missing",
    },
    runtime: process.env.VERCEL ? "vercel" : "local",
    region: process.env.VERCEL_REGION ?? null,
    deploymentUrl: process.env.VERCEL_URL ?? null,
  });
}
