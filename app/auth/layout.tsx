export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex min-h-svh w-full items-center justify-center p-6 md:p-10"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 60% 50% at 50% 0%, hsl(42 71% 74% / 0.18), transparent 60%)",
      }}
    >
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
