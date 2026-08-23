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
          "radial-gradient(ellipse 55% 45% at 82% 8%, hsl(10 100% 57% / 0.20), transparent 60%), radial-gradient(ellipse 45% 40% at 5% 90%, hsl(78 100% 62% / 0.10), transparent 60%)",
      }}
    >
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
