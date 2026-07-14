import { createFileRoute, Link } from "@tanstack/react-router";

import { LegalLayout, LegalList, LegalSection } from "@/components/site/legal-layout";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use — LineUp" },
      {
        name: "description",
        content:
          "The Terms of Use governing your use of the LineUp app, provided by Bice Enterprises.",
      },
      { property: "og:title", content: "Terms of Use — LineUp" },
      {
        property: "og:description",
        content:
          "The Terms of Use governing your use of the LineUp app, provided by Bice Enterprises.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/terms" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Use"
      intro={
        <p>
          These Terms of Use (“Terms”) are a legal agreement between you and Bice Enterprises (“we,”
          “us,” or “our”) governing your use of the LineUp mobile application (the “App”). By
          downloading, accessing, or using the App, you agree to these Terms and acknowledge our{" "}
          <Link to="/privacy" className="font-semibold text-primary hover:text-foreground">
            Privacy Policy
          </Link>
          . If you do not agree, do not use the App.
        </p>
      }
    >
      <LegalSection title="1. Eligibility">
        <p>
          You must be at least 17 years old to use the App. By using the App, you represent that you
          are 17 or older and able to form a binding contract with us. The App references venues that
          serve alcohol; it does not sell alcohol or facilitate its purchase. You are responsible for
          complying with applicable laws, including alcohol and age-of-majority laws where you live.
        </p>
      </LegalSection>

      <LegalSection title="2. What LineUp Is—and Is Not">
        <p>
          LineUp provides estimates and venue information intended to help users compare nightlife
          options, including separate views of the crowd inside and entrance line or wait outside.
          Estimates may use LineUp user reports, verified signals when enabled, historical LineUp
          patterns, venue updates, local event context, and—where currently enabled under a valid
          agreement—licensed aggregate third-party data.
        </p>
        <LegalList
          items={[
            "Crowd levels, line states, wait times, deals, events, hours, and venue information may be inaccurate, incomplete, out of date, or unavailable and may not reflect real-time conditions.",
            "We are not affiliated with and do not control, endorse, or guarantee any venue shown in the App.",
            "We do not guarantee entry to, conditions at, accessibility of, or safety of any venue.",
            "Sponsored placement, if enabled, is labeled and never changes crowd, line, or wait truth.",
            "You are responsible for your decisions and conduct, including transportation and consumption choices. Never drink and drive.",
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Your Account">
        <p>
          You may need an account to use certain features. You agree to provide accurate information,
          keep credentials confidential, and accept responsibility for activity under your account.
          Notify us promptly if you believe your account has been compromised. You may delete your
          account in the App from Profile → Delete Account.
        </p>
      </LegalSection>

      <LegalSection title="4. Profile Content and Reports">
        <p>
          The App lets you submit structured crowd and entrance-line reports and optionally provide a
          display name and profile photo (“User Content”). You retain ownership of your User Content.
          You grant us a worldwide, non-exclusive, royalty-free, sublicensable license to host,
          store, reproduce, aggregate, display, and distribute User Content as needed to operate,
          secure, and improve the App, including combining valid reports into aggregate crowd
          estimates shown to users.
        </p>
        <p>
          If you choose Public name, your current display name and profile photo may appear with your
          structured reports. If you choose Anonymous, those profile elements are hidden from other
          users.
        </p>
        <p>
          You agree that User Content will be accurate to the best of your knowledge and will not be
          false, manipulated, misleading, unlawful, harassing, defamatory, infringing, or otherwise
          objectionable. We may remove content or suspend accounts that violate these Terms, but we
          are not obligated to monitor every submission.
        </p>
      </LegalSection>

      <LegalSection title="5. Acceptable Use">
        <p>You agree not to:</p>
        <LegalList
          items={[
            "Submit false, manipulated, automated, duplicate, or spam reports or interfere with the accuracy or integrity of LineUp;",
            "Use the App for an unlawful purpose or to harass, threaten, deceive, or harm others;",
            "Attempt to access, scrape, reverse engineer, decompile, probe, overload, or disrupt the App, its servers, or underlying data, except where applicable law expressly permits;",
            "Circumvent access controls, rate limits, device protections, or security measures;",
            "Use LineUp or its data to build a competing dataset or service without written permission; or",
            "Violate applicable law or the rights of any third party.",
          ]}
        />
      </LegalSection>

      <LegalSection title="6. Intellectual Property">
        <p>
          The App and its content, excluding User Content and third-party data, including software,
          design, text, graphics, and the LineUp name and logo, are owned by us or our licensors and
          protected by intellectual-property laws. We grant you a limited, non-exclusive,
          non-transferable, revocable license to use the App for personal, non-commercial purposes
          subject to these Terms.
        </p>
      </LegalSection>

      <LegalSection title="7. Third-Party Data and Services">
        <p>
          The App relies on providers for infrastructure, authentication, storage, maps, email, push
          delivery, and, when enabled, data sources. Third-party services may be unavailable or
          inaccurate and are governed by their own terms and policies where applicable. Third-party
          venue and aggregate data is provided “as is.”
        </p>
      </LegalSection>

      <LegalSection title="8. Disclaimers">
        <p>
          To the maximum extent permitted by law, the App and all information in it are provided “as
          is” and “as available,” without warranties of any kind, express, implied, or statutory,
          including implied warranties of merchantability, fitness for a particular purpose,
          accuracy, and non-infringement. We do not warrant that the App will be uninterrupted,
          error-free, or secure, or that crowd estimates, line states, wait times, deals, or venue
          information will be accurate or current.
        </p>
      </LegalSection>

      <LegalSection title="9. Limitation of Liability">
        <p>
          To the maximum extent permitted by law, Bice Enterprises and its owners, employees, and
          licensors will not be liable for indirect, incidental, special, consequential, or punitive
          damages, or loss of data, profits, or goodwill, arising out of or relating to the App, even
          if advised of the possibility. To the maximum extent permitted by law, our total liability
          for a claim relating to the App will not exceed the greater of the amount you paid us to use
          the App in the twelve months before the claim or twenty-five U.S. dollars ($25).
        </p>
        <p>
          Some jurisdictions do not allow certain exclusions or limitations, so some of the above may
          not apply to you.
        </p>
      </LegalSection>

      <LegalSection title="10. Indemnification">
        <p>
          To the extent permitted by law, you agree to indemnify and hold harmless Bice Enterprises
          and its owners, employees, and licensors from claims, damages, liabilities, and expenses,
          including reasonable attorneys’ fees, arising from your use of the App, your User Content,
          or your violation of these Terms, applicable law, or third-party rights.
        </p>
      </LegalSection>

      <LegalSection title="11. Termination">
        <p>
          We may suspend or terminate your access for violation of these Terms, fraud, abuse,
          security risk, legal requirements, or discontinuation of the service. You may stop using
          the App and delete your account at any time. Provisions that by their nature should survive
          termination will survive.
        </p>
      </LegalSection>

      <LegalSection title="12. Changes to the App or Terms">
        <p>
          We may modify the App or update these Terms. We will revise the “Last updated” date and,
          where appropriate, provide notice in the App. Material changes apply prospectively as
          required by law. Your continued use after changes take effect constitutes acceptance of the
          updated Terms.
        </p>
      </LegalSection>

      <LegalSection title="13. Governing Law and Disputes">
        <p>
          These Terms are governed by the laws of the State of Texas, without regard to
          conflict-of-laws rules. Any dispute arising from these Terms or the App will be subject to
          the exclusive jurisdiction of state and federal courts located in Texas, unless applicable
          law requires otherwise. Nothing in these Terms limits mandatory consumer-protection rights
          in your place of residence.
        </p>
      </LegalSection>

      <LegalSection title="14. Apple App Store Terms">
        <p>
          If you download the App from the Apple App Store, you acknowledge that these Terms are
          between you and us, not Apple, and Apple is not responsible for the App or its content.
          Apple is a third-party beneficiary of these Terms and may enforce them against you. The App
          must be used in accordance with the Apple Media Services Terms and Conditions.
        </p>
      </LegalSection>

      <LegalSection title="15. Contact Us">
        <p>
          <strong className="font-semibold text-foreground">Bice Enterprises</strong>
          <br />
          Email:{" "}
          <a
            href="mailto:support@get-lineup.app?subject=LineUp%20Terms"
            className="font-semibold text-primary hover:text-foreground"
          >
            support@get-lineup.app
          </a>
        </p>
        <p className="text-[13px] text-faint">
          LineUp is not affiliated with, endorsed by, or sponsored by the University of Arizona or
          any venue displayed in the App.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
