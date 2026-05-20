/**
 * "Engineered in Germany" sub-brand tag with DE flag bar.
 * Per brand guidelines: bottom-corner placement, smaller than the main logo.
 */
export default function EngineeredInGermany({
  variant = "light",
  className = "",
}: {
  variant?: "light" | "dark";
  className?: string;
}) {
  const textColor = variant === "dark" ? "text-white/90" : "text-zinc-700";
  return (
    <div className={`inline-flex items-center gap-2 text-[11px] leading-tight ${className}`}>
      <span className="flex flex-col overflow-hidden rounded-sm" aria-hidden>
        <span className="block h-1 w-5 bg-black" />
        <span className="block h-1 w-5 bg-[#DD0000]" />
        <span className="block h-1 w-5 bg-[#FFCE00]" />
      </span>
      <span className={textColor}>
        <span className="block font-medium">Engineered</span>
        <span className="block">in Germany</span>
      </span>
    </div>
  );
}
