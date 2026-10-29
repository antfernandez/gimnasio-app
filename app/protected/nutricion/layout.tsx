import { NutricionSubnav } from "@/components/nutricion/nutricion-subnav";

export default function NutricionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Panel del gimnasio
        </div>
        <h2 className="mb-4 text-2xl">Nutrición</h2>
        <NutricionSubnav />
      </div>
      {children}
    </div>
  );
}
