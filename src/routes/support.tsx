import { createFileRoute } from "@tanstack/react-router";

import { LegalLayout, LegalList, LegalSection } from "@/components/site/legal-layout";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support — LineUp" },
      {
        name: "description",
        content:
          "Get help with the LineUp app, request a venue correction, submit a privacy request, or delete your account.",
      },
      { property: "og:title", content: "Support — LineUp" },
      {
        property: "og:description",
        content:
          "Get help with the LineUp app, request a venue correction, submit a privacy request, or delete your account.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/support" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/support" }],
  }),
  component: SupportPage,
});

function SupportPage() {
  return (
    <LegalLayout
      title="Support"
      intro={
        <p>
          Need a hand with LineUp? Use the guidance below to get help fast. When you reach out,
          include as much detail as you safely can—but never share your password.
        </p>
      }
    >
      <LegalSection title="App or account issue">
        <p>
          Include the screen you were using, what you expected, what happened, and your iPhone and
          iOS version. Never email your password.
        </p>
      </LegalSection>

      <LegalSection title="Venue correction">
        <p>
          Send the venue name and the specific address, hours, deal, event, or listing detail that
          needs review. Venue information is verified before permanent changes.
        </p>
      </LegalSection>

      <LegalSection title="Privacy request">
        <p>
          Use the email address on your LineUp account so we can securely verify access, correction,
          deletion, restriction, or appeal requests.
        </p>
      </LegalSection>

      <LegalSection title="Delete your account in LineUp">
        <ol className="space-y-2.5">
          {[
            <>
              Open the <strong className="font-semibold text-foreground">Profile</strong> tab.
            </>,
            <>
              Scroll to <strong className="font-semibold text-foreground">Account</strong>.
            </>,
            <>
              Open <strong className="font-semibold text-foreground">Delete Account</strong>.
            </>,
            <>
              Type <strong className="font-semibold text-foreground">DELETE</strong> and confirm.
            </>,
          ].map((step, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-[1.7] text-muted-foreground">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[13px] font-bold text-primary">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <p>
          The App keeps your account active if the server cannot confirm deletion. If the in-app flow
          does not complete, email support from your account address.
        </p>
      </LegalSection>

      <LegalSection title="For faster technical help">
        <p>Please include:</p>
        <LegalList
          items={[
            "the screen and action that caused the issue;",
            "the exact message shown, if any;",
            "whether the issue occurs on Wi-Fi, cellular, or both;",
            "your iPhone model, iOS version, LineUp version, and build number; and",
            "a screenshot or screen recording if it does not contain private information.",
          ]}
        />
        <p>
          <strong className="font-semibold text-foreground">Protect your account.</strong> LineUp
          support will never ask for your password, full authentication token, or device token.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          <strong className="font-semibold text-foreground">Bice Enterprises</strong>
          <br />
          <a
            href="mailto:support@get-lineup.app?subject=LineUp%20Support"
            className="font-semibold text-primary hover:text-foreground"
          >
            support@get-lineup.app
          </a>
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
