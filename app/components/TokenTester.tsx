"use client";

import { useEffect, useState } from "react";

type TokenResp = {
  status: number;
  body: unknown;
  error?: string;
};

const STORAGE_KEY = "kobil-token-tester-v1";
const TOKEN_KEY = "kobil-access-token-v1";
const CREDS_KEY = "kobil-service-credentials-v1";

type ServiceCreds = {
  clientId?: string;
  clientSecret?: string;
  smartdashboardBaseUrl?: string;
  tenant?: string;
  name?: string;
  createdAt?: string;
};

type Stored = {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scope: string;
};

export default function TokenTester() {
  const [tokenUrl, setTokenUrl] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [scope, setScope] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<TokenResp | null>(null);
  const [accessToken, setAccessToken] = useState<string>("");
  const [showSecret, setShowSecret] = useState(false);
  const [serviceCreds, setServiceCreds] = useState<ServiceCreds | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Stored) : null;
      const credsRaw = localStorage.getItem(CREDS_KEY);
      const creds = credsRaw ? (JSON.parse(credsRaw) as ServiceCreds) : null;

      const formAlreadyHasValues = !!(parsed?.clientId || parsed?.clientSecret);

      setTokenUrl(parsed?.tokenUrl || "");
      setScope(parsed?.scope || "");

      if (!formAlreadyHasValues && creds?.clientId && creds?.clientSecret) {
        setClientId(creds.clientId);
        setClientSecret(creds.clientSecret);
      } else {
        setClientId(parsed?.clientId || "");
        setClientSecret(parsed?.clientSecret || "");
      }
      if (creds) setServiceCreds(creds);

      const tok = localStorage.getItem(TOKEN_KEY);
      if (tok) setAccessToken(tok);
    } catch {
      /* ignore */
    }
  }, []);

  function applyCreds() {
    if (!serviceCreds) return;
    if (serviceCreds.clientId) setClientId(serviceCreds.clientId);
    if (serviceCreds.clientSecret) setClientSecret(serviceCreds.clientSecret);
  }

  function persist() {
    try {
      const data: Stored = { tokenUrl, clientId, clientSecret, scope };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }

  async function fetchToken(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResponse(null);
    persist();
    try {
      const res = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenUrl, clientId, clientSecret, scope, grantType: "client_credentials" }),
      });
      const data = (await res.json()) as TokenResp;
      setResponse(data);

      const maybeToken =
        data.body && typeof data.body === "object" && data.body !== null
          ? (data.body as Record<string, unknown>).access_token
          : null;
      if (typeof maybeToken === "string" && maybeToken.length > 0) {
        setAccessToken(maybeToken);
        try {
          localStorage.setItem(TOKEN_KEY, maybeToken);
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      setResponse({ status: 0, body: null, error: err instanceof Error ? err.message : "Request failed" });
    } finally {
      setLoading(false);
    }
  }

  function clearToken() {
    setAccessToken("");
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-6">
      {serviceCreds?.clientId && serviceCreds?.clientSecret ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-green-900">
                Credentials from step 1 are loaded
              </p>
              <p className="text-xs text-green-800">
                Service <code>{serviceCreds.name || serviceCreds.clientId}</code>
                {serviceCreds.tenant ? <> on tenant <code>{serviceCreds.tenant}</code></> : null}.
              </p>
            </div>
            <button
              type="button"
              onClick={applyCreds}
              className="rounded-full border border-green-300 px-3 py-1 text-xs font-medium text-green-900 hover:border-green-500"
            >
              Re-apply
            </button>
          </div>
        </div>
      ) : null}

      <form
        onSubmit={fetchToken}
        className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-800">
              Token endpoint
              <span className="text-zinc-400"> (from your well-known config)</span>
            </label>
            <input
              required
              value={tokenUrl}
              onChange={(e) => setTokenUrl(e.target.value)}
              placeholder="https://idp.example.com/realms/your-tenant/protocol/openid-connect/token"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-800">Client ID</label>
              <input
                required
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="f3a17b80-..."
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-800">Client secret</label>
              <div className="mt-1 flex">
                <input
                  required
                  type={showSecret ? "text" : "password"}
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full rounded-l-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((s) => !s)}
                  className="rounded-r-md border border-l-0 border-zinc-300 bg-zinc-50 px-3 text-xs text-zinc-600 hover:bg-zinc-100"
                >
                  {showSecret ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-800">
              Scope <span className="text-zinc-400">(optional)</span>
            </label>
            <input
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              placeholder="openid"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
            >
              {loading ? "Requesting…" : "Get access token"}
            </button>
            <span className="text-xs text-zinc-500">
              Grant type: <code>client_credentials</code>
            </span>
          </div>
        </div>
      </form>

      {response ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900">Response</h3>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                response.status >= 200 && response.status < 300
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              HTTP {response.status || "error"}
            </span>
          </div>
          {response.error ? (
            <p className="text-sm text-red-700">{response.error}</p>
          ) : (
            <pre className="overflow-x-auto rounded-md bg-zinc-900 p-3 text-xs leading-relaxed text-zinc-100">
              <code>{JSON.stringify(response.body, null, 2)}</code>
            </pre>
          )}
        </div>
      ) : null}

      {accessToken ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <h3 className="text-sm font-semibold text-green-900">Saved access token</h3>
          <p className="mt-1 text-xs text-green-800">
            Stored in your browser&rsquo;s localStorage. The API tester picks it up automatically.
          </p>
          <pre className="mt-3 overflow-x-auto rounded bg-white p-3 text-[11px] leading-snug text-zinc-700">
            <code>{accessToken}</code>
          </pre>
          <div className="mt-3 flex gap-2">
            <a
              href="/api-tester"
              className="rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Use in API tester →
            </a>
            <button
              type="button"
              onClick={clearToken}
              className="rounded-full border border-green-300 px-4 py-1.5 text-sm font-medium text-green-900 hover:border-green-500"
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
