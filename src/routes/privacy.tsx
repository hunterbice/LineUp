import { createFileRoute } from "@tanstack/react-router";

import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — LineUp" },
      { name: "description", content: "How LineUp handles your data." },
      { property: "og:title", content: "Privacy Policy — LineUp" },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 pb-20 pt-32 sm:px-8 sm:pt-40">
        <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-primary">Legal</p>
        <h1 className="mt-2 text-[34px] font-extrabold tracking-[-0.02em] text-foreground">
          Privacy Policy
        </h1>
        <p className="mt-6 text-[15px] leading-[1.6] text-muted-foreground">
          LineUp is built around aggregate, anonymous crowd signals. We never sell your data, and
          the LineUp app never shares individual identities, exact locations, or device details with
          venues. The full policy is being finalized and will be published here before launch.
        </p>
        <p className="mt-4 text-[15px] leading-[1.6] text-muted-foreground">
          Questions in the meantime? Reach us through the LineUp app or your onboarding contact.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
