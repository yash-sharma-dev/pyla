import globals from "globals";
import { defineConfig, globalIgnores } from "eslint/config";
import {
  appBaseConfig,
  appTsRules,
  createTypeScriptConfig,
  getConfigDir,
  lintOptionsConfig,
  packageIgnores,
} from "../../configs/eslint/shared.mjs";
import prettier from "eslint-config-prettier/flat";

const configDir = getConfigDir(import.meta.url);

export default defineConfig(
  globalIgnores(packageIgnores),
  { ...appBaseConfig },
  createTypeScriptConfig({
    files: ["**/*.{ts,tsx}"],
    configDir,
    globals: {
      ...globals.node,
    },
    extraRules: {
      ...appTsRules,
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: false }],
    },
  }),
  prettier,
  lintOptionsConfig,
);
