import { NextRequest, NextResponse } from "next/server";
import { Trace } from "../../../lib/trace";

export const dynamic = "force-dynamic";

type MultipartPart =
  | { kind: "text"; name: string; value: string }
  | { kind: "file"; name: string; filename: string; contentType?: string; base64: string };

type ProxyBody = {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string | null;
  multipart?: MultipartPart[];
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
  let multipartParts = 0;
  if (method !== "GET" && method !== "DELETE") {
    if (body.multipart && body.multipart.length > 0) {
      const form = new FormData();
      for (const p of body.multipart) {
        if (p.kind === "text") {
          form.append(p.name, p.value);
        } else if (p.kind === "file") {
          try {
            const bytes = Uint8Array.from(atob(p.base64), (c) => c.charCodeAt(0));
            const blob = new Blob([bytes], { type: p.contentType || "application/octet-stream" });
            form.append(p.name, blob, p.filename);
            bodyLen += bytes.length;
          } catch {
            trace.push("multipart-decode-fail", { note: `part=${p.name} filename=${p.filename}` });
          }
        }
        multipartParts++;
      }
      init.body = form;
      // Let fetch set the multipart Content-Type with the right boundary.
      headers.delete("Content-Type");
    } else if (body.body) {
      init.body = body.body;
      bodyLen = body.body.length;
      if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    }
  }

  trace.push("upstream-request", {
    url: parsed.toString(),
    method,
    note: `headers=[${headerNames.join(", ")}] auth=${hasAuth ? "yes" : "no"} bodyLen=${bodyLen}${multipartParts ? ` multipartParts=${multipartParts}` : ""}`,
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
