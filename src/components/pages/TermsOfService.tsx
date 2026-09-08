import { Link } from "react-router";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Logo } from "@/components/atoms/Logo";

const EFFECTIVE_DATE = "September 30, 2026";
const CONTACT_EMAIL = "loadoutize@gmail.com";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-[#fafafa]">{title}</h2>
      <div className="flex flex-col gap-3 text-[14px] leading-relaxed text-[#aea6a8]">{children}</div>
    </section>
  );
}

export function TermsOfService() {
  usePageTitle("Loadoutize • Terms of Service");

  return (
    <div className="min-h-screen bg-[#0a0909]">
      <div className="max-w-[720px] mx-auto px-6 py-12 flex flex-col gap-10">
        <div className="flex flex-col gap-6">
          <Link to="/home" className="inline-flex items-center gap-1.5 w-fit">
            <Logo />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#fafafa] mb-2">Terms of Service</h1>
            <p className="text-sm text-teritary">Effective {EFFECTIVE_DATE}</p>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <p className="text-secondary">
            These Terms of Service ("Terms") govern your use of loadoutize.com (the "Service"), operated by
            Loadoutize ("we", "us"). By creating an account or otherwise using the Service, you agree to these
            Terms. If you don't agree, please don't use the Service.
          </p>

          <Section title="Who can use Loadoutize">
            <p>
              You must be at least 13 years old to create an account. By signing up, you confirm the information you
              provide is accurate and that you'll keep your password secure and confidential. You're responsible for
              all activity under your account.
            </p>
          </Section>

          <Section title="Your content">
            <p>
              When you create a loadout, upload an avatar, or otherwise submit content ("User Content"), you retain
              ownership of it. By submitting User Content, you grant us a non-exclusive, worldwide, royalty-free
              license to host, store, display, and distribute it as necessary to operate and promote the Service
              (for example, showing your public loadouts to other visitors or in a shareable link).
            </p>
            <p>You agree not to submit User Content that:</p>
            <ul className="list-disc pl-5 flex flex-col gap-1.5">
              <li>Is unlawful, harassing, hateful, or infringes someone else's rights (including copyright);</li>
              <li>Impersonates another person or misrepresents your affiliation with anyone;</li>
              <li>Contains malware, spam, or attempts to disrupt the Service;</li>
              <li>You don't have the right to share (e.g. images you don't own).</li>
            </ul>
            <p>
              We may remove User Content or suspend accounts that violate these Terms, at our discretion, without
              prior notice.
            </p>
          </Section>

          <Section title="Acceptable use">
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 flex flex-col gap-1.5">
              <li>Scrape, reverse-engineer, or use automated tools against the Service beyond normal browsing;</li>
              <li>Interfere with or disrupt the Service's infrastructure or security;</li>
              <li>Create accounts to evade a suspension or ban;</li>
              <li>Use the Service for any unlawful purpose.</li>
            </ul>
          </Section>

          <Section title="Third-party sign-in">
            <p>
              If you sign in with Google, your use of that provider is also governed by its own terms and privacy
              policy. We only receive the profile information the provider shares with us, as described in our{" "}
              <Link to="/privacy" className="text-[#fafafa] underline underline-offset-2">
                Privacy Policy
              </Link>
              .
            </p>
          </Section>

          <Section title="Game content and trademarks">
            <p>
              Loadoutize is an independent, fan-made tool for building and sharing loadouts for third-party games
              (including titles from Call of Duty, Battlefield, The Finals, and Delta Force). We are not affiliated
              with, sponsored by, or endorsed by the publishers or rights holders of those games. All related game
              names, trademarks, and imagery belong to their respective owners and are referenced for identification
              purposes only.
            </p>
          </Section>

          <Section title="Termination">
            <p>
              You may stop using the Service or delete your account at any time. We may suspend or terminate your
              access if you violate these Terms, or if we discontinue the Service, with or without notice where
              reasonably possible.
            </p>
          </Section>

          <Section title='"As is" and disclaimers'>
            <p>
              The Service is provided "as is" and "as available," without warranties of any kind, whether express or
              implied. We don't guarantee the Service will be uninterrupted, error-free, or that any loadout data
              (in-game stats, meta rankings, community content) is accurate or current.
            </p>
          </Section>

          <Section title="Limitation of liability">
            <p>
              To the fullest extent permitted by law, Loadoutize will not be liable for any indirect, incidental, or
              consequential damages arising from your use of the Service. Our total liability for any claim relating
              to the Service is limited to the amount you paid us in the past twelve months, if any (the Service is
              currently free to use).
            </p>
          </Section>

          <Section title="Changes to the Service or these Terms">
            <p>
              We may modify or discontinue features of the Service at any time. We may also update these Terms; if
              we make material changes, we'll update the effective date above. Continuing to use the Service after
              changes take effect means you accept the updated Terms.
            </p>
          </Section>

          <Section title="Governing law">
            <p>
              These Terms are governed by applicable law in the jurisdiction where Loadoutize operates, without
              regard to conflict-of-law principles, unless a different law is required to apply to you by mandatory
              consumer-protection rules where you live.
            </p>
          </Section>

          <Section title="Contact us">
            <p>
              Questions about these Terms? Email us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#fafafa] underline underline-offset-2">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </Section>
        </div>

        <div className="pt-4 border-t border-white/[0.08] flex gap-4 text-[13px] text-[#857d7f]">
          <Link to="/privacy" className="hover:text-[#efedf1]">
            Privacy Policy
          </Link>
          <Link to="/home" className="hover:text-[#efedf1]">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
