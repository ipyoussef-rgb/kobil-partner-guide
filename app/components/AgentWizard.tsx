"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  CATEGORIES,
  deriveProductBase,
  findCategory,
  type Category,
  type Endpoint,
  type Param,
} from "../../lib/endpoints";

const STATE_KEY = "kobil-agent-v1";

// ---------- Client-side debug log ----------

type ClientCall = {
  id: string;
  ts: number;
  endpoint: string;
  status: number | "error";
  durationMs: number;
  ok: boolean;
  error?: string;
  trace?: unknown;
  authTrace?: unknown;
};

type DebugCtx = {
  calls: ClientCall[];
  record: (c: Omit<ClientCall, "id">) => void;
  clear: () => void;
};

const DebugContext = createContext<DebugCtx | null>(null);

function useDebug() {
  const ctx = useContext(DebugContext);
  if (!ctx) throw new Error("DebugContext missing");
  return ctx;
}

/**
 * Centralised fetch wrapper. Every API call from the agent goes through here
 * so the Debug panel can show endpoint, status, duration, and the trace the
 * server returned.
 */
async function tracedFetch(
  recorder: DebugCtx,
  endpoint: string,
  init: RequestInit,
): Promise<unknown> {
  const t0 = Date.now();
  try {
    const r = await fetch(endpoint, init);
    const durationMs = Date.now() - t0;
    let data: unknown = null;
    try {
      data = await r.json();
    } catch {
      data = null;
    }
    const obj = (data || {}) as Record<string, unknown>;
    recorder.record({
      ts: Date.now(),
      endpoint,
      status: r.status,
      durationMs,
      ok: r.ok && (obj.ok !== false),
      error: typeof obj.error === "string" ? obj.error : undefined,
      trace: obj.trace,
      authTrace: obj.authTrace,
    });
    return data;
  } catch (e) {
    const durationMs = Date.now() - t0;
    recorder.record({
      ts: Date.now(),
      endpoint,
      status: "error",
      durationMs,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }
}

type Service = {
  baseUrl: string;
  tenant: string;
  wellKnownUrl: string;
  clientId: string;
  clientSecret: string;
  tokenEndpoint?: string;
  userinfoEndpoint?: string;
  issuer?: string;
  callbackUrl?: string;
};

type Step =
  | "welcome"
  | "service-form"
  | "service-created"
  | "category-pick"
  | "category";

type Stored = {
  step: Step;
  service?: Service;
  category?: Category;
  accessToken?: string;
};

export default function AgentWizard() {
  const [step, setStep] = useState<Step>("welcome");
  const [service, setService] = useState<Service | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [accessToken, setAccessToken] = useState<string>("");
  const [endpointIdx, setEndpointIdx] = useState<number>(0);
  const [calls, setCalls] = useState<ClientCall[]>([]);
  const [debugOpen, setDebugOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const debugCtx: DebugCtx = useMemo(
    () => ({
      calls,
      record: (c) => {
        const id = (typeof crypto !== "undefined" && "randomUUID" in crypto
          ? (crypto as Crypto & { randomUUID(): string }).randomUUID()
          : Math.random().toString(36).slice(2)).slice(0, 8);
        setCalls((cur) => [...cur, { ...c, id }].slice(-20));
      },
      clear: () => setCalls([]),
    }),
    [calls],
  );

  // Restore state once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Stored;
        if (p.step) setStep(p.step);
        if (p.service) setService(p.service);
        if (p.category) setCategory(p.category);
        if (p.accessToken) setAccessToken(p.accessToken);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Persist on change
  useEffect(() => {
    try {
      const data: Stored = {
        step,
        service: service ?? undefined,
        category: category ?? undefined,
        accessToken: accessToken || undefined,
      };
      localStorage.setItem(STATE_KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }, [step, service, category, accessToken]);

  // Scroll to bottom on new message
  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }, [step, category, endpointIdx, accessToken]);

  function reset() {
    setStep("welcome");
    setService(null);
    setCategory(null);
    setAccessToken("");
    setEndpointIdx(0);
    try {
      localStorage.removeItem(STATE_KEY);
    } catch {
      /* ignore */
    }
  }

  return (
    <DebugContext.Provider value={debugCtx}>
    <div className="flex flex-col h-[calc(100vh-120px)] max-h-[900px]">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-zinc-50/50 px-4 py-6"
      >
        <div className="mx-auto max-w-3xl space-y-5">
          <Bot>
            <p className="font-medium">Welcome to the KOBIL Partner Guide.</p>
            <p className="mt-1.5 text-zinc-600">
              I&rsquo;ll walk you through three things: create a service in SmartDashboard,
              get an access token, and call the KOBIL APIs (Identity, Chat, Pay, Signature,
              TMS).
            </p>
            <p className="mt-1.5 text-zinc-600">
              Start by creating a service — that gives you the <code>client_id</code> and{" "}
              <code>client_secret</code>{" "}you&rsquo;ll use for every API call.
            </p>
            {step === "welcome" ? (
              <button
                type="button"
                onClick={() => setStep("service-form")}
                className="mt-4 rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
              >
                Continue →
              </button>
            ) : null}
          </Bot>

          {step !== "welcome" ? (
            <>
              <UserMessage>Let&rsquo;s create a service.</UserMessage>
              <Bot>
                <p>
                  Tell me about your SmartDashboard tenant and the service you want to create.
                </p>
                {step === "service-form" ? (
                  <ServiceForm
                    onSuccess={(s) => {
                      setService(s);
                      setStep("service-created");
                    }}
                  />
                ) : service ? (
                  <SubmittedServiceSummary service={service} />
                ) : null}
              </Bot>
            </>
          ) : null}

          {service && (step === "service-created" || step === "category-pick" || step === "category") ? (
            <>
              <UserMessage>Service created.</UserMessage>
              <Bot>
                <p className="font-medium text-green-800">
                  Your service is live. Save these — you&rsquo;ll need them for every API call.
                </p>
                <CredentialsCard service={service} />
                {step === "service-created" ? (
                  <button
                    type="button"
                    onClick={() => setStep("category-pick")}
                    className="mt-4 rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
                  >
                    I&rsquo;ve saved them — what&rsquo;s next?
                  </button>
                ) : null}
              </Bot>
            </>
          ) : null}

          {step === "category-pick" || (step === "category" && category) ? (
            <>
              {step === "category-pick" ? (
                <Bot>
                  <p>Which API would you like to test first?</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => {
                          setCategory(c.key);
                          setStep("category");
                          setEndpointIdx(0);
                          setAccessToken("");
                        }}
                        className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left hover:border-zinc-400 hover:shadow-sm"
                      >
                        <p className="font-semibold text-zinc-900">{c.label}</p>
                        <p className="mt-0.5 text-xs text-zinc-600">{c.tagline}</p>
                      </button>
                    ))}
                  </div>
                </Bot>
              ) : null}

              {step === "category" && category && service ? (
                <CategoryFlow
                  category={category}
                  service={service}
                  accessToken={accessToken}
                  endpointIdx={endpointIdx}
                  onToken={setAccessToken}
                  onEndpointChange={setEndpointIdx}
                  onPickAnother={() => {
                    setStep("category-pick");
                  }}
                />
              ) : null}
            </>
          ) : null}

          <div className="pt-4 text-center text-xs text-zinc-400">
            <button type="button" onClick={reset} className="underline hover:text-zinc-700">
              Restart from welcome
            </button>
          </div>
        </div>
      </div>

      <DebugPanel
        calls={calls}
        open={debugOpen}
        onToggle={() => setDebugOpen((o) => !o)}
        onClear={() => debugCtx.clear()}
      />
    </div>
    </DebugContext.Provider>
  );
}

function DebugPanel({
  calls,
  open,
  onToggle,
  onClear,
}: {
  calls: ClientCall[];
  open: boolean;
  onToggle: () => void;
  onClear: () => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const hasError = calls.some((c) => !c.ok);

  return (
    <div className="border-t border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2 text-xs">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-2 font-medium text-zinc-700 hover:text-zinc-900"
        >
          <span className={`inline-block h-2 w-2 rounded-full ${hasError ? "bg-red-500" : "bg-green-500"}`} />
          Debug log
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600">
            {calls.length} calls
          </span>
          <span className="text-zinc-400">{open ? "▼" : "▲"}</span>
        </button>
        <span className="flex-1" />
        {calls.length > 0 ? (
          <button type="button" onClick={onClear} className="text-zinc-500 hover:text-zinc-800">
            Clear
          </button>
        ) : null}
      </div>
      {open ? (
        <div className="max-h-72 overflow-auto border-t border-zinc-100 bg-zinc-50">
          <div className="mx-auto max-w-3xl px-4 py-3">
            {calls.length === 0 ? (
              <p className="text-xs text-zinc-500">No API calls yet. Trigger any step above.</p>
            ) : (
              <ul className="space-y-1.5">
                {calls
                  .slice()
                  .reverse()
                  .map((c) => {
                    const isOpen = expandedId === c.id;
                    return (
                      <li key={c.id} className="rounded-md bg-white px-2.5 py-1.5 text-xs shadow-sm">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isOpen ? null : c.id)}
                          className="flex w-full items-center gap-2 text-left"
                        >
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              c.ok
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {c.status}
                          </span>
                          <span className="font-mono text-zinc-800">{c.endpoint}</span>
                          <span className="text-zinc-400">{c.durationMs}ms</span>
                          <span className="ml-auto text-zinc-400">{isOpen ? "−" : "+"}</span>
                        </button>
                        {c.error ? (
                          <p className="mt-1 text-[11px] text-red-700">{c.error}</p>
                        ) : null}
                        {isOpen && (c.trace || c.authTrace) ? (
                          <div className="mt-2 space-y-2">
                            {c.trace ? (
                              <pre className="max-h-72 overflow-auto rounded bg-zinc-900 p-2 text-[11px] leading-snug text-zinc-100">
                                <code>route trace:{"\n"}{JSON.stringify(c.trace, null, 2)}</code>
                              </pre>
                            ) : null}
                            {c.authTrace ? (
                              <pre className="max-h-72 overflow-auto rounded bg-zinc-900 p-2 text-[11px] leading-snug text-zinc-100">
                                <code>auth trace:{"\n"}{JSON.stringify(c.authTrace, null, 2)}</code>
                              </pre>
                            ) : null}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ---------- Visual primitives ----------

function Bot({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-semibold text-white">
        K
      </div>
      <div className="flex-1 rounded-xl border border-zinc-200 bg-white p-4 text-sm leading-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}

function UserMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end gap-3">
      <div className="rounded-xl bg-zinc-900 px-4 py-2 text-sm text-white">{children}</div>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-700">
        you
      </div>
    </div>
  );
}

// ---------- Service form ----------

function ServiceForm({ onSuccess }: { onSuccess: (s: Service) => void }) {
  const debug = useDebug();
  const [baseUrl, setBase] = useState("");
  const [tenant, setTenant] = useState("");
  const [wellKnownUrl, setWellKnownUrl] = useState("");
  const [name, setName] = useState("");
  const [callbackUrl, setCallbackUrl] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trace, setTrace] = useState<unknown>(null);

  // Auto-derive well-known URL when base/tenant change and the user hasn't typed one
  const [wellKnownTouched, setWellKnownTouched] = useState(false);
  useEffect(() => {
    if (wellKnownTouched) return;
    if (!baseUrl || !tenant) return;
    try {
      const u = new URL(baseUrl);
      const idpHost = u.host.replace(/^smartdashboard\./, "idp.");
      const derived = `${u.protocol}//${idpHost}/auth/realms/${encodeURIComponent(
        tenant.trim(),
      )}/.well-known/openid-configuration`;
      setWellKnownUrl(derived);
    } catch {
      /* ignore */
    }
  }, [baseUrl, tenant, wellKnownTouched]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setTrace(null);

    // 1. Fetch the well-known config (best-effort; failure is non-fatal — we still
    //    try to create the service so the user can fix the well-known later).
    let tokenEndpoint: string | undefined;
    let userinfoEndpoint: string | undefined;
    let issuer: string | undefined;
    try {
      const wkJson = (await tracedFetch(debug, "/api/idp/well-known", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: wellKnownUrl }),
      })) as { ok?: boolean; tokenEndpoint?: string; userinfoEndpoint?: string; issuer?: string };
      if (wkJson?.ok) {
        tokenEndpoint = wkJson.tokenEndpoint;
        userinfoEndpoint = wkJson.userinfoEndpoint;
        issuer = wkJson.issuer;
      }
    } catch {
      /* ignore — we'll still create the service */
    }

    // 2. Create the service.
    try {
      const data = (await tracedFetch(debug, "/api/smartdashboard/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smartdashboardBaseUrl: baseUrl,
          tenant,
          service: { name, description, callbackUrl },
        }),
      })) as {
        ok?: boolean;
        clientId?: string;
        clientSecret?: string;
        upstreamMessage?: string;
        error?: string;
        trace?: unknown;
        authTrace?: unknown;
      };
      if (!data.ok || !data.clientId || !data.clientSecret) {
        setError(data.upstreamMessage || data.error || "Service creation failed.");
        setTrace(data.authTrace ?? data.trace);
        return;
      }
      onSuccess({
        baseUrl,
        tenant,
        wellKnownUrl,
        clientId: data.clientId,
        clientSecret: data.clientSecret,
        tokenEndpoint,
        userinfoEndpoint,
        issuer,
        callbackUrl,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <Field label="SmartDashboard Base URL" required value={baseUrl} onChange={setBase} placeholder="https://smartdashboard.example.kobil.com" />
      <Field label="IDP well-known configuration URL" required value={wellKnownUrl} onChange={(v) => { setWellKnownUrl(v); setWellKnownTouched(true); }} placeholder="https://idp.example.kobil.com/auth/realms/your-tenant/.well-known/openid-configuration" hint="Auto-filled from base URL and tenant — override if your IDP is hosted elsewhere." />
      <Field label="Tenant" required value={tenant} onChange={setTenant} placeholder="your-tenant" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Service name" required value={name} onChange={setName} placeholder="Acme MiniApp" />
        <Field label="Callback URL" required value={callbackUrl} onChange={setCallbackUrl} placeholder="https://acme.example.com" />
      </div>
      <Field label="Description (optional)" value={description} onChange={setDescription} placeholder="Short description" />

      {error ? (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <p className="font-medium">{error}</p>
          {trace ? (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer">Show diagnostic trace</summary>
              <pre className="mt-2 max-h-72 overflow-auto rounded bg-zinc-900 p-2 text-[11px] text-zinc-100">
                <code>{JSON.stringify(trace, null, 2)}</code>
              </pre>
            </details>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
      >
        {submitting ? "Logging in & creating…" : "Create service"}
      </button>
    </form>
  );
}

function Field({
  label,
  required,
  value,
  onChange,
  placeholder,
  hint,
  type = "text",
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-800">
        {label}
        {required ? <span className="text-[var(--accent)]"> *</span> : null}
      </label>
      <input
        required={required}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
      />
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

function SubmittedServiceSummary({ service }: { service: Service }) {
  return (
    <div className="mt-4 grid gap-2 rounded-md bg-zinc-50 p-3 text-xs">
      <Row k="Base URL" v={service.baseUrl} />
      <Row k="Tenant" v={service.tenant} />
      <Row k="Well-known" v={service.wellKnownUrl} />
      <Row k="Service name" v={(service as Service & { name?: string }).name || ""} />
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-24 shrink-0 text-zinc-500">{k}</span>
      <span className="break-all font-mono text-zinc-800">{v}</span>
    </div>
  );
}

function CredentialsCard({ service }: { service: Service }) {
  function copy(s: string) {
    try {
      navigator.clipboard.writeText(s);
    } catch {
      /* ignore */
    }
  }
  return (
    <div className="mt-3 space-y-3 rounded-md border border-green-200 bg-green-50 p-3">
      <CredRow label="client_id" value={service.clientId} onCopy={() => copy(service.clientId)} />
      <CredRow label="client_secret" value={service.clientSecret} onCopy={() => copy(service.clientSecret)} />
      {service.tokenEndpoint ? (
        <CredRow label="token_endpoint" value={service.tokenEndpoint} onCopy={() => copy(service.tokenEndpoint!)} />
      ) : null}
      {service.issuer ? (
        <CredRow label="issuer" value={service.issuer} onCopy={() => copy(service.issuer!)} />
      ) : null}
    </div>
  );
}

function CredRow({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-green-900">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <code className="block w-full break-all rounded bg-white px-2 py-1.5 font-mono text-[11px] text-zinc-800">
          {value}
        </code>
        <button
          type="button"
          onClick={onCopy}
          className="rounded border border-green-300 px-2 py-1 text-[11px] font-medium text-green-900 hover:border-green-500"
        >
          Copy
        </button>
      </div>
    </div>
  );
}

// ---------- Per-category flow ----------

function CategoryFlow({
  category,
  service,
  accessToken,
  endpointIdx,
  onToken,
  onEndpointChange,
  onPickAnother,
}: {
  category: Category;
  service: Service;
  accessToken: string;
  endpointIdx: number;
  onToken: (t: string) => void;
  onEndpointChange: (i: number) => void;
  onPickAnother: () => void;
}) {
  const info = useMemo(() => findCategory(category)!, [category]);

  return (
    <>
      <UserMessage>Test {info.label}.</UserMessage>
      <Bot>
        <p className="font-semibold text-zinc-900">KOBIL {info.label}</p>
        <p className="mt-1 text-sm text-zinc-800">{info.tagline}</p>
        <p className="mt-2 text-zinc-700">{info.description}</p>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-zinc-700">
          {info.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </Bot>

      <Bot>
        <p className="font-medium">Step A — Get an access token.</p>
        <p className="mt-1 text-zinc-600">
          Service-account flow (<code>client_credentials</code>). I&rsquo;ve pre-filled everything from
          your service.
        </p>
        <TokenForm service={service} onToken={onToken} accessToken={accessToken} />
      </Bot>

      {accessToken ? (
        <Bot>
          <p className="font-medium">Step B — Call the {info.label} API.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {info.endpoints.map((ep, i) => (
              <button
                key={ep.id}
                type="button"
                onClick={() => onEndpointChange(i)}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  i === endpointIdx
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-300 text-zinc-700 hover:border-zinc-900"
                }`}
              >
                {ep.method} {ep.name}
              </button>
            ))}
          </div>
          <EndpointForm
            endpoint={info.endpoints[endpointIdx]}
            service={service}
            accessToken={accessToken}
          />
          <button
            type="button"
            onClick={onPickAnother}
            className="mt-4 rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-800 hover:border-zinc-900"
          >
            Try a different category
          </button>
        </Bot>
      ) : null}
    </>
  );
}

// ---------- Token form ----------

function TokenForm({
  service,
  accessToken,
  onToken,
}: {
  service: Service;
  accessToken: string;
  onToken: (t: string) => void;
}) {
  const debug = useDebug();
  const [tokenUrl, setTokenUrl] = useState(service.tokenEndpoint || "");
  const [clientId, setClientId] = useState(service.clientId);
  const [clientSecret, setClientSecret] = useState(service.clientSecret);
  const [scope, setScope] = useState("openid");
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<{ status: number; body: unknown; error?: string } | null>(null);

  useEffect(() => {
    setTokenUrl(service.tokenEndpoint || "");
    setClientId(service.clientId);
    setClientSecret(service.clientSecret);
  }, [service]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResp(null);
    try {
      const data = (await tracedFetch(debug, "/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenUrl,
          clientId,
          clientSecret,
          scope,
          grantType: "client_credentials",
        }),
      })) as { status: number; body: unknown };
      setResp(data);
      const t =
        data?.body && typeof data.body === "object"
          ? (data.body as Record<string, unknown>).access_token
          : null;
      if (typeof t === "string" && t.length > 0) onToken(t);
    } catch (err) {
      setResp({ status: 0, body: null, error: err instanceof Error ? err.message : "Request failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <Field label="Token endpoint" required value={tokenUrl} onChange={setTokenUrl} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Client ID" required value={clientId} onChange={setClientId} />
        <Field label="Client secret" required type="password" value={clientSecret} onChange={setClientSecret} />
      </div>
      <Field label="Scopes" value={scope} onChange={setScope} hint="Space-separated. openid is a sensible default." />
      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
      >
        {loading ? "Requesting…" : accessToken ? "Refresh token" : "Get access token"}
      </button>
      {resp ? (
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-700">Response</span>
            <span
              className={`rounded-full px-2 py-0.5 font-medium ${
                resp.status >= 200 && resp.status < 300
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              HTTP {resp.status || "error"}
            </span>
          </div>
          {resp.error ? (
            <p className="text-xs text-red-700">{resp.error}</p>
          ) : (
            <pre className="max-h-56 overflow-auto rounded-md bg-zinc-900 p-2 text-[11px] leading-snug text-zinc-100">
              <code>{JSON.stringify(resp.body, null, 2)}</code>
            </pre>
          )}
        </div>
      ) : null}
      {accessToken ? (
        <p className="text-[11px] text-green-700">
          Access token captured. The next step uses it as <code>Authorization: Bearer …</code>{" "}
          automatically.
        </p>
      ) : null}
    </form>
  );
}

// ---------- Endpoint form ----------

function uuidv4(): string {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  a[6] = (a[6] & 0x0f) | 0x40;
  a[8] = (a[8] & 0x3f) | 0x80;
  const h = Array.from(a, (b) => b.toString(16).padStart(2, "0"));
  return `${h[0]}${h[1]}${h[2]}${h[3]}-${h[4]}${h[5]}-${h[6]}${h[7]}-${h[8]}${h[9]}-${h[10]}${h[11]}${h[12]}${h[13]}${h[14]}${h[15]}`;
}

function substitute(template: string, vars: Record<string, string>): string {
  return template
    .replace(/\{\{\$randomUUID\}\}/g, uuidv4())
    .replace(/\{\{([\w.-]+)\}\}/g, (_, k) => (k in vars ? vars[k] : `{{${k}}}`));
}

function basicAuth(clientId: string, clientSecret: string): string {
  if (typeof btoa === "function") return "Basic " + btoa(`${clientId}:${clientSecret}`);
  return "";
}

function EndpointForm({
  endpoint,
  service,
  accessToken,
}: {
  endpoint: Endpoint;
  service: Service;
  accessToken: string;
}) {
  const debug = useDebug();
  const [base, setBase] = useState("");
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [bodyText, setBodyText] = useState<string>("");
  const [formFields, setFormFields] = useState<{ key: string; value: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<{ status: number; statusText?: string; body: unknown; error?: string } | null>(null);

  // Variables available for {{template}} substitution.
  const subsVars = useMemo<Record<string, string>>(
    () => ({
      client_id: service.clientId,
      client_secret: service.clientSecret,
      tenant_name: service.tenant,
      tenant_id: service.tenant,
      base_url: new URL(service.baseUrl).host.replace(/^smartdashboard\./, ""),
    }),
    [service],
  );

  // Re-initialize whenever the active endpoint changes.
  useEffect(() => {
    let defaultBase = deriveProductBase(endpoint.host, service.baseUrl);
    defaultBase = defaultBase.replace(/\/auth\/?$/i, "");
    setBase(defaultBase);

    const next: Record<string, string> = {};
    for (const p of endpoint.params) {
      if (p.defaultFrom === "tenant") next[p.name] = service.tenant;
      else if (p.defaultFrom === "clientId") next[p.name] = service.clientId;
      else if (p.defaultFrom === "callbackUrl") next[p.name] = service.callbackUrl || "";
      else if (p.example && p.example.includes("{{")) next[p.name] = substitute(p.example, subsVars);
      else if (p.example) next[p.name] = p.example;
      else next[p.name] = "";
    }
    setParamValues(next);

    if (endpoint.bodyTemplate) {
      setBodyText(substitute(endpoint.bodyTemplate, subsVars));
    } else {
      setBodyText("");
    }

    if (endpoint.formData && endpoint.formData.length > 0) {
      setFormFields(
        endpoint.formData.map((f) => ({ key: f.key, value: substitute(f.value, subsVars) })),
      );
    } else {
      setFormFields([]);
    }

    setResp(null);
  }, [endpoint, service, subsVars]);

  function buildRequest(): { url: string; body: string | null; headers: Record<string, string> } {
    let path = endpoint.pathTemplate;
    const query: string[] = [];
    const headers: Record<string, string> = {};
    for (const p of endpoint.params) {
      const val = (paramValues[p.name] ?? "").trim();
      if (p.in === "path") {
        // Both {paramName} and {{paramName}} substitution.
        path = path
          .replace(`{${p.name}}`, encodeURIComponent(val))
          .replace(`{{${p.name}}}`, encodeURIComponent(val));
      } else if (p.in === "query" && val) {
        query.push(`${encodeURIComponent(p.name)}=${encodeURIComponent(val)}`);
      } else if (p.in === "header" && val) {
        headers[p.name] = val;
      }
    }

    const url = `${base.replace(/\/+$/, "")}${path}${query.length ? `?${query.join("&")}` : ""}`;

    let body: string | null = null;
    if (endpoint.formData && endpoint.formData.length > 0) {
      const form = new URLSearchParams();
      for (const f of formFields) {
        if (f.key && f.value) form.set(f.key, f.value);
      }
      body = form.toString();
      headers["Content-Type"] = endpoint.contentType ?? "application/x-www-form-urlencoded";
    } else if (endpoint.method !== "GET" && endpoint.method !== "DELETE" && bodyText.trim()) {
      // Substitute placeholders that may remain in the (possibly edited) body.
      body = substitute(bodyText, subsVars);
      headers["Content-Type"] = endpoint.contentType ?? "application/json";
    }

    return { url, body, headers };
  }

  const preview = useMemo(buildRequest, [paramValues, base, endpoint, bodyText, formFields, subsVars]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResp(null);
    try {
      const headers: Record<string, string> = { ...preview.headers };
      // Token endpoints don't take a Bearer; everything else does.
      const isTokenEndpoint = endpoint.host === "idp" && endpoint.pathTemplate.endsWith("/token");
      if (!isTokenEndpoint && accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }
      if (!headers.Accept) headers.Accept = "application/json";

      const data = (await tracedFetch(debug, "/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: preview.url,
          method: endpoint.method,
          headers,
          body: preview.body,
        }),
      })) as { status: number; statusText?: string; body: unknown; error?: string };
      setResp(data);
    } catch (err) {
      setResp({ status: 0, body: null, error: err instanceof Error ? err.message : "Request failed" });
    } finally {
      setLoading(false);
    }
  }

  const baseLabel =
    endpoint.host === "idp"
      ? "IDP base URL"
      : endpoint.host === "pay"
        ? "Pay base URL"
        : "TMS base URL";

  return (
    <div className="mt-3 rounded-lg border border-zinc-200 bg-white">
      <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-xs">
        <span
          className={`rounded px-2 py-0.5 font-mono font-semibold ${
            endpoint.method === "GET"
              ? "bg-blue-100 text-blue-900"
              : endpoint.method === "POST"
                ? "bg-green-100 text-green-900"
                : "bg-amber-100 text-amber-900"
          }`}
        >
          {endpoint.method}
        </span>
        <span className="break-all font-mono text-zinc-800">{endpoint.pathTemplate}</span>
        {endpoint.docsUrl ? (
          <a
            href={endpoint.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto whitespace-nowrap text-zinc-500 underline hover:text-zinc-900"
          >
            spec ↗
          </a>
        ) : null}
      </div>

      <form onSubmit={submit} className="space-y-3 p-3">
        <p className="text-xs text-zinc-600">{endpoint.summary}</p>

        <Field
          label={baseLabel}
          required
          value={base}
          onChange={setBase}
          hint={`Derived: smartdashboard.{env} → ${endpoint.host}.{env}.`}
        />

        {endpoint.note ? (
          <p className="rounded bg-amber-50 px-2 py-1.5 text-[11px] text-amber-900">
            {endpoint.note}
          </p>
        ) : null}

        {endpoint.params.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {endpoint.params.map((p) => (
              <ParamInput
                key={p.name}
                param={p}
                value={paramValues[p.name] ?? ""}
                onChange={(v) => setParamValues((cur) => ({ ...cur, [p.name]: v }))}
              />
            ))}
          </div>
        ) : null}

        {endpoint.formData && endpoint.formData.length > 0 ? (
          <div>
            <p className="mb-1 text-xs font-medium text-zinc-800">
              Form body{" "}
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] uppercase text-zinc-600">
                {endpoint.contentType ?? "application/x-www-form-urlencoded"}
              </span>
            </p>
            <div className="space-y-2">
              {formFields.map((f, i) => (
                <div key={i} className="grid grid-cols-[140px_1fr] gap-2">
                  <input
                    value={f.key}
                    onChange={(e) =>
                      setFormFields((cur) =>
                        cur.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)),
                      )
                    }
                    className="rounded-md border border-zinc-300 px-2 py-1 font-mono text-xs"
                  />
                  <input
                    value={f.value}
                    onChange={(e) =>
                      setFormFields((cur) =>
                        cur.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)),
                      )
                    }
                    className="rounded-md border border-zinc-300 px-2 py-1 font-mono text-xs"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {endpoint.bodyTemplate ? (
          <div>
            <p className="mb-1 text-xs font-medium text-zinc-800">
              JSON body
              <span className="ml-2 text-[10px] text-zinc-500">
                {"{"}{"{"}variables{"}"}{"}"} are substituted on send. {"{"}{"{"}$randomUUID{"}"}{"}"} regenerates each call.
              </span>
            </p>
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              rows={Math.min(20, Math.max(6, bodyText.split("\n").length))}
              className="w-full rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1.5 font-mono text-[11px] leading-snug focus:border-zinc-900 focus:outline-none"
            />
          </div>
        ) : null}

        <div className="rounded bg-zinc-50 p-2 text-[11px] font-mono break-all text-zinc-700">
          <span className="text-zinc-500">{endpoint.method} </span>
          {preview.url}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
        >
          {loading ? "Sending…" : "Send request"}
        </button>

        {resp ? (
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-700">Response</span>
              <span
                className={`rounded-full px-2 py-0.5 font-medium ${
                  resp.status >= 200 && resp.status < 300
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                HTTP {resp.status || "error"}
                {resp.statusText ? ` · ${resp.statusText}` : ""}
              </span>
            </div>
            {resp.error ? (
              <p className="text-xs text-red-700">{resp.error}</p>
            ) : (
              <pre className="max-h-72 overflow-auto rounded-md bg-zinc-900 p-2 text-[11px] leading-snug text-zinc-100">
                <code>{typeof resp.body === "string" ? resp.body : JSON.stringify(resp.body, null, 2)}</code>
              </pre>
            )}
          </div>
        ) : null}
      </form>
    </div>
  );
}

function ParamInput({
  param,
  value,
  onChange,
}: {
  param: Param;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-800">
        <span className="font-mono">{param.name}</span>
        <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] uppercase text-zinc-600">
          {param.in}
        </span>
        {param.required ? <span className="ml-2 text-[var(--accent)]">required</span> : null}
      </label>
      <input
        required={param.required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={param.example ?? ""}
        className="mt-1 w-full rounded-md border border-zinc-300 px-2.5 py-1.5 font-mono text-xs focus:border-zinc-900 focus:outline-none"
      />
      {param.description ? (
        <p className="mt-0.5 text-[11px] text-zinc-500">{param.description}</p>
      ) : null}
    </div>
  );
}
