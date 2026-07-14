const VENUES = [
  "No Anchovies",
  "The Hut",
  "Gentle Ben's",
  "Bum Steer",
  "O'Malley's",
  "Frog & Firkin",
  "Dirtbag's",
  "The Auld Dubliner",
  "Sky Bar",
  "Illegal Pete's",
  "Playground",
  "Union Public House",
];

/** Infinite marquee of local venue names — social proof at a glance. */
export function VenueMarquee() {
  const doubled = [...VENUES, ...VENUES];
  return (
    <div className="relative overflow-hidden py-2">
      {/* edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent" aria-hidden="true" />

      <div className="marquee-track flex w-max items-center gap-3">
        {doubled.map((name, i) => (
          <span
            key={`${name}-${i}`}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-[14px] font-semibold text-muted-foreground"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary/70" aria-hidden="true" />
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
