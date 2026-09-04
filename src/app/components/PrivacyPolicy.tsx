import { Link } from "react-router";
import { usePageTitle } from "../hooks/usePageTitle";
import { Logo } from "./ui/logo";

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

export function PrivacyPolicy() {
  usePageTitle("Loadoutize • Privacy Policy");

  return (
    <div className="min-h-screen bg-[#0a0909]">
      <div className="max-w-[720px] mx-auto px-6 py-12 flex flex-col gap-10">
        <div className="flex flex-col gap-6">
          <Link to="/" className="inline-flex items-center gap-1.5 w-fit">
            <Logo />
          </Link>
            <h1 className="text-2xl font-bold text-[#fafafa] mb-2">Privacy Policy</h1>
            <p className="text-teritary">Effective {EFFECTIVE_DATE}</p>

        </div>

        <div className="flex flex-col gap-8">
          <p className="text-secondary">
            Loadoutize ("Loadoutize", "we", "us") lets players build and share game loadouts. This policy explains
            what information we collect when you use loadoutize.com (the "Service"), why we collect it, and the
            choices you have.
          </p>

          <Section title="Information we collect">
            <p>
              <strong className="text-white">Account information.</strong> If you create an account, we collect
              your email address, password, display name, and public nickname. If you sign up with Google instead,
              we receive your email address and name from Google rather than a password.
            </p>
            <p>
              <strong className="text-white">Profile content.</strong> Your nickname, avatar image (if you
              upload one), and role tag (e.g. player, creator) are stored and shown on your public profile page.
            </p>
            <p>
              <strong className="text-white">User content.</strong> Loadouts you create — weapon, attachment,
              perk, and equipment selections, along with any name or notes you give them — are stored and, unless
              you keep them private, shown publicly to other visitors.
            </p>
            <p>
              <strong className="text-white">Automatically collected information.</strong> Our hosting and
              backend providers (Supabase, and any CDN/hosting provider serving the site) may log standard technical
              data such as IP address, browser type, and request timestamps for security and reliability purposes.
              We do not run our own analytics or advertising trackers.
            </p>
            <p>
              <strong className="text-white]">Local storage.</strong> Your browser stores your session access
              token in <code className="text-white">localStorage</code> so you stay signed in. This stays on
              your device and is not shared with third parties.
            </p>
          </Section>

          <Section title="How we use information">
            <p>We use the information above to:</p>
            <ul className="list-disc pl-5 flex flex-col gap-1.5">
              <li>Create and secure your account, and keep you signed in.</li>
              <li>Display your profile, avatar, and loadouts to you and, where public, to other users.</li>
              <li>Operate, maintain, and improve the Service, including diagnosing bugs and abuse.</li>
              <li>Communicate with you about your account or respond to support requests you send us.</li>
            </ul>
            <p>We do not sell your personal information, and we do not use it for third-party advertising.</p>
          </Section>

          <Section title="Sharing of information">
            <p>We do not sell or rent your personal information. We share information only with:</p>
            <ul className="list-disc pl-5 flex flex-col gap-1.5">
              <li>
                <strong className="text-white">Service providers</strong> that host our infrastructure —
                currently Supabase (database, authentication, and file storage) — under agreements limiting their
                use of your data to providing those services.
              </li>
              <li>
                <strong className="text-white">Google</strong>, if you choose "Continue with Google" to sign in,
                to authenticate your identity.
              </li>
              <li>
                <strong className="text-white">Other users</strong>, to the extent you make information public
                — your nickname, avatar, role tag, and any loadouts you don't keep private are visible to anyone
                who visits the Service.
              </li>
              <li>
                <strong className="text-white">Legal authorities</strong>, if required to comply with the law,
                protect our rights, or protect the safety of our users.
              </li>
            </ul>
          </Section>

          <Section title="Data retention">
            <p>
              We retain your account and content for as long as your account is active. If you delete your account
              or specific loadouts, we remove them from active use within a reasonable time, except where retention
              is required for legal, security, or fraud-prevention reasons.
            </p>
          </Section>

          <Section title="Your choices and rights">
            <ul className="list-disc pl-5 flex flex-col gap-1.5">
              <li>You can review and update your profile, avatar, and nickname at any time from Settings.</li>
              <li>You can delete individual loadouts you've created.</li>
              <li>
                You can request access to, correction of, or deletion of your personal information by emailing us
                at{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-white underline underline-offset-2">
                  {CONTACT_EMAIL}
                </a>
                . Depending on your location, you may have additional rights under laws such as the GDPR or CCPA;
                we'll honor applicable requests.
              </li>
            </ul>
          </Section>

          <Section title="Children's privacy">
            <p>
              The Service is not directed to children under 13, and we do not knowingly collect personal information
              from children under 13. If you believe a child has provided us information, contact us and we will
              delete it.
            </p>
          </Section>

          <Section title="Security">
            <p>
              We rely on industry-standard measures provided by our infrastructure providers — including encryption
              in transit and access controls — to protect your information. No method of transmission or storage is
              perfectly secure, and we cannot guarantee absolute security.
            </p>
          </Section>

          <Section title="International users">
            <p>
              Our infrastructure providers may process and store data in countries other than your own. By using
              the Service, you consent to your information being transferred to and processed in such countries.
            </p>
          </Section>

          <Section title="Changes to this policy">
            <p>
              We may update this Privacy Policy from time to time. If we make material changes, we'll update the
              effective date above and, where appropriate, notify you through the Service.
            </p>
          </Section>

          <Section title="Contact us">
            <p>
              Questions about this policy or your data? Email us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-white underline underline-offset-2">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </Section>
        </div>

        <div className="pt-4 border-t border-white/[0.08] flex gap-4 text-[13px] text-teritary">
          <Link to="/terms" className="hover:text-white">
            Terms of Service
          </Link>
          <Link to="/" className="hover:text-white">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
