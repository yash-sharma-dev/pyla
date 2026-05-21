import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/**/*.ts",
    "src/**/*.tsx",
    "!src/**/*.test.*",
    "!src/**/*.spec.*",
  ],
  format: ["esm"],
  bundle: true,
  tsconfig: "tsconfig.json",
  dts: {
    compilerOptions: {
      composite: false,
    },
  },
  treeshake: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  clean: true,
  esbuildOptions(options) {
    options.jsx = "automatic";
  },
  external: ["@pyla/core-schema"],
});
