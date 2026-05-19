"use client";

import { useEffect, useMemo, useState } from "react";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type Sample = {
  id: string;
  label: string;
  method: Method;
  path: string;
  body?: string;
};

type Product = {
  key: string;
  label: string;
  description: string;
  baseEnvVar: string;
  basePlaceholder: string;
  samples: Sample[];
};

const PRODUCTS: Product[] = [
  {
    key: "identity",
    label: "Identity",
    description: "OpenID Connect endpoints — userinfo, token introspection, well-known.",
    baseEnvVar: "ISSUER",
    basePlaceholder: "https://idp.example.com/realms/your-tenant",
    samples: [
      {
        id: "well-known",
        label: "GET .well-known/openid-configuration",
        method: "GET",
        path: "/.well-known/openid-configuration",
      },
      {
        id: "userinfo",
        label: "GET /protocol/openid-connect/userinfo",
        method: "GET",
        path: "/protocol/openid-connect/userinfo",
      },
    ],
  },
  {
    key: "chat",
    label: "Chat",
    description: "Send messages to SuperApp users. Plain text, choices, attachments, signatures.",
    baseEnvVar: "CHAT_BASE",
    basePlaceholder: "https://chat.cloud.kobil.com",
    samples: [
      {
        id: "send-text",
        label: "POST /v1/messages — text",
        method: "POST",
        path: "/v1/messages",
        body: JSON.stringify(
          {
            userId: "USER_ID",
            type: "text",
            body: "Your order #1234 has shipped.",
            callbackUrl: "https://yourapp.example/chat-callback",
          },
          null,
          2,
        ),
      },
      {
        id: "send-signature",
        label: "POST /v1/messages — signature",
        method: "POST",
        path: "/v1/messages",
        body: JSON.stringify(
          {
            userId: "USER_ID",
            type: "signature",
            title: "Sign your contract",
            pdf: "data:application/pdf;base64,JVBERi0xLjQK...",
            callbackUrl: "https://yourapp.example/chat-callback",
          },
          null,
          2,
        ),
      },
    ],
  },
  {
    key: "pay",
    label: "Pay",
    description: "Create, inquire, refund, and void payment transactions.",
    baseEnvVar: "PAY_BASE",
    basePlaceholder: "https://pay.cloud.kobil.com",
    samples: [
      {
        id: "create",
        label: "POST /v1/transactions — create",
        method: "POST",
        path: "/v1/transactions",
        body: JSON.stringify(
          {
            userId: "USER_ID",
            amount: 19.99,
            currency: "EUR",
            description: "Order #1234",
            callbackUrl: "https://yourapp.example/pay-callback",
            preAuthorized: false,
          },
          null,
          2,
        ),
      },
      {
        id: "inquiry",
        label: "GET /v1/transactions/{id}",
        method: "GET",
        path: "/v1/transactions/REPLACE_TX_ID",
      },
      {
        id: "refund",
        label: "POST /v1/transactions/{id}/refund",
        method: "POST",
        path: "/v1/transactions/REPLACE_TX_ID/refund",
        body: JSON.stringify({ amount: 19.99, reason: "customer return" }, null, 2),
      },
    ],
  },
  {
    key: "tms",
    label: "TMS",
    description: "Start, monitor, and retrieve high-trust transaction confirmations.",
    baseEnvVar: "TMS_BASE",
    basePlaceholder: "https://tms.cloud.kobil.com",
    samples: [
      {
        id: "start",
        label: "POST /v1/transactions — start",
        method: "POST",
        path: "/v1/transactions",
        body: JSON.stringify(
          {
            userId: "USER_ID",
            tmsData: "Login attempt from new device — confirm?",
            timeoutSeconds: 60,
          },
          null,
          2,
        ),
      },
      {
        id: "status",
        label: "GET /v1/transactions/{id}",
        method: "GET",
        path: "/v1/transactions/REPLACE_TX_ID",
      },
      {
        id: "result",
        label: "GET /v1/transactions/{id}/result",
        method: "GET",
        path: "/v1/transactions/REPLACE_TX_ID/result",
      },
    ],
  },
];

const TOKEN_KEY = "kobil-access-token-v1";
const STATE_KEY = "kobil-api-tester-v1";

type Resp = {
  status: number;
  statusText?: string;
  elapsedMs?: number;
  headers?: Record<string, string>;
  body?: unknown;
  error?: string;
};

export default function ApiTester({ initialProductKey }: { initialProductKey?: string }) {
  const initialIdx = useMemo(() => {
    if (!initialProductKey) return 0;
    const idx = PRODUCTS.findIndex((p) => p.key === initialProductKey);
    return idx >= 0 ? idx : 0;
  }, [initialProductKey]);

  const [productKey, setProductKey] = useState(PRODUCTS[initialIdx].key);
  const product = useMemo(() => PRODUCTS.find((p) => p.key === productKey)!, [productKey]);

  const [baseUrls, setBaseUrls] = useState<Record<string, string>>({});
  const [accessToken, setAccessToken] = useState("");
  const [sampleId, setSampleId] = useState(product.samples[0].id);
  const [method, setMethod] = useState<Method>(product.samples[0].method);
  const [path, setPath] = useState(product.samples[0].path);
  const [body, setBody] = useState(product.samples[0].body ?? "");
  const [extraHeaders, setExtraHeaders] = useState("");
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<Resp | null>(null);

  useEffect(() => {
    try {
      const tok = localStorage.getItem(TOKEN_KEY);
      if (tok) setAccessToken(tok);
      const raw = localStorage.getItem(STATE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.baseUrls === "object") setBaseUrls(parsed.baseUrls);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const s = product.samples.find((x) => x.id === sampleId) ?? product.samples[0];
    setMethod(s.method);
    setPath(s.path);
    setBody(s.body ?? "");
  }, [sampleId, product]);

  useEffect(() => {
    setSampleId(product.samples[0].id);
  }, [product]);

  function setBase(value: string) {
    const next = { ...baseUrls, [product.key]: value };
    setBaseUrls(next);
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify({ baseUrls: next }));
    } catch {
      /* ignore */
    }
  }

  function buildUrl(): string {
    const base = (baseUrls[product.key] || "").replace(/\/+$/, "");
    if (!base) return path;
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    return base + (path.startsWith("/") ? path : "/" + path);
  }

  function parseExtraHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
    if (!extraHeaders.trim()) return headers;
    for (const line of extraHeaders.split(/\n+/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const idx = trimmed.indexOf(":");
      if (idx === -1) continue;
      const k = trimmed.slice(0, idx).trim();
      const v = trimmed.slice(idx + 1).trim();
      if (k) headers[k] = v;
    }
    return headers;
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResp(null);
    try {
      const res = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: buildUrl(),
          method,
          headers: parseExtraHeaders(),
          body: method === "GET" || method === "DELETE" ? null : body || null,
        }),
      });
      const data = (await res.json()) as Resp;
      setResp(data);
    } catch (err) {
      setResp({ status: 0, error: err instanceof Error ? err.message : "Request failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-1 shadow-sm">
        <div className="flex flex-wrap gap-1 p-1">
          {PRODUCTS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setProductKey(p.key)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                p.key === productKey
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="px-4 pb-3 pt-1 text-xs text-zinc-500">{product.description}</p>
      </div>

      <form onSubmit={send} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-800">
                {product.label} base URL <span className="text-zinc-400">(${product.baseEnvVar})</span>
              </label>
              <input
                value={baseUrls[product.key] || ""}
                onChange={(e) => setBase(e.target.value)}
                placeholder={product.basePlaceholder}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-800">
                Access token <span className="text-zinc-400">(loaded from step 2)</span>
              </label>
              <input
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="paste an access token, or fetch one on Get token"
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-xs focus:border-zinc-900 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-800">Sample requests</label>
            <select
              value={sampleId}
              onChange={(e) => setSampleId(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
            >
              {product.samples.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
            <div>
              <label className="block text-sm font-medium text-zinc-800">Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as Method)}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
              >
                {(["GET", "POST", "PUT", "PATCH", "DELETE"] as Method[]).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-800">Path or URL</label>
              <input
                value={path}
                onChange={(e) => setPath(e.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-sm focus:border-zinc-900 focus:outline-none"
              />
            </div>
          </div>

          {(method === "POST" || method === "PUT" || method === "PATCH") && (
            <div>
              <label className="block text-sm font-medium text-zinc-800">Body (JSON)</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-xs focus:border-zinc-900 focus:outline-none"
              />
            </div>
          )}

          <details className="text-sm">
            <summary className="cursor-pointer font-medium text-zinc-700">Extra headers</summary>
            <textarea
              value={extraHeaders}
              onChange={(e) => setExtraHeaders(e.target.value)}
              placeholder={"X-Tenant-Id: your-tenant\nX-Trace-Id: ..."}
              rows={3}
              className="mt-2 w-full rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-xs focus:border-zinc-900 focus:outline-none"
            />
            <p className="mt-1 text-xs text-zinc-500">
              One <code>Key: value</code> per line. Authorization is added for you when a token is set.
            </p>
          </details>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
            >
              {loading ? "Sending…" : "Send request"}
            </button>
            <span className="truncate text-xs text-zinc-500">
              → <span className="font-mono">{method}</span> {buildUrl() || <em>(no URL)</em>}
            </span>
          </div>
        </div>
      </form>

      {resp ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-zinc-900">Response</h3>
            <div className="flex items-center gap-2 text-xs">
              {typeof resp.elapsedMs === "number" ? (
                <span className="text-zinc-500">{resp.elapsedMs} ms</span>
              ) : null}
              <span
                className={`rounded-full px-2 py-0.5 font-medium ${
                  resp.status >= 200 && resp.status < 300
                    ? "bg-green-100 text-green-800"
                    : resp.status === 0
                      ? "bg-zinc-100 text-zinc-700"
                      : "bg-red-100 text-red-800"
                }`}
              >
                HTTP {resp.status || "error"} {resp.statusText ? `· ${resp.statusText}` : ""}
              </span>
            </div>
          </div>
          {resp.error ? <p className="text-sm text-red-700">{resp.error}</p> : null}
          {resp.headers && Object.keys(resp.headers).length > 0 ? (
            <details className="mb-3 text-sm">
              <summary className="cursor-pointer text-zinc-700">Response headers</summary>
              <pre className="mt-2 overflow-x-auto rounded bg-zinc-100 p-3 text-[11px] leading-snug text-zinc-700">
                <code>
                  {Object.entries(resp.headers)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join("\n")}
                </code>
              </pre>
            </details>
          ) : null}
          <pre className="max-h-[420px] overflow-auto rounded-md bg-zinc-900 p-3 text-xs leading-relaxed text-zinc-100">
            <code>
              {typeof resp.body === "string" ? resp.body : JSON.stringify(resp.body, null, 2)}
            </code>
          </pre>
        </div>
      ) : null}
    </div>
  );
}
