"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";

const App = dynamic(() => import("@/app/App"), { ssr: false });

export function ClientApp() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      })
      .catch(() => {
        // Ignore cleanup failures; service workers are not used by this app.
      });
  }, []);

  return <App />;
}
