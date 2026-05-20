import { NextRequest, NextResponse } from "next/server";
import { Trace } from "../../../lib/trace";

export const dynamic = "force-dynamic";

type TokenBody = {
  tokenUrl?: string;
  clientId?: string;
  clientSecret?: string;
  scope?: string;
  grantType?: string;
  username?: string;
  password?: string;
};

export async function POST(req: NextRequest) {
  const trace = new Trace("api/token");
  trace.push("received");

  let body: TokenBody;
  try {
    body = await req.json();
  } catch {
    trace.push("bad-json");
    return NextResponse.json({ error: "Invalid JSON body", trace: trace.toArray() }, { status: 400 });
  }

  const { tokenUrl, clientId, clientSecret } = body;
  const scope = body.scope?.trim() || "";
  const grantType = body.grantType?.trim() || "client_credentials";

  if (!tokenUrl) {
    trace.push("validate-fail", { note: "tokenUrl missing" });
    return NextResponse.json({ error: "tokenUrl is required", trace: trace.toArray() }, { status: 400 });
  }
  if (!clientId) {
    trace.push("validate-fail", { note: "clientId missing" });
    return NextResponse.json({ error: "clientId is required", trace: trace.toArray() }, { status: 400 });
  }
  if (!clientSecret) {
    trace.push("validate-fail", { note: "clientSecret missing" });
    return NextResponse.json({ error: "clientSecret is required", trace: trace.toArray() }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(tokenUrl);
  } catch {
    trace.push("validate-fail", { note: "tokenUrl not a valid URL" });
    return NextResponse.json({ error: "tokenUrl is not a valid URL", trace: trace.toArray() }, { status: 400 });
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    trace.push("validate-fail", { note: "tokenUrl must be http(s)" });
    return NextResponse.json({ error: "tokenUrl must be http(s)", trace: trace.toArray() }, { status: 400 });
  }

  const form = new URLSearchParams();
  form.set("grant_type", grantType);
  form.set("client_id", clientId);
  form.set("client_secret", clientSecret);
  if (scope) form.set("scope", scope);

  if (grantType === "password") {
    const username = (body.username || "").trim();
    const password = body.password || "";
    if (!username) {
      trace.push("validate-fail", { note: "username required for password grant" });
      return NextResponse.json(
        { error: "username is required for grant_type=password", trace: trace.toArray() },
        { status: 400 },
      );
    }
    if (!password) {
      trace.push("validate-fail", { note: "password required for password grant" });
      return NextResponse.json(
        { error: "password is required for grant_type=password", trace: trace.toArray() },
        { status: 400 },
      );
    }
    form.set("username", username);
    form.set("password", password);
  }

  trace.push("token-request", {
    url: parsed.toString(),
    method: "POST",
    note: `grant=${grantType} scope=${scope || "(none)"} fields=${[...form.keys()].join(",")}`,
  });

  try {
    const { response: upstream, durationMs } = await trace.wrapFetch("upstream-token", parsed.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: form.toString(),
      cache: "no-store",
    });

    const text = await upstream.text();
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
    trace.push("parsed-response", { status: upstream.status, durationMs });

    return NextResponse.json({ status: upstream.status, body: json, trace: trace.toArray() }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upstream request failed";
    return NextResponse.json({ status: 0, error: msg, trace: trace.toArray() }, { status: 502 });
  }
}
