import React from "react";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * React class-based error boundary.
 * Catches render errors in the subtree and shows a fallback UI instead of a blank screen.
 *
 * @example
 * <ErrorBoundary>
 *   <Suspense fallback={<Loader />}>
 *     <Routes />
 *   </Suspense>
 * </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
          <Card className="w-full max-w-sm shadow-md">
            <CardContent className="pt-6 flex flex-col items-center gap-4 text-center">
              <p className="text-lg font-semibold">Something went wrong</p>
              {this.state.error && (
                <p className="text-sm text-muted-foreground">{this.state.error.message}</p>
              )}
              <Button onClick={() => window.location.reload()}>Reload page</Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
