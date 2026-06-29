"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="bezel-shell">
        <div className="bezel-core shadow-ambient-lg flex flex-col items-center gap-3 px-10 py-12 text-center">
          <span className="inline-flex w-fit items-center rounded-full bg-destructive/10 px-3 py-1 text-[10px] font-medium tracking-[0.2em] text-destructive uppercase">
            Error
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
          <p className="max-w-xs text-sm text-muted-foreground">
            An unexpected error occurred. You can try again, or head back to the dashboard.
          </p>
          <Button size="lg" className="mt-2" onClick={reset}>
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
