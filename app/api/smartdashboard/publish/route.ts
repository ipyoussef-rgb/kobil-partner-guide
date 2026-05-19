import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type PublishBody = {
  smartdashboardBaseUrl?: string;
  tenant?: string;
  cookie?: string;
};

function bad(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

type StepResult = {
  ok: boolean;
  status: number;
  url: string;
  body?: unknown;
  error?: string;
};

async function doFetch(url: string, init: RequestInit): Promise<StepResult> {
  try {
    const r = await fetch(url, { ...init, cache: "no-store", redirect: "manual" });
    const text = await r.text();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text.slice(0, 300);
    }
    return { ok: r.ok, status: r.status, url, body: parsed };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network error";
    return { ok: false, status: 0, url, error: msg };
  }
}

export async function POST(req: NextRequest) {
  let body: PublishBody;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const base = (body.smartdashboardBaseUrl || "").trim().replace(/\/+$/, "");
  const tenant = (body.tenant || "").trim();
  const cookie = (body.cookie || "").trim();

  if (!base) return bad("smartdashboardBaseUrl is required");
  if (!tenant) return bad("tenant is required");
  if (!cookie) return bad("cookie is required");

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Cookie: cookie,
  };

  const homeListUrl = `${base}/${tenant}/api/v1/smart-screen/homescreens/`;
  const branchesBase = `${base}/${tenant}/api/v1/smart-screen/branches_management`;

  // Step 1: trigger isChanged=true by PUTting the current homescreen back.
  let touchResult: StepResult | null = null;
  try {
    const r = await fetch(homeListUrl, { headers, cache: "no-store" });
    const text = await r.text();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
    const screens =
      parsed && typeof parsed === "object" && parsed !== null
        ? Array.isArray((parsed as Record<string, unknown>).data)
          ? ((parsed as Record<string, unknown>).data as unknown[])
          : Array.isArray(parsed)
            ? (parsed as unknown[])
            : []
        : Array.isArray(parsed)
          ? (parsed as unknown[])
          : [];
    if (screens.length === 0) {
      touchResult = {
        ok: false,
        status: r.status,
        url: homeListUrl,
        error: "No homescreens found — cannot trigger isChanged",
      };
    } else {
      const first = screens[0] as Record<string, unknown>;
      const id = typeof first.id === "string" ? first.id : "";
      const putUrl = `${base}/${tenant}/api/v1/smart-screen/homescreens/${id}/`;
      const sections = Array.isArray(first.sections)
        ? (first.sections as Record<string, unknown>[])
            .filter((s) => typeof s.id === "string")
            .map((s) => ({ id: s.id as string }))
        : [];
      const putPayload = {
        label: typeof first.label === "string" ? first.label : "Home Screen",
        sections,
        audiences: Array.isArray(first.audiences) ? first.audiences : [],
        type: typeof first.type === "string" ? first.type : "legacy",
      };
      touchResult = await doFetch(putUrl, {
        method: "PUT",
        headers,
        body: JSON.stringify(putPayload),
      });
    }
  } catch (e) {
    touchResult = {
      ok: false,
      status: 0,
      url: homeListUrl,
      error: e instanceof Error ? e.message : "Network error",
    };
  }

  // Step 2–4: save, publish, switch
  const branchId = String(Date.now());
  const saveResult = await doFetch(`${branchesBase}/save/branch/${branchId}/`, {
    method: "POST",
    headers,
    body: JSON.stringify({ description: "Created via KOBIL Partner Guide" }),
  });
  const publishResult = await doFetch(`${branchesBase}/publish/branch/${branchId}/`, {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  });
  const switchResult = await doFetch(
    `${branchesBase}/switch/branch/${branchId}/?discardChanges=true`,
    { method: "POST", headers, body: JSON.stringify({}) },
  );

  const ok =
    !!touchResult?.ok && saveResult.ok && publishResult.ok && switchResult.ok;

  return NextResponse.json({
    ok,
    branchId,
    touch: touchResult,
    save: saveResult,
    publish: publishResult,
    switch: switchResult,
  });
}
