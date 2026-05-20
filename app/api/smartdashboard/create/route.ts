import { NextRequest, NextResponse } from "next/server";
import { SmartDashboardClient } from "../../../../lib/smartdashboard";
import { Trace } from "../../../../lib/trace";

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

function bad(trace: Trace, msg: string) {
  trace.push("validate-fail", { note: msg });
  return NextResponse.json({ error: msg, trace: trace.toArray() }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const trace = new Trace("api/smartdashboard/create");
  trace.push("received");

  let body: CreateBody;
  try {
    body = await req.json();
  } catch {
    return bad(trace, "Invalid JSON body");
  }

  const base = (body.smartdashboardBaseUrl || "").trim();
  const tenant = (body.tenant || "").trim();
  const service = body.service;

  if (!base) return bad(trace, "smartdashboardBaseUrl is required");
  if (!tenant) return bad(trace, "tenant is required");
  if (!service?.name) return bad(trace, "service.name is required");
  if (!service.callbackUrl) return bad(trace, "service.callbackUrl is required");

  try {
    new URL(base);
  } catch {
    return bad(trace, "smartdashboardBaseUrl is not a valid URL");
  }

  trace.push("inputs", {
    note: `base=${base} tenant=${tenant} serviceName="${service.name}" callback=${service.callbackUrl}`,
  });

  const client = SmartDashboardClient.fromEnv({ baseUrl: base, tenant });
  if (!client.hasCredentials()) {
    trace.push("configure-fail", { note: "SMARTDASHBOARD_USERNAME / PASSWORD env vars missing" });
    return NextResponse.json(
      {
        ok: false,
        stage: "configure",
        error:
          "Server is missing SMARTDASHBOARD_USERNAME / SMARTDASHBOARD_PASSWORD. Set them in .env.local for local dev, or in the Vercel project's Environment Variables.",
        trace: trace.toArray(),
      },
      { status: 500 },
    );
  }

  trace.push("auth-start");
  try {
    await client.authenticate();
    trace.push("auth-ok");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Authentication failed";
    const authTrace = client.getTrace();
    trace.push("auth-fail", { error: msg, note: `clientSteps=${authTrace.length}` });
    const upstreamMessage = authTrace
      .map((t) => t.errorMessage)
      .find((m): m is string => !!m);
    return NextResponse.json(
      {
        ok: false,
        stage: "authenticate",
        error: msg,
        upstreamMessage,
        authTrace,
        trace: trace.toArray(),
      },
      { status: 502 },
    );
  }

  trace.push("create-start");
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

    trace.push(ok ? "create-ok" : "create-fail", {
      status: result.status,
      url: result.requestUrl,
      method: "POST",
      note: ok ? `id=${result.clientId}` : "missing id/client_secret",
    });

    return NextResponse.json({
      ok,
      stage: "create",
      status: result.status,
      requestUrl: result.requestUrl,
      payload: result.payload,
      body: result.body,
      clientId: result.clientId,
      clientSecret: result.clientSecret,
      authTrace: client.getTrace(),
      trace: trace.toArray(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upstream request failed";
    trace.push("create-fail", { error: msg });
    return NextResponse.json(
      {
        ok: false,
        stage: "create",
        error: msg,
        authTrace: client.getTrace(),
        trace: trace.toArray(),
      },
      { status: 502 },
    );
  }
}
