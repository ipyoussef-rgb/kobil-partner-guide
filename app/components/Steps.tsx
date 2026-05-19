export default function Steps({ items }: { items: { title: string; body: React.ReactNode }[] }) {
  return (
    <ol className="space-y-6">
      {items.map((s, i) => (
        <li key={i} className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-semibold text-white">
            {i + 1}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-zinc-900">{s.title}</h3>
            <div className="mt-1 text-sm leading-6 text-zinc-600">{s.body}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}
