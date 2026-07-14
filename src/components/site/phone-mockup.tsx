import { CROWD_META, type CrowdStatus } from "./crowd";

interface Row {
  name: string;
  meta: string;
  status: CrowdStatus;
  fill: number;
  wait: string;
}

const ROWS: Row[] = [
  { name: "No Anchovies", meta: "0.2 mi · Pizza & Bar", status: "Packed", fill: 96, wait: "~25 min" },
  { name: "The Hut", meta: "0.4 mi · Tiki Bar", status: "Busy", fill: 66, wait: "~12 min" },
  { name: "Gentle Ben's", meta: "0.3 mi · Brewery", status: "Slow", fill: 34, wait: "No wait" },
  { name: "Bum Steer", meta: "0.6 mi · Sports Bar", status: "Dead", fill: 12, wait: "No wait" },
];

/** A tasteful iPhone mockup rendering the live feed — hero centerpiece. */
export function PhoneMockup() {
  return (
    <div className="relative mx-auto w-[300px] max-w-full">
      {/* glow puddle behind the device */}
      <div
        className="pointer-events-none absolute -inset-10 rounded-[64px] opacity-70"
        style={{ background: "radial-gradient(60% 55% at 50% 40%, rgba(139,108,255,0.4), transparent 70%)", filter: "blur(30px)" }}
        aria-hidden="true"
      />

      <div className="float-soft glow-violet relative rounded-[46px] border border-white/10 bg-[#0b0a08] p-2.5">
        {/* notch */}
        <div className="absolute left-1/2 top-3 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-[#0b0a08]" aria-hidden="true" />

        <div className="relative overflow-hidden rounded-[38px] bg-background">
          {/* screen top gradient */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-40"
            style={{ background: "linear-gradient(180deg, rgba(139,108,255,0.22), transparent)" }}
            aria-hidden="true"
          />

          <div className="relative px-5 pb-6 pt-12">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">Tonight</p>
                <p className="text-[19px] font-extrabold tracking-[-0.02em] text-foreground">Tucson</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-primary">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-primary" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                Live
              </span>
            </div>

            <div className="mt-4 space-y-2.5">
              {ROWS.map((row) => {
                const crowd = CROWD_META[row.status];
                return (
                  <div key={row.name} className="rounded-2xl border border-border bg-card/80 p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-bold text-foreground">{row.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{row.meta}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: crowd.colorVar }} aria-hidden="true" />
                        <span className="text-[11px] font-extrabold tracking-[0.04em]" style={{ color: crowd.colorVar }}>
                          {crowd.label}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center gap-2.5">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-track">
                        <div className="h-full rounded-full" style={{ width: `${row.fill}%`, backgroundColor: crowd.colorVar }} />
                      </div>
                      <span className="shrink-0 text-[11px] font-bold text-foreground">{row.wait}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
