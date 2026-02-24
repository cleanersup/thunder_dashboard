/**
 * PublicRoute — wrapper for routes that don't require authentication.
 * Examples: /auth, /booking/:userId, /view/estimate/:token, /invoice/payment/:id.
 *
 * Currently passes children through directly.
 * If you need to redirect already-authenticated users away from /auth,
 * add the logic here (check session → navigate to /home).
 */
export function PublicRoute({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
