export default function Container({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`mx-auto w-full max-w-4xl px-6 py-12 ${className}`}>{children}</div>;
}
