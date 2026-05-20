/**
 * KOBIL logo: signal-mark (three rising bars) + wordmark.
 * Per the 2026 brand guidelines: blue on light; white on dark/blue.
 */
export function KobilSignalMark({
  size = 24,
  className = "",
  color,
}: {
  size?: number;
  className?: string;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      fill={color ?? "currentColor"}
      aria-hidden
    >
      <rect x="2"  y="20" width="6" height="10" rx="1.5" />
      <rect x="12" y="12" width="6" height="18" rx="1.5" />
      <rect x="22" y="2"  width="6" height="28" rx="1.5" />
    </svg>
  );
}

export function KobilLogo({
  variant = "blue",
  size = 22,
  className = "",
}: {
  variant?: "blue" | "white" | "navy";
  size?: number;
  className?: string;
}) {
  const color =
    variant === "white" ? "#ffffff" : variant === "navy" ? "var(--kobil-navy)" : "var(--kobil-blue)";
  return (
    <span className={`inline-flex items-center gap-2 leading-none ${className}`}>
      <span
        className="font-bold tracking-tight"
        style={{ color, fontSize: size, letterSpacing: "-0.01em" }}
      >
        KOBIL
      </span>
      <KobilSignalMark size={Math.round(size * 1.0)} color={color} />
    </span>
  );
}
