import { NextRequest, NextResponse } from "next/server";
import { Trace } from "../../../lib/trace";

export const dynamic = "force-dynamic";

type ProxyBody = {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string | null;
};

const ALLOWED_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

function bad(trace: Trace, msg: string) {
  trace.push("validate-fail", { note: msg });
  return NextResponse.json({ error: msg, trace: trace.toArray() }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const trace = new Trace("api/proxy");
  trace.push("received");

  let body: ProxyBody;
  try {
    body = await req.json();
  } catch {
    return bad(trace, "Invalid JSON body");
  }

  const method = (body.method || "GET").toUpperCase();
  if (!ALLOWED_METHODS.includes(method)) return bad(trace, "Unsupported method");
  if (!body.url) return bad(trace, "url is required");

  let parsed: URL;
  try {
    parsed = new URL(body.url);
  } catch {
    return bad(trace, "url is not valid");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return bad(trace, "url must be http(s)");
  }

  const headers = new Headers();
  const headerNames: string[] = [];
  if (body.headers) {
    for (const [k, v] of Object.entries(body.headers)) {
      if (typeof v !== "string") continue;
      const key = k.toLowerCase();
      if (key === "host" || key === "content-length") continue;
      headers.set(k, v);
      headerNames.push(k);
    }
  }
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  const hasAuth = headers.has("Authorization");

  const init: RequestInit = { method, headers, cache: "no-store" };
  let bodyLen = 0;
  if (method !== "GET" && method !== "DELETE" && body.body) {
    init.body = body.body;
    bodyLen = body.body.length;
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  }

  trace.push("upstream-request", {
    url: parsed.toString(),
    method,
    note: `headers=[${headerNames.join(", ")}] auth=${hasAuth ? "yes" : "no"} bodyLen=${bodyLen}`,
  });

  try {
    const { response: upstream, durationMs } = await trace.wrapFetch(
      "upstream-fetch",
      parsed.toString(),
      init,
    );

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

    trace.push("parsed-response", {
      status: upstream.status,
      durationMs,
      note: `contentType=${respHeaders["content-type"] ?? "(none)"} bodyLen=${text.length}`,
    });

    return NextResponse.json({
      status: upstream.status,
      statusText: upstream.statusText,
      elapsedMs: durationMs,
      headers: respHeaders,
      body: parsedBody,
      trace: trace.toArray(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upstream request failed";
    return NextResponse.json({ status: 0, error: msg, trace: trace.toArray() }, { status: 502 });
  }
}
