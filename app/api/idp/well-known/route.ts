import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Body = {
  url?: string;
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const url = (body.url || "").trim();
  if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "url is not a valid URL" }, { status: 400 });
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return NextResponse.json({ error: "url must be http(s)" }, { status: 400 });
  }

  try {
    const r = await fetch(parsed.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store",
      redirect: "follow",
    });
    const text = await r.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { ok: false, status: r.status, error: "Response was not valid JSON" },
        { status: 502 },
      );
    }
    if (!r.ok) {
      return NextResponse.json({ ok: false, status: r.status, body: json }, { status: 502 });
    }
    const obj = (json ?? {}) as Record<string, unknown>;
    return NextResponse.json({
      ok: true,
      status: r.status,
      url: parsed.toString(),
      issuer: typeof obj.issuer === "string" ? obj.issuer : undefined,
      tokenEndpoint:
        typeof obj.token_endpoint === "string" ? obj.token_endpoint : undefined,
      authorizationEndpoint:
        typeof obj.authorization_endpoint === "string"
          ? obj.authorization_endpoint
          : undefined,
      userinfoEndpoint:
        typeof obj.userinfo_endpoint === "string" ? obj.userinfo_endpoint : undefined,
      jwksUri: typeof obj.jwks_uri === "string" ? obj.jwks_uri : undefined,
      grantTypesSupported: Array.isArray(obj.grant_types_supported)
        ? obj.grant_types_supported.filter((g): g is string => typeof g === "string")
        : undefined,
      scopesSupported: Array.isArray(obj.scopes_supported)
        ? obj.scopes_supported.filter((s): s is string => typeof s === "string")
        : undefined,
      raw: json,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch well-known config";
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
