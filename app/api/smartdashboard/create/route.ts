import { NextRequest, NextResponse } from "next/server";
import { SmartDashboardClient } from "../../../../lib/smartdashboard";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type CreateBody = {
  smartdashboardBaseUrl?: string;
  tenant?: string;
  service?: {
    name?: string;
    description?: string;
    callbackUrl?: string;
    keywords?: string[];
    categoryIds?: string[];
  };
};

function bad(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

export async function POST(req: NextRequest) {
  let body: CreateBody;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const base = (body.smartdashboardBaseUrl || "").trim();
  const tenant = (body.tenant || "").trim();
  const service = body.service;

  if (!base) return bad("smartdashboardBaseUrl is required");
  if (!tenant) return bad("tenant is required");
  if (!service?.name) return bad("service.name is required");
  if (!service.callbackUrl) return bad("service.callbackUrl is required");

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
        stage: "configure",
        error:
          "Server is missing SMARTDASHBOARD_USERNAME / SMARTDASHBOARD_PASSWORD. Set them in .env.local for local dev, or in the Vercel project's Environment Variables.",
      },
      { status: 500 },
    );
  }

  try {
    await client.authenticate();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Authentication failed";
    return NextResponse.json(
      { ok: false, stage: "authenticate", error: msg, trace: client.getTrace() },
      { status: 502 },
    );
  }

  try {
    const result = await client.createService({
      name: service.name,
      description: service.description,
      callbackUrl: service.callbackUrl,
      keywords: service.keywords,
      categoryIds: service.categoryIds,
    });

    const ok =
      result.status >= 200 &&
      result.status < 300 &&
      !!result.clientId &&
      !!result.clientSecret;

    return NextResponse.json({
      ok,
      stage: "create",
      status: result.status,
      requestUrl: result.requestUrl,
      payload: result.payload,
      body: result.body,
      clientId: result.clientId,
      clientSecret: result.clientSecret,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upstream request failed";
    return NextResponse.json({ ok: false, stage: "create", error: msg }, { status: 502 });
  }
}
