import { NextRequest, NextResponse } from "next/server";
import { SmartDashboardClient } from "../../../../lib/smartdashboard";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type PublishBody = {
  smartdashboardBaseUrl?: string;
  tenant?: string;
};

function bad(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

export async function POST(req: NextRequest) {
  let body: PublishBody;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const base = (body.smartdashboardBaseUrl || "").trim();
  const tenant = (body.tenant || "").trim();
  if (!base) return bad("smartdashboardBaseUrl is required");
  if (!tenant) return bad("tenant is required");

  try {
    new URL(base);
  } catch {
    return bad("smartdashboardBaseUrl is not a valid URL");
  }

  const client = SmartDashboardClient.fromEnv({ baseUrl: base, tenant });
  if (!client.hasCredentials()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Server is missing SMARTDASHBOARD_USERNAME / SMARTDASHBOARD_PASSWORD. Set them in .env.local locally or in Vercel Environment Variables.",
      },
      { status: 500 },
    );
  }

  try {
    await client.authenticate();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Authentication failed";
    return NextResponse.json({ ok: false, stage: "authenticate", error: msg }, { status: 502 });
  }

  try {
    const result = await client.publishCurrentBranch();
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Publish failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
