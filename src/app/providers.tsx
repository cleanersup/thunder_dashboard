import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SubscriptionProvider } from "@/features/subscriptions/context/SubscriptionContext";
import { Toaster } from "@/shared/components/ui/sonner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Composes all global providers for the application.
 * Order matters: QueryClientProvider must wrap SubscriptionProvider (which uses useQuery internally).
 * Add new providers here — keep this file as the single source of provider composition.
 *
 * @param children - React subtree
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SubscriptionProvider>
        {children}
        <Toaster richColors closeButton position="top-right" />
      </SubscriptionProvider>
    </QueryClientProvider>
  );
}
