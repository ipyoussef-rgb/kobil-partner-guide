import Link from "next/link";
import Container from "../components/Container";
import PageHeader from "../components/PageHeader";
import Steps from "../components/Steps";
import CodeBlock from "../components/CodeBlock";

export const metadata = { title: "KOBIL Pay — Partner Guide" };

export default function PayPage() {
  return (
    <Container>
      <PageHeader
        eyebrow="Core integration"
        title="KOBIL Pay"
        tagline="One-click checkout and full payment lifecycle inside the SuperApp."
      />

      <h2 className="text-lg font-semibold text-zinc-900">What it does</h2>
      <p className="mt-2 text-zinc-700">
        Pay lets merchants create, inquire, cancel, or refund transactions. The user confirms the
        payment in the SuperApp Pay UI and the outcome is delivered to your registered callback.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-zinc-900">Integration steps</h2>
      <div className="mt-4">
        <Steps
          items={[
            { title: "Get an access token", body: "Exchange client_id and client_secret for a token via the service-account flow." },
            {
              title: "Initiate a payment",
              body: "Create a regular or pre-authorized transaction with amount, currency, callback URL, and any extra payment parameters.",
            },
            { title: "Receive the transactionId", body: "Pay returns a unique transactionId and delivers the request to the SuperApp user." },
            { title: "User confirms in the Pay UI", body: "User reviews and approves or rejects in the SuperApp." },
            { title: "Handle the callback", body: "Pay POSTs the outcome (success / failure / status changes) to your callback URL." },
            { title: "Manage the lifecycle", body: "Check status, void (cancel), or refund using the transactionId." },
          ]}
        />
      </div>

      <h2 className="mt-10 text-lg font-semibold text-zinc-900">Create a payment</h2>
      <div className="mt-3">
        <CodeBlock
          title="POST — Pay create transaction"
          code={`curl -X POST {PAY_BASE}/v1/transactions \\
  -H "Authorization: Bearer $ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "userId": "USER_ID",
    "amount": 19.99,
    "currency": "EUR",
    "description": "Order #1234",
    "callbackUrl": "https://yourapp.example/pay-callback",
    "preAuthorized": false
  }'`}
        />
      </div>

      <h2 className="mt-10 text-lg font-semibold text-zinc-900">Other lifecycle calls</h2>
      <div className="mt-3 space-y-4">
        <CodeBlock
          title="GET — inquiry"
          code={`curl {PAY_BASE}/v1/transactions/{transactionId} \\
  -H "Authorization: Bearer $ACCESS_TOKEN"`}
        />
        <CodeBlock
          title="POST — refund"
          code={`curl -X POST {PAY_BASE}/v1/transactions/{transactionId}/refund \\
  -H "Authorization: Bearer $ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{ "amount": 19.99, "reason": "customer return" }'`}
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
          href="/api-tester?product=pay&sample=create"
          className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-800 hover:border-zinc-900"
        >
          Try: create a transaction
        </Link>
        <Link
          href="/api-tester?product=pay&sample=refund"
          className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-800 hover:border-zinc-900"
        >
          Try: refund a transaction
        </Link>
      </div>
    </Container>
  );
}
