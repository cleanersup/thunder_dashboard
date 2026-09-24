import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./app/App";

// Recover when a lazy-loaded chunk 404s after a deploy (hashed filenames change).
// A plain reload() often re-serves cached index.html that still points at old chunks → infinite loop.
window.addEventListener("vite:preloadError", () => {
  const url = new URL(window.location.href);
  if (url.searchParams.has("_chunk")) {
    return;
  }
  url.searchParams.set("_chunk", String(Date.now()));
  window.location.replace(url.toString());
});

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
