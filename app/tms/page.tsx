import Link from "next/link";
import Container from "../components/Container";
import PageHeader from "../components/PageHeader";
import Steps from "../components/Steps";
import CodeBlock from "../components/CodeBlock";

export const metadata = { title: "KOBIL TMS — Partner Guide" };

export default function TmsPage() {
  return (
    <Container>
      <PageHeader
        eyebrow="Core integration"
        title="KOBIL TMS"
        tagline="Authenticate and confirm high-trust transactions with the SuperApp user."
      />

      <h2 className="text-lg font-semibold text-zinc-900">What it does</h2>
      <p className="mt-2 text-zinc-700">
        TMS (Transaction Management Service) lets you ask a user to confirm or reject a specific
        action &mdash; a login, a financial transfer, an administrative change. The user reviews and
        signs in the SuperApp and you receive the signed result.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-zinc-900">Integration steps</h2>
      <div className="mt-4">
        <Steps
          items={[
            { title: "Get an access token", body: "Complete the Identity integration first." },
            {
              title: "Start a transaction",
              body: "POST a TMS transaction with userId, tmsData (the data to sign), and a timeout.",
            },
            {
              title: "Check status",
              body: "GET the transaction by id while it is pending. You can long-poll or check periodically.",
            },
            {
              title: "Retrieve the signed result",
              body: "Once the user confirms, GET the final transaction details — signed data and signer info are returned.",
            },
          ]}
        />
      </div>

      <h2 className="mt-10 text-lg font-semibold text-zinc-900">Sample calls</h2>
      <div className="mt-3 space-y-4">
        <CodeBlock
          title="POST — start transaction"
          code={`curl -X POST {TMS_BASE}/v1/transactions \\
  -H "Authorization: Bearer $ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "userId": "USER_ID",
    "tmsData": "Login attempt from new device — confirm?",
    "timeoutSeconds": 60
  }'`}
        />
        <CodeBlock
          title="GET — status"
          code={`curl {TMS_BASE}/v1/transactions/{transactionId} \\
  -H "Authorization: Bearer $ACCESS_TOKEN"`}
        />
        <CodeBlock
          title="GET — signed result"
          code={`curl {TMS_BASE}/v1/transactions/{transactionId}/result \\
  -H "Authorization: Bearer $ACCESS_TOKEN"`}
        />
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/get-token"
          className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
        >
          Get a token →
        </Link>
        <Link
          href="/api-tester?product=tms&sample=start"
          className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-800 hover:border-zinc-900"
        >
          Try: start a transaction
        </Link>
        <Link
          href="/api-tester?product=tms&sample=result"
          className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-800 hover:border-zinc-900"
        >
          Try: get the signed result
        </Link>
      </div>
    </Container>
  );
}
