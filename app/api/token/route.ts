import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type TokenBody = {
  tokenUrl?: string;
  clientId?: string;
  clientSecret?: string;
  scope?: string;
  grantType?: string;
};

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

export async function POST(req: NextRequest) {
  let body: TokenBody;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const { tokenUrl, clientId, clientSecret } = body;
  const scope = body.scope?.trim() || "";
  const grantType = body.grantType?.trim() || "client_credentials";

  if (!tokenUrl) return badRequest("tokenUrl is required");
  if (!clientId) return badRequest("clientId is required");
  if (!clientSecret) return badRequest("clientSecret is required");

  let parsed: URL;
  try {
    parsed = new URL(tokenUrl);
  } catch {
    return badRequest("tokenUrl is not a valid URL");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return badRequest("tokenUrl must be http(s)");
  }

  const form = new URLSearchParams();
  form.set("grant_type", grantType);
  form.set("client_id", clientId);
  form.set("client_secret", clientSecret);
  if (scope) form.set("scope", scope);

  try {
    const upstream = await fetch(parsed.toString(), {
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

    return NextResponse.json(
      { status: upstream.status, body: json },
      { status: upstream.ok ? 200 : 200 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upstream request failed";
    return NextResponse.json({ status: 0, error: msg }, { status: 502 });
  }
}
