import Link from "next/link";
import Container from "../components/Container";
import PageHeader from "../components/PageHeader";
import ApiTester from "../components/ApiTester";

export const metadata = { title: "API Tester — Partner Guide" };

type SearchParamsPromise = Promise<{
  product?: string | string[];
  sample?: string | string[];
}>;

export default async function ApiTesterPage({ searchParams }: { searchParams: SearchParamsPromise }) {
  const params = await searchParams;
  const productRaw = params?.product;
  const sampleRaw = params?.sample;
  const product = Array.isArray(productRaw) ? productRaw[0] : productRaw;
  const sample = Array.isArray(sampleRaw) ? sampleRaw[0] : sampleRaw;

  return (
    <Container>
      <PageHeader
        eyebrow="Step 3 of 3"
        title="Try Identity, Chat, Pay, TMS"
        tagline="Pick a product, edit a sample request, and send it through this site&rsquo;s proxy. Your access token (from step 2) is added automatically."
      />

      <ApiTester initialProductKey={product} initialSampleId={sample} />

      <div className="mt-10 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Heads up.</strong>{" "}Requests are proxied server-side from this site so CORS
        doesn&rsquo;t block your browser. Don&rsquo;t paste production secrets into a public
        deployment; clone the repo and run it locally for sensitive testing.
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/get-token"
          className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-800 hover:border-zinc-900"
        >
          ← Back to step 2
        </Link>
        <Link
          href="/"
          className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-800 hover:border-zinc-900"
        >
          Overview
        </Link>
      </div>
    </Container>
  );
}
