// Public site key -- safe to ship in frontend code. The matching secret key
// lives only in the Edge Function's env (RECAPTCHA_SECRET_KEY), never here.
const RECAPTCHA_SITE_KEY = "6LcDLqktAAAAAAzqZIrfszuqsOvGHdFdXTktTvOR";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadRecaptchaScript(): Promise<void> {
  if (window.grecaptcha) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load reCAPTCHA"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/** reCAPTCHA v3 is invisible -- call this right before submitting, then send the token to the
 * backend for verification. Each token is single-use, so get a fresh one per submit attempt. */
export async function getRecaptchaToken(action: string): Promise<string> {
  await loadRecaptchaScript();
  return new Promise((resolve, reject) => {
    window.grecaptcha!.ready(() => {
      window.grecaptcha!.execute(RECAPTCHA_SITE_KEY, { action }).then(resolve, reject);
    });
  });
}

/** Required Google attribution when the floating reCAPTCHA badge is hidden via CSS (see the
 * `.grecaptcha-badge` rule in theme.css) -- v3 has no visible widget of its own otherwise. */
export function RecaptchaNotice({ className }: { className?: string }) {
  return (
    <p className={className}>
      This site is protected by reCAPTCHA and the Google{" "}
      <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline">
        Privacy Policy
      </a>{" "}
      and{" "}
      <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline">
        Terms of Service
      </a>{" "}
      apply.
    </p>
  );
}
