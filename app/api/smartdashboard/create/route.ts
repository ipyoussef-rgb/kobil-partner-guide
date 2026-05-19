import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_CATEGORY_ID = "fbc33089-93ff-4bce-ad3d-16645e9edf15";

type CreateBody = {
  smartdashboardBaseUrl?: string;
  tenant?: string;
  cookie?: string;
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

function buildPayload(s: NonNullable<CreateBody["service"]>) {
  const name = (s.name || "").trim();
  const callbackUrl = (s.callbackUrl || "").trim();
  const keywords =
    s.keywords && s.keywords.length > 0
      ? s.keywords
      : [name.toLowerCase().replace(/\s+/g, "_")];
  const categories =
    s.categoryIds && s.categoryIds.length > 0 ? s.categoryIds : [DEFAULT_CATEGORY_ID];
  return {
    title: { default: name, locales: [] },
    description: { default: s.description ?? "", locales: [] },
    type: "MiniApp",
    behaviour: "Banner",
    callbackUrl,
    consentEnabled: false,
    webFlowEnabled: false,
    launchInstructions: { readOnly: true, url: callbackUrl },
    redirectUris: [callbackUrl],
    searchable: true,
    requirements: {},
    tags: { categories, keywords },
  };
}

export async function POST(req: NextRequest) {
  let body: CreateBody;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const baseRaw = (body.smartdashboardBaseUrl || "").trim().replace(/\/+$/, "");
  const tenant = (body.tenant || "").trim();
  const cookie = (body.cookie || "").trim();
  const service = body.service;

  if (!baseRaw) return bad("smartdashboardBaseUrl is required");
  if (!tenant) return bad("tenant is required");
  if (!cookie) return bad("cookie is required (paste the Cookie header from an authenticated SmartDashboard session)");
  if (!service || !service.name) return bad("service.name is required");
  if (!service.callbackUrl) return bad("service.callbackUrl is required");

  let parsed: URL;
  try {
    parsed = new URL(`${baseRaw}/${tenant}/api/v1/smart-screen/cqrs/services/`);
  } catch {
    return bad("smartdashboardBaseUrl is not a valid URL");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return bad("smartdashboardBaseUrl must be http(s)");
  }

  const payload = buildPayload(service);

  try {
    const upstream = await fetch(parsed.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      redirect: "manual",
    });

    const text = await upstream.text();
    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(text);
    } catch {
      parsedBody = text;
    }

    let clientId: string | undefined;
    let clientSecret: string | undefined;
    if (parsedBody && typeof parsedBody === "object") {
      const obj = parsedBody as Record<string, unknown>;
      const inner =
        obj.data && typeof obj.data === "object" ? (obj.data as Record<string, unknown>) : obj;
      if (typeof inner.id === "string") clientId = inner.id;
      if (typeof inner.client_secret === "string") clientSecret = inner.client_secret;
    }

    const ok = upstream.status >= 200 && upstream.status < 300 && !!clientId && !!clientSecret;

    return NextResponse.json({
      ok,
      status: upstream.status,
      requestUrl: parsed.toString(),
      payload,
      body: parsedBody,
      clientId,
      clientSecret,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upstream request failed";
    return NextResponse.json({ ok: false, status: 0, error: msg }, { status: 502 });
  }
}
