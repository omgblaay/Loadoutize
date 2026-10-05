import { createRoot } from "react-dom/client";
import App from "@/app/App.tsx";
import "@/styles/index.css";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
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
  });
}

createRoot(document.getElementById("root")!).render(<App />);
