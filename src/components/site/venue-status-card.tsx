import { CROWD_META, type CrowdStatus } from "./crowd";

export interface VenueSample {
  name: string;
  meta: string;
  status: CrowdStatus;
  fill: number;
  wait: string;
  freshness: string;
}

/** Live-style venue card mirroring the consumer app output. */
export function VenueStatusCard({ venue }: { venue: VenueSample }) {
  const crowd = CROWD_META[venue.status];

  return (
    <article className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_24px_60px_-30px_rgba(139,108,255,0.5)]">
      {/* hover glow wash */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: "radial-gradient(circle, rgba(139,108,255,0.22), transparent 70%)" }}
        aria-hidden="true"
      />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[20px] font-bold tracking-[-0.01em] text-foreground">{venue.name}</h3>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{venue.meta}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className="live-ping absolute inline-flex h-full w-full rounded-full"
              style={{ backgroundColor: crowd.colorVar }}
              aria-hidden="true"
            />
            <span
              className="relative inline-flex h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: crowd.colorVar }}
              aria-hidden="true"
            />
          </span>
          <span
            className="text-[14px] font-extrabold uppercase tracking-[0.06em]"
            style={{ color: crowd.colorVar }}
          >
            {crowd.label}
          </span>
        </div>
      </div>

      <div className="relative flex items-baseline justify-between">
        <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-faint">
          Est. line
        </span>
        <span className="text-[27px] font-extrabold tracking-[-0.02em] text-foreground">
          {venue.wait}
        </span>
      </div>

      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-track">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${venue.fill}%`, backgroundColor: crowd.colorVar }}
        />
      </div>

      <p className="relative text-[12px] text-faint">{venue.freshness}</p>
    </article>
  );
}
