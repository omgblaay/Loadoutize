import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Button } from "./ui/button";

const CONSENT_KEY = "loadoutize:cookieConsent";

/** Below `sm:`, sidenav.tsx renders a fixed bottom tab bar (h-14 + safe-area inset) --
 * sit above it there instead of covering navigation until the banner is dismissed. */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(CONSENT_KEY)) setVisible(true);
    } catch {
      // localStorage may be unavailable (e.g. private browsing) -- skip rather than
      // show a banner with no way to remember it was dismissed.
    }
  }, []);

  if (!visible) return null;

  const accept = () => {
    try {
      localStorage.setItem(CONSENT_KEY, "accepted");
    } catch {
      // ignore -- see above
    }
    setVisible(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] sm:bottom-0 z-40 border-t border-[#201e1f] bg-[#121011]">
      <div className="max-w-[1440px] mx-auto px-6 py-4 flex flex-wrap items-center gap-4">
        <p className="flex-1 min-w-[240px] text-[13px] text-[#8d898a]">
          We use essential local storage to keep you signed in and Google reCAPTCHA to protect
          against spam when you publish a loadout. See our{" "}
          <Link to="/privacy" className="underline underline-offset-2 text-[#fafafa]">
            Privacy Policy
          </Link>{" "}
          for details.
        </p>
        <Button onClick={accept} className="shrink-0">
          Got it
        </Button>
      </div>
    </div>
  );
}
