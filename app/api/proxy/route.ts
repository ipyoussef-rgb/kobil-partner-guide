import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type ProxyBody = {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string | null;
};

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

const ALLOWED_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export async function POST(req: NextRequest) {
  let body: ProxyBody;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const method = (body.method || "GET").toUpperCase();
  if (!ALLOWED_METHODS.includes(method)) return badRequest("Unsupported method");

  if (!body.url) return badRequest("url is required");
  let parsed: URL;
  try {
    parsed = new URL(body.url);
  } catch {
    return badRequest("url is not valid");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return badRequest("url must be http(s)");
  }

  const headers = new Headers();
  if (body.headers) {
    for (const [k, v] of Object.entries(body.headers)) {
      if (typeof v !== "string") continue;
      const key = k.toLowerCase();
      if (key === "host" || key === "content-length") continue;
      headers.set(k, v);
    }
  }
  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  const init: RequestInit = {
    method,
    headers,
    cache: "no-store",
  };
  if (method !== "GET" && method !== "DELETE" && body.body) {
    init.body = body.body;
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  }

  const startedAt = Date.now();
  try {
    const upstream = await fetch(parsed.toString(), init);
    const elapsedMs = Date.now() - startedAt;

    const text = await upstream.text();
    let parsedBody: unknown = null;
    try {
      parsedBody = JSON.parse(text);
    } catch {
      parsedBody = text;
    }

    const respHeaders: Record<string, string> = {};
    upstream.headers.forEach((v, k) => {
      respHeaders[k] = v;
    });

    return NextResponse.json({
      status: upstream.status,
      statusText: upstream.statusText,
      elapsedMs,
      headers: respHeaders,
      body: parsedBody,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upstream request failed";
    return NextResponse.json({ status: 0, error: msg }, { status: 502 });
  }
}
