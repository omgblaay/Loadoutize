"use client";

import { useMemo, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { NavigationType, Router, type Location, type Navigator, type To } from "react-router";
import { AppLayout } from "@/components/templates/AppLayout";
import { CookieConsent } from "@/components/organisms/CookieConsent";
import { Toaster } from "@/components/molecules/Toaster";
import { AuthProvider } from "@/providers/AuthProvider";
import { LOCKED_GAME_ID } from "@/lib/games";

function toHref(to: To): string {
  if (typeof to === "string") return to;
  return `${to.pathname ?? ""}${to.search ?? ""}${to.hash ?? ""}`;
}

// Same providers and chrome as the client app (App.tsx + AppLayout), so SEO
// pages look identical. Server-rendered pages can't own a BrowserRouter, so
// React Router gets a location derived from Next's pathname, and its navigator
// hands every navigation to Next.js. Links and navigate() calls then move
// between the SEO pages and the SPA routes without a full reload.
export function SeoAppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const location = useMemo<Partial<Location>>(
    () => ({ pathname, search: "", hash: "", state: null, key: pathname }),
    [pathname],
  );

  const navigator = useMemo<Navigator>(
    () => ({
      createHref: toHref,
      push: (to) => router.push(toHref(to)),
      replace: (to) => router.replace(toHref(to)),
      go: (delta) => window.history.go(delta),
    }),
    [router],
  );

  return (
    <AuthProvider>
      <Toaster position="top-center" />
      <Router location={location} navigator={navigator} navigationType={NavigationType.Pop}>
        <AppLayout selectedGame={LOCKED_GAME_ID} onGameSelect={() => {}}>
          {children}
        </AppLayout>
        <CookieConsent />
      </Router>
    </AuthProvider>
  );
}
