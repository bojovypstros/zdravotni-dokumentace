export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex min-h-dvh items-center justify-center bg-background px-4 py-8 text-foreground"
      style={{
        /* Top safe-area comes from root spacer; keep side/bottom insets. */
        paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(1rem, env(safe-area-inset-left))",
        paddingRight: "max(1rem, env(safe-area-inset-right))",
      }}
    >
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
