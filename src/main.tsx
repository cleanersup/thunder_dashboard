import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./app/App";

// Auto-reload when a lazy-loaded chunk fails (stale chunk after deploy)
window.addEventListener("vite:preloadError", () => {
  window.location.reload();
});

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
