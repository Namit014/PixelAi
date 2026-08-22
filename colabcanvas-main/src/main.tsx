import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeErrorFilter } from "./lib/errorFilter";
import { primeAiNotifyAudio } from "./lib/notifications/aiNotify";

// Initialize global error filter to clean console
initializeErrorFilter({ 
  enabled: true, // Always enabled to reduce noise
  logFiltered: false // Set to true to debug what's being filtered
});

// Pre-warm the WebAudio context on the first user gesture so completion
// chimes can play without being blocked by autoplay policy.
primeAiNotifyAudio();

// PWA service worker registration with strict guards.
// Per Lovable PWA rules: NEVER register in iframes / preview hosts / dev mode —
// otherwise the SW serves stale content and breaks the editor preview.
(() => {
  if (typeof window === "undefined") return;
  const inIframe = (() => {
    try { return window.self !== window.top; } catch { return true; }
  })();
  const host = window.location.hostname;
  const isPreviewHost =
    host.includes("lovableproject.com") ||
    host.includes("id-preview--") ||
    host.includes("lovable.app") && host.startsWith("id-preview--");

  if (import.meta.env.PROD && !inIframe && !isPreviewHost) {
    import("virtual:pwa-register")
      .then(({ registerSW }) => registerSW({ immediate: true }))
      .catch(() => {});
  } else if ("serviceWorker" in navigator) {
    // Clean up any leftover SWs that could poison the preview iframe.
    navigator.serviceWorker.getRegistrations()
      .then((regs) => regs.forEach((r) => r.unregister()))
      .catch(() => {});
  }
})();

console.log("🚀 App starting...");
const rootElement = document.getElementById("root");
console.log("📦 Root element:", rootElement);

if (!rootElement) {
  console.error("❌ Root element not found!");
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'padding: 20px; font-family: system-ui;';
  errorDiv.textContent = 'Root element not found. Check index.html';
  document.body.appendChild(errorDiv);
} else {
  try {
    console.log("✅ Creating React root...");
    createRoot(rootElement).render(<App />);
    console.log("✅ App rendered successfully!");
  } catch (error) {
    console.error("❌ Error rendering app:", error);
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'padding: 20px; font-family: system-ui; color: red;';
    errorDiv.textContent = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    document.body.appendChild(errorDiv);
  }
}
