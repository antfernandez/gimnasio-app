import { Rama, RamasDefs } from "@/components/sitio/ramas";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative flex min-h-svh w-full items-center justify-center overflow-hidden p-6 md:p-10"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 60% 40% at 12% 8%, rgba(255,255,255,.6), transparent 70%), radial-gradient(ellipse 50% 40% at 88% 28%, rgba(232,209,154,.3), transparent 70%), radial-gradient(ellipse 50% 40% at 40% 85%, rgba(255,250,235,.55), transparent 70%)",
      }}
    >
      <RamasDefs />
      <Rama
        viewBox="0 0 300 280"
        paths="M-20,30 C70,10 160,40 215,110 S258,190 268,240|M40,-20 C25,60 45,125 72,180"
        seed={11}
        step={14}
        scale={1.2}
        className="-left-[34px] -top-[30px] hidden w-[clamp(150px,18vw,250px)] md:block"
      />
      <Rama
        viewBox="0 0 300 280"
        paths="M-20,25 C70,5 160,35 215,105 S255,180 265,230|M40,-20 C28,55 50,120 78,170"
        seed={29}
        step={14}
        scale={1.15}
        volteo="vuelta"
        className="-bottom-[30px] -right-[34px] hidden w-[clamp(150px,16vw,220px)] md:block"
      />
      <div className="relative z-[2] w-full max-w-sm">{children}</div>
    </div>
  );
}
