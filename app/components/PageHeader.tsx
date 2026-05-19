export default function PageHeader({
  eyebrow,
  title,
  tagline,
}: {
  eyebrow?: string;
  title: string;
  tagline: string;
}) {
  return (
    <header className="mb-8 border-b border-zinc-200 pb-6">
      {eyebrow ? (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">{title}</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-600">{tagline}</p>
    </header>
  );
}
