export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_-10%,oklch(0.4_0.1_178/12%),transparent_60%)] dark:bg-[radial-gradient(circle_at_50%_-10%,oklch(0.78_0.13_178/14%),transparent_60%)]"
      />
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
