import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

// eslint-config-next 16 exporta configuración "flat" nativa (ya no hace falta FlatCompat).
const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    // Reglas nuevas de eslint-config-next 16 que marcan código previo: aviso, no error.
    rules: { "react-hooks/set-state-in-effect": "warn" },
  },
  {
    files: ["tailwind.config.ts"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
];

export default eslintConfig;
