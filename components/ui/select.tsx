import * as React from "react";

import { cn } from "@/lib/utils";

/** Blanco cuando se puede elegir; beige (`bg-secondary`) solo si está deshabilitado (spec 57). */
const Select = React.forwardRef<
  HTMLSelectElement,
  React.ComponentProps<"select">
>(({ className, children, ...props }, ref) => {
  return (
    <select
      className={cn(
        "flex h-11 w-full rounded-[9px] border border-input bg-white [color-scheme:light] px-3.5 py-1 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground",
        "[&>option]:bg-white [&>option]:text-foreground [&>option:disabled]:text-muted-foreground",
        className,
      )}
      ref={ref}
      {...props}
    >
      {children}
    </select>
  );
});
Select.displayName = "Select";

export { Select };
