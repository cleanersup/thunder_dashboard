import { Providers } from "./providers";
import { AppRouter } from "./routes";

/**
 * Root application component.
 * Composes all providers and the router.
 */
export default function App() {
  return (
    <Providers>
      <AppRouter />
    </Providers>
  );
}
