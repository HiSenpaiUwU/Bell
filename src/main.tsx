import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContextFixed";
import { CommunityProvider } from "./context/CommunityContext";
import { NotificationProvider } from "./context/NotificationContext";
import { PersonalizationProvider } from "./context/PersonalizationContext";
import { RewardsProvider } from "./context/RewardsContext";
import { ThemeProvider } from "./context/ThemeContext";
import "./styles/global.css";
import "./styles/app.css";

function normalizeLocationForStaticHosting() {
  const { hash, pathname, search } = window.location;

  if (hash.startsWith("#/") || hash.startsWith("#//")) {
    const sanitizedHashPath = `#${hash
      .slice(1)
      .replace(/^\/+/, "/")
      .replace(/\/{2,}/g, "/")}`;

    if (sanitizedHashPath !== hash) {
      window.history.replaceState(
        window.history.state ?? null,
        "",
        `${window.location.pathname}${search}${sanitizedHashPath}`,
      );
    }

    return;
  }

  const normalizedPath = !pathname || pathname.endsWith("/index.html") ? "/" : pathname;

  if (normalizedPath !== "/") {
    window.history.replaceState(window.history.state ?? null, "", `/#${normalizedPath}${search}`);
  }
}

normalizeLocationForStaticHosting();

if ("serviceWorker" in navigator) {
  if (import.meta.env.PROD) {
    const serviceWorkerUrl = new URL("sw.js", window.location.href).toString();

    window.addEventListener("load", () => {
      navigator.serviceWorker.register(serviceWorkerUrl).catch(() => undefined);
    });
  } else {
    window.addEventListener("load", () => {
      void (async () => {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));

        if ("caches" in window) {
          const cacheKeys = await window.caches.keys();
          await Promise.all(
            cacheKeys
              .filter((cacheKey) => cacheKey.startsWith("bell-fresh"))
              .map((cacheKey) => window.caches.delete(cacheKey)),
          );
        }
      })();
    });
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <NotificationProvider>
      <AuthProvider>
        <CommunityProvider>
          <RewardsProvider>
            <CartProvider>
              <PersonalizationProvider>
                <App />
              </PersonalizationProvider>
            </CartProvider>
          </RewardsProvider>
        </CommunityProvider>
      </AuthProvider>
    </NotificationProvider>
  </ThemeProvider>,
);
