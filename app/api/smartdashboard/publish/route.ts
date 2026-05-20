import { NextRequest, NextResponse } from "next/server";
import { SmartDashboardClient } from "../../../../lib/smartdashboard";
import { Trace } from "../../../../lib/trace";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type PublishBody = {
  smartdashboardBaseUrl?: string;
  tenant?: string;
};

function bad(trace: Trace, msg: string) {
  trace.push("validate-fail", { note: msg });
  return NextResponse.json({ error: msg, trace: trace.toArray() }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const trace = new Trace("api/smartdashboard/publish");
  trace.push("received");

  let body: PublishBody;
  try {
    body = await req.json();
  } catch {
    return bad(trace, "Invalid JSON body");
  }

  const base = (body.smartdashboardBaseUrl || "").trim();
  const tenant = (body.tenant || "").trim();
  if (!base) return bad(trace, "smartdashboardBaseUrl is required");
  if (!tenant) return bad(trace, "tenant is required");

  try {
    new URL(base);
  } catch {
    return bad(trace, "smartdashboardBaseUrl is not a valid URL");
  }

  trace.push("inputs", { note: `base=${base} tenant=${tenant}` });

  const client = SmartDashboardClient.fromEnv({ baseUrl: base, tenant });
  if (!client.hasCredentials()) {
    trace.push("configure-fail");
    return NextResponse.json(
      {
        ok: false,
        error:
          "Server is missing SMARTDASHBOARD_USERNAME / SMARTDASHBOARD_PASSWORD. Set them in .env.local locally or in Vercel Environment Variables.",
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
    trace.push("auth-fail", { error: msg });
    return NextResponse.json(
      {
        ok: false,
        stage: "authenticate",
        error: msg,
        authTrace: client.getTrace(),
        trace: trace.toArray(),
      },
      { status: 502 },
    );
  }

  trace.push("publish-start");
  try {
    const result = await client.publishCurrentBranch();
    trace.push(result.ok ? "publish-ok" : "publish-partial", {
      note: `branch=${result.branchId} touch=${result.touch.status} save=${result.save.status} publish=${result.publish.status} switch=${result.switch.status}`,
    });
    return NextResponse.json({ ...result, authTrace: client.getTrace(), trace: trace.toArray() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Publish failed";
    trace.push("publish-fail", { error: msg });
    return NextResponse.json(
      { ok: false, error: msg, authTrace: client.getTrace(), trace: trace.toArray() },
      { status: 502 },
    );
  }
}
