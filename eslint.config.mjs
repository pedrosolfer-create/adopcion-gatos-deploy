import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Scripts standalone de Node (Playwright, generadores de imágenes) --
    // corren fuera de la app de Next.js, usan require() a propósito y no
    // se compilan como parte del build.
    "scripts/*.js",
    "marketing/**",
  ]),
]);

export default eslintConfig;
