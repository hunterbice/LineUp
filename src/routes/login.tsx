import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Logo } from "@/components/site/logo";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Bar Login — LineUp Business Dashboard" },
      {
        name: "description",
        content: "Sign in to manage your venue on LineUp — update crowd levels, post deals, and see your data.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Bar Login — LineUp" },
      { property: "og:url", content: "/login" },
    ],
    links: [{ rel: "canonical", href: "/login" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [notice, setNotice] = useState(false);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-12">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "var(--hero-glow)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute left-1/2 top-[-300px] h-[700px] w-[700px] -translate-x-1/2 rounded-full"
        style={{ background: "rgba(139,108,255,0.25)", filter: "blur(130px)" }}
        aria-hidden="true"
      />

      <div
        className="relative w-full max-w-[440px] rounded-2xl border border-border bg-card p-8 sm:p-10"
        style={{ boxShadow: "0 40px 100px rgba(0,0,0,0.5)" }}
      >
        <div className="flex flex-col items-center text-center">
          <Link to="/" aria-label="LineUp home">
            <Logo size={26} />
          </Link>
          <p className="mt-6 text-[12px] font-bold uppercase tracking-[0.16em] text-primary">
            Business Dashboard
          </p>
          <h1 className="mt-2 text-[24px] font-extrabold tracking-[-0.02em] text-foreground">
            Sign in to manage your venue
          </h1>
        </div>

        <form
          className="mt-8 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setNotice(true);
          }}
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-[11px] font-bold uppercase tracking-[0.1em] text-faint">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@yourvenue.com"
              className="h-[50px] rounded-[14px] border border-input bg-white/[0.04] px-4 text-[15px] text-foreground outline-none transition-colors placeholder:text-faint focus:border-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-[11px] font-bold uppercase tracking-[0.1em] text-faint">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="h-[50px] rounded-[14px] border border-input bg-white/[0.04] px-4 text-[15px] text-foreground outline-none transition-colors placeholder:text-faint focus:border-primary"
            />
          </div>

          <button
            type="submit"
            className="mt-2 h-[56px] w-full rounded-[14px] bg-primary text-[15px] font-bold text-primary-foreground transition-colors hover:bg-accent-deep"
          >
            Sign in
          </button>

          {notice && (
            <p className="rounded-[12px] border border-border bg-secondary px-4 py-3 text-center text-[13px] text-muted-foreground">
              Dashboard access is being set up. Accounts are provisioned by the LineUp team — we'll
              be in touch to activate yours.
            </p>
          )}

          <button
            type="button"
            className="mx-auto mt-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setNotice(true)}
          >
            Forgot password?
          </button>
        </form>
      </div>
    </div>
  );
}
