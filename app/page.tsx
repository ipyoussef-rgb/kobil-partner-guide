import Link from "next/link";

const products = [
  {
    href: "/identity",
    name: "Identity",
    tagline: "Single Sign-On for SuperApp users via OpenID Connect.",
    detail:
      "Authenticate users once and share their identity across MiniApps using the standard OIDC authorization-code flow.",
  },
  {
    href: "/chat",
    name: "Chat",
    tagline: "Send encrypted, signed messages to SuperApp users and receive replies.",
    detail:
      "Plain text, multi-choice prompts, attachments, and PDF signature requests delivered into the SuperApp inbox.",
  },
  {
    href: "/pay",
    name: "Pay",
    tagline: "One-click checkout and full payment lifecycle inside the SuperApp.",
    detail:
      "Create, inquire, cancel, or refund transactions. Receive results at your registered callback endpoint.",
  },
  {
    href: "/signature",
    name: "Signature",
    tagline: "PDF and transaction signing through Chat and TMS.",
    detail:
      "Request user-signed PDFs via Chat sign-messages, or have users approve and sign transactions via TMS.",
  },
  {
    href: "/tms",
    name: "TMS",
    tagline: "Authenticate and confirm transactions with the SuperApp user.",
    detail:
      "Start a TMS transaction, monitor its status, and retrieve the signed result for high-trust operations.",
  },
];

const flow = [
  {
    n: "1",
    title: "Create your service",
    body: "Use SmartDashboard to register a MiniApp service. You get back client_id, client_secret, and the well-known configuration.",
    href: "/create-service",
  },
  {
    n: "2",
    title: "Get an access token",
    body: "Exchange client_id and client_secret for an access token via the service-account (client_credentials) flow.",
    href: "/get-token",
  },
  {
    n: "3",
    title: "Try Identity, Chat, Pay, TMS",
    body: "Send real requests to KOBIL APIs with your token. Inspect responses side-by-side.",
    href: "/api-tester",
  },
];

export default function Home() {
  return (
    <div>
      <section className="border-b border-zinc-200 bg-gradient-to-b from-white to-zinc-50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
            Partner Developer Guide
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
            Ship on the KOBIL SuperApp platform in three steps.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-600">
            Register a service, get a token via your service account, and call Identity, Chat, Pay,
            Signature, and TMS APIs &mdash; all from one page.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/create-service"
              className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
            >
              Start: create a service
            </Link>
            <Link
              href="/get-token"
              className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-800 hover:border-zinc-900"
            >
              I already have client credentials
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          The flow
        </h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {flow.map((f) => (
            <li key={f.n} className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-semibold text-white">
                {f.n}
              </div>
              <h3 className="font-semibold text-zinc-900">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-zinc-600">{f.body}</p>
              <Link
                href={f.href}
                className="mt-4 inline-block text-sm font-medium text-[var(--accent)] hover:underline"
              >
                Open step →
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Core integrations
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <li key={p.href}>
              <Link
                href={p.href}
                className="block h-full rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-400 hover:shadow-sm"
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
                  <h3 className="font-semibold text-zinc-900">KOBIL {p.name}</h3>
                </div>
                <p className="text-sm font-medium text-zinc-800">{p.tagline}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{p.detail}</p>
                <span className="mt-4 inline-block text-sm text-[var(--accent)]">
                  Read the guide →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
