import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="bezel-shell">
        <div className="bezel-core shadow-ambient-lg flex flex-col items-center gap-3 px-10 py-12 text-center">
          <span className="inline-flex w-fit items-center rounded-full bg-accent px-3 py-1 text-[10px] font-medium tracking-[0.2em] text-accent-foreground uppercase">
            404
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
          <p className="max-w-xs text-sm text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or may have moved.
          </p>
          <Button asChild size="lg" className="mt-2">
            <Link href="/">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
