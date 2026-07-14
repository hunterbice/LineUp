import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { VenueStatusCard, type VenueSample } from "@/components/site/venue-status-card";
import { PhoneMockup } from "@/components/site/phone-mockup";
import { VenueMarquee } from "@/components/site/venue-marquee";
import { Reveal } from "@/components/site/reveal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LineUp — Know Before You Go" },
      {
        name: "description",
        content:
          "See the line before you leave the house. LineUp shows live crowd levels, wait times, and deals at your city's bars. Free on iOS.",
      },
      { property: "og:title", content: "LineUp — Know Before You Go" },
      {
        property: "og:description",
        content:
          "Live crowd levels and wait times for the bars you're deciding between. Know before you go.",
      },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: HomePage,
});

// Illustrative live-look data for the showcase strip (no live backend on web).
const SHOWCASE: VenueSample[] = [
  {
    name: "No Anchovies",
    meta: "University District · Pizza & Bar",
    status: "Packed",
    fill: 96,
    wait: "~25 min",
    freshness: "Updated just now · 14 recent check-ins",
  },
  {
    name: "The Hut",
    meta: "Main Gate Square · Tiki Bar",
    status: "Busy",
    fill: 66,
    wait: "~12 min",
    freshness: "Updated 3 min ago · 9 recent check-ins",
  },
  {
    name: "Gentle Ben's",
    meta: "University Blvd · Brewery",
    status: "Slow",
    fill: 34,
    wait: "No wait",
    freshness: "Updated just now · 6 recent check-ins",
  },
];

const STATS = [
  { value: "4", label: "crowd levels, at a glance" },
  { value: "< 3s", label: "to decide where to go" },
  { value: "0", label: "wasted trips to a dead bar" },
  { value: "100%", label: "free on iOS" },
];

const STEPS = [
  {
    title: "Open the live feed",
    body: "See every nearby bar's crowd level and estimated wait, ranked in real time.",
    icon: RadioIcon,
  },
  {
    title: "Skip the guess",
    body: "Dead, Slow, Busy, or Packed — decide where to go before you leave the house.",
    icon: CompassIcon,
  },
  {
    title: "Catch the deal",
    body: "Spot tonight's specials and last call so you never miss the good hour.",
    icon: TagIcon,
  },
];

function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <Hero />
        <Showcase />
        <StatsBand />
        <HowItWorks />
        <OwnersBand />
      </main>
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="grain relative overflow-hidden pt-28 pb-16 sm:pt-36 sm:pb-24">
      {/* Base hero glow */}
      <div className="pointer-events-none absolute inset-0" style={{ background: "var(--hero-glow)" }} aria-hidden="true" />
      {/* Drifting aurora blobs */}
      <div
        className="aurora pointer-events-none absolute left-[8%] top-[-140px] h-[520px] w-[520px] rounded-full"
        style={{ background: "rgba(139,108,255,0.30)", filter: "blur(140px)" }}
        aria-hidden="true"
      />
      <div
        className="aurora pointer-events-none absolute right-[4%] top-[60px] h-[420px] w-[420px] rounded-full"
        style={{ background: "rgba(109,77,230,0.22)", filter: "blur(150px)", animationDelay: "-6s" }}
        aria-hidden="true"
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
        {/* Copy */}
        <div className="text-center lg:text-left">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-[12px] font-bold uppercase tracking-[0.14em] text-primary">
              <span className="relative flex h-1.5 w-1.5">
                <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-primary" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              Live tonight in Tucson
            </span>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="mx-auto mt-6 max-w-xl text-[44px] font-extrabold leading-[1.02] tracking-[-0.03em] text-foreground sm:text-[64px] lg:mx-0">
              See the line before you <span className="text-gradient">leave the house.</span>
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="mx-auto mt-6 max-w-lg text-[17px] leading-[1.5] text-muted-foreground sm:text-[19px] lg:mx-0">
              LineUp shows live crowd levels, estimated wait times, and tonight's deals for the bars
              you're deciding between — so you pick the right one, every time.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
              <AppStoreButton />
              <a
                href="#how-it-works"
                className="inline-flex h-[54px] items-center justify-center rounded-[14px] border border-border px-6 text-[15px] font-semibold text-foreground transition-colors hover:bg-secondary"
              >
                See how it works <span className="ml-1.5" aria-hidden="true">↓</span>
              </a>
            </div>
          </Reveal>

          <Reveal delay={320}>
            <p className="mt-5 text-[13px] text-faint">Free · iOS · Tucson · Coming soon</p>
          </Reveal>
        </div>

        {/* Phone */}
        <Reveal delay={180} className="flex justify-center lg:justify-end">
          <PhoneMockup />
        </Reveal>
      </div>

      {/* Marquee of venues */}
      <div className="relative mx-auto mt-16 max-w-6xl px-5 sm:mt-20 sm:px-8">
        <p className="mb-4 text-center text-[12px] font-semibold uppercase tracking-[0.16em] text-faint lg:text-left">
          Bars students are watching right now
        </p>
        <VenueMarquee />
      </div>
    </section>
  );
}

function AppStoreButton() {
  return (
    <button
      type="button"
      title="Coming soon to the App Store"
      className="group relative inline-flex h-[54px] cursor-pointer items-center justify-center gap-2.5 overflow-hidden rounded-[14px] bg-foreground px-6 text-[15px] font-semibold text-background transition-transform hover:scale-[1.02]"
    >
      {/* sheen sweep */}
      <span
        className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-20deg] bg-white/40 opacity-0 transition-opacity group-hover:opacity-100 group-hover:[animation:sheen_0.9s_ease]"
        aria-hidden="true"
      />
      <AppleGlyph />
      <span className="flex flex-col items-start leading-none">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] opacity-70">
          Coming soon
        </span>
        <span className="text-[15px] font-bold">Get it on the App Store</span>
      </span>
    </button>
  );
}

function Showcase() {
  return (
    <section className="relative py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="mb-10 flex flex-col gap-2 text-center">
          <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-primary">A live look</p>
          <h2 className="text-[30px] font-extrabold tracking-[-0.02em] text-foreground sm:text-[36px]">
            This is what you see the moment you open the app.
          </h2>
          <p className="mx-auto max-w-lg text-[15px] text-muted-foreground">
            Crowd level and estimated wait, always shown together — illustrative of tonight's feed.
          </p>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SHOWCASE.map((venue, i) => (
            <Reveal key={venue.name} delay={i * 90}>
              <VenueStatusCard venue={venue} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatsBand() {
  return (
    <section className="relative py-6">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="glass-card grain grid grid-cols-2 gap-y-8 rounded-2xl px-6 py-9 sm:px-10 md:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="relative text-center">
              <p className="text-[38px] font-extrabold tracking-[-0.03em] text-gradient sm:text-[44px]">
                {stat.value}
              </p>
              <p className="mx-auto mt-1 max-w-[10rem] text-[13px] leading-tight text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="mb-12 text-center">
          <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-primary">How it works</p>
          <h2 className="mt-2 text-[30px] font-extrabold tracking-[-0.02em] text-foreground sm:text-[36px]">
            Three taps between you and the right night.
          </h2>
        </Reveal>

        <div className="grid gap-5 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 90}>
              <div className="group relative flex h-full flex-col items-start gap-4 overflow-hidden rounded-2xl border border-border bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_24px_60px_-30px_rgba(139,108,255,0.5)]">
                <div
                  className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ background: "radial-gradient(circle, rgba(139,108,255,0.2), transparent 70%)" }}
                  aria-hidden="true"
                />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-[16px] border border-primary/20 bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
                  <step.icon />
                </div>
                <div className="relative">
                  <div className="mb-2 text-[12px] font-bold text-faint">0{i + 1}</div>
                  <h3 className="text-[20px] font-bold tracking-[-0.01em] text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-[15px] leading-[1.5] text-muted-foreground">{step.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function OwnersBand() {
  return (
    <section id="for-owners" className="scroll-mt-20 py-12 sm:py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal
          className="grain relative overflow-hidden rounded-[28px] border p-8 sm:p-14"
          delay={0}
        >
          <div
            className="absolute inset-0"
            style={{ background: "var(--business-band)" }}
            aria-hidden="true"
          />
          <div
            className="aurora pointer-events-none absolute right-[-80px] top-[-80px] h-[360px] w-[360px] rounded-full"
            style={{ background: "rgba(139,108,255,0.28)", filter: "blur(120px)" }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-0 rounded-[28px]"
            style={{ boxShadow: "inset 0 0 0 1px rgba(139,108,255,0.22)" }}
            aria-hidden="true"
          />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-primary">
                For bar &amp; venue owners
              </p>
              <h2 className="mt-3 text-[30px] font-extrabold tracking-[-0.02em] text-foreground sm:text-[38px]">
                Run your listing, post deals, see the data.
              </h2>
              <p className="mt-4 text-[16px] leading-[1.5] text-muted-foreground">
                Update tonight's crowd in seconds, launch deals that reach students while they're
                deciding where to go, and measure what actually fills the room.
              </p>
            </div>
            <Link
              to="/login"
              className="group inline-flex h-[54px] shrink-0 items-center justify-center rounded-[14px] bg-primary px-7 text-[15px] font-bold text-primary-foreground transition-all hover:bg-accent-deep hover:shadow-[0_18px_40px_-16px_rgba(139,108,255,0.7)]"
            >
              Sign in to your dashboard
              <span className="ml-1.5 transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---- Line icons (1.8px stroke) ---- */

function RadioIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="1.5" />
      <path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M6 6a9 9 0 0 0 0 12M18 6a9 9 0 0 1 0 12" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.5 13.5 13 21a2 2 0 0 1-2.8 0l-6.7-6.7a2 2 0 0 1-.5-1.9l1.4-5.6a2 2 0 0 1 1.9-1.5H12a2 2 0 0 1 1.4.6l7.1 7.1a2 2 0 0 1 0 2.8Z" />
      <circle cx="8.5" cy="8.5" r="1.3" />
    </svg>
  );
}

function AppleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.4 12.9c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9s-1.8-.8-3-.8c-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7 2-1.1 2.8-2.2c.9-1.3 1.2-2.5 1.3-2.6-.1 0-2.5-1-2.5-3.8Zm-2.3-7c.6-.8 1.1-1.9 1-3-.9 0-2.1.6-2.7 1.4-.6.7-1.1 1.8-1 2.9 1 .1 2.1-.5 2.7-1.3Z" />
    </svg>
  );
}
