import Link from "next/link";
import Container from "../components/Container";
import PageHeader from "../components/PageHeader";
import Steps from "../components/Steps";
import CodeBlock from "../components/CodeBlock";

export const metadata = { title: "KOBIL Signature — Partner Guide" };

export default function SignaturePage() {
  return (
    <Container>
      <PageHeader
        eyebrow="Core integration"
        title="KOBIL Signature"
        tagline="PDF and transaction signing delivered through Chat and TMS."
      />

      <h2 className="text-lg font-semibold text-zinc-900">What it does</h2>
      <p className="mt-2 text-zinc-700">
        Signature is not a separate endpoint &mdash; it&rsquo;s the signing capability KOBIL ships
        across two channels:
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-6 text-zinc-700">
        <li>
          <strong>PDF signing</strong> via Chat: send a PDF as a signature request; the user signs
          in the SuperApp and the signed document is returned to your callback.
        </li>
        <li>
          <strong>Transaction signing</strong> via TMS: start a transaction, the user reviews and
          signs it in the SuperApp, and you receive the signed payload plus signer info.
        </li>
      </ul>

      <h2 className="mt-8 text-lg font-semibold text-zinc-900">Choose a flow</h2>
      <div className="mt-4">
        <Steps
          items={[
            {
              title: "Signing a document → use Chat",
              body: "Send a Chat message of type signature with a base64-encoded PDF. The signed PDF arrives at your registered Chat callback.",
            },
            {
              title: "Signing a transaction → use TMS",
              body: "POST a TMS transaction with the data to be signed. Poll the status, then GET the signed result when the user confirms.",
            },
            { title: "Prerequisite — Identity", body: "Both flows require a valid access token from KOBIL Identity." },
          ]}
        />
      </div>

      <h2 className="mt-10 text-lg font-semibold text-zinc-900">PDF signature via Chat</h2>
      <div className="mt-3">
        <CodeBlock
          title="POST — Chat signature message"
          code={`curl -X POST {CHAT_BASE}/v1/messages \\
  -H "Authorization: Bearer $ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "userId": "USER_ID",
    "type": "signature",
    "title": "Sign your contract",
    "pdf": "data:application/pdf;base64,...",
    "callbackUrl": "https://yourapp.example/chat-callback"
  }'`}
        />
      </div>

      <h2 className="mt-10 text-lg font-semibold text-zinc-900">Transaction signature via TMS</h2>
      <div className="mt-3">
        <CodeBlock
          title="POST — TMS start signing transaction"
          code={`curl -X POST {TMS_BASE}/v1/transactions \\
  -H "Authorization: Bearer $ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "userId": "USER_ID",
    "tmsData": "Transfer 100 EUR to IBAN DE89...",
    "timeoutSeconds": 120
  }'`}
        />
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/api-tester?product=chat&sample=send-signature"
          className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
        >
          Try: PDF signature via Chat
        </Link>
        <Link
          href="/api-tester?product=tms&sample=start"
          className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-800 hover:border-zinc-900"
        >
          Try: transaction signature via TMS
        </Link>
      </div>
    </Container>
  );
}
