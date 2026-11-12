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
    // Not app code: the approved mockup, build output and test reports.
    "index.html",
    "design/**",
    ".open-next/**",
    ".wrangler/**",
    "playwright-report/**",
    "test-results/**",
    "cloudflare-env.d.ts",
    "lib/database.types.ts",
  ]),
]);

export default eslintConfig;
