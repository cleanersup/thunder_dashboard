/**
 * AuthBackground — dark futuristic gradient used across all auth pages.
 * Renders: slate gradient, cyan grid, glowing orbs.
 */
export function AuthBackground() {
  return (
    <>
      {/* Base gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 -z-50" />

      {/* Cyan grid */}
      <div
        className="fixed inset-0 opacity-10 -z-40 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(56,189,248,0.3) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(56,189,248,0.3) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Glowing orbs — hidden on mobile for performance */}
      <div className="hidden lg:block fixed top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse -z-30 pointer-events-none" />
      <div
        className="hidden lg:block fixed bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse -z-30 pointer-events-none"
        style={{ animationDelay: "1s" }}
      />

      {/* Scan line */}
      <div className="fixed inset-0 opacity-5 pointer-events-none -z-20">
        <div className="h-full w-full bg-gradient-to-b from-transparent via-cyan-500/50 to-transparent animate-pulse" />
      </div>
    </>
  );
}
