import type { ReactNode } from "react";

import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";

type LegalLayoutProps = {
  eyebrow?: string;
  title: string;
  intro?: ReactNode;
  updated?: string;
  children: ReactNode;
};

export function LegalLayout({
  eyebrow = "Legal",
  title,
  intro,
  updated,
  children,
}: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main
        id="main"
        className="mx-auto max-w-3xl px-5 pb-24 pt-32 sm:px-8 sm:pt-40"
      >
        <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-primary">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-[34px] font-extrabold leading-[1.1] tracking-[-0.02em] text-foreground sm:text-[42px]">
          {title}
        </h1>
        {updated ? (
          <p className="mt-3 text-[13px] font-medium text-faint">Last updated {updated}</p>
        ) : null}
        {intro ? (
          <div className="mt-6 text-[16px] leading-[1.7] text-muted-foreground">{intro}</div>
        ) : null}

        <div className="legal-prose mt-10">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="text-[20px] font-bold tracking-[-0.01em] text-foreground">{title}</h2>
      <div className="mt-3 space-y-4 text-[15px] leading-[1.7] text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="relative pl-5 text-[15px] leading-[1.7] text-muted-foreground">
          <span
            className="absolute left-0 top-[0.7em] h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-primary/70"
            aria-hidden="true"
          />
          {item}
        </li>
      ))}
    </ul>
  );
}
