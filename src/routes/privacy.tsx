import { createFileRoute } from "@tanstack/react-router";

import { LegalLayout, LegalList, LegalSection } from "@/components/site/legal-layout";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — LineUp" },
      {
        name: "description",
        content:
          "How LineUp (Bice Enterprises) collects, uses, and protects your information across the LineUp app.",
      },
      { property: "og:title", content: "Privacy Policy — LineUp" },
      {
        property: "og:description",
        content:
          "How LineUp (Bice Enterprises) collects, uses, and protects your information across the LineUp app.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/privacy" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      intro={
        <>
          <p>
            This Privacy Policy explains how Bice Enterprises (“we,” “us,” or “our”) collects, uses,
            and shares information when you use the LineUp mobile application (the “App”). LineUp
            helps you see how busy bars and nightlife venues near you are likely to be, including the
            crowd inside and the entrance line or wait, so you can decide where to go.
          </p>
          <p className="mt-4">
            LineUp is intended for users aged 17 and older. We do not knowingly collect information
            from anyone under 17. See “Children’s Privacy” below.
          </p>
        </>
      }
    >
      <LegalSection title="1. Information We Collect">
        <h3 className="text-[16px] font-semibold text-foreground">Information you provide</h3>
        <LegalList
          items={[
            <>
              <strong className="font-semibold text-foreground">
                Account and profile information.
              </strong>{" "}
              When you create an account, we collect information such as your name and email address.
              If you choose to add a profile photo, we collect the fresh square JPEG the App creates
              from your selected image. The original photo and its embedded metadata are not
              uploaded.
            </>,
            <>
              <strong className="font-semibold text-foreground">Reports and contributions.</strong>{" "}
              When you submit a structured venue report, we collect the crowd level, entrance-line
              state, optional wait time, venue, and related report information. Depending on your
              profile choice, a report may display your current public name and profile photo or
              appear as anonymous.
            </>,
            <>
              <strong className="font-semibold text-foreground">Support communications.</strong> If
              you contact us, we collect the information you include in that communication and any
              attachments you choose to send.
            </>,
          ]}
        />

        <h3 className="pt-2 text-[16px] font-semibold text-foreground">
          Information collected through the App
        </h3>
        <LegalList
          items={[
            <>
              <strong className="font-semibold text-foreground">Location information.</strong> With
              your permission, LineUp may use precise or approximate location to support nearby
              features, verify reports, and evaluate an optional Automatic Arrival. Foreground
              location, Automatic Arrival consent, and background arrival are separate choices. Exact
              coordinates are evaluated transiently for server verification and are not intentionally
              retained in LineUp product tables; limited rounded operational location may be retained
              for safety, abuse prevention, and system operation. You can browse University and Off
              Campus venues without granting location.
            </>,
            <>
              <strong className="font-semibold text-foreground">
                Identifiers and notification information.
              </strong>{" "}
              We use your account identifier and a random installation or device identifier to keep
              you signed in, secure requests, enforce rate limits, and prevent abuse. If you enable
              notifications, we may collect an Apple Push Notification service device token and
              notification preferences.
            </>,
            <>
              <strong className="font-semibold text-foreground">Usage and diagnostic data.</strong>{" "}
              We collect limited product interactions and closed-category diagnostics, such as
              screens or features used, request outcomes, launch-time ranges, and aggregate crash or
              performance counts. LineUp’s diagnostic service is designed not to collect raw crash
              payloads, stack traces, precise coordinates, authentication tokens, URLs, or free-form
              text.
            </>,
          ]}
        />

        <h3 className="pt-2 text-[16px] font-semibold text-foreground">
          Information from venues and other sources
        </h3>
        <p>
          Venue hours, deals, events, capacity context, and similar information may come from venues,
          public sources, or service providers. Crowd estimates may use LineUp user reports, verified
          arrival signals when enabled, historical LineUp patterns, venue updates, and local event
          context. Where a licensed third-party aggregate foot-traffic source is enabled under a
          current agreement, it may also contribute de-identified venue-level patterns. A source that
          is not active does not silently supply live data.
        </p>
      </LegalSection>

      <LegalSection title="2. How We Use Information">
        <LegalList
          items={[
            "Provide core functionality, including venue crowd levels, entrance-line or wait information, nearby venues, deals, events, favorites, and Tonight planning.",
            "Create and secure your account, keep you signed in, and prevent fraud, spam, manipulation, and abuse.",
            "Incorporate valid reports and verified signals into aggregate venue estimates shown to users.",
            "Operate optional location, Automatic Arrival, and notification features you choose to enable.",
            "Analyze product usage and improve accuracy, reliability, accessibility, performance, and features.",
            "Respond to support, privacy, and venue-correction requests.",
            "Comply with legal obligations and enforce our Terms of Use.",
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Your Choices">
        <LegalList
          items={[
            <>
              <strong className="font-semibold text-foreground">Location.</strong> Control precise or
              approximate location in iOS Settings. Automatic Arrival and background arrival have
              additional in-app controls.
            </>,
            <>
              <strong className="font-semibold text-foreground">Notifications.</strong> Choose
              notification categories in LineUp and control system authorization in iOS Settings.
            </>,
            <>
              <strong className="font-semibold text-foreground">Report identity.</strong> Choose
              Anonymous or Public name in Edit Profile.
            </>,
            <>
              <strong className="font-semibold text-foreground">Profile photo.</strong> Add, replace,
              or remove your optional profile photo in Edit Profile.
            </>,
            <>
              <strong className="font-semibold text-foreground">Account deletion.</strong> Delete
              your account directly in Profile → Delete Account. You may also contact us for help with
              access, correction, deletion, restriction, or appeal requests.
            </>,
            <>
              <strong className="font-semibold text-foreground">Communications.</strong> You may opt
              out of non-essential communications. Transactional account, security, and support
              messages may still be sent when needed.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Your Privacy Rights">
        <p>
          Depending on where you live, you may have rights to access, correct, delete, or restrict
          the use of your personal information, obtain a portable copy, or appeal a denied request.
          We will not discriminate against you for exercising a privacy right. To make a request,
          contact us using the details below. We may need to verify your identity before completing
          it.
        </p>
      </LegalSection>

      <LegalSection title="5. Data Retention">
        <p>
          We retain personal information only as long as reasonably needed to provide LineUp, secure
          the service, comply with legal obligations, resolve disputes, and enforce agreements.
          Retention differs by data type:
        </p>
        <LegalList
          items={[
            "Account and profile data are retained while your account is active and deleted through the in-app account-deletion process unless law requires limited retention.",
            "Profile-photo replacement or removal queues the prior private object for deletion.",
            "Exact location is evaluated transiently and is not intentionally stored in product tables. Identified rounded operational location and geofence operational state are subject to a maximum 30-day retention policy.",
            "Identified client diagnostic events and, if enabled, identified campaign assignments and interactions are subject to a maximum 30-day retention policy. Some non-identifying aggregate metrics may remain.",
            "Reports and report-derived personal signals are removed with account deletion. Aggregate or de-identified venue history may remain where it no longer identifies you.",
          ]}
        />
        <p>When information is no longer needed, we delete or de-identify it.</p>
      </LegalSection>

      <LegalSection title="6. Security">
        <p>
          We use reasonable administrative, technical, and organizational measures designed to
          protect information, including encryption in transit, private storage for profile photos,
          access controls, signed-device proof, and server-side authorization. No method of
          transmission or storage is completely secure, and we cannot guarantee absolute security.
        </p>
      </LegalSection>

      <LegalSection title="7. Children’s Privacy">
        <p>
          LineUp is rated 17+ and is not directed to children under 17. We do not knowingly collect
          personal information from children under 17. If you believe a child has provided
          information to LineUp, contact us and we will take appropriate steps to delete it.
        </p>
      </LegalSection>

      <LegalSection title="8. Changes to This Policy">
        <p>
          We may update this Privacy Policy as LineUp changes. We will revise the “Last updated” date
          and, where appropriate, provide additional notice in the App. Material changes apply
          prospectively as required by law.
        </p>
      </LegalSection>

      <LegalSection title="9. Contact Us">
        <p>
          <strong className="font-semibold text-foreground">Bice Enterprises</strong>
          <br />
          Email:{" "}
          <a
            href="mailto:support@get-lineup.app?subject=LineUp%20Privacy"
            className="font-semibold text-primary hover:text-foreground"
          >
            support@get-lineup.app
          </a>
        </p>
        <p className="text-[13px] text-faint">
          LineUp is not affiliated with, endorsed by, or sponsored by the University of Arizona or
          any venue displayed in the App. Crowd levels and waits are estimates and may not reflect
          real-time conditions.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
