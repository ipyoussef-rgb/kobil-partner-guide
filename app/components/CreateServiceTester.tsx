"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "kobil-create-service-v2";
const CREDS_KEY = "kobil-service-credentials-v1";

type Stored = {
  smartdashboardBaseUrl: string;
  tenant: string;
  name: string;
  description: string;
  callbackUrl: string;
};

type CreateResp = {
  ok?: boolean;
  stage?: string;
  status?: number;
  requestUrl?: string;
  payload?: unknown;
  body?: unknown;
  clientId?: string;
  clientSecret?: string;
  error?: string;
  trace?: unknown;
};

type StepResult = { ok: boolean; status: number; error?: string };
type PublishResp = {
  ok?: boolean;
  branchId?: string;
  touch?: StepResult;
  save?: StepResult;
  publish?: StepResult;
  switch?: StepResult;
  error?: string;
};

export default function CreateServiceTester() {
  const [smartdashboardBaseUrl, setBase] = useState("");
  const [tenant, setTenant] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [callbackUrl, setCallbackUrl] = useState("");

  const [creating, setCreating] = useState(false);
  const [createResp, setCreateResp] = useState<CreateResp | null>(null);

  const [publishing, setPublishing] = useState(false);
  const [publishResp, setPublishResp] = useState<PublishResp | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Stored;
        setBase(p.smartdashboardBaseUrl || "");
        setTenant(p.tenant || "");
        setName(p.name || "");
        setDescription(p.description || "");
        setCallbackUrl(p.callbackUrl || "");
      }
    } catch {
      /* ignore */
    }
  }, []);

  function persist() {
    try {
      const merged: Stored = {
        smartdashboardBaseUrl,
        tenant,
        name,
        description,
        callbackUrl,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {
      /* ignore */
    }
  }

  function saveCreds(clientId: string, clientSecret: string) {
    try {
      localStorage.setItem(
        CREDS_KEY,
        JSON.stringify({
          clientId,
          clientSecret,
          smartdashboardBaseUrl,
          tenant,
          name,
          createdAt: new Date().toISOString(),
        }),
      );
    } catch {
      /* ignore */
    }
  }

  async function createService(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateResp(null);
    setPublishResp(null);
    persist();
    try {
      const res = await fetch("/api/smartdashboard/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smartdashboardBaseUrl,
          tenant,
          service: { name, description, callbackUrl },
        }),
      });
      const data = (await res.json()) as CreateResp;
      setCreateResp(data);
      if (data.ok && data.clientId && data.clientSecret) {
        saveCreds(data.clientId, data.clientSecret);
      }
    } catch (err) {
      setCreateResp({
        ok: false,
        status: 0,
        error: err instanceof Error ? err.message : "Request failed",
      });
    } finally {
      setCreating(false);
    }
  }

  async function publishBranch() {
    setPublishing(true);
    setPublishResp(null);
    try {
      const res = await fetch("/api/smartdashboard/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ smartdashboardBaseUrl, tenant }),
      });
      const data = (await res.json()) as PublishResp;
      setPublishResp(data);
    } catch (err) {
      setPublishResp({
        ok: false,
        error: err instanceof Error ? err.message : "Request failed",
      });
    } finally {
      setPublishing(false);
    }
  }

  const created = createResp?.ok && createResp.clientId && createResp.clientSecret;

  function copy(text: string) {
    try {
      navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
        Click <strong>Create service</strong> and the server logs in to SmartDashboard,
        creates the service, and returns your <code>client_id</code> + <code>client_secret</code>.
        No cookie wrangling needed.
      </div>

      <form
        onSubmit={createService}
        className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          SmartDashboard target
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-800">
              SmartDashboard base URL
            </label>
            <input
              required
              value={smartdashboardBaseUrl}
              onChange={(e) => setBase(e.target.value)}
              placeholder="https://smartdashboard.example.com"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-800">Tenant</label>
            <input
              required
              value={tenant}
              onChange={(e) => setTenant(e.target.value)}
              placeholder="your-tenant"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
            />
          </div>
        </div>

        <h3 className="mt-8 mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Service definition
        </h3>
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-800">Service name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme MiniApp"
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-800">Callback URL</label>
              <input
                required
                value={callbackUrl}
                onChange={(e) => setCallbackUrl(e.target.value)}
                placeholder="https://acme.example.com"
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-800">
              Description <span className="text-zinc-400">(optional)</span>
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="submit"
            disabled={creating}
            className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
          >
            {creating ? "Logging in & creating…" : "Create service"}
          </button>
          <span className="text-xs text-zinc-500">
            Login → POST <code>/api/v1/smart-screen/cqrs/services/</code>
          </span>
        </div>
      </form>

      {createResp ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900">Create response</h3>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                createResp.ok
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {createResp.ok
                ? "Service created"
                : `${createResp.stage ? createResp.stage + " · " : ""}HTTP ${
                    createResp.status ?? "error"
                  }`}
            </span>
          </div>
          {createResp.error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {createResp.error}
            </p>
          ) : null}
          {Array.isArray(createResp.trace) && createResp.trace.length > 0 ? (
            <details className="mt-3 text-sm" open>
              <summary className="cursor-pointer text-zinc-700">Auth trace</summary>
              <pre className="mt-2 max-h-96 overflow-auto rounded-md bg-zinc-900 p-3 text-[11px] leading-snug text-zinc-100">
                <code>{JSON.stringify(createResp.trace, null, 2)}</code>
              </pre>
            </details>
          ) : null}
          {created ? (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  client_id
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="block w-full break-all rounded bg-zinc-100 px-2 py-1.5 font-mono text-xs">
                    {createResp.clientId}
                  </code>
                  <button
                    type="button"
                    onClick={() => copy(createResp.clientId!)}
                    className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:border-zinc-900"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  client_secret
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="block w-full break-all rounded bg-zinc-100 px-2 py-1.5 font-mono text-xs">
                    {createResp.clientSecret}
                  </code>
                  <button
                    type="button"
                    onClick={() => copy(createResp.clientSecret!)}
                    className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:border-zinc-900"
                  >
                    Copy
                  </button>
                </div>
                <p className="mt-1 text-xs text-amber-700">
                  Stored in your browser only. Copy now — you can&rsquo;t retrieve the secret again.
                </p>
              </div>
              <Link
                href="/get-token"
                className="inline-block rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
              >
                Next: get a token →
              </Link>
            </div>
          ) : null}
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer text-zinc-700">Full response</summary>
            <pre className="mt-2 max-h-72 overflow-auto rounded-md bg-zinc-900 p-3 text-xs leading-relaxed text-zinc-100">
              <code>{JSON.stringify(createResp.body ?? createResp, null, 2)}</code>
            </pre>
          </details>
        </div>
      ) : null}

      {created ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-zinc-900">Publish branch</h3>
          <p className="mt-1 text-sm text-zinc-600">
            Make the new service discoverable in the SuperApp by saving and switching to a new
            branch. Mirrors <code>create_miniapps.py</code> exactly.
          </p>
          <button
            type="button"
            onClick={publishBranch}
            disabled={publishing}
            className="mt-4 rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
          >
            {publishing ? "Publishing…" : "Save + publish + switch"}
          </button>
          {publishResp ? (
            <div className="mt-4 space-y-2 text-sm">
              {publishResp.error ? (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {publishResp.error}
                </p>
              ) : null}
              {(["touch", "save", "publish", "switch"] as const).map((step) => {
                const r = publishResp[step];
                return (
                  <div key={step} className="flex items-center gap-3">
                    <span
                      className={`inline-block w-16 rounded-full px-2 py-0.5 text-center text-xs font-medium ${
                        r?.ok
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {r?.ok ? "ok" : `HTTP ${r?.status ?? "?"}`}
                    </span>
                    <span className="font-medium capitalize text-zinc-800">{step}</span>
                    {r?.error ? <span className="text-xs text-red-700">{r.error}</span> : null}
                  </div>
                );
              })}
              {publishResp.branchId ? (
                <p className="pt-2 text-xs text-zinc-500">
                  Branch id: <code>{publishResp.branchId}</code>
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
