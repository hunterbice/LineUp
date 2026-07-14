import { cn } from "@/lib/utils";

/** LineUp rising-bars mark + wordmark. */
export function Logo({
  className,
  size = 22,
  showWordmark = true,
}: {
  className?: string;
  size?: number;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <RisingBars size={size} />
      {showWordmark && (
        <span
          className="font-extrabold tracking-[-0.02em] text-foreground"
          style={{ fontSize: size, lineHeight: 1 }}
        >
          LineUp
        </span>
      )}
    </span>
  );
}

export function RisingBars({ size = 22 }: { size?: number }) {
  const box = size * 1.05;
  return (
    <svg
      width={box}
      height={box}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="lineup-bars" x1="0" y1="24" x2="24" y2="0">
          <stop offset="0" stopColor="#9C7BFF" />
          <stop offset="1" stopColor="#5B3FE0" />
        </linearGradient>
      </defs>
      <rect x="2" y="14" width="4.4" height="8" rx="2.2" fill="url(#lineup-bars)" />
      <rect x="9.8" y="9" width="4.4" height="13" rx="2.2" fill="url(#lineup-bars)" />
      <rect x="17.6" y="3" width="4.4" height="19" rx="2.2" fill="url(#lineup-bars)" />
    </svg>
  );
}
