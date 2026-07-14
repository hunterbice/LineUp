import { createFileRoute } from "@tanstack/react-router";

import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — LineUp" },
      { name: "description", content: "The terms that govern use of LineUp." },
      { property: "og:title", content: "Terms of Service — LineUp" },
      { property: "og:url", content: "/terms" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 pb-20 pt-32 sm:px-8 sm:pt-40">
        <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-primary">Legal</p>
        <h1 className="mt-2 text-[34px] font-extrabold tracking-[-0.02em] text-foreground">
          Terms of Service
        </h1>
        <p className="mt-6 text-[15px] leading-[1.6] text-muted-foreground">
          By using LineUp you agree to use crowd and wait-time information as a helpful estimate, not
          a guarantee. Venue accounts are provisioned by the LineUp team and are subject to fair-use
          and accuracy expectations. The full terms are being finalized and will be published here
          before launch.
        </p>
        <p className="mt-4 text-[15px] leading-[1.6] text-muted-foreground">
          Questions in the meantime? Reach us through the LineUp app or your onboarding contact.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
